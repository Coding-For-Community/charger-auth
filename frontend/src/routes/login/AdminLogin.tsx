import { Paper, rem, Text, TextInput, Title } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchBackend } from "../../api/fetchBackend";
import { LogInButton } from "../../components/LogInButton";

export const Route = createFileRoute("/login/AdminLogin")({
  component: AdminLogin,
  validateSearch: (search: Record<string, unknown>) => ({
    redirectUrl: (search.redirectUrl as string)?.replace("#", "") ?? "/Admin",
  }),
});

function AdminLogin() {
  const navigate = useNavigate();
  const { redirectUrl } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const loginM = useMutation<boolean, Error, string>({
    mutationFn: async (password) => {
      const res = await fetchBackend("/checkin/login/", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ kind: "admin", password }),
      });
      return (await res.json())["success"];
    },
    onSuccess: (success) => {
      if (success) {
        navigate({ to: redirectUrl });
      } else {
        setError("Invalid password. Please try again.");
      }
    },
    onError: () => {
      setError("An error occurred. Please try again.");
    },
  });

  if (loginM.data) {
    return <div>✅ Logged in successfully</div>;
  }

  return (
    <Paper maw={rem(300)} mt={rem(15)} ml={rem(15)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          loginM.mutate(password);
        }}
      >
        <Title order={4} mb={4}>
          Enter Password
        </Title>
        <TextInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          mb={10}
        />
        {(error || loginM.isError) && (
          <Text c="red" size="sm" mb={3}>
            {error}
          </Text>
        )}
        <LogInButton submitting={loginM.isPending} />
      </form>
    </Paper>
  );
}
