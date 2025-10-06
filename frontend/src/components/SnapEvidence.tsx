import { Button, Card, Group, Modal, rem, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";

interface FaceCheckProps {
  onSend: (file: File) => void;
}

export default function SnapEvidence(props: FaceCheckProps) {
  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    previewStream
  } = useReactMediaRecorder({ video: true, audio: false });
  const [modalOpened, setModalOpened] = useState(false);

  useEffect(() => {
    startRecording()
    return () => {
      if (status === "recording") stopRecording();
    }
  }, []);

  useEffect(() => {
    if (mediaBlobUrl == null) {
      return
    }
    console.log("START")
    fetch(mediaBlobUrl)
      .then(resp => resp.blob())
      .then(blob => {
        const filename = "media_file.mp4"; // Replace with your desired filename and extension
        const fileType = blob.type; // Get the MIME type from the fetched blob
        const file = new File([blob], filename, { type: fileType });
        props.onSend(file)
      })
  }, [mediaBlobUrl])

  return (
    <Stack mih="100vh" gap={0}>
      <Group align="center" justify="center">
        <Title order={4}>
          Take a picture of your surroundings{" "}
          <Button 
            onClick={() => setModalOpened(true)} 
            variant="subtle"
            size="lg"
            p={0}
          >
            (Why?)
          </Button>
        </Title>
      </Group>

      <Card
        shadow="md"
        padding={0}
        mb={rem(20)}
        mx={rem(10)}
        bdrs={rem(10)}
        bg="#f8fafc"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {status === "recording" && previewStream ? (
          <video
            ref={video => {
              if (video && previewStream) {
                video.srcObject = previewStream;
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 16,
            }}
            autoPlay
            muted
            playsInline
          />
        ) : (
          // placeholder when video not ready
          <Text>Preparing camera…</Text>
        )}
      </Card>

      <div style={{ padding: "12px 16px", background: "transparent" }}>
        <Button onClick={stopRecording} loading={status !== "recording"} fullWidth size="lg">
          Take Photo
        </Button>
      </div>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)}>
        <Title order={1}>Why request a picture in a sign-in app?</Title>
        <Text>
          If you took longer than 10 seconds to open this page after scanning the QR code,
          you'll get this. QR codes "expire" every 10 seconds to prevent people from sending sign-in links
          to their friends.
        </Text>
        <Text>
          Once they expire, we make you send a photo of yourself
          to make sure that you're on CA campus and not somewhere else.
        </Text>
      </Modal>
    </Stack>
  );
}
