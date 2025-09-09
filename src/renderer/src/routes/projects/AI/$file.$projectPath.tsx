import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import Thinking from '../../../assets/lottie/Loader.json'
import Lottie from 'lottie-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '../../../components/ui/accordion'
import { cn } from '../../../lib/utils'
import { Button } from '../../../components/ui/button'

export const Route = createFileRoute('/projects/AI/$file/$projectPath')({
  component: RouteComponent
})

function RouteComponent() {
  const { file, projectPath } = Route.useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['meta-list', file],
    queryFn: async () => {
      try {
        const res = await fetch('http://localhost:5177/api/ai-review', {
          method: 'POST',
          body: JSON.stringify({ filePath: file, projectPath }),
          headers: { 'Content-Type': 'application/json' }
        })
        const json = await res.json()
        console.log(json)
        return json.results
      } catch (err) {
        console.log(err)

        return []
      }
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // cacheTime: 1 * 60 * 60 * 1000,

    staleTime: 1 * 60 * 60 * 1000
  })
  if (isLoading)
    return (
      <div className="grid place-content-center h-screen">
        <div className="w-40">
          <Lottie animationData={Thinking} loop={true} />
          <p>AI Conducting review</p>
        </div>
      </div>
    )

  return (
    <div className="p-4">
      <Accordion type="single" collapsible>
        {data?.map((item, index) => (
          <AccordionItem value={item.issue} key={index}>
            <AccordionTrigger>
              <h6 className="relative ps-5 flex items-center">
                <span
                  className={cn('absolute start-0 w-3 h-3 rounded-full', {
                    'bg-red-400': item.priority === 'High',
                    'bg-amber-400': item.priority === 'Medium',
                    'bg-green-400': item.priority === 'Low'
                  })}
                ></span>
                {item.issue}
              </h6>
            </AccordionTrigger>
            <AccordionContent>
              <div className="ps-6">
                <p>
                  <strong>description: </strong>
                  {item.description}
                </p>
                <p>
                  <strong>suggested_fix: </strong>
                  {item.suggested_fix}
                </p>
                <div className="flex gap-3 pt-5 pb-1">
                  <Button variant={'outline'}>Approve</Button>
                  <Button variant={'secondary'}>Skip</Button>
                  <Button variant={'destructive'}>Reject</Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
