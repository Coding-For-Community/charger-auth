// import { Card, Center, Group, Loader, Stack, Text, Title } from '@mantine/core'
// import { useMutation, useQuery } from '@tanstack/react-query'
// import { createFileRoute } from '@tanstack/react-router'
// import { useEffect, useRef, useState } from 'react'
// import { IconCheck } from '../components/icons.tsx'
// import { delay } from '../utils/delay.ts'
// import { fetchBackend } from '../utils/fetchBackend.ts'

// export const Route = createFileRoute('/MobileApp')({
//   component: MobileApp,
// })

// const ohNoSound = new Audio("error.mp3")

// interface ScanResult {
//   status: "ok" | "err" | "skipped"
//   msg?: string,
//   studentName?: string
// }

// function useDeviceIdQuery() {
//   return useQuery({
//     queryKey: ["deviceId"],
//     queryFn: async () => {
//       const agent = await loadAgent()
//       const id = await agent.get()
//       return id.visitorId
//     }
//   })
// }

// function MobileApp() {
//   const vidRef = useRef<HTMLVideoElement | null>(null)
//   const cooldownOn = useRef(false)
//   const prevEmail = useRef("")
//   const [signedInName, setSignedInName] = useState<string | null>(null)
//   const [notifsEnabled, setNotifsEnabled] = useState(false)

//   function onError(err: string) {
//     window.alert(err) 
//     cooldownOn.current = false;
//     prevEmail.current = ""
//   }

//   const freeBlockQ = useQuery({
//     queryKey: ["currFreeBlock"],
//     queryFn: async () => {
//       const res = await fetchBackend("/checkin/freeBlockNow/")
//       return (await res.json())["curr_free_block"]
//     }
//   })

//   const checkinM = useMutation<ScanResult, Error, string>({
//     mutationFn: async (data) => {
//       if (!data || cooldownOn.current) return { status: "skipped" }
//       cooldownOn.current = true
//       setTimeout(() => cooldownOn.current = false, 2000)

//       const email = JSON.parse(data).email_b64
//       if (prevEmail.current === email) return { status: "skipped" }
//       prevEmail.current = email

//       console.log("DATA: " + data)

//       const res = await fetchBackend("/checkin/run/", {
//         method: "POST",
//         credentials: 'include',
//         body: data
//       })

//       switch (res.status) {
//         case 200:
//           return { status: "ok", studentName: (await res.json())["studentName"] }
//         case 400:
//           return { status: "err", msg: "Invalid Student ID - maybe close and re-open ChargerAuth?" }
//         case 401:
//           return { status: "err", msg: "This is not your fault - scanner app not logged in." }
//         case 403:
//           return { status: "err", msg: "Heads up: sign-in qr codes change every 5 seconds, so you can't send a screenshot to your friend." }
//         case 405:
//           return { status: "err", msg: "There isn't a free block right now; try signing in later." }
//         case 409:
//           return { status: "err", msg: "This device has already checked in a user for this free period." }
//         default:
//           return { status: "err", msg: "Invalid status code: " + res.status }
//       }
//     },
//     onError: (err) => onError(err.toString()),
//     onSuccess: async (result) => { 
//       if (result.status === "err") {
//         ohNoSound.play()
//         await delay(200)
//         onError(result.msg ?? "Invalid Error")
//       } else if (result.status === "ok") {
//         setSignedInName(result.studentName ?? "ERROR: No student name")
//       }
//     },
//   })

//   async function updateNotifsEnabled() {
//     const res = await fetchBackend("/notifs/enabled/" + emailB64)
//     setNotifsEnabled((await res.json())["registered"])
//   }

//   async function disablePushNotifs() {
//     const res = await fetchBackend("/notifs/unregister/", {
//       method: "POST",
//       body: JSON.stringify({ email_b64: emailB64 })
//     })
//     if (res.status != 200) {
//       console.error("Push notifs WERE NOT DISABLED: " + res.statusText)
//     }
//   }

//   useEffect(() => {
//     if (!emailB64 || emailB64 === '') {
//       navigate({ to: "/MobileAppSignIn" })
//     } else {
//       updateNotifsEnabled()
//     }
//     console.log("hiya!")
//     import('qr-scanner')
//       .then(module => module.default)
//       .then(QrScanner => {
//         if (vidRef.current == null || freeBlockQ.isFetching) return
//         const scanner = new QrScanner(
//           vidRef.current, (res) => checkinM.mutate(res.data),
//           { 
//             preferredCamera: "user",
//             highlightScanRegion: true,
//             calculateScanRegion(video) {
//               // Expand the scan region to 95% of the video's width and height
//               const size = Math.min(video.videoWidth, video.videoHeight);
//               const x = (video.videoWidth - size * 0.95) / 2;
//               const y = (video.videoHeight - size * 0.95) / 2;
//               const width = size * 0.95;
//               const height = size * 0.95;
//               return { x, y, width, height };
//             }
//           }
//         )
//         scanner.start()
//       })
//   }, [vidRef.current, freeBlockQ.isFetching])

//   if (freeBlockQ.isFetching) {
//     return (
//       <Center style={{ minHeight: "100vh" }}>
//         <Loader size="xl" />
//         <Text ml="md" size="lg">Loading authentication and block info...</Text>
//       </Center>
//     );
//   }

//   return (
//     <div style={{ height: `100vh` }}>
//       <Modal opened={settingsOpened} onClose={() => setSettingsOpened(false)}>
//         <Title order={2} mb={rem(10)}>Settings</Title>
//         <Stack>
//           {
//             notifsEnabled 
//               ? <Button bg="gray" onClick={disablePushNotifs}>
//                   Disable Push Notifs
//                 </Button> 
//               : <Button onClick={() => enablePushNotifs(parseInt(emailB64!, 10))}>
//                   Enable Push Notifs
//                 </Button>
//           }
//           <Button 
//             bg="red"
//             onClick={() => {
//               window.localStorage.removeItem(EMAIL_KEY)
//               navigate({ to: "/MobileAppSignIn" })
//             }}
//           >
//             Log Out
//           </Button>
//         </Stack>
//       </Modal>
      
//       <Stack align="center" gap={0}>
//         <Text fz={30} fw="bold" mb={8} gradient={{ from: "blue", to: "cyan", deg: 90 }}>
//           ChargerAuth Check-In {freeBlockQ.data ? `(${freeBlockQ.data} Block)` : `` }
//         </Text>
//         <Text size="md" c="dimmed" ta="center" mb={20}>
//           {freeBlockQ.data
//             ? `Scan your sign-in QR code below to check in.`
//             : "There is currently no free block available for check-in. Please try again later."}
//         </Text>
//         <Card
//           shadow="md"
//           padding={0}
//           mb={24}
//           mx={80}
//           bdrs={16}
//           bg="#f8fafc"
//           style={{
//             aspectRatio: "1/1",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//           }}
//         >
//           <video
//             ref={vidRef}
//             style={{
//               width: "100%",
//               height: "100%",
//               objectFit: "cover",
//               borderRadius: 16,
//             }}
//             muted
//           />
//         </Card>
//         <Group gap={10}>
//           <IconCheck 
//             color="white" 
//             size={50} 
//             style={{
//               boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
//               background: "green",
//               borderRadius: "50%"
//             }} 
//           />
//           <Title order={1}>Daniel Chen has signed in.</Title>
//         </Group>
//       </Stack>
//     </div>
//   );
// }
