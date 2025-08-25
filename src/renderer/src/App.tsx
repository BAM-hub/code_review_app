import { Button } from './components/ui/button'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return <Button variant={'secondary'}>hiii</Button>
}

export default App
