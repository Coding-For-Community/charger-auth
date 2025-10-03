import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { EMAIL_KEY } from "./constants";
import { fetchBackend } from "./fetchBackend";

export interface AdminPerms {
  isAdmin: boolean
  manualCheckIn?: boolean
}

async function adminPerms(): Promise<AdminPerms> {
  const response = await fetchBackend("/checkin/perms/", { credentials: 'include' });
  if (!response.ok) throw new Error("Network response was not ok");
  const resp = await response.json()
  console.log(resp)
  return resp
}

export function useAdminLoginRedirect() {
  const navigate = useNavigate()
  return useQuery({
    queryKey: ["loggedIn"],
    queryFn: async () => {
      const perms = await adminPerms()
      if (!perms.isAdmin) {
        console.log("attempting navigate")
        navigate({ to: "/AdminLogin" })
      }
      return perms
    },
    retry: false
  })
}

export function useB64EmailRedirect(args?: {
  onEmailResolve: (e: string) => void
}) {
  function resolve() {
    if (!emailB64 || emailB64 === '') {
      navigate({ to: "/LoginPage" })
    } else {
      args?.onEmailResolve(emailB64)
    }
  }

  const emailB64 = btoa(window.localStorage.getItem(EMAIL_KEY) ?? "")
  const navigate = useNavigate()
  useEffect(() => {
    resolve()
    window.addEventListener('hashchange', resolve)
    return () => window.removeEventListener('hashchange', resolve)
  }, [])

  return { 
    emailB64, 
    setEmail(email: string) { window.localStorage.setItem(EMAIL_KEY, email) },
    removeEmail() { window.localStorage.removeItem(EMAIL_KEY) }
  }
}