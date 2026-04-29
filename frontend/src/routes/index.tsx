import {
  ActionIcon,
  AppShell,
  Button,
  Card,
  Group,
  Modal,
  rem,
  Space,
  Stack,
  Title,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";
import z from "zod";
import { useFingerprint } from "../api/checkIn";
import { fetchBackend } from "../api/fetchBackend";
import { useLoginRedirect } from "../api/perms";
import { usePushNotifs } from "../api/pushNotifs";
import { IconSettings2 } from "../components/icons";

export const Route = createFileRoute("/")({
  component: Index,
  validateSearch: (search: Record<string, unknown>) => {
    const msVal = parseInt(search.cooldownStartMs as string);
    return {
      cooldownStartMs: isNaN(msVal) ? null : msVal,
    };
  },
});

const AdvisorRequestSchema = z.object({
  request: z.union([
    z.literal("not_requested"),
    z.literal("pending"),
    z.literal("accepted")
  ]),
  advisor_email: z.optional(z.string()),
  advisor_name: z.optional(z.string())
});

function Index() {
  const { email, removeEmail } = useLoginRedirect();
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [advisorModalOpened, setAdvisorModalOpened] = useState(false);
  const navigate = useNavigate();
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const deviceIdQ = useFingerprint();
  const { cooldownStartMs } = Route.useSearch();
  const [cooldownOn, setCooldownOn] = useState(true);
  const { notifsEnabled, setNotifsEnabled } = 
    usePushNotifs(email, deviceIdQ.data);
    
  const advisorRequest = useQuery({
    queryKey: ["AdvisorRequests"],
    queryFn: async () => {
      const res = await fetchBackend(`/checkin/advisorInvite/?student_email=${email}`)
      const data = await res.json()
      return AdvisorRequestSchema.parse(data)
    }
  })
  const manageAdvisorReq = useMutation({
    mutationFn: async (action: "accept" | "decline") => {
      const url = `/checkin/advisorInvite/${action}/?student_email=${email}`
      const res = await fetchBackend(url, { method: "POST" })
      if (res.status === 200) {
        setAdvisorModalOpened(false)
        window.alert("Advisor Request Successfully " + (action === "accept" ? "Accepted" : "Declined") + ".")
      } else {
        window.alert("Error while processing request: " + res.status)
      }
    }
  })

  useEffect(() => {
    if (!cooldownStartMs) {
      setCooldownOn(false);
      return;
    }
    const elapsedSinceFetch = new Date().getTime() - cooldownStartMs;
    const ms = Math.max(1, 4000 - elapsedSinceFetch);
    const handle = setTimeout(() => setCooldownOn(false), ms);
    return () => clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (vidRef.current == null || cooldownOn) return;
    const scanner = new QrScanner(
      vidRef.current,
      (res) => {
        const url = res.data;
        if (!url.includes("charger-auth")) return;
        navigate({ to: url.substring(url.indexOf("charger-auth/#") + 14) });
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        calculateScanRegion(video) {
          // Expand the scan region to 95% of the video's width and height
          const size = Math.min(video.videoWidth, video.videoHeight);
          const x = (video.videoWidth - size * 0.95) / 2;
          const y = (video.videoHeight - size * 0.95) / 2;
          const width = size * 0.95;
          const height = size * 0.95;
          return { x, y, width, height };
        },
      },
    );
    scanner.start();
    return () => scanner.stop();
  }, [vidRef.current, cooldownOn]);

  // Open modal when a pending advisor request is detected
  useEffect(() => {
    const openModal = advisorRequest.isSuccess 
      && advisorRequest.data.request === "pending" 
      && advisorRequest.data.advisor_name != null
    setAdvisorModalOpened(openModal);
  }, [advisorRequest.isSuccess, advisorRequest.data]);

  function handleLogout() {
    removeEmail();
    navigate({
      to: "/login/Default", 
      search: () => ({ redirectUrl: "/" }),
    });
  }

  return (
    <AppShell>
      <AppShell.Header>
        <Group m={10} justify="space-between">
          <img src="ca-icon.png" width={30} height={30} />
          <Title order={3}>ChargerAuth</Title>
          <ActionIcon
            variant="transparent"
            onClick={() => setSettingsOpened(true)}
          >
            <IconSettings2 size={rem(50)} />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Stack justify="center" align="center">
          <Space h={rem(50)} />
          <Title order={3} style={{ textAlign: "center" }}>
            Use the camera feed to scan a kiosk's QR code.
          </Title>
          <Card
            shadow="md"
            padding={0}
            mb={rem(20)}
            mx={rem(10)}
            bdrs={rem(10)}
            bg="#f8fafc"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <video
              ref={vidRef}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 16,
              }}
              muted
            />
          </Card>
        </Stack>
      </AppShell.Main>

      {/* Advisor Invitation Modal */}
      <Modal
        opened={advisorModalOpened}
        onClose={() => setAdvisorModalOpened(false)}
        centered
        withCloseButton={false}
      >
        <Stack align="center" gap="xs">
          <Title order={4} mb={rem(10)}>
            Advisor Invitation
          </Title>
          <div>
            <b>{advisorRequest.data?.advisor_name}</b> wants to become your advisor.
          </div>
          <Group mt={rem(10)}>
            <Button
              color="green"
              loading={manageAdvisorReq.isPending}
              onClick={() => manageAdvisorReq.mutate("accept")}
            >
              Accept
            </Button>
            <Button
              color="red"
              loading={manageAdvisorReq.isPending}
              onClick={() => manageAdvisorReq.mutate("decline")}
            >
              Decline
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Settings Modal */}
      <Modal opened={settingsOpened} onClose={() => setSettingsOpened(false)}>
        <Title order={2} mb={rem(10)}>
          Settings
        </Title>
        <Stack>
          {notifsEnabled.data ? (
            <Button bg="gray" onClick={() => setNotifsEnabled(false)}>
              Disable Push Notifs
            </Button>
          ) : (
            <Button onClick={() => setNotifsEnabled(true)}>
              Enable Push Notifs
            </Button>
          )}
          <Button bg="red" onClick={handleLogout}>
            Log Out
          </Button>
        </Stack>
      </Modal>
    </AppShell>
  );
}
