import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { GoWorkflow } from 'react-icons/go'
import { CiFileOn } from 'react-icons/ci'
import { IoShieldCheckmarkOutline } from 'react-icons/io5'
import { FaImages } from 'react-icons/fa'
import { VscSymbolSnippet } from 'react-icons/vsc'
import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import Lottie from 'lottie-react'
import Thinking from '../../assets/lottie/Loader.json'

export const Route = createFileRoute('/projects/$projectPath')({
  component: RouteComponent
})
const SUPPORTED = ['Microflow', 'Page', 'ImageCollection', 'Snippet', 'DomainModel']

function RouteComponent() {
  const [filter, setFilter] = useState<keyof typeof SUPPORTED | null>(null)
  const { projectPath } = Route.useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['meta-list', projectPath],
    queryFn: async () => {
      try {
        const res = await fetch('http://localhost:5177/api/meta-list?path=' + projectPath)
        const data = await res.json()
        const resolvedData = data.files.map((file) => resolveFileName(file))
        console.log(projectPath, resolvedData)
        return resolvedData.filter(
          (item) => SUPPORTED.includes(item.type) || item.type.includes('Security')
        )
      } catch (err) {
        console.log(err)
      }
    },
    enabled: !!projectPath
  })

  function resolveFileName(name: string) {
    const suffix = name.split('\\').at(-1) as string
    const [fileName, type] = suffix.split('$')
    const cleanName = fileName.split('.').at(0)
    console.log(type?.replace('.yaml', ''))
    return { fileName: cleanName, type: type?.replace('.yaml', '') || '', path: name }
  }

  if (isLoading) return <Lottie animationData={Thinking} loop={true} />

  return (
    <div>
      <div>
        <Link to={'/'}>Back</Link>
      </div>
      <section>
        <h1 className="font-bold text-2xl">what do you want to review?</h1>

        <div className="flex gap-3 py-3 flex-wrap">
          {['All', ...SUPPORTED].map((type, index) => (
            <Badge key={index} className="p-6" variant={'secondary'} asChild>
              <Button
                className="hover:text-white"
                onClick={() => setFilter(type === 'All' ? null : type)}
              >
                {type}
              </Button>
            </Badge>
          ))}
        </div>
      </section>
      <div className="grid gap-3">
        {data
          .filter((item) => (!filter ? item : filter === item.type))
          ?.map((item, index) => (
            <Button asChild variant={'ghost'} key={index}>
              <Link
                to={'/projects/AI/$file/$projectPath'}
                params={{ file: item.path, projectPath }}
                className="flex gap-3 rounded-sm hover:bg-slate-200 transition-all cursor-pointer ps-6 justify-start"
                onClick={() => {}}
              >
                {item.type === 'Microflow' && <GoWorkflow />}
                {item.type === 'Page' && <CiFileOn />}
                {item.type.includes('Security') && <IoShieldCheckmarkOutline />}
                {item.type === 'ImageCollection' && <FaImages />}
                {item.type === 'Snippet' && <VscSymbolSnippet />}

                {item.fileName}
              </Link>
            </Button>
          ))}
      </div>
    </div>
  )
}
