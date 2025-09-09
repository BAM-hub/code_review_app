import { app, dialog } from 'electron'
import path from 'node:path'
import fs from 'fs'
import { cp, mkdir } from 'fs/promises'
import { spawn } from 'child_process'
import express from 'express'
import { readFile, readdir } from 'fs/promises'
import { Agent, run } from '@openai/agents'
import { z } from 'zod'
import { Effect } from 'effect/index'
import { Serializable } from 'node:child_process'

const OpenAIResponse = z.object({
  results: z.array(
    z.object({
      issue: z.string(),
      description: z.string(),
      priority: z.enum(['High', 'Medium', 'Low']),
      suggested_fix: z.string(),
      status: z.enum(['Pending', 'Approved', 'Rejected', 'Skipped']).nullable().optional(),
      result: z.enum(['returned', 'new', 'passed', 'failed'])
    })
  )
})

const mendixAgent = new Agent({
  name: 'Mendix expert',
  instructions: fs.readFileSync('./instructions.txt', 'utf-8'),
  outputType: OpenAIResponse
})

const META_PATH = path.join(app.getPath('userData'), 'meta.json')
const YAML_FILES_PATH = path.join(app.getPath('userData'), 'yaml')
const LINT_RESULT_PATH = path.join(app.getPath('userData'), 'json')
const AI_RESULT_PATH = path.join(app.getPath('userData'), 'json', 'ai')

const BASE_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'app', '.vite', 'build')
  : __dirname

const scriptPath = path.join(BASE_PATH, 'bin', 'mxlint-local.exe')

function spawnAsync(
  command: string,
  options: { shell: boolean },
  onstdout?: (message: Serializable) => void
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, options)
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    if (onstdout) {
      child.on('message', (message) => {
        onstdout(message)
      })
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        console.error(new Error(`Child process exited with code ${code}.`))
        reject(code)
      }
    })

    child.on('error', (err) => {
      console.error(new Error(`Failed to spawn child process: ${err.message}`))
      reject(1)
    })
  })
}

function getMeta() {
  try {
    const data = fs.readFileSync(META_PATH, {
      encoding: 'utf-8'
    })
    return JSON.parse(data)
  } catch (err) {
    return []
  }
}

function resolveProjectPath(projectPath: string, basePath: string) {
  const pathPrefix = projectPath.split(':\\').at(-1)?.replaceAll('\\', '__')
  if (!pathPrefix) throw new Error('Project Path is in invalid format: ' + projectPath)
  return path.join(basePath, pathPrefix)
}

async function resolveFiles(path: string) {
  const readFileList = Effect.promise<string[]>(() =>
    readdir(path, {
      recursive: true
    })
  )

  const fileList = await Effect.runPromise(readFileList)

  const resolvedObject = {
    modules: [],
    files: []
  }

  const resolvedResult = fileList.reduce((prev, curr) => {
    const isFile = curr.endsWith('.yaml')
    const isModule = curr.split('\\').length === 1
    if (isFile) {
      const files = [...prev.files, curr]
      return {
        ...prev,
        files
      }
    }
    const modules = [...prev.modules, curr]
    return {
      ...prev,
      modules
    }
  }, resolvedObject)

  return resolvedResult
}

export default function createServer() {
  const api = express()
  api.use(express.json())
  api.use((_, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next()
  })

  api.get('/api/pick', async (req, res) => {
    const type = req.query.type
    const properties = type === 'file' ? ['openFile'] : ['openDirectory']
    const result = await dialog.showOpenDialog({
      title: 'Pick a file',
      properties,
      filters: [{ name: 'All Files', extensions: ['*'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return res.status(400).json({ error: 'No file selected' })
    }

    return res.json({ filePath: result.filePaths[0] })
  })

  api.get('/api/project', (req, res) => res.send({ data: getMeta() }))

  api.post('/api/project', (req, res) => {
    try {
      const { path, name } = req.body
      const data = getMeta()
      const exists = data.filter((project) => project.path === path)

      if (exists.length) {
        const newData = data.map((project) => {
          if (project.path === path) {
            return { path, name }
          }
          return project
        })

        fs.writeFile(META_PATH, JSON.stringify(newData), () => {
          return res.send({ message: 'Success' })
        })
      }
      fs.writeFile(META_PATH, JSON.stringify([...data, { path, name }]), () => {
        return res.send({ message: 'Success' })
      })
    } catch {
      return res.status(500).send({ message: 'Fail' })
    }
  })

  api.delete('/api/project', (req, res) => {
    try {
      const { path } = req.body
      const data = getMeta()
      const newData = data.filter((project) => project.path !== path)

      fs.writeFile(META_PATH, JSON.stringify(newData), () => {
        return res.send({ message: 'Success' })
      })
    } catch {
      return res.status(500).send({ message: 'Fail' })
    }
  })

  api.post('/api/lint', async (req, res) => {
    try {
      const { path: projectPath } = req.body

      const exists = getMeta().filter((project) => project.path === projectPath).length > 0
      if (!exists) return res.status(404).send({ message: 'project not found' })
      console.log(BASE_PATH)

      await mkdir(resolveProjectPath(projectPath, YAML_FILES_PATH), {
        recursive: true
      })

      const buildCommand = [
        `${scriptPath}`,
        'export-model',
        '--input',
        `${projectPath}`,
        '--output',
        resolveProjectPath(projectPath, YAML_FILES_PATH)
      ].join(' ')

      console.log('runing command: ', buildCommand)

      await spawnAsync(buildCommand, { shell: true })

      const lintCommand = [
        `${scriptPath}`,
        'lint',
        '--rules',
        `${BASE_PATH}\\bin\\rules`,
        '--modelsource',
        resolveProjectPath(projectPath, YAML_FILES_PATH),
        '--json-file',
        `${BASE_PATH}\\temp\\result.json`
      ].join(' ')

      console.log('runing command: ', lintCommand)

      await spawnAsync(lintCommand, { shell: true }).catch(async (code) => {
        if (code === 1 || code === 0) {
          const data = await readFile(`${BASE_PATH}\\temp\\result.json`, 'utf-8')
          try {
            await cp(
              `${BASE_PATH}\\temp\\result.json`,
              path.join(resolveProjectPath(projectPath, LINT_RESULT_PATH), 'result.json'),
              {
                force: true
              }
            )
          } catch (err) {
            return res.status(500).send({ message: 'somthing went wrong' })
          }

          return res.send({ data: JSON.parse(data) })
        } else {
          return res.status(500).send({ message: 'somthing went wrong' })
        }
      })
      console.log(resolveProjectPath(projectPath, YAML_FILES_PATH))
    } catch (err) {
      console.error(err)
      return res.status(500).send({ message: 'somthing went wrong' })
    }
  })

  api.get('/api/meta-list', async (req, res) => {
    // this promise should never fail
    // if it fails that means the user enterd the wrong path
    // or the previous steps of loading the project Failed
    // @Todo handle errors later after POC
    const meta = Effect.promise(() => {
      const { path: projectPath } = req.query
      const projectMetaFilesPath = resolveProjectPath(projectPath, YAML_FILES_PATH)
      return resolveFiles(projectMetaFilesPath)
    })

    const result = await Effect.runPromise(meta)
    res.send(result)
  })

  api.post('/api/ai-review', async (req, res) => {
    const { filePath, projectPath } = req.body
    const cachePath = resolveProjectPath(projectPath, AI_RESULT_PATH)
    const filePathAsName = filePath.replaceAll('\\', '__')
    const data = await readFile(path.join(cachePath, filePathAsName + '.json'), 'utf-8').catch(
      () => null
    )
    const absFilePath = resolveProjectPath(projectPath, YAML_FILES_PATH)
    const meta = fs.readFileSync(path.join(absFilePath, filePath))

    if (data) {
      // in this case the review was once done we need to forward the old results
      // and then let mr gpt test against them for fixes keeping in mind skipped or rejected tests
      const agentRes = await run(
        mendixAgent,
        meta + '\n  can you review this based ont these test cases you provieded erlier' + data
      )
      const agentJson = agentRes.finalOutput
      return res.send(agentJson)
    } else {
      const agentRes = await run(mendixAgent, meta + '\n  can you review this')

      const agentJson = agentRes.finalOutput
      await mkdir(cachePath, { recursive: true })
      fs.writeFile(
        path.join(cachePath, filePathAsName + '.json'),
        JSON.stringify(agentJson),
        () => {
          console.log(cachePath)
          console.log('cached file')
          return res.send(agentJson)
        }
      )
    }
  })

  api.listen(5177, () => {
    console.log('API server running on http://localhost:5177')
  })
}
