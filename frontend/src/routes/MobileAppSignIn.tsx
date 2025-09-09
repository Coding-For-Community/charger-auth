import { rem, Stack, Text, TextInput } from "@mantine/core"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState, type FormEvent } from "react"
import { SignInButton } from "../components/SignInButton"
import { BACKEND_URL, BBID_KEY } from "../utils/constants"

export const Route = createFileRoute('/MobileAppSignIn')({
  component: MobileAppSignIn,
})

function MobileAppSignIn() {
  const navigate = useNavigate()
  const [idValue, setIdValue] = useState('')

  const bbid = window.localStorage.getItem(BBID_KEY)
  useEffect(() => {
    console.log()
    if (bbid && bbid !== '') {
      navigate({ to: "/MobileAppHome" })
    }
  }, [bbid])

  async function handleStudentIdLogin(e: FormEvent) {
    e.preventDefault()
    if (idValue.trim() === '') {
      alert('Please enter your Student ID.');
      return;
    }
    const isValidRes = await fetch(BACKEND_URL + "/checkin/studentExists/" + idValue)
    const isValid = (await isValidRes.json())["exists"]
    if (!isValid) {
      window.alert("There is no user with id " + idValue + ".")
      return
    }
    window.localStorage.setItem(BBID_KEY, idValue)
    await navigate({ to: "/MobileAppHome" })
  };
  
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
        Enter your Student ID to sign in
      </Text>
      <form onSubmit={handleStudentIdLogin}>
        <TextInput
          value={idValue}
          onChange={e => setIdValue(e.target.value)}
          placeholder="Student ID"
          size="lg"
          radius={12}
          mb={rem(20)}
        />
        <SignInButton />
      </form>
    </Stack>
  )

}