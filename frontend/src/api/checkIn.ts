import FingerprintJs from '@fingerprintjs/fingerprintjs';
import { useQuery } from '@tanstack/react-query';
import { fetchBackend } from "./fetchBackend";

export function useCheckinTokenQ() {
  return useQuery({
    queryKey: ["token"],
    queryFn: async () => {
      const relativePath = window.location.hash
      const lastToken = relativePath.substring(relativePath.indexOf("token=") + 6)
      const res = await fetchBackend("/checkin/token?last_token=" + lastToken)
      console.log("STATUS: " + res.status)
      if (res.status == 403) return 0
      return await res.json()
    },
    refetchInterval: (query) => {
      if (!query.state.data || query.state.data == 0) return false
      return 1000 * query.state.data["time_until_refresh"]
    },
    refetchIntervalInBackground: true
  })
}

export function useFingerprintQ() {
  return useQuery({
    queryKey: ["fingerprint"],
    queryFn: async () => {
      const agent = await FingerprintJs.load()
      const id = await agent.get()
      return id.visitorId
    }
  })
}

export interface CheckInResult {
  status: "ok" | "err" | "loading"
  msg?: string,
  studentName?: string
}

export async function attemptCheckIn(
  email_b64: string,
  checkin_token: string,
  device_id: string,
  vidFile?: File 
): Promise<CheckInResult> {
  // since the name of the variable is used as the dict key, you have to use underscore notation
  const body = JSON.stringify({ email_b64, checkin_token, device_id })
  console.log("BODY: " + body)

  let res: Response | null = null
  if (vidFile) {
    const formData = new FormData()
    formData.append("input_data", body)
    formData.append("raw_video", vidFile)
    res = await fetchBackend("/checkin/runTentative/", {
      method: "POST",
      body: formData
    })
  } else {
    res = await fetchBackend("/checkin/run/", { method: "POST", body })
  }

  switch (res.status) {
    case 200:
      return { status: "ok", studentName: (await res.json())["studentName"] }
    case 400:
      return { status: "err", msg: "Invalid Student ID - maybe close and re-open ChargerAuth?" }
    case 401:
      return { status: "err", msg: "This is not your fault - scanner app not logged in." }
    case 405:
      return { status: "err", msg: "There isn't a free period right now; try signing in later." }
    case 409:
      return { status: "err", msg: "This device has already checked in a user for this free period." }
    default:
      return { status: "err", msg: "Invalid status code: " + res.status }
  }
}