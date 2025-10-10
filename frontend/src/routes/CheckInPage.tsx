import { Loader, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, useEffect, useState } from "react";
import {
  checkIn,
  useFingerprint,
  useUserToken,
  type CheckInResult,
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
  const [initialLoad, setInitialLoad] = useState(false);
  const [evidenceTaken, setEvidenceTaken] = useState(false);
  const { email } = useLoginRedirect();
  const { kioskToken } = Route.useSearch();
  const userTokenQ = useUserToken(kioskToken);
  const fingerprintQ = useFingerprint();

  useEffect(() => {
    if (
      !initialLoad &&
      fingerprintQ.data &&
      userTokenQ.data &&
      userTokenQ.data !== 0
    ) {
      setInitialLoad(true);
      checkIn(email, fingerprintQ.data, userTokenQ.data).then(setStatus);
    }
    const promptRerun = () => setInitialLoad(false)
    window.addEventListener("hashchange", promptRerun);
    return () => window.removeEventListener("hashchange", promptRerun);
  }, [fingerprintQ.data, userTokenQ.data, initialLoad]);

  if (userTokenQ.data === 0 && !evidenceTaken) {
    return (
      <SnapEvidence
        onSend={(file) => {
          setEvidenceTaken(true);
          setStatus({ status: "loading" });
          checkIn(email, fingerprintQ.data!, undefined, file).then(setStatus);
        }}
      />
    );
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
            Welcome{status.studentName ? `, ${status.studentName}` : ""}! You
            have just checked in for this block.
          </Text>
          <Link to="/">Return to home page</Link>
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
          <Link to="/">Return to home page</Link>
        </>
      );
      break;
    case "modeNeeded":
      return (
        <ModeSelect
          onSelect={(mode) => {
            setStatus({ status: "loading" });
            checkIn(
              email,
              fingerprintQ.data!,
              userTokenQ.data!,
              undefined,
              mode,
            ).then(setStatus);
          }}
        />
      );
  }

  return (
    <Stack justify="center" align="center" mih="100vh" gap={0} p="md">
      {content}
    </Stack>
  );
}
