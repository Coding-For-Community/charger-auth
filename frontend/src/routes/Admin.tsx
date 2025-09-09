import { ActionIcon, AppShell, Burger, Checkbox, Group, Loader, Paper, rem, Select, Stack, Title } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { IconReload } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { createFileRoute } from '@tanstack/react-router';
import { useAdminLoggedInCheck } from '../utils/tryAdminLogin';

export const Route = createFileRoute('/Admin')({
  component: Admin,
})

function Admin() {
  const [opened, { toggle }] = useDisclosure();
  const [block, setBlock] = useState("A");
  useEffect(() => {
    absentStudentsQ.refetch()
  }, [block])

  const absentStudentsQ = useQuery({
    queryKey: ["absentStudents"],
    queryFn: async () => {
      const res = await fetch(BACKEND_URL + "/checkin/notCheckedInStudents/" + block)
      return (await res.json())["students"] as { id: number, name: string }[]
    }
  })
  const loggedIn = useAdminLoggedInCheck()
  const absentStudents = absentStudentsQ.data ?? []

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
        </Group>
      </AppShell.Header>
    
      <AppShell.Main maw={rem(600)}>
        <Group gap={rem(10)} mb={rem(20)}>
          <Title order={4}>Not checked in students for </Title>
          <Select
            data={["A", "B", "C", "D", "E", "F", "G"]} 
            value={block}
            onChange={block => {
              if (block != null) setBlock(block)
            }}
            size="xs"
            maw={rem(80)}
          />
          {
            absentStudentsQ.isFetching
              ? <Loader size={20} ml="auto" />
              : <ActionIcon 
                  variant="outline" 
                  ml="auto" 
                  color="rgb(0, 0, 0)" 
                  radius="lg"
                  onClick={() => {
                    absentStudentsQ.refetch()
                  }}
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
        
        {/* <h1 className="list-title">Class Roster 🎓</h1>
        <ul className="student-list">
          {students.map((student, index) => (
            <li key={index} className="student-list-item">
              {student}
            </li>
          ))}
        </ul> */}
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