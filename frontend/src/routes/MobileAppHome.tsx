import { ActionIcon, AppShell, Button, Group, Modal, rem, Stack, Switch, Text, Title } from "@mantine/core";
import { useSessionStorage } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from "react";
import { BACKEND_URL, BBID_KEY } from "../utils/constants";
import { IconSettings2 } from "@tabler/icons-react";
import { enablePushNotifs } from "../utils/enablePushNotifs";

export const Route = createFileRoute('/MobileAppHome')({
  component: MobileAppHome,
})

function MobileAppHome() {
  const navigate = useNavigate()
  const [settingsOpened, setSettingsOpened] = useState(false)
  const [notifsEnabled, setNotifsEnabled] = useState(false)
  const tokenQuery = useQuery({
    queryKey: ["qrCodeToken"],
    queryFn: async () => {
      const res = await fetch(BACKEND_URL + "/checkin/token/")
      return (await res.json())
    },
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000
      }
      const time = query.state.data["time_until_refresh"]
      return time * 1000
    }
  })
  const bbid = window.sessionStorage.getItem(BBID_KEY)

  async function updateNotifsEnabled() {
    const res = await fetch(BACKEND_URL + "/notifs/enabled/" + bbid)
    setNotifsEnabled((await res.json())["registered"])
  }

  async function disablePushNotifs() {
    const res = await fetch(BACKEND_URL + "/notifs/unregister/", {
      method: "POST",
      body: JSON.stringify({ user_id: bbid })
    })
    if (res.status != 200) {
      console.error("Push notifs WERE NOT DISABLED: " + res.statusText)
    }
  }

  useEffect(() => {
    if (!bbid || bbid === '') {
      navigate({ to: "/MobileAppSignIn" })
    } else {
      updateNotifsEnabled()
    }
  }, [bbid])

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
                : <Button onClick={() => enablePushNotifs(parseInt(bbid!, 10))}>
                    Enable Push Notifs
                  </Button>
            }
            <Button 
              bg="red"
              onClick={() => {
                window.sessionStorage.removeItem(BBID_KEY)
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
            <QRCodeSVG value={bbid + ";" + tokenQuery.data["id"]} size={200} />
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