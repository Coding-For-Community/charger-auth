import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return <div>Welcome to ChargerAuth! Setup instructions here are TODO.</div>
}
