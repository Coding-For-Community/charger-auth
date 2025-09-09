import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export async function tryAdminLogin(password: string, verify: boolean = true): Promise<boolean> {
  const response = await fetch("http://127.0.0.1:8001/oauth/scannerAppLogin/", {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, verify }),
  });
  if (!response.ok) throw new Error("Network response was not ok");
  const resp = await response.json()
  return resp["success"];
}

export function useAdminLoggedInCheck() {
  const navigate = useNavigate()
  return useQuery({
    queryKey: ["loggedIn"],
    queryFn: async () => {
      const isLoggedIn = await tryAdminLogin("", false)
      if (!isLoggedIn) {
        console.log("attempting navigate")
        navigate({ to: "/AdminLogin" })
      }
      return isLoggedIn
    },
    retry: false
  })
}