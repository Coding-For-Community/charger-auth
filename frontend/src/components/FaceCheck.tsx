import { Button, Card, Container, Group, Text, Title } from "@mantine/core"
import { useRef, useState } from "react"
import Webcam from "react-webcam"

interface FaceCheckProps {
  title: string
  subtitle: string
  onSnapshot: (cam: Webcam) => Promise<void> 
}

export function FaceCheck(props: FaceCheckProps) {
  const webcamRef = useRef<Webcam | null>(null)
  const [loading, setLoading] = useState(false)
  function handleClick() {
    if (loading || !webcamRef.current) return
    setLoading(true)
    props.onSnapshot(webcamRef.current).then(() => setLoading(false))
  }
  
  return (
    <Container mt={10} size="sm" style={{ display: "flex", justifyContent: "center", minHeight: "100vh", alignItems: "center" }}>
      <Card shadow="lg" radius="lg" p="xl" withBorder style={{ textAlign: "center", width: "100%", maxWidth: 400 }}>
        <Title order={2} mb="sm">{props.title}</Title>

        <Text c="dimmed" mb="lg">{props.subtitle}</Text>

        <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 16, overflow: "hidden", border: "4px solid #dee2e6" }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <Group justify="center" mt="lg">
          <Button onClick={handleClick}>
            {loading ? "Scanning..." : "Capture Face"}
          </Button>
        </Group>
      </Card>
    </Container>
  )
}