import { ActionIcon, AppShell, Button, Checkbox, CloseButton, Divider, Group, Loader, Paper, rem, ScrollArea, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { createLazyFileRoute } from '@tanstack/react-router';
import { lazy, useState } from 'react';
import { fetchBackend } from '../api/fetchBackend.ts';
import { useAdminLoginRedirect } from '../api/perms.ts';
import { IconReload, IconSettings2 } from '../components/icons.tsx';

export const Route = createLazyFileRoute('/Admin')({
  component: Admin,
})

const VideoPlayer = lazy(() => import("../components/EvidencePlayer.tsx"))
const SP_MODE = "Senior Privileges"

function Admin() {
  const loggedIn = useAdminLoginRedirect();
  
  const [vidsOpened, setVidsOpened] = useState(false)
  const [navbarCollapsedMobile, setNavbarCollapsedMobile] = useState(true)
  const [mode, setMode] = useState("A");
  const [searchQ, setSearchQ] = useState("");
  const [checkedItems, setCheckedItems] = useState(() => {
    const txt = window.localStorage.getItem("checkedItems");
    return (txt == null ? [] : JSON.parse(txt)) as string[];
  });

  const studentsQ = useQuery({
    queryKey: ["students", mode],
    queryFn: async () => {
      const res = 
        mode === SP_MODE
          ? await fetchBackend("/checkin/spStudents/")
          : await fetchBackend(`/checkin/students/${mode}`);
      return (await res.json()) as any[];
    }
  })
  const seniorYearQ = useQuery({
    queryKey: ["seniorYear"],
    queryFn: async () => await (await fetchBackend("/checkin/seniorYear/")).text(),
    staleTime: Infinity
  })

  function checked(name: string) {
    return checkedItems.includes(name)
  }

  function setChecked(checked: boolean, name: string) {
    setCheckedItems(prevValue => {
      let newItems = prevValue;
      if (checked) {
        if (!newItems.includes(name)) newItems = newItems.concat(name);
      } else {
        newItems = newItems.filter(item => item !== name);
      }
      window.localStorage.setItem("checkedItems", JSON.stringify(newItems));
      return newItems;
    })
  }

  function searched(student: any) {
    return searchQ === "" ||
      student.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      (student.id && student.id.toLowerCase().includes(searchQ.toLowerCase()));
  }

  function findStudents(status: string) {
    return studentsQ.data?.filter(s => s.status === status && searched(s)) ?? []
  }

  const defaultColProps = {
    hasCheckbox: mode !== SP_MODE,
    checked, setChecked
  }

  if (loggedIn.isFetching) {
    return (
      <Group justify="center" align="center" style={{ minHeight: "100vh" }}>
        <Loader size="xl" />
        <Title order={3} ml="md">Loading admin dashboard...</Title>
      </Group>
    );
  }

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: navbarCollapsedMobile } }}
      style={{ background: "#f6f8fa" }}
    >
      <AppShell.Header p={rem(15)} style={{ background: "#fff", borderBottom: "1px solid #e9ecef" }}>
        <Group gap={rem(10)}>
          <img src="icon.svg" width={32} height={32} style={{ borderRadius: 8 }} />
          <Title order={3} fw={700} c="blue">CA Check-in Admin</Title>
          <ActionIcon 
            variant="transparent" 
            ml="auto"
            hiddenFrom="sm"
            onClick={() => setNavbarCollapsedMobile(!navbarCollapsedMobile)}
          >
            <IconSettings2 />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ background: "#f8fafc", borderRight: "1px solid #e9ecef" }}>
        <Group justify="space-between" mb={rem(8)}>
          <Title order={4} c="gray.7">Options</Title>
          <CloseButton hiddenFrom="sm" onClick={() => setNavbarCollapsedMobile(true)} />
        </Group>
        <Divider mb={rem(12)} />
        <Select
          data={["A", "B", "C", "D", "E", "F", "G", SP_MODE]}
          value={mode}
          onChange={block => {
            if (block == null) return;
            setMode(block);
          }}
          maw={rem(200)}
          label="Free Period/SP"
          maxDropdownHeight={300}
        />
        <TextInput
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="Search by name"
          maw={rem(200)}
          label="Student Search"
          mt={rem(16)}
        />
        <Divider mt={rem(16)} />
        <Group gap={rem(8)}>
          <ActionIcon
            variant="outline"
            color="blue"
            radius="lg"
            onClick={() => studentsQ.refetch()}
            loading={studentsQ.isFetching}
          >
            <IconReload size="20" />
          </ActionIcon>
          <Text size="sm" c="gray.6">Reload students</Text>
        </Group>
        <Divider mb={rem(14)} />
        <Stack gap={rem(10)}>
          <Button bg="yellow" onClick={() => setVidsOpened(true)}>
            Open Tentative Videos
          </Button>
          <Button bg="red" onClick={forceReset}>
            Force Reset
          </Button>
        </Stack>
        <Divider my={rem(14)} />
        <Text m={0} c="gray.6">Senior year: {seniorYearQ.data ?? "Fetching..."}</Text>
      </AppShell.Navbar>

      <AppShell.Main maw={rem(1200)} mih="calc(100vh - 20px)">
        <Title order={4} c="gray.7" mb={rem(8)}>Students with {mode} block free</Title>
        <Divider mb={rem(16)} />
        <Group align="flex-start" grow style={{ height: "calc(100vh - 150px)" }}>
          <ColumnPanel
            title={mode === SP_MODE ? "Checked Out" : "Checked In"}
            color="green"
            students={findStudents(mode === SP_MODE ? "checked_out" : "checked_in")}
            {...defaultColProps}
          />
          <ColumnPanel
            title={mode === SP_MODE ? "Tentative(Out)" : "Tentative"}
            color="yellow"
            students={findStudents("tentative")}
            {...defaultColProps}
          />
          {
            mode === SP_MODE  
              ? <ColumnPanel
                  title="Tentative(In)"
                  color="yellow"
                  students={findStudents("tentative_in")}
                  {...defaultColProps}
                />
              : <ColumnPanel
                  title="Absent"
                  color="red"
                  students={findStudents("nothing")}
                  {...defaultColProps}
                />
          }
        </Group>
      </AppShell.Main>

      <VideoPlayer 
        opened={vidsOpened} 
        onClose={() => {
          studentsQ.refetch()
          setVidsOpened(false)
        }}
        freeBlock={mode}
        students={findStudents("tentative")} 
      />
    </AppShell>
  );
}

