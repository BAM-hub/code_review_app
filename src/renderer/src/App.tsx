import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible'
import { Button } from './components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from './components/ui/card'
import { useQuery } from '@tanstack/react-query'

function formatLintResponse(data) {
  return data.testsuites
    .map((testSuite) => {
      const { testcases: _, ...rest } = testSuite
      return testSuite.testcases.map((testcase) => {
        const rule = data.rules.find((rule) => rule.path === testSuite.name)
        return {
          ...rule,
          ...rest,
          ...testcase,
          testCaseName: testcase.name
        }
      })
    })
    .flat()
}

function App(): React.JSX.Element {
  const { data: projects } = useQuery({
    queryKey: ['lint_data'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5177/api/project')
      const json = await response.json()
      console.log(json)
      return json.data
    }
  })

  return (
    <div className="container p-4 m-auto">
      <div className="pb-6">
        {projects?.map((item, index) => (
          <Card key={index}>
            <div className="flex justify-between">
              <CardHeader>{item.name}</CardHeader>
              <CardContent>
                <Button>go</Button>
              </CardContent>
            </div>
            <CardFooter>
              <span className="text-xs  text-gray-500">{item.path}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
            <CardAction>Card Action</CardAction>
          </CardHeader>
          <CardContent>
            <p>Card Content</p>
            <Collapsible>
              <CollapsibleTrigger>Can I use this in my project?</CollapsibleTrigger>
              <CollapsibleContent>
                Yes. Free to use for personal and commercial projects. No attribution required.
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
          <CardFooter>
            <p>Card Footer</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default App
