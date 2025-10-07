/**
 * Important note: Sub-routes(routes that are in sub-folders within the routes folder)
 * break the service worker.
 */
import { createRootRoute, Outlet } from "@tanstack/react-router";

function RootLayout() {
  return <Outlet />;
}

export const Route = createRootRoute({ component: RootLayout });
