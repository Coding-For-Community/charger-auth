import { BACKEND_URL } from "./constants.ts"

export function fetchBackend(url: string, init?: RequestInit) {
  return fetch(BACKEND_URL + url, {
    ...(init ?? {}),
    headers: {
      'ngrok-skip-browser-warning': "1",
      "Content-Type": "application/json"
    }
  })
}