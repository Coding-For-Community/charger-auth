import { createFileRoute } from '@tanstack/react-router'
import { useAdminLoggedInCheck } from '../utils/tryAdminLogin'

export const Route = createFileRoute('/ScannerApp')({
  component: ScannerApp,
})

function ScannerApp() {
  const loggedIn = useAdminLoggedInCheck()

  if (loggedIn.isFetching) {
    return <div>Loading....</div>
  }

  return <div>Hello "/ScannerApp"!</div>
}
