import { Button, Center, Loader, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute } from "@tanstack/react-router";
import { lazy, useState } from "react";
import { fetchBackend } from "../api/fetchBackend";
import { useAdminLoginRedirect } from "../api/perms";

export const Route = createLazyFileRoute("/KioskPage")({
  component: KioskPage
})

const ManualCheckInModal = lazy(() => import("../components/ManualCheckInModal"))
const QRCodeSVG = lazy(
  () => import("qrcode.react").then(module => ({ default: module.QRCodeSVG })
))

function KioskPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const perms = useAdminLoginRedirect() 
  const tokenQ = useQuery({
    queryKey: ["qrCodeToken"],
    queryFn: async () => {
      const res = await fetchBackend("/checkin/kioskToken/", { credentials: "include" })
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
        perms.data?.teacherMonitored &&
        <ManualCheckInModal open={modalOpen} setOpen={setModalOpen} />
      }
      <Stack align="center" justify="center" h="100vh" gap={0}>
        <Text fz={30} fw="bold" mb={5}>
          {freeBlockQ.data
            ? "Scan the QR code to check in!"
            : "You can't check in right now."
          }
        </Text>
        <Text size="lg" c="dimmed" ta="center" mt={0} mb={30}>
          {
            freeBlockQ.data &&
            `Current Free Period: ${freeBlockQ.data} Block`
          }
        </Text>
        <QRCodeSVG 
          value={
            `https://coding-for-community.github.io/charger-auth/#/CheckInPage?kioskToken=${tokenQ.data["token"]}`
          } 
          size={550}
        />
        <Button 
          bg="red" 
          size="xl"
          display={perms.data?.teacherMonitored ? "block" : "none"}
          my={30}
          onClick={() => setModalOpen(true)}
        >
          Don't have a phone?
        </Button>
      </Stack>
    </>
  )
}