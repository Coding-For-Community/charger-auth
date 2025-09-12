import { ActionIcon, AppShell, Button, Group, Modal, rem, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from "react";
import { IconSettings2 } from "../components/icons.tsx";
import { EMAIL_KEY } from "../utils/constants";
import { enablePushNotifs } from "../utils/enablePushNotifs";
import { fetchBackend } from "../utils/fetchBackend";
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsalAuthentication } from "@azure/msal-react";
import { InteractionType } from "@azure/msal-browser";

export const Route = createFileRoute('/MobileAppHome')({
  component: MobileAppHome,
})


function MobileApp() {
  const {login, result, error} = useMsalAuthentication(InteractionType.Popup);
  result?.account?.username
  return (
    <>
      <AuthenticatedTemplate>
        <MobileAppHome />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        
      </UnauthenticatedTemplate>
    </>
  )
}


function RetryScreen() {

}

function MobileAppHome() {
  const navigate = useNavigate()
  const [settingsOpened, setSettingsOpened] = useState(false)
  const [notifsEnabled, setNotifsEnabled] = useState(false)
  const tokenQuery = useQuery({
    queryKey: ["qrCodeToken"],
    queryFn: async () => {
      const res = await fetchBackend("/checkin/token/")
      return (await res.json())
    },
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000
      }
      const time = query.state.data["time_until_refresh"]
      return time * 1000
    },
    refetchOnMount: "always"
  })
  const emailB64 = window.localStorage.getItem(EMAIL_KEY)

  async function updateNotifsEnabled() {
    const res = await fetchBackend("/notifs/enabled/" + emailB64)
    setNotifsEnabled((await res.json())["registered"])
  }

  async function disablePushNotifs() {
    const res = await fetchBackend("/notifs/unregister/", {
      method: "POST",
      body: JSON.stringify({ email: emailB64 })
    })
    if (res.status != 200) {
      console.error("Push notifs WERE NOT DISABLED: " + res.statusText)
    }
  }

  useEffect(() => {
    if (!emailB64 || emailB64 === '') {
      navigate({ to: "/MobileAppSignIn" })
    } else {
      updateNotifsEnabled()
    }
  }, [emailB64])

  if (tokenQuery.isSuccess) {
    return (
      <AppShell>
        <Modal opened={settingsOpened} onClose={() => setSettingsOpened(false)}>
          <Title order={2} mb={rem(10)}>Settings</Title>
          <Stack>
            {
              notifsEnabled 
                ? <Button bg="gray" onClick={disablePushNotifs}>
                    Disable Push Notifs
                  </Button> 
                : <Button onClick={() => enablePushNotifs(parseInt(emailB64!, 10))}>
                    Enable Push Notifs
                  </Button>
            }
            <Button 
              bg="red"
              onClick={() => {
                window.localStorage.removeItem(EMAIL_KEY)
                navigate({ to: "/MobileAppSignIn" })
              }}
            >
              Log Out
            </Button>
          </Stack>
        </Modal>

        <AppShell.Main>
          <Stack style={{
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: "100vh"
          }}>
            <Title order={3} style={{textAlign: "center"}}>Rotate the phone 180 degrees so the scanner can see this QR code: </Title>
            <QRCodeSVG value={emailB64 + ";" + tokenQuery.data["id"]} size={200} />
          </Stack>
        </AppShell.Main>

        <AppShell.Header>
          <Group m={10} justify="space-between">
            <img src="icon.svg" width={25} height={25} />
            <Title order={3}>ChargerAuth</Title>
            <ActionIcon 
              variant="transparent"
              onClick={() => setSettingsOpened(true)}
            >
              <IconSettings2 size={50} />
            </ActionIcon>
          </Group>
        </AppShell.Header>
      </AppShell>
    )
  } else if (tokenQuery.isError) {
    return (
      <div>
        <Text>Error with fetching token: {tokenQuery.error.toString()}</Text>
      </div>
    )
  } else {
    return (
      <div>
        <Text>...</Text>
      </div>
    )
  }
}