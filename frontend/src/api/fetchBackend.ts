import { BACKEND_URL } from "../utils/constants.ts";

export function fetchBackend(url: string, init?: RequestInit) {
  return fetch(BACKEND_URL + url, {
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      "ngrok-skip-browser-warning": "1",
    },
  });
}
