import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SignInButton } from '../components/SignInButton';
import { Paper, rem, Text, TextInput, Title } from '@mantine/core';
import { tryAdminLogin } from '../utils/tryAdminLogin';

export const Route = createFileRoute('/AdminLogin')({
  component: AdminLogin,
})

function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const loginM = useMutation<boolean, Error, string>({
    mutationFn: (pwd) => tryAdminLogin(pwd),
    onSuccess: (success) => {
      if (success) {
        navigate({ to: "/Admin" })
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
        <Title order={4} mb={4}>Enter Password</Title>
        <TextInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          mb={10}
        />
        {(error || loginM.isError) && (
          <Text c="red" size="sm" mb={3}>{error}</Text>
        )}
        <SignInButton submitting={loginM.isPending} />
      </form>
    </Paper>
  );
}

