import "@mantine/core/styles/baseline.css";
import "@mantine/core/styles/default-css-variables.css";
import "@mantine/core/styles/global.css";

import "@mantine/core/styles/Popover.css";
import "@mantine/core/styles/CloseButton.css";
import "@mantine/core/styles/Overlay.css";
import "@mantine/core/styles/VisuallyHidden.css";
import "@mantine/core/styles/UnstyledButton.css";
import "@mantine/core/styles/Combobox.css";
import "@mantine/core/styles/Affix.css";
import "@mantine/core/styles/Modal.css";
import "@mantine/core/styles/ModalBase.css";
import "@mantine/core/styles/Button.css";
import "@mantine/core/styles/Center.css";
import "@mantine/core/styles/Input.css";
import "@mantine/core/styles/Title.css";
import "@mantine/core/styles/ActionIcon.css";
import "@mantine/core/styles/AppShell.css";
import "@mantine/core/styles/Checkbox.css";
import "@mantine/core/styles/Divider.css";
import "@mantine/core/styles/Group.css";
import "@mantine/core/styles/Loader.css";
import "@mantine/core/styles/Paper.css";
import "@mantine/core/styles/ScrollArea.css";
import "@mantine/core/styles/Card.css";
import "@mantine/core/styles/Stack.css";

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// By default, everything in the "public" directory is considered to be at the root.
navigator.serviceWorker?.register("../charger-auth/serviceWorker.js");

const qClient = new QueryClient();
const router = createRouter({ routeTree, history: createHashHistory() });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider>
      <QueryClientProvider client={qClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
