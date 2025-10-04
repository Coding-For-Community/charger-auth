import { Button, Card, Center, Group, Text, Title } from "@mantine/core";
import { useEffect } from "react";
import { useReactMediaRecorder } from "react-media-recorder";

interface FaceCheckProps {
  title: string;
  subtitle: string;
  onSend: (file: File) => Promise<void>;
}

export default function RecordView(props: FaceCheckProps) {
  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    previewStream
  } = useReactMediaRecorder({ video: true, audio: false });

  useEffect(() => {
    // Start recording immediately on mount
    startRecording();
    // Optionally stop recording on unmount
    return () => {
      if (status === "recording") stopRecording();
    };
    // eslint-disable-next-line
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
        return props.onSend(file)
      })
  }, [mediaBlobUrl])

  return (
    <Center style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Card shadow="md" radius="lg" p="xl" style={{ maxWidth: 420, width: "100%" }}>
        <Title order={2} mb="xs">{props.title ?? "Record Evidence"}</Title>
        <Text mb="md" c="dimmed">{props.subtitle ?? "Please record a short video as evidence."}</Text>
        <Text size="sm" mb="sm" c={status === "recording" ? "green" : "gray"}>
          Status: {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
        <Group justify="center" mb="md">
          <Button color="red" onClick={stopRecording} disabled={status !== "recording"}>
            Stop Recording
          </Button>
        </Group>
        <div style={{ width: "100%", aspectRatio: "16/9", background: "#e9ecef", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
          {/* Show live preview while recording */}
          {status === "recording" && previewStream && (
            <video
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
              autoPlay
              muted
              playsInline
              ref={video => {
                if (video && previewStream) {
                  video.srcObject = previewStream;
                }
              }}
            />
          )}
        </div>
      </Card>
    </Center>
  );
}