export async function forceReset() {
  const confirmation = window.prompt("Type 'YES' if you want to force reset.")
  if (confirmation !== "YES") {
    window.alert("Operation was cancelled.")
    return
  }
  const res = await fetchBackend("/checkin/forceReset/", { credentials: 'include' })
  if (res.ok) {
    window.alert("Reset successful")
  } else {
    window.alert("ERROR: " + res.statusText)
  }
}

function ColumnPanel(props: {
  title: string,
  color: string,
  students: any[],
  hasCheckbox: boolean,
  checked: (name: string) => boolean,
  setChecked: (checked: boolean, name: string) => void
}) {
  return (
    <Paper radius="md" p="md" style={{ minWidth: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <Title order={5} mb="sm" c={props.color}>{props.title}</Title>
      <ScrollArea h="100%" style={{ flex: 1 }}>
        {props.students.length === 0 ? (
          <Text c="gray.5" ta="center" mt="md">No students</Text>
        ) : (
          props.students.map((student: any) => (
            <StudentListing
              key={student.name}
              name={student.name}
              hasCheckbox={props.hasCheckbox}
              checked={props.checked(student.name)}
              setChecked={c => props.setChecked(c, student.name)}
            />
          ))
        )}
      </ScrollArea>
    </Paper>
  );
}

function StudentListing(props: {
  name: string,
  hasCheckbox: boolean
  checked: boolean,
  setChecked: (checked: boolean) => void
}) {
  return (
    <Paper
      radius={rem(10)}
      p={rem(14)}
      mb={rem(10)}
      bd="1.5px solid #e3e6ea"
      onClick={() => props.setChecked(!props.checked)}
    >
      <Group justify="space-between" align="center">
        <Title order={5} fw={600}>{props.name}</Title>
        {
          props.hasCheckbox &&
          <Checkbox
            bg="#fafbfe"
            checked={props.checked}
            onChange={e => props.setChecked(e.currentTarget.checked)}
            color="blue"
            size="md"
            radius="md"
          />
        }
      </Group>
    </Paper>
  );
}