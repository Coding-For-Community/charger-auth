import { Button, Center, Group, Loader, Modal, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { fetchBackend } from "../api/fetchBackend";

export default function EvidencePlayer(props: {
  opened: boolean;
  onClose: () => void;
  students: any[];
  freeBlock: string;
}) {
  const [index, setIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currStudent = props.students[index];
  const numStudents = props.students.length;

  useEffect(() => {
    if (numStudents == 0 || !props.opened) return;
    let objectUrl: string | null = null;
    setLoading(true);
    let endpoint = `/checkin/studentVid?free_block=${props.freeBlock}`;
    endpoint += `&email=${currStudent.email}`;
    fetchBackend(endpoint)
      .then((res) => res.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        window.alert(
          "Developer error: This student does not seem to have a video.",
        );
      });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [props]);

  if (!props.students || numStudents === 0) {
    return (
      <Modal opened={props.opened} onClose={props.onClose} centered>
        <Title order={4} mb="md">
          No tentative student videos available.
        </Title>
      </Modal>
    );
  }

  return (
    <Modal opened={props.opened} onClose={props.onClose} centered size="lg">
      <Group justify="space-between" mb="md">
        <Button
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          variant="subtle"
        >
          Previous
        </Button>
        <Title order={4}>
          Video {index + 1} of {numStudents} ({currStudent["name"]})
        </Title>
        <Button
          disabled={index === numStudents - 1}
          onClick={() => setIndex((i) => Math.min(numStudents - 1, i + 1))}
          variant="subtle"
        >
          Next
        </Button>
      </Group>
      <Center>
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
      </Center>
    </Modal>
  );
}
