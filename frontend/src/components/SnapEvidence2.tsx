// import { Button, Group, Modal, Stack, Text, Title } from "@mantine/core";
// import { useEffect, useRef, useState } from "react";

// interface FaceCheckProps {
//   title: string;
//   subtitle: string;
//   onSend: (file: File) => Promise<void>;
// }

// export default function SnapEvidence(props: FaceCheckProps) {
//   // Lightweight native camera handling (reduces bundle size vs react-media-recorder)
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const [ready, setReady] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [modalOpened, setModalOpened] = useState(false);
//   const recorderRef = useRef<MediaRecorder | null>(null);
//   const chunksRef = useRef<Blob[]>([]);
//   const [recording, setRecording] = useState(false);

//   useEffect(() => {
//     let mounted = true;
//     async function startCamera() {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
//         streamRef.current = stream;
//         if (videoRef.current) videoRef.current.srcObject = stream;
//         if (mounted) setReady(true);
//       } catch (err: any) {
//         console.error('camera error', err);
//         setError(err?.message || 'Could not access camera');
//       }
//     }
//     startCamera();
//     return () => {
//       mounted = false;
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((t) => t.stop());
//       }
//     };
//   }, []);

//   // MediaRecorder-based video recording
//   const startRecording = () => {
//     setError(null);
//     if (!streamRef.current) {
//       setError('Camera not ready');
//       return;
//     }
//     const stream = streamRef.current;
//     let options: MediaRecorderOptions = {};
//     // Prefer webm with vp8/opus where available
//     const mimeTypes = [
//       'video/webm;codecs=vp9,opus',
//       'video/webm;codecs=vp8,opus',
//       'video/webm',
//     ];
//     for (const mt of mimeTypes) {
//       if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mt)) {
//         options.mimeType = mt;
//         break;
//       }
//     }
//     try {
//       const mr = new MediaRecorder(stream, options);
//       recorderRef.current = mr;
//       chunksRef.current = [];
//       mr.ondataavailable = (ev: BlobEvent) => {
//         if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
//       };
//       mr.onstop = async () => {
//         const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/webm' });
//         const filename = `media_file.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
//         const file = new File([blob], filename, { type: blob.type });
//         setLoading(true);
//         try {
//           await props.onSend(file);
//         } catch (err) {
//           console.error('send error', err);
//           setError((err as any)?.message || 'Upload failed');
//         } finally {
//           setLoading(false);
//           chunksRef.current = [];
//           setRecording(false);
//         }
//       };
//       mr.start();
//       setRecording(true);
//     } catch (err: any) {
//       console.error('recorder error', err);
//       setError(err?.message || 'Could not start recording');
//     }
//   };

//   const stopRecording = () => {
//     try {
//       recorderRef.current?.stop();
//     } catch (err) {
//       console.error('stop error', err);
//       setError((err as any)?.message || 'Could not stop recording');
//       setRecording(false);
//     }
//   };

//   return (
//     <Stack mih="100vh" gap={0}>
//       <header style={{ padding: "12px 16px" }}>
//         <Group justify="space-between" align="center" mb={4}>
//           <Title order={3}>
//             Take a picture of your surroundings
//           </Title>
//           <Button 
//             onClick={() => setModalOpened(true)} 
//             variant="subtle"
//             p="xs"
//             size="lg"
//           >
//             (Why?)
//           </Button>
//         </Group>
//       </header>

//       {/* Large video area that uses most of the screen */}
//       <div style={{ flex: 1, background: "#000", display: 'flex' }}>
//         {ready ? (
//           <video
//             ref={(el) => {
//               videoRef.current = el;
//               if (el && streamRef.current) el.srcObject = streamRef.current;
//             }}
//             style={{ width: "100%", height: "100%", objectFit: "cover" }}
//             autoPlay
//             muted
//             playsInline
//           />
//         ) : (
//           <div style={{ width: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
//             <Text>{error ? error : 'Preparing camera…'}</Text>
//           </div>
//         )}
//       </div>

//       <div style={{ padding: "12px 16px", background: "transparent" }}>
//         {!recording ? (
//           <Button onClick={startRecording} loading={loading} fullWidth size="lg">
//             Start Recording
//           </Button>
//         ) : (
//           <Button onClick={stopRecording} loading={loading} fullWidth color="red" size="lg">
//             Stop & Send
//           </Button>
//         )}
//       </div>

//       <Modal opened={modalOpened} onClose={() => setModalOpened(false)}>
//         <Title order={1}>Why request a picture in a sign-in app?</Title>
//         <Text>
//           If you took longer than 10 seconds to open this page after scanning the QR code,
//           you'll get this. QR codes "expire" every 10 seconds to prevent people from sending sign-in links
//           to their friends.
//         </Text>
//         <Text>
//           Once they expire, we make you send a photo of yourself
//           to make sure that you're on CA campus and not somewhere else.
//         </Text>
//       </Modal>
//     </Stack>
//   );
// }
