import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Button } from '../components/ui/button'

const RootLayout = () => (
  <div className="relative min-h-screen">
    <Button asChild>
      <Link to="/" className="absolute top-2 end-2">
        Home
      </Link>
    </Button>

    <Outlet />
    <TanStackRouterDevtools />
  </div>
)

export const Route = createRootRoute({ component: RootLayout })
