import FingerprintJs from "@fingerprintjs/fingerprintjs";
import { fetchBackend } from "./fetchBackend";
import { useQuery } from "@tanstack/react-query";

export interface CheckInResult {
  status: "ok" | "err" | "loading" | "modeNeeded";
  msg?: string;
  studentName?: string;
}

export type ModeOption = "sp_check_out" | "sp_check_in" | "free_period";

export function useUserToken(kioskToken: string) {
  return useQuery({
    queryKey: ["userToken", kioskToken],
    queryFn: async () => {
      const res = await fetchBackend(
        "/checkin/userToken/?kiosk_token=" + kioskToken,
      );
      if (!res.ok) {
        if (res.status === 403) return 0;
        throw new Error("Network response was not ok");
      }
      return (await res.json())["token"];
    },
    staleTime: Infinity,
  });
}

export function useFingerprint() {
  return useQuery({
    queryKey: ["fingerprint"],
    queryFn: async () => {
      const fp = await FingerprintJs.load();
      const result = await fp.get();
      return result.visitorId;
    },
    staleTime: Infinity,
  });
}

export async function checkIn(
  email: string,
  device_id?: string,
  mode?: ModeOption,
  user_token?: string,
  vidFile?: File,
): Promise<CheckInResult> {
  const body = JSON.stringify({ email, mode, device_id, user_token });
  console.log("BODY: " + body);

  let res: Response | null = null;
  if (vidFile) {
    const formData = new FormData();
    formData.append("input_data", body);
    formData.append("raw_video", vidFile);
    res = await fetchBackend("/checkin/runTentative/", {
      method: "POST",
      body: formData,
    });
  } else {
    res = await fetchBackend("/checkin/run/", { method: "POST", body });
  }

  return parseCheckInRes(res);
}

export async function parseCheckInRes(res: Response): Promise<CheckInResult> {
  switch (res.status) {
    case 200:
      return { status: "ok", studentName: (await res.json())["studentName"] };
    case 400:
      try {
        const data = await res.json()
        console.log("400 DATA: ", data);
        if (data["err_code"] == 2) return { status: "modeNeeded" };
        return { status: "err", msg: data["msg"] };
      } catch {
        return { status: "err", msg: "Unhandled 4xx error." };
      }
    default:
      return { status: "err", msg: "Invalid status code: " + res.status };
  }
}
