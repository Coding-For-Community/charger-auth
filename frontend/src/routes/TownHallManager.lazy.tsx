import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/TownHallManager')({
  component: TownHallManager,
})

function TownHallManager() {
  return <div>Hello "/TownHallManager"!</div>
}
