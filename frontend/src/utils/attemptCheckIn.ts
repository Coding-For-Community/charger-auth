import { load as loadAgent } from '@fingerprintjs/fingerprintjs';
import { fetchBackend } from "../utils/fetchBackend";

export interface CheckInResult {
  status: "ok" | "err" | "loading"
  msg?: string,
  studentName?: string
}

async function getToken(): Promise<string | null> {
  const relativePath = window.location.hash
  const lastToken = relativePath.substring(relativePath.indexOf("token=") + 6)
  const res = await fetchBackend("/checkin/token?last_token=" + lastToken)
  console.log("STATUS: " + res.status)
  if (res.status == 403) return null
  return (await res.json())["token"]
}

async function getFingerprint() {
  const agent = await loadAgent()
  const id = await agent.get()
  return id.visitorId
}

export async function attemptCheckIn(email_b64: string): Promise<CheckInResult> {
  const [checkin_token, device_id] = await Promise.all([
    getToken(), getFingerprint()
  ])
  if (checkin_token == null) {
    return { 
      status: "err", 
      msg: `
      Your check-in token has expired. Either:
      1. Someone else sent you this link/qr code
      2. This webpage took more than 5 secs to load
      (try scanning the qr code again)
      ` 
    }
  }
  const res = await fetchBackend("/checkin/run/", {
    method: "POST",
    body: JSON.stringify({ 
      email_b64, 
      checkin_token: checkin_token, 
      device_id: device_id 
    })
  })
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