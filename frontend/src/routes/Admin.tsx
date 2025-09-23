import { ActionIcon, AppShell, Burger, Checkbox, Divider, Group, Loader, Paper, rem, ScrollArea, Select, TextInput, Title } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { IconReload } from '../components/icons.tsx';
import { useAdminLoginRedirect } from '../utils/adminPerms.ts';
import { fetchBackend } from '../utils/fetchBackend';

export const Route = createFileRoute('/Admin')({
  component: Admin,
})

type CheckInMode = "Not checked in" | "Checked in"

function Admin() {
  const [opened, { toggle }] = useDisclosure();
  const [mode, setMode] = useState<CheckInMode>("Not checked in")
  const [block, setBlock] = useState("A");
  const [searchQ, setSearchQ] = useState("");
  const [absentStudents, setAbsentStudents] = useState([] as string[])
  const studentsM = useMutation({
    mutationFn: async () => {
      let endpoint = "/checkin/"
      endpoint += mode === "Checked in" ? "checkedInStudents/" : "notCheckedInStudents/"
      endpoint += block
      const res = await fetchBackend(endpoint)
      const students = (await res.json())["students"] as string[]
      setAbsentStudents(students)
    }
  })
  const loggedIn = useAdminLoginRedirect()

  function isSearched(student: string) {
    return searchQ === "" || 
      student.toLowerCase().startsWith(searchQ.toLowerCase())
  }

  if (loggedIn.isFetching) {
    return <div>Loading...</div>
  }

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{width: 0, breakpoint: 'sm'}}
    >
      <AppShell.Header p={rem(15)}>
        <Group gap={rem(10)}>
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
          />
          <Title order={3}>CA Free Block Check-in Admin</Title>
        </Group>
      </AppShell.Header>
    
      <AppShell.Main maw={rem(700)}>
        <Group gap={rem(10)} mb={rem(10)}>
          <Select
            data={["Not checked in", "Checked in"]} 
            size="sm"
            maw={rem(150)}
            value={mode}
            styles={{
              root: { fontWeight: "bold" }
            }}
            onChange={(m) => {
              if (m == null) return
              setMode(m as CheckInMode)
              studentsM.mutate()
            }}
          />
          <Title order={4}> students for </Title>
          <Select
            data={["A", "B", "C", "D", "E", "F", "G"]} 
            value={block}
            onChange={block => {
              if (block == null) return
              setBlock(block)
              studentsM.mutate()
            }}
            size="sm"
            maw={rem(80)}
            styles={{
              root: { fontWeight: "bold" }
            }}
          />
          <TextInput 
            ml="auto" 
            value={searchQ} 
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by student name/id" 
            w={rem(200)}
          />
          {
            studentsM.isPending
              ? <Loader size={30} />
              : <ActionIcon 
                  variant="outline" 
                  color="rgb(0, 0, 0)" 
                  radius="lg"
                  onClick={() => studentsM.mutate()}
                >
                  <IconReload size="20" />
                </ActionIcon>
          }
        </Group>
        <Divider mb={rem(10)} />
        <ScrollArea offsetScrollbars="y" h={rem(500)}>
          {
            absentStudents
              .filter(isSearched)
              .map(student => <StudentListing name={student} />)
          }
        </ScrollArea>
      </AppShell.Main>
    </AppShell>
  );
}

function StudentListing({ name }: { name: string }) {
  const [checkedItems, setCheckedItems] = useLocalStorage({
    key: "checkedItems",
    defaultValue: [] as string[]
  })
  const checked = checkedItems.includes(name)
  const setChecked = (checked: boolean) => {
    if (checked) {
      setCheckedItems(i => i.concat(name))
    } else {
      setCheckedItems(i => i.filter(item => item !== name))
    }
  }
  return (
    <Paper 
      shadow="xs" 
      radius={rem(10)} 
      p={rem(10)} 
      bg="rgb(250, 251, 254)"
      key={name}
      mb={rem(10)}
      onClick={() => setChecked(!checked)}
    >
      <Group justify="space-between">
        <Title order={5}>{name}</Title>
        <Checkbox 
          bg="#fafbfe" 
          checked={checked}
          onChange={e => setChecked(e.currentTarget.checked)}
        />
      </Group>
    </Paper>
  )
}