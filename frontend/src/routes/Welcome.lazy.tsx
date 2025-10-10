import { Text, Title } from "@mantine/core";
import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/Welcome")({
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <>
      <Title>Welcome to ChargerAuth!</Title>
      <Text>
        You may have noticed that the various free period sign-in kiosks
        around campus now have QR codes that you can scan. They all use the ChargerAuth system!
      </Text>
      <Text>
        You can scan the QR code with just your phone, but using the dedicated app is a lot faster.
      </Text>
      <Title order={2}>Setup instructions: iPhone</Title>
      <Text>
        
      </Text>
    </>
  )
}
