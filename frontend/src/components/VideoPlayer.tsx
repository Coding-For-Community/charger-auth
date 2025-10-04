import { Card, Center, Loader, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { fetchBackend } from "../api/fetchBackend";

export default function VideoPlayer(props: {
  freeBlock: string,
  studentEmail: string,
  studentName: string
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    setLoading(true);
    fetchBackend(
      `/checkin/studentVid?free_block=${props.freeBlock}
      &email_b64=${btoa(props.studentEmail)}`
    )
      .then(res => res.blob())
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        window.alert("Developer error: This student does not seem to have a video.")
      })
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [props]);

  return (
    <Center style={{ minHeight: "300px" }}>
      <Card shadow="md" radius="md" p="lg" style={{ width: 400 }}>
        <Title order={4} mb="md">Video from {props.studentName}</Title>
        {loading ? (
          <Loader size="lg" />
        ) : (
          videoUrl && (
            <video
              src={videoUrl}
              controls
              style={{ width: "100%", borderRadius: 8 }}
            />
          )
        )}
      </Card>
    </Center>
  );
}