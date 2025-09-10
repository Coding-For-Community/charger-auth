import { ActionIcon, AppShell, Burger, Button, Checkbox, Group, Loader, Paper, rem, Select, Stack, Title } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { IconReload } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAdminLoggedInCheck } from '../utils/tryAdminLogin';
import { fetchBackend } from '../utils/fetchBackend';

export const Route = createFileRoute('/Admin')({
  component: Admin,
})

interface Student {
  id: number
  name: string
}

function Admin() {
  const navigate = useNavigate()
  const [opened, { toggle }] = useDisclosure();
  const [block, setBlock] = useState("A");
  const [absentStudents, setAbsentStudents] = useState([] as Student[])
  const absentStudentsM = useMutation({
    mutationFn: async (block: string) => {
      const res = await fetchBackend("/checkin/notCheckedInStudents/" + block)
      const students = (await res.json())["students"] as Student[]
      setAbsentStudents(students)
    }
  })
  const loggedIn = useAdminLoggedInCheck()

  if (loggedIn.isFetching) {
    return <div>Loading...</div>
  }

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{width: 0, breakpoint: 'sm'}}
    >
      <AppShell.Header>
        <Group mt={rem(15)} mx={rem(15)} gap={rem(10)}>
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
          />
          <Title order={3}>CA Free Block Check-in Admin</Title>
          <Button onClick={() => navigate({ to: "/ScannerApp" })}>
            Go to Scanner App
          </Button>
        </Group>
      </AppShell.Header>
    
      <AppShell.Main maw={rem(600)}>
        <Group gap={rem(10)} mb={rem(20)}>
          <Title order={4}>Not checked in students for </Title>
          <Select
            data={["A", "B", "C", "D", "E", "F", "G"]} 
            value={block}
            onChange={block => {
              if (block != null) {
                setBlock(block)
                absentStudentsM.mutate(block)
              }
            }}
            size="xs"
            maw={rem(80)}
          />
          {
            absentStudentsM.isPending
              ? <Loader size={20} ml="auto" />
              : <ActionIcon 
                  variant="outline" 
                  ml="auto" 
                  color="rgb(0, 0, 0)" 
                  radius="lg"
                  onClick={() => absentStudentsM.mutate(block)}
                >
                  <IconReload size="20" />
                </ActionIcon>
          }
        </Group>
        <Stack gap={rem(10)}>
          {
            absentStudents.map(student => <StudentListing name={student.name} />)
          }
        </Stack>
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
      key={name}
      radius={rem(10)} 
      p={rem(10)} 
      bg="rgb(250, 251, 254)"
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