import { app, dialog } from 'electron'
import path from 'node:path'
import fs from 'fs'
import { spawn } from 'child_process'
import express from 'express'
import { readFile } from 'fs/promises'

const META_PATH = path.join(app.getPath('userData'), 'meta.json')
const BASE_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'app', '.vite', 'build')
  : __dirname

const scriptPath = path.join(BASE_PATH, 'bin', 'mxlint-local.exe')

function spawnAsync(command, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, options)
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
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
export default function createServer() {
  const api = express()
  api.use(express.json())
  api.use((req, res, next) => {
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
    const { path } = req.body

    const exists = getMeta().filter((project) => project.path === path).length > 0
    if (!exists) return res.status(404).send({ message: 'project not found' })
    console.log(BASE_PATH)

    const buildCommand = [
      `${scriptPath}`,
      'export-model',
      '--input',
      `${path}`,
      '--output',
      `${BASE_PATH}\\temp\\yaml`
    ].join(' ')

    await spawnAsync(buildCommand, { shell: true })

    const lintCommand = [
      `${scriptPath}`,
      'lint',
      '--rules',
      `${BASE_PATH}\\bin\\rules`,
      '--modelsource',
      `${BASE_PATH}\\temp\\yaml`,
      '--json-file',
      `${BASE_PATH}\\temp\\result.json`
    ].join(' ')

    await spawnAsync(lintCommand, { shell: true }).catch(async (code) => {
      if (code === 1 || code === 0) {
        const data = await readFile(`${BASE_PATH}\\temp\\result.json`, 'utf-8')
        return res.send({ data: JSON.parse(data) })
      } else {
        return res.status(500).send({ message: 'somthing went wrong' })
      }
    })
  })

  api.listen(5177, () => {
    console.log('API server running on http://localhost:5177')
  })
}
