import { rem, Stack, Text, TextInput } from "@mantine/core"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState, type FormEvent } from "react"
import { SignInButton } from "../components/SignInButton"
import { EMAIL_KEY } from "../utils/constants"
import { fetchBackend } from "../utils/fetchBackend"
import { useMutation } from "@tanstack/react-query"

export const Route = createFileRoute('/MobileAppSignIn')({
  component: MobileAppSignIn,
})

function MobileAppSignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

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
      window.localStorage.setItem(EMAIL_KEY, email)
      navigate({ to: "/MobileApp" })
    }
  })

  useEffect(() => {
    if (window.localStorage.getItem(EMAIL_KEY)) {
      navigate({ to: "/MobileApp" })
    }
  }, [])
  
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