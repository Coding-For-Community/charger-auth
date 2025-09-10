import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.PROD ? <></> : <TanStackRouterDevtools />}
    </>
  )
}

export const Route = createRootRoute({ component: RootLayout })
