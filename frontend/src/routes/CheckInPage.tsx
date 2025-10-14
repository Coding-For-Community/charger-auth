import { Loader, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, useEffect, useState } from "react";
import {
  checkIn,
  useFingerprint,
  useUserToken,
  type CheckInResult,
  type ModeOption,
} from "../api/checkIn.ts";
import { useLoginRedirect } from "../api/perms.ts";
import { IconAlertTriangle, IconCheck } from "../components/icons.tsx";

export const Route = createFileRoute("/CheckInPage")({
  component: CheckInPage,
  validateSearch: (search: Record<string, unknown>) => ({
    kioskToken: search.kioskToken as string,
  }),
});

const SnapEvidence = lazy(() => import(`../components/SnapEvidence.tsx`));
const ModeSelect = lazy(() => import(`../components/ModeSelect.tsx`));

function CheckInPage() {
  const [status, setStatus] = useState<CheckInResult>({ status: "loading" });
  const [mode, setMode] = useState<ModeOption | undefined>(undefined);
  const [vid, setVid] = useState<File | undefined>(undefined);
  const { email } = useLoginRedirect();
  const { kioskToken } = Route.useSearch();
  const userTokenQ = useUserToken(kioskToken);
  const fingerprintQ = useFingerprint();

  function handleCheckIn() {
    if (
      status.status === "ok" ||
      !fingerprintQ.isSuccess ||
      !userTokenQ.isSuccess
    ) {
      return;
    }
    if (userTokenQ.data === 0) {
      if (vid == null) return;
      checkIn(email, fingerprintQ.data, mode, undefined, vid).then(setStatus);
    } else {
      checkIn(email, fingerprintQ.data, mode, userTokenQ.data).then(setStatus);
    }
    setStatus({ status: "loading" });
  }

  useEffect(() => {
    handleCheckIn();
    window.addEventListener("hashchange", handleCheckIn);
    return () => window.removeEventListener("hashchange", handleCheckIn);
  }, [fingerprintQ.isSuccess, userTokenQ.isSuccess, vid, mode]);

  if (userTokenQ.data === 0 && !vid) {
    return <SnapEvidence onSend={setVid} />;
  }

  let content = <></>;
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
      );
      break;
    case "ok":
      content = (
        <>
          <IconCheck size={48} color="green" />
          <Title order={3} ta="center" mt="md" mb="xs">
            Check-in Successful!
          </Title>
          <Text ta="center" c="dimmed" mb="md">
            {status.msg} <br />
            {new Date().toLocaleString()} <br />
          </Text>
          <Link to="/" search={{ cooldownStartMs: new Date().getTime() }}>
            Return to home page
          </Link>
        </>
      );
      break;
    case "err":
      content = (
        <>
          <IconAlertTriangle size={48} color="#fa5252" />
          <Title order={3} ta="center" mt="md" c="#fa5252">
            Check-in Failed
          </Title>
          <Text
            ta="center"
            c="dimmed"
            mb="md"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {status.msg?.trim() ??
              "An unknown error occurred. Please try again."}
          </Text>
          <Link to="/" search={{ cooldownStartMs: null }}>
            Return to home page
          </Link>
        </>
      );
      break;
    case "modeNeeded":
      return <ModeSelect onSelect={setMode} />;
  }

  return (
    <Stack justify="center" align="center" mih="100vh" gap={0} p="md">
      {content}
    </Stack>
  );
}
