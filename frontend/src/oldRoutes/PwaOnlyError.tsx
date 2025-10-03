// import { Button, Card, Center, Text, Title } from '@mantine/core'
// import { createFileRoute } from '@tanstack/react-router'

// export const Route = createFileRoute('/PwaOnlyError')({
//   component: PwaOnlyError,
// })

// function PwaOnlyError() {
//   return (
//     <Center style={{ minHeight: '100vh', background: '#f8fafc' }}>
//       <Card shadow="md" padding="xl" radius="md" style={{ maxWidth: 400, width: '100%' }}>
//         <Title order={2} ta="center" mb="xs">
//           ChargerAuth cannot be used on a browser
//         </Title>
//         <Text ta="center" c="dimmed" mb="md">
//           To use ChargerAuth, 
//           For the best experience, please install ChargerAuth as an app on your device.<br />
//           This page is only available in the installed app.
//         </Text>
//         <Button
//           fullWidth
//           variant="gradient"
//           gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
//           onClick={() => window.location.reload()}
//         >
//           Try Again
//         </Button>
//         <Text ta="center" size="xs" mt="md" color="gray">
//           Need help? Tap the <b>Share</b> icon and choose <b>Add to Home Screen</b> on your device.
//         </Text>
//       </Card>
//     </Center>
//   )
// }
