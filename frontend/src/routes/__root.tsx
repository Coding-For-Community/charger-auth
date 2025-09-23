/**
 * Important note: Sub-routes(routes that are in sub-folders within the routes folder)
 * break the service worker.
 */
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
