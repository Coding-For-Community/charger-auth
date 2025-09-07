import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ScannerApp')({
  component: ScannerApp,
})

function ScannerApp() {
  return <div>Hello "/ScannerApp"!</div>
}
