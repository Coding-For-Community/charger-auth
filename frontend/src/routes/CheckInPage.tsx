import { Loader, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, useEffect, useState } from "react";
import { attemptCheckIn as checkIn, useCheckinTokenQ, useFingerprintQ, type CheckInResult } from '../api/checkIn.ts';
import { useB64EmailRedirect } from "../api/perms.ts";
import { IconAlertTriangle, IconCheck } from "../components/icons.tsx";

export const Route = createFileRoute("/CheckInPage")({
  component: CheckInPage,
  validateSearch: (search: Record<string, unknown>) => ({
    lastToken: (search.lastToken as string)
  }),
})

const SnapEvidence = lazy(() => import(`../components/SnapEvidence.tsx`))

function CheckInPage() {
  const [status, setStatus] = useState<CheckInResult>({ status: "loading" })
  const [triedVideoCheckIn, setTriedVideoCheckIn] = useState(false)
  const { emailB64 } = useB64EmailRedirect()
  const { lastToken } = Route.useSearch()
  const tokenQ = useCheckinTokenQ(lastToken)
  const fingerprintQ = useFingerprintQ()

  useEffect(() => {
    if (
      tokenQ.data && fingerprintQ.data && 
      tokenQ.data != 0 && status.status !== "ok"
    ) {
      checkIn(emailB64, fingerprintQ.data, tokenQ.data["token"]).then(setStatus)
    }
  }, [tokenQ.data, fingerprintQ.data])

  if (tokenQ.data == 0 && !triedVideoCheckIn && status.status !== "ok") {
    return (
      <SnapEvidence
        title=""
        subtitle=""
        onSend={async (file) => {
          console.log("Got here?")
          setStatus({ status: "loading" })
          setTriedVideoCheckIn(true)
          checkIn(emailB64, fingerprintQ.data!, undefined, file).then(setStatus)
        }}
      />
    )
  }

  let content = <></>
  switch (status.status) {
    case "loading":
      content = (
        <>
          <Loader size="xl" mb="md" />
          <Title order={3} ta="center" mb="xs">
            Checking you in...
          </Title>
          <Text ta="center" c="dimmed">
            Please wait while we verify your information and check you in.
          </Text>
        </>
      )
      break
    case "ok":
      content = (
        <>
          <IconCheck size={48} color="green" />
          <Title order={3} ta="center" mt="md" mb="xs">
            Check-in Successful!
          </Title>
          <Text ta="center" c="dimmed" mb="md">
            Welcome{status.studentName ? `, ${status.studentName}` : ""}! You have just checked in for this block.
          </Text>
          <Link to="/HomePage" style={{ textDecoration: "none" }}>
            Return to home page
          </Link>
        </>
      )
      break
    case "err":
      content = (
        <>
          <IconAlertTriangle size={48} color="#fa5252" />
          <Title order={3} ta="center" mt="md" c="#fa5252">
            Check-in Failed
          </Title>
          <Text ta="center" c="dimmed" mb="md" style={{ whiteSpace: "pre-wrap" }}>
            {status.msg?.trim() ?? "An unknown error occurred. Please try again."}
          </Text>
          <Link to="/HomePage">
            Return to home page
          </Link>
        </>
      )
      break
  }

  return (
    <Stack 
      justify="center" 
      align="center"
      mih="100vh"
      gap={0}
      p="md"
    >
      {content}
    </Stack>
  )
}