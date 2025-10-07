import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { EMAIL_KEY } from "../utils/constants";
import { fetchBackend } from "./fetchBackend";

export interface AdminPerms {
  isAdmin: boolean;
  teacherMonitored?: boolean;
}

async function adminPerms(): Promise<AdminPerms> {
  const response = await fetchBackend("/checkin/perms/", {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Network response was not ok");
  const resp = await response.json();
  console.log(resp);
  return resp;
}

export function useAdminLoginRedirect() {
  const navigate = useNavigate();
  return useQuery({
    queryKey: ["loggedIn"],
    queryFn: async () => {
      const perms = await adminPerms();
      if (!perms.isAdmin) {
        console.log("attempting navigate");
        navigate({
          to: "/AdminLogin",
          search: () => ({
            redirectUrl: window.location.hash,
          }),
        });
      }
      return perms;
    },
    retry: false,
  });
}

export function useLoginRedirect() {
  const navigate = useNavigate();
  const email = window.localStorage.getItem(EMAIL_KEY) ?? "";

  useEffect(() => {
    if (!email || email === "") {
      navigate({
        to: "/LoginPage",
        search: () => ({
          redirectUrl: window.location.hash,
        }),
      });
    }
  }, []);

  return {
    email,
    setEmail(email: string) {
      window.localStorage.setItem(EMAIL_KEY, email);
    },
    removeEmail() {
      window.localStorage.removeItem(EMAIL_KEY);
    },
  };
}
