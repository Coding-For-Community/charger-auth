import { Button, Card, Container, Group, rem, Stack, Text, TextInput, Title } from "@mantine/core"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { SignInButton } from "../components/SignInButton"
import { BACKEND_URL, EMAIL_KEY } from "../utils/constants"
import { fetchBackend } from "../utils/fetchBackend"
import Webcam from "react-webcam";
import { useMutation } from "@tanstack/react-query"

export const Route = createFileRoute('/MobileAppSignIn')({
  component: MobileAppSignIn,
})

function MobileAppSignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [faceScanOpen, setFaceScanOpen] = useState(false)
  const webcamRef = useRef<Webcam | null>(null)

  const captureM = useMutation({
    mutationFn: async () => {
      let imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc == null) return
      imageSrc = imageSrc.replace("data:image/jpeg;base64,", "")
      const emailB64 = btoa(email)
      const res = await fetch(BACKEND_URL + "/checkin/verifyFace/", {
        method: "POST",
        body: JSON.stringify({ email_b64: emailB64, face_image_b64: imageSrc })
      })
      const json = await res.json()
      if (json["similarity"] > 0.5 || json["similarity"] == -1) {
        window.localStorage.setItem(EMAIL_KEY, emailB64)
        navigate({ to: "/MobileAppHome" })
      } else {
        window.alert("Your face did not match your blackbaud ID photo.")
      }
    }
  });
  const emailM = useMutation({
    mutationFn: async (e: FormEvent) => {
      e.preventDefault()
      if (email.trim() === '') {
        alert('Please enter your email.');
        return;
      }
      const isValidRes = await fetchBackend("/checkin/studentExists/" + btoa(email))
      const isValid = (await isValidRes.json())["exists"]
      if (!isValid) {
        window.alert("There is no user with email " + email + ".")
        return
      }
      setFaceScanOpen(true)
    }
  })

  useEffect(() => {
    if (window.localStorage.getItem(EMAIL_KEY)) {
      navigate({ to: "/MobileAppHome" })
    }
  }, [])

  if (faceScanOpen) {
    return (
      <Container mt={10} size="sm" style={{ display: "flex", justifyContent: "center", minHeight: "100vh", alignItems: "center" }}>
        <Card shadow="lg" radius="lg" p="xl" withBorder style={{ textAlign: "center", width: "100%", maxWidth: 400 }}>
          <Title order={2} mb="sm">
            Scan Your Face
          </Title>
          <Text c="dimmed" mb="lg">
            Please align your face within the frame to continue.
          </Text>

          <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 16, overflow: "hidden", border: "4px solid #dee2e6" }}>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Scanning overlay */}
          </div>

          <Group justify="center" mt="lg">
            <Button
              onClick={() => captureM.mutate()}
            >
              {captureM.isPending ? "Scanning..." : "Capture Face"}
            </Button>
          </Group>
        </Card>
      </Container>
    )
    // return (
    //   <>
    //     <Stack p={rem(10)} gap={0} style={{ justifyContent: "center", minHeight: "100vh" }}>
    //       <Text style={{
    //         fontSize: 24,
    //         fontWeight: 'bold',
    //         color: '#111827', // Dark text for high contrast
    //         textAlign: "center"
    //       }}>
    //         Welcome to ChargerAuth!
    //       </Text>
    //       <Webcam
    //         ref={webcamRef}
    //       />
    //     </Stack>
    //     <Button style={{ transform: "translate(50%, 50%);" }}>Scan Face</Button>
    //   </>
      
    // )
  }
  
  return (
    <Stack p={rem(10)} gap={0} style={{ justifyContent: "center", minHeight: "100vh" }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827', // Dark text for high contrast
        textAlign: "center"
      }}>
        Welcome to ChargerAuth!
      </Text>
      <Text style={{
        fontSize: 14,
        color: '#4b5563', // A softer, medium gray
        textAlign: 'center',
        marginBottom: rem(20)
      }}>
        Enter your email to sign in
      </Text>
      <form onSubmit={emailM.mutate}>
        <TextInput
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          size="lg"
          radius={12}
          mb={rem(20)}
        />
        <SignInButton />
      </form>
    </Stack>
  )
}