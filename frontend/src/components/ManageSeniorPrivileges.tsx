import { Button, Checkbox, Divider, Group, Modal, ScrollArea, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

interface ManageSeniorPrivilegesProps {
  opened: boolean;
  onClose: () => void;
  seniors: string[];
  initiallyEnabled?: string[]; // optional: seniors who already have privileges
}

export function ManageSeniorPrivileges({
  opened,
  onClose,
  seniors,
  initiallyEnabled = [],
}: ManageSeniorPrivilegesProps) {
  const [enabled, setEnabled] = useState<string[]>(initiallyEnabled);

  const allEnabled = enabled.length === seniors.length && seniors.length > 0;

  const toggleAll = (value: boolean) => {
    setEnabled(value ? [...seniors] : []);
  };

  const toggleOne = (name: string, value: boolean) => {
    setEnabled(prev =>
      value ? [...prev, name] : prev.filter(n => n !== name)
    );
  };

  return (
    <Modal opened={opened} onClose={onClose} title={<Title order={3}>Manage Senior Privileges</Title>} size="lg" centered>
      <Stack gap="md">
        <Group justify="space-between">
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
              disabled={!enabled.length}
            >
              Disable All
            </Button>
          </Group>
        </Group>
        <Divider label="Or manage individually" labelPosition="center" />
        <ScrollArea h={300}>
          <Stack gap="xs">
            {seniors.map(name => (
              <Group key={name} justify="space-between">
                <Text>{name}</Text>
                <Checkbox
                  checked={enabled.includes(name)}
                  onChange={e => toggleOne(name, e.currentTarget.checked)}
                  color="blue"
                  label={enabled.includes(name) ? "Enabled" : "Disabled"}
                />
              </Group>
            ))}
            {seniors.length === 0 && (
              <Text c="gray.6" ta="center">No seniors found.</Text>
            )}
          </Stack>
        </ScrollArea>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
          {/* You can add a Save/Apply button here if needed */}
        </Group>
      </Stack>
    </Modal>
  );
}
