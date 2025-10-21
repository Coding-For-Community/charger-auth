import { Button, Checkbox, Divider, Group, Loader, Modal, ScrollArea, Stack, Text, TextInput, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchBackend } from "../api/fetchBackend";

interface ManageSeniorPrivilegesProps {
  opened: boolean;
  onClose: () => void;
}

interface Senior {
  name: string;
  email: string;
  has_sp: boolean;
}

export function ManageSeniorPrivileges({
  opened,
  onClose
}: ManageSeniorPrivilegesProps) {
  const { isFetching, isError } = useQuery({
    queryKey: ['seniorsList', opened],
    queryFn: async () => {
      if (!opened) return 0;
      setSeniors([]);
      const res = await fetchBackend('/checkin/allSeniors');
      if (!res.ok) {
        window.alert(`Error fetching seniors list. Error: ${res.statusText}`);
        return -1;
      }
      setSeniors(await res.json());
      return 0;
    }
  })
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [searchQ, setSearchQ] = useState('');

  const allEnabled = seniors.every(s => s.has_sp);
  const allDisabled = seniors.every(s => !s.has_sp);

  const toggleAll = (value: boolean) => {
    for (const s of seniors) {
      s.has_sp = value;
    }
    setSeniors([...seniors]);
    fetchBackend(`/checkin/${value ? 'enable' : 'disable'}Sp/`, {
      method: 'POST',
      credentials: 'include'
    }).catch(err => window.alert(err.message));
  };

  const toggleOne = (senior: Senior, value: boolean) => {
    senior.has_sp = value;
    setSeniors([...seniors]);
    let route = `/checkin/${value ? 'enable' : 'disable'}Sp/`;
    route += "?is_for=" + senior.email
    fetchBackend(route, { method: 'POST', credentials: 'include' })
      .catch(err => window.alert(err.message));
  };
  const searchedSeniors = seniors.filter(s => (
    searchQ === '' || s.name.toLowerCase().includes(searchQ.toLowerCase()) || s.email.toLowerCase().includes(searchQ.toLowerCase())
  ))

  let content = <></>
  if (isFetching || isError) {
    content = (
      <Group align="center" justify="center" style={{ position: 'relative', minHeight: 200 }}>
        <Loader />
        <Text>Loading...</Text>
      </Group>
    )
  } else {
    content = (
      <Stack gap="sm">
        <Group justify="space-between" px="md">
          <Text fw={600}>Enable for all seniors</Text>
          <Group>
            <Button
              color="green"
              variant={allEnabled ? "filled" : "light"}
              onClick={() => toggleAll(true)}
              disabled={allEnabled}
            >
              Enable All
            </Button>
            <Button
              color="red"
              variant={!allEnabled ? "filled" : "light"}
              onClick={() => toggleAll(false)}
              disabled={allDisabled}
            >
              Disable All
            </Button>
          </Group>
        </Group>
        <Divider label="Or manage individually" labelPosition="center" px="md" />
        <ScrollArea h={300} px="md">
          <Stack gap={0}>
            {searchedSeniors.map(senior => (
              <Group key={senior.name} justify="space-between">
                <Text my={10}>{senior.name}</Text>
                <Checkbox
                  disabled={allDisabled}
                  checked={seniors.find(s => s.name === senior.name)?.has_sp || false}
                  onChange={e => toggleOne(senior, e.currentTarget.checked)}
                  color="blue"
                />
              </Group>
            ))}
            {searchedSeniors.length === 0 && (
              <Text c="gray.6" ta="center">No seniors found.</Text>
            )}
          </Stack>
        </ScrollArea>
        <Group justify="space-between" mt="md" px="md">
          <TextInput
            placeholder="Search students by name"
            value={searchQ}
            onChange={(e) => setSearchQ(e.currentTarget.value)}
            w={200}
          />
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    )
  }

  return (
    <Modal.Root 
      opened={opened} 
      onClose={onClose} 
      size="lg" 
      centered
      padding={0}
    >
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header p="md">
          <Title order={3}>Manage Senior Privileges</Title>
          <Modal.CloseButton />
        </Modal.Header>

        <Modal.Body h={480} style={{ overflow: "hidden" }}>
          {content}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
