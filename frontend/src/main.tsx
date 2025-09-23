import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { routeTree } from './routeTree.gen'
import { createHashHistory, createRouter, RouterProvider } from '@tanstack/react-router';

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// By default, everything in the "public" directory is considered to be at the root.
navigator.serviceWorker?.register("../charger-auth/serviceWorker.js");

const qClient = new QueryClient();
const router = createRouter({ routeTree, history: createHashHistory() })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <QueryClientProvider client={qClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>
)
