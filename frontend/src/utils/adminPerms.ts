import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fetchBackend } from "./fetchBackend";

export interface AdminPerms {
  isAdmin: boolean
  manualCheckIn?: boolean
}

export async function adminPerms(): Promise<AdminPerms> {
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