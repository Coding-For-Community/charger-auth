import "@mantine/dates/styles.css";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";

import {
  ActionIcon,
  AppShell,
  Button,
  Checkbox,
  CloseButton,
  Divider,
  Group,
  Loader,
  Paper,
  rem,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  type MantineSize,
} from "@mantine/core";
import { DatePickerInput, DateTimePicker, TimePicker } from "@mantine/dates";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createLazyFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import z from "zod";
import { useCheckedStudents } from "../api/checkedStudents.ts";
import { fetchBackend } from "../api/fetchBackend.ts";
import { useAdminLoginRedirect } from "../api/perms.ts";
import { EvidencePlayer } from "../components/EvidencePlayer.tsx";
import { IconEye, IconEyeOff, IconReload } from "../components/icons.tsx";
import { ManageSeniorPrivileges } from "../components/ManageSeniorPrivileges.tsx";
import { usePartialState } from "../utils/usePartialState.ts";

dayjs.extend(utc);
dayjs.extend(timezone);

export const Route = createLazyFileRoute("/Admin")({
  component: Admin,
});

type Mode = "free_period" | "senior_privileges" | "town_hall"
type Student = z.infer<typeof StudentSchema>
type TownHallMeeting = z.infer<typeof TownHallMeetingSchema>

const StudentSchema = z.object({
  name: z.string(),
  email: z.email(),
  status: z.string(),
  date_str: z.optional(z.string())
});
const TownHallMeetingSchema = z.object({
  start: z.string(), // ISO string
  end: z.string(),   // ISO string
  code: z.string(),
  title: z.string(),
});
const StudentsSchema = StudentSchema.array();
const TownHallMeetingsSchema = TownHallMeetingSchema.array();

const DATE_PROPS = {
  valueFormat: "DD MMM YY hh:mm A",
  styles: {
    input: { width: 94, height: 40, textAlign: "center" as CanvasTextAlign },
  },
  size: "xs" as MantineSize
};
const INITIAL_STATE = {
  mode: "free_period" as Mode,
  spManagerOpened: false,
  vidsOpened: false,
  freePeriod: "A",
  searchQ: "",
  spStartDate: null as string | null,
  spEndDate: null as string | null,
  townHallDate: null as string | null,
  townHallStartTime: "",
  townHallEndTime: "",
  townHallMeetTitle: "",
  showCodes: {} as { [code: string]: boolean }
}; 

function townHallFieldsMissing(state: typeof INITIAL_STATE) {
  return !state.townHallDate 
    || !state.townHallStartTime 
    || !state.townHallEndTime 
    || !state.townHallMeetTitle.trim();
}

function Admin() {
  const loggedIn = useAdminLoginRedirect();
  const [state, updateState] = usePartialState(INITIAL_STATE);
  const { isChecked, setChecked, clearChecked } = useCheckedStudents();
  const studentsQ = useQuery({
    queryKey: ["students", state.mode, state.freePeriod, state.spStartDate, state.spEndDate],
    queryFn: async () => {
      const endpoints: Record<Mode, string> = {
        free_period: `/checkin/students/FP/${state.freePeriod}`,
        senior_privileges: `/checkin/students/SP/?from_date=${state.spStartDate}&to_date=${state.spEndDate}`,
        town_hall: `checkin/students/TH/`
      };
      const res = await fetchBackend(endpoints[state.mode]);
      return StudentsSchema.parseAsync(await res.json());
    },
  });
  const meetingsQ = useQuery({
    queryKey: ["townHallMeetings", state.mode],
    queryFn: async () => {
      if (state.mode !== "town_hall") return [];
      const res = await fetchBackend("/checkin/townHallMeeting/all", { credentials: "include" });
      const data = await res.json();
      return TownHallMeetingsSchema.parse(data);
    },
    enabled: state.mode === "town_hall",
  });
  const addMeetingM = useMutation({
    mutationFn: async () => {
      if (townHallFieldsMissing(state)) {
        window.alert("Invalid State: town hall dates/times or title not specified.")
        return
      }
      const start = dayjs(`${state.townHallDate}T${state.townHallStartTime}`);
      const end = dayjs(`${state.townHallDate}T${state.townHallEndTime}`);
      if (!start.isValid() || !end.isValid()) {
        window.alert("Invalid State: town hall start/end times invalid.")
        return
      }
      const res = await fetchBackend("/checkin/townHallMeeting/create/", {
        credentials: "include",
        method: "POST",
        body: JSON.stringify({ 
          start: start.toISOString(), 
          end: end.toISOString(), 
          title: state.townHallMeetTitle.trim() 
        })
      });
      if (res.status === 200) {
        window.alert("Town Hall meeting successfully created!")
        updateState({ 
          townHallMeetTitle: "",
          townHallDate: null,
          townHallStartTime: "",
          townHallEndTime: ""
        });
        meetingsQ.refetch()
      } else if (res.status === 400) {
        const resp = await res.json();
        window.alert(resp.msg);
      } else {
        window.alert(`Error, status ${res.status}.`)
      }
    }
  })
  const qrRefs = useRef<{ [code: string]: HTMLDivElement | null }>({
  });

  // Helper to print QR code for a meeting
  function handlePrintQR(meeting: TownHallMeeting) {
    const qrDiv = qrRefs.current[meeting.code];
    if (!qrDiv) {
      window.alert("QR code not found.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      window.alert("Could not open print window.");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .qr-title { font-size: 4em; margin-bottom: 16px; }
            .qr-title-small { font-size: 2em; margin-bottom: 16px; }
            .qr-code { margin-bottom: 16px; }
            .qr-meta { font-size: 1.5em; color: #444; }
            @media screen {
              .print-only { display: none; } /* Hidden on screen */
            }
            @media print {
              .print-only { display: block; } /* Visible in print */
            }
          </style>
          <script>
            window.onafterprint = function() { window.close(); };
            window.onbeforeunload = function() { window.close(); };
          </script>
        </head>
        <body>
          <div class="print-only">
            <div class="${meeting.title.length >= 22 ? "qr-title-small" : "qr-title"}">
              ${meeting.title}
            </div>
            <div class="qr-code">${qrDiv.innerHTML}</div>
            <div class="qr-meta"><b>Start:</b> ${dayjs(meeting.start).format("YYYY-MM-DD hh:mm A [EST]")}</div>
            <div class="qr-meta"><b>End:</b> ${dayjs(meeting.end).format("YYYY-MM-DD hh:mm A [EST]")}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // Wait for QR SVG to render, then print
    setTimeout(() => printWindow.print(), 300);
  }

  function searched(student: Student) {
    return (
      state.searchQ === "" ||
      student.name.toLowerCase().includes(state.searchQ.toLowerCase())
    );
  }

  function findStudents(status: string) {
    return (
      studentsQ.data?.filter((s) => s.status === status && searched(s)) ?? []
    );
  }

  const defaultColProps = {
    hasCheckbox: state.mode == "free_period",
    isChecked,
    setChecked,
  };

  const titles: Record<Mode, string> = {
    free_period: `Students with ${state.freePeriod} Block Free`,
    senior_privileges: "Students with Senior Privileges",
    town_hall: "Students Attending Town Hall Today"
  }

  if (loggedIn.isFetching) {
    return (
      <Group justify="center" align="center" style={{ minHeight: "100vh" }}>
        <Loader size="xl" />
        <Title order={3} ml="md">
          Loading admin dashboard...
        </Title>
      </Group>
    );
  }

  let sidebarContent = <></>
  switch (state.mode) {
    case "free_period":
      sidebarContent = (
        <>
          <Select
            data={["A", "B", "C", "D", "E", "F", "G"]}
            value={state.freePeriod}
            onChange={(freePeriod) => {
              if (freePeriod == null) return;
              clearChecked();
              updateState({ freePeriod });
            }}
            maw={rem(200)}
            label="Free Period"
            maxDropdownHeight={300}
          />
          <Stack gap={rem(10)} mt={rem(20)}>
            <Button bg="yellow" onClick={() => updateState({ vidsOpened: true })}>
              Open Tentative Videos
            </Button>
            <Button bg="red" onClick={forceReset}>
              Force Reset
            </Button>
            <Button onClick={clearChecked}>
              Clear Checked Students
            </Button>
          </Stack>
        </>
      );
      break;
    case "senior_privileges":
      sidebarContent = (
        <>
          <Group mb={0}>
            <Text my={0} fz={14} fw={500}>
              Date & Time Search
            </Text>
            <CloseButton
              size="sm"
              my={0}
              ml="auto"
              mr={3}
              onClick={() => updateState({
                spStartDate: null,
                spEndDate: null
              })}
            />
          </Group>
          <Group gap={2} mt={0}>
            <DateTimePicker
              value={state.spStartDate}
              onChange={spStartDate => updateState({ spStartDate })}
              placeholder="Start Date"
              {...DATE_PROPS}
            />
            <Text my={0}>-</Text>
            <DateTimePicker
              value={state.spEndDate}
              onChange={spEndDate => updateState({ spEndDate })}
              placeholder="End Date"
              {...DATE_PROPS}
            />
          </Group>
          <Stack gap={rem(10)} mt={rem(20)}>
            <Button onClick={() => updateState({ spManagerOpened: true })}>
              Manage Senior Privileges
            </Button>
            <Button bg="red" onClick={forceReset}>
              Force Reset
            </Button>
          </Stack>
        </>
      );
      break;
    case "town_hall":
      sidebarContent = (
        <>
          <Title order={4} mb={rem(10)}>Meeting Creation</Title>
          <TextInput
            label="Title"
            value={state.townHallMeetTitle}
            onChange={e => updateState({ townHallMeetTitle: e.currentTarget.value})}
            placeholder="Enter meeting title"
          />
          <DatePickerInput
            value={state.townHallDate ? new Date(state.townHallDate) : null}
            onChange={date => {
              const townHallDate = date ? dayjs(date).format("YYYY-MM-DD") : null
              updateState({ townHallDate })
            }}
            placeholder="Select Date"
            label="Town Hall Date"
            mt={rem(10)}
          />
          <Group gap={rem(18)} mt={rem(10)}>
            <TimePicker
              value={state.townHallStartTime}
              onChange={townHallStartTime => updateState({ townHallStartTime })}
              label="Start Time"
              format="12h"
              {...DATE_PROPS}
            />
            <TimePicker
              value={state.townHallEndTime}
              onChange={townHallEndTime => updateState({ townHallEndTime })}
              label="End Time"
              format="12h"
              {...DATE_PROPS}
            />
          </Group>
          <Button
            my={rem(16)}
            color="blue"
            fullWidth
            disabled={townHallFieldsMissing(state)}
            onClick={() => addMeetingM.mutate()}
          >
            Create Meeting
          </Button>
        </>
      )
      break;
  }

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: "sm",
      }}
      style={{ background: "#f6f8fa" }}
    >
      <AppShell.Header
        p={rem(15)}
        style={{ background: "#fff", borderBottom: "1px solid #e9ecef" }}
      >
        <Group gap={rem(10)}>
          <img
            src="ca-icon.png"
            width={32}
            height={32}
            style={{ borderRadius: 8 }}
          />
          <Title order={3} fw={700} c="blue">
            CA Check-in Admin
          </Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="md"
        style={{ background: "#f8fafc", borderRight: "1px solid #e9ecef" }}
      >
        <Select
          label="Mode"
          data={[
            { label: "Free Period", value: "free_period" },
            { label: "Senior Privileges", value: "senior_privileges" },
            { label: "Town Hall", value: "town_hall" }
          ]}
          value={state.mode}
          onChange={newMode => updateState({ 
            mode: (newMode ?? "free_period") as Mode 
          })}
        />
        <TextInput
          value={state.searchQ}
          onChange={(e) => updateState({ searchQ: e.target.value})}
          placeholder="Search by name"
          maw={rem(200)}
          label="Student Search"
          mt={rem(10)}
        />
        <Divider mt={rem(16)} mb={rem(10)} color="gray.6" />
        {sidebarContent}
      </AppShell.Navbar>

      <AppShell.Main mih="calc(100vh - 20px)">
        {state.mode === "town_hall" ? (
          <Group align="flex-start" grow style={{ height: "calc(100vh - 100px)" }}>
            {/* Left: Student Panels (half width, smaller) */}
            <Stack style={{ width: "50%", minWidth: 0, height: "100%" }} gap={0}>
              <Group justify="space-between">
                <Title order={4}>{titles[state.mode]}</Title>
                <Group gap={rem(4)} m={0}>
                  <ActionIcon
                    variant="outline"
                    color="blue"
                    radius="lg"
                    onClick={() => studentsQ.refetch()}
                    loading={studentsQ.isFetching}
                    size="sm"
                  >
                    <IconReload size="16" />
                  </ActionIcon>
                  <Text size="xs" c="gray.6">
                    Reload
                  </Text>
                </Group>
              </Group>
              <Divider mb={rem(16)} color="gray.6" />
              <Group align="flex-start" grow h="100%">
                <ColumnPanel
                  title={"Checked In"}
                  color="green"
                  students={findStudents("checked_in")}
                  {...defaultColProps}
                />
                <ColumnPanel
                  title={"Absent"}
                  color="red"
                  students={findStudents("nothing")}
                  {...defaultColProps}
                />
              </Group>
            </Stack>
            {/* Right: Town Hall Meeting Management */}
            <Paper style={{ width: "50%", minWidth: 0, height: "100%", display: "flex", flexDirection: "column" }} p="md">
              <Title order={2} mb={rem(12)}>
                Town Hall Meetings
              </Title>
              {meetingsQ.isPending ? (
                <Loader />
              ) : meetingsQ.isError ? (
                <Text c="red">Error loading meetings.</Text>
              ) : meetingsQ.data.length === 0 ? (
                <Text c="gray.6">No meetings found.</Text>
              ) : (
                <Stack gap={rem(10)}>
                  {meetingsQ.data.map((meeting, idx) => (
                    <Stack
                      style={{
                        flex: 1,
                        border: "1px solid var(--mantine-color-gray-6)",
                        borderRadius: 8
                      }}
                      gap={rem(5)}
                      key={meeting.code + idx}
                      p={rem(10)}
                    >
                      <Group>
                        <Title order={4}>{meeting.title}</Title>
                        <Button
                          color="red"
                          size="sm"
                          variant="light"
                          ml="auto"
                          onClick={async () => {
                            const isGood = window.confirm("Are you sure you want to delete this meeting?")
                            if (!isGood) return
                            const resp = await fetchBackend(`/checkin/townHallMeeting/delete/?code=${meeting.code}`, {
                              method: "DELETE",
                              credentials: "include"
                            })
                            if (resp.status === 200) {
                              window.alert("Town Hall Meeting was successfully deleted.")
                              meetingsQ.refetch()
                            } else if (resp.status === 400) {
                              window.alert((await resp.json()).msg)
                            } else {
                              window.alert("Invalid Status: " + resp.status)
                            }
                          }}
                        >
                          Delete
                        </Button>
                        <Button
                          color="gray"
                          c="gray.8"
                          size="sm"
                          variant="outline"
                          ml={rem(8)}
                          onClick={() => handlePrintQR(meeting)}
                        >
                          Print QR Code
                        </Button>
                      </Group>
                      {/* Hidden QR code for printing */}
                      <div
                        ref={el => {
                          qrRefs.current[meeting.code] = el;
                        }}
                        style={{ display: "none" }}
                        aria-hidden="true"
                      >
                        <QRCodeSVG
                          value={`https://coding-for-community.github.io/charger-auth/#/CheckInPage?meetingCode=${meeting.code}`}
                          size={512}
                        />
                      </div>
                      <Text my={0}><b>Start:</b> {dayjs(meeting.start).format("YYYY-MM-DD hh:mm A [EST]")}</Text>
                      <Text my={0}><b>End:</b> {dayjs(meeting.end).format("YYYY-MM-DD hh:mm A [EST]")}</Text>
                      <Group gap={rem(6)}>
                        <Text size="lg" my={0}><b>Code:</b> {state.showCodes[meeting.code] ? meeting.code : "••••••••"}</Text>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() => updateState({
                            showCodes: {
                              ...state.showCodes,
                              [meeting.code]: !state.showCodes[meeting.code]
                            }
                          })}
                          aria-label={state.showCodes[meeting.code] ? "Hide code" : "Show code"}
                        >
                          {state.showCodes[meeting.code] ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </ActionIcon>
                      </Group>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Group>
        ) : (
          <>
            <Group justify="space-between">
              <Title order={4} c="gray.7">{titles[state.mode]}</Title>
              <Group gap={rem(8)} m={0}>
                <ActionIcon
                  variant="outline"
                  color="blue"
                  radius="lg"
                  onClick={() => studentsQ.refetch()}
                  loading={studentsQ.isFetching}
                >
                  <IconReload size="20" />
                </ActionIcon>
                <Text size="sm" c="gray.6">
                  Reload
                </Text>
              </Group>
            </Group>
            <Divider mb={rem(16)} color="gray.6" />
            <Group
              align="flex-start"
              grow
              style={{ height: "calc(100vh - 170px)" }}
            >
              {state.mode === "senior_privileges" && (
                <ColumnPanel
                  title={"Checked Out"}
                  color="red"
                  students={findStudents("checked_out")}
                  {...defaultColProps}
                />
              )}
              <ColumnPanel
                title={"Checked In"}
                color="green"
                students={findStudents("checked_in")}
                {...defaultColProps}
              />
              <ColumnPanel
                title={state.mode === "senior_privileges" ? "Tentative(Out)" : "Tentative"}
                color="yellow"
                students={findStudents(
                  state.mode === "senior_privileges" ? "tentative_out" : "tentative",
                )}
                {...defaultColProps}
              />
              {state.mode === "senior_privileges" ? (
                <ColumnPanel
                  title="Tentative(In)"
                  color="yellow"
                  students={findStudents("tentative_in")}
                  {...defaultColProps}
                />
              ) : (
                <ColumnPanel
                  title="Absent"
                  color="red"
                  students={findStudents("nothing")}
                  {...defaultColProps}
                />
              )}
            </Group>
          </>
        )}
      </AppShell.Main>

      <EvidencePlayer
        opened={state.vidsOpened}
        onClose={() => {
          studentsQ.refetch();
          updateState({ vidsOpened: false })
        }}
        freeBlock={state.freePeriod}
        students={findStudents("tentative")}
      />

      <ManageSeniorPrivileges
        opened={state.spManagerOpened}
        onClose={() => updateState({ spManagerOpened: false })}
      />
    </AppShell>
  );
}

async function forceReset() {
  const confirmation = window.prompt("Type 'YES' if you want to force reset.");
  if (confirmation !== "YES") {
    window.alert("Operation was cancelled.");
    return;
  }
  const res = await fetchBackend("/checkin/forceReset/", {
    credentials: "include",
    method: "POST"
  });
  if (res.ok) {
    window.alert("Reset successful");
  } else {
    window.alert("ERROR: " + res.statusText);
  }
}

function ColumnPanel(props: {
  title: string;
  color: string;
  students: Student[];
  hasCheckbox: boolean;
  isChecked: (name: string) => boolean;
  setChecked: (checked: boolean, name: string) => void;
}) {
  return (
    <Paper
      radius="md"
      p="md"
      style={{
        minWidth: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Title order={5} mb="sm" c={props.color}>
        {props.title}
      </Title>
      <ScrollArea h="100%" style={{ flex: 1 }}>
        {props.students.length === 0 ? (
          <Text c="gray.5" ta="center" mt="md">
            No students
          </Text>
        ) : (
          props.students.map((student: any, idx: number) => (
            <StudentListing
              key={student + idx}
              name={student.name}
              hasCheckbox={props.hasCheckbox}
              checked={props.isChecked(student.name)}
              setChecked={(c) => props.setChecked(c, student.name)}
              dateStr={student.date_str}
            />
          ))
        )}
      </ScrollArea>
    </Paper>
  );
}

function StudentListing(props: {
  name: string;
  hasCheckbox: boolean;
  checked: boolean;
  setChecked: (checked: boolean) => void;
  dateStr?: string;
}) {
  return (
    <Paper
      radius={rem(10)}
      p={rem(10)}
      mb={rem(10)}
      bd="1.5px solid #e3e6ea"
      onClick={() => props.setChecked(!props.checked)}
    >
      <Group justify="space-between" align="center">
        <Stack gap={5}>
          <Title order={5} fw={600}>
            {props.name}
          </Title>
          {props.dateStr && (
            <Text size="sm" c="gray.6" m={0}>
              ({props.dateStr})
            </Text>
          )}
        </Stack>
        {props.hasCheckbox && (
          <Checkbox
            bg="#fafbfe"
            checked={props.checked}
            onChange={(e) => props.setChecked(e.currentTarget.checked)}
            color="blue"
            size="md"
            radius="md"
          />
        )}
      </Group>
    </Paper>
  );
}
