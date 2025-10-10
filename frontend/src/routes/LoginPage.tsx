import { rem, Stack, Text, TextInput } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { fetchBackend } from "../api/fetchBackend";
import { SignInButton } from "../components/SignInButton";
import { EMAIL_KEY } from "../utils/constants";

export const Route = createFileRoute("/LoginPage")({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirectUrl:
      (search.redirectUrl as string)?.replace("#", "") ?? "/",
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const { redirectUrl } = Route.useSearch();

  const loginRunner = useMutation({
    mutationFn: async (e: FormEvent) => {
      e.preventDefault();
      if (id.trim() === "") {
        alert("Please enter your email or student ID.");
        return;
      }
      const isValidRes = await fetchBackend(`/checkin/studentExists/${id}`);
      if (isValidRes.status === 418) {
        window.alert(
          "Sorry, we've hit a blackbaud API quota. Use your email instead.",
        );
        return;
      }
      const json = await isValidRes.json();
      if (!json["exists"]) {
        window.alert("There is no user with email or student id " + id + ".");
        return;
      }
      window.localStorage.setItem(EMAIL_KEY, json["email"]);
      navigate({ to: redirectUrl });
    },
  });

  useEffect(() => {
    if (window.localStorage.getItem(EMAIL_KEY)) {
      navigate({ to: redirectUrl });
    }
  }, []);

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
          margin: 0,
        }}
      >
        Welcome to ChargerAuth!
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: "#4b5563", // A softer, medium gray
          textAlign: "center",
          marginBottom: rem(20),
        }}
      >
        Enter your email or student id to sign in
      </Text>
      <form onSubmit={loginRunner.mutate}>
        <TextInput
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Email or Student ID"
          size="lg"
          radius={12}
          mb={rem(20)}
        />
        <SignInButton />
      </form>
    </Stack>
  );
}
