import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  rem,
  ScrollArea,
  Select,
  Stack,
  Text,
  Title
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from "react";
import { fetchBackend } from "../api/fetchBackend";
import { IconPlus, IconTrash } from "../components/icons";
import { alertNotif } from "../utils/alertNotif";
import z from "zod";

export const Route = createFileRoute('/AdvisorDashboard')({
  component: AdvisorDashboard,
});

const StudentSchema = z.object({
  name: z.string(),
  email: z.string()
})
const StudentsSchema = z.array(StudentSchema)

const AdviseeSchema = StudentSchema.extend({
  checkedIn: z.boolean(),
  status: z.union([
    z.literal("pending"),
    z.literal("accepted")
  ])
})
const AdviseesSchema = z.array(AdviseeSchema)
type Advisee = z.infer<typeof AdviseeSchema>

function getOutlineColor(advisee: Advisee) {
  if (advisee.checkedIn) return "#38d9a9";
  if (advisee.status === "pending") return "#489fb5";
  return "#fa5252";
}

function getMainColor(advisee: Advisee) {
  if (advisee.checkedIn) return "green";
  if (advisee.status === "pending") return "blue";
  return "red";
}

function AdvisorDashboard() {
  const navigate = useNavigate()
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAdviseeName, setNewAdviseeName] = useState("");

  const adviseesQ = useQuery({
    queryKey: ["advisees"],
    queryFn: async () => {
      const res = await fetchBackend("/checkin/advisees/", { credentials: "include" });
      if (res.status === 200){
        return AdviseesSchema.parseAsync(await res.json())
      } 
      if (res.status === 403) {
        navigate({ to: "/login/AdvisorLogin" })
      } else {
        window.alert(`Unknown error when loading advisees(${res.status})`)
      }
      return []
    },
  })
  const allStudentsQ = useQuery({
    queryKey: ["allStudents"],
    queryFn: async () => {
      const res = await fetchBackend("/checkin/students/");
      return StudentsSchema.parseAsync(await res.json())
    },
    staleTime: Infinity,
    enabled: false
  })
  const removeAdvisee = useMutation({
    mutationFn: async (advisee: Advisee) => {
      if (!window.confirm("Are you sure you want to remove " + advisee.name + "?")) {
        return;
      }
      await fetchBackend(
        `/checkin/removeAdvisee/?student_email=${advisee.email}`,
        { method: "POST", credentials: "include" }
      )
      await adviseesQ.refetch()
    },
    onError: alertNotif("[remove advisee]")
  })
  const inviteNextAdvisee = useMutation({
    mutationFn: async () => {
      if (allStudentsQ.data == null) {
        window.alert("Please wait, data is still being fetched.")
        return
      }
      const student = allStudentsQ.data.find(s => s.name === newAdviseeName)
      if (student == null) {
        window.alert("Could not find student with name " + newAdviseeName)
        return
      }
      const resp = await fetchBackend(
        `/checkin/inviteAdvisee/?student_email=${student.email}`,
        { method: "POST", credentials: "include" }
      )
      if (resp.status === 200) {
        window.alert("Advisee request has been sent!")
        setAddModalOpen(false)
        setNewAdviseeName("")
        await adviseesQ.refetch()
      } else {
        const msg: string = (await resp.json())["msg"]
        throw new Error(msg)
      }
    },
    onError: alertNotif("[invite advisee]")
  })

  if (!adviseesQ.isSuccess) {
    return <Loader />
  }

  let modalContent = <Loader />;
  if (allStudentsQ.isSuccess) {
    modalContent = (
      <Stack>          
        <Select
          label="Advisee Name"
          placeholder="Select or Search Advisee"
          data={allStudentsQ.data?.map(s => s.name) ?? []}
          value={newAdviseeName}
          onChange={name => setNewAdviseeName(name ?? "")}
          searchable
        />
        <Group justify="flex-end">
          <Button 
            onClick={() => inviteNextAdvisee.mutate()} 
            disabled={!newAdviseeName.trim()}
          >
            Invite
          </Button>
        </Group>
      </Stack>
    )
  }

  return (
    <Stack align="center" p={rem(24)} style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 500, marginBottom: rem(8) }}>
        <Title
          order={2}
          c="indigo.7"
          style={{
            textAlign: "center",
            width: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          Advisor Dashboard
        </Title>
        <Button
          variant="outline"
          color="red"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            zIndex: 2,
          }}
          onClick={() => {
            fetchBackend("/checkin/logout/", { method: "POST", credentials: "include" })
              .finally(() => navigate({ to: "/login/AdvisorLogin" }))
          }}
        >
          Log Out
        </Button>
      </div>
      <Text c="gray.7" mb="md">
        Manage your advisees and monitor their check-in status.
      </Text>
      <Divider mb="md" style={{ width: "100%", maxWidth: 500 }} />
      <Group mb="md">
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => {
            setAddModalOpen(true)
            allStudentsQ.refetch()
          }}
          variant="gradient"
          gradient={{ from: "indigo", to: "cyan", deg: 90 }}
        >
          Invite Advisee
        </Button>
      </Group>
      <ScrollArea style={{ width: "100%", maxWidth: 500 }} h={400}>
        <Stack>
          {adviseesQ.data.length === 0 && (
            <Text ta="center" c="gray.5" mt="md">
              No advisees yet. Add one to get started!
            </Text>
          )}
          {adviseesQ.data.map(advisee => (
            <Card
              key={advisee.email}
              shadow="sm"
              radius="md"
              p="md"
              withBorder
              style={{
                background: "#fff",
                borderLeft: `6px solid ${getOutlineColor(advisee)}`,
                transition: "border-color 0.2s",
              }}
            >
              <Group justify="space-between" align="center">
                <div>
                  <Title order={5} fw={600}>{advisee.name}</Title>
                  <Badge
                    color={getMainColor(advisee)}
                    variant="filled"
                    mt={4}
                  >
                    {
                      advisee.status === "pending" 
                        ? "Invitation pending" 
                        : advisee.checkedIn 
                          ? "Checked In" 
                          : "Not Checked In"
                    }
                  </Badge>
                </div>
                <Group>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => removeAdvisee.mutate(advisee)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      </ScrollArea>
      <Modal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Advisee"
        centered
      >
        {modalContent}
      </Modal>
    </Stack>
  );
}
