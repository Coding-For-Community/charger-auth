import { Center, Loader, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { fetchBackend } from "../api/fetchBackend";
import { useAdminLoginRedirect } from "../api/perms";

export const Route = createFileRoute("/KioskPage")({
  component: KioskPage
})

const ManualCheckInModal = lazy(() => import("../components/ManualCheckInModal"))
const QRCodeSVG = lazy(
  () => import("qrcode.react").then(module => ({ default: module.QRCodeSVG })
))

function KioskPage() {
  const perms = useAdminLoginRedirect() 
  const tokenQ = useQuery({
    queryKey: ["qrCodeToken"],
    queryFn: async () => {
      const res = await fetchBackend("/checkin/token/", { credentials: "include" })
      return (await res.json())
    },
    refetchInterval: (query) => {
      if (!query.state.data) return 1000
      return 1000 * query.state.data["time_until_refresh"]
    },
    refetchOnMount: "always"
  })
  const freeBlockQ = useQuery({
    queryKey: ["currFreeBlock"],
    queryFn: async () => {
      const res = await fetchBackend("/checkin/freeBlockNow/")
      return (await res.json())["curr_free_block"]
    }
  })

  if (freeBlockQ.isFetching || tokenQ.isLoading) {
    return (
      <Center style={{ minHeight: "100vh" }}>
        <Loader size="xl" />
        <Text ml="md" size="lg">Loading authentication and block info...</Text>
      </Center>
    )
  }

  return (
    <>
      {
        perms.data?.isAdmin &&
        <ManualCheckInModal perms={perms.data} />
      }
      <Stack align="center" justify="center" h="100vh" gap={0}>
        <Text fz={30} fw="bold" mb={8} gradient={{ from: "blue", to: "cyan", deg: 90 }}>
          {freeBlockQ.data
            ? "Scan the QR code to check in!"
            : "You can't check in right now."
          }
        </Text>
        <Text size="lg" c="dimmed" ta="center" mb={20}>
          {
            freeBlockQ.data &&
            `Current Free Period: ${freeBlockQ.data} Block`
          }
        </Text>
        <QRCodeSVG 
          value={
            `https://coding-for-community.github.io/charger-auth/#/CheckInPage?last_token=${tokenQ.data["token"]}`
          } 
          size={350}
        />
      </Stack>
    </>
  )
}