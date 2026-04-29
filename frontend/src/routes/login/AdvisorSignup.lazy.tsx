import { Button, Card, Group, Stack, TextInput, Title, rem } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchBackend } from "../../api/fetchBackend";

export const Route = createLazyFileRoute('/login/AdvisorSignup')({
  component: AdvisorSignup,
});

function AdvisorSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const signupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchBackend("/checkin/registerAdvisor/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Signup failed");
      }
      return res.json();
    },
    onSuccess: () => navigate({ to: "/AdvisorDashboard" }),
  });

  return (
    <Stack align="center" justify="center" mt={rem(60)}>
      <Card shadow="md" padding={rem(32)} w={350}>
        <Title order={3} mb={rem(20)} ta="center">
          Advisor Signup
        </Title>
        <form
          onSubmit={e => {
            e.preventDefault();
            signupMutation.mutate();
          }}
        >
          <Stack>
            <TextInput
              label="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              size="md"
              radius="md"
            />
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              size="md"
              radius="md"
            />
            <TextInput
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              size="md"
              radius="md"
            />
            <Group justify="center" mt={rem(10)}>
              <Button
                type="submit"
                loading={signupMutation.isPending}
                fullWidth
              >
                Sign Up
              </Button>
            </Group>
            <Group justify="center" mt={rem(5)}>
              <Button
                variant="subtle"
                color="blue"
                onClick={() => navigate({ to: "/login/AdvisorLogin" })}
                fullWidth
              >
                Log in instead
              </Button>
            </Group>
            {signupMutation.isError && (
              <div style={{ color: "red", textAlign: "center" }}>
                {signupMutation.error.message}
              </div>
            )}
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
