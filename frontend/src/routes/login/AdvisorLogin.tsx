import { Button, Group, Loader, PasswordInput, rem, Select, Stack, Text } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import z from "zod";
import { fetchBackend } from "../../api/fetchBackend";
import { LogInButton } from "../../components/LogInButton";

export const Route = createFileRoute("/login/AdvisorLogin")({
  component: AdvisorLogin
});

const AdvisorSchema = z.object({
  name: z.string(),
  email: z.string()
})

const AdvisorsSchema = z.array(AdvisorSchema)

function AdvisorLogin() {
  const navigate = useNavigate();
  const [advisorName, setAdvisorName] = useState<string | null>(null)
  const [password, setPassword] = useState("");
  const advisorsQ = useQuery({
    queryKey: ["advisors"],
    queryFn: async () => {
      const res = await fetchBackend("/checkin/advisors/")
      return AdvisorsSchema.parseAsync(await res.json())
    }
  })
  const loginRunner = useMutation({
    mutationFn: async (e: FormEvent) => {
      e.preventDefault()
      if (advisorName == null) {
        window.alert("Please specify a user.")
        return
      } else if (!advisorsQ.isSuccess) {
        window.alert("Advisors are still being fetched, please wait.")
        return
      }
      const email = advisorsQ.data.find(a => a.name == advisorName)?.email
      if (email == null) {
        window.alert("Invalid Advisor.")
        return
      }
      const res = await fetchBackend("/checkin/login/", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ kind: "advisor", email, password }),
      });
      const success = (await res.json())["success"] as boolean;
      if (success) {
        navigate({ to: "/AdvisorDashboard" })
      } else {
        window.alert("Invalid password. Please try again.");
      }
    },
    onError: () => {
      window.alert("An error occurred. Please try again.");
    },
  });

  if (!advisorsQ.isSuccess) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Loader size="xl" />
      </Stack>
    );
  }

  return (
    <Stack
      p={rem(10)}
      gap={0}
      style={{ justifyContent: "center", minHeight: "100vh" }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: "#111827", // Dark text for high contrast
          textAlign: "center",
          marginBottom: 20
        }}
      >
        Advisor Login
      </Text>
      <Select 
        value={advisorName}
        onChange={setAdvisorName}
        data={advisorsQ.data?.map(data => data.name)}
        placeholder="Search Advisor Name"
        searchable={true}
        size="lg"
        radius={12}
        mb={rem(20)}
      />
      <form onSubmit={loginRunner.mutate}>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          size="lg"
          radius={12}
          mb={rem(20)}
        />
        <Group justify="center" gap="md">
          <LogInButton submitting={loginRunner.isPending} />
          <Button
            variant="outline"
            color="indigo"
            bdrs="md"
            onClick={() => navigate({ to: "/login/Default", search: { redirectUrl: "/" } })}
          >
            Login as Student Instead
          </Button>
          <Button
            variant="outline"
            color="darkblue"
            bdrs="md"
            onClick={() => navigate({ to: "/login/AdvisorSignup" })}
          >
            Sign up as Advisor
          </Button>
        </Group>
      </form>
    </Stack>
  );
}
