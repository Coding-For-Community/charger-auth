import { useQuery } from "@tanstack/react-query";
import { NOTIFS_ENABLED_KEY } from "../utils/constants";
import { fetchBackend } from "./fetchBackend";

export function usePushNotifs(email: string, deviceId?: string) {
  const notifsEnabled = useQuery({
    queryKey: ["notifsEnabled", deviceId],
    queryFn: async () => {
      const storedVal = window.localStorage.getItem(NOTIFS_ENABLED_KEY)
      if (storedVal) return storedVal === "yes" 
      const res = await fetchBackend("/notifs/enabled/" + deviceId)
      const enabled = (await res.json())["registered"]
      window.localStorage.setItem(NOTIFS_ENABLED_KEY, enabled ? "yes" : "no")
      return enabled
    },
    enabled: deviceId != null
  })

  function setNotifsEnabled(enabled: boolean) {
    if (deviceId == null) {
      window.alert("Device ID loading, please wait.")
      return
    }
    enabled ? enablePushNotifs(email, deviceId) : disablePushNotifs(email)
    window.localStorage.setItem(NOTIFS_ENABLED_KEY, enabled ? "yes" : "no")
    notifsEnabled.refetch()
  }

  return { notifsEnabled, setNotifsEnabled }
}

async function disablePushNotifs(email: string) {
  const res = await fetchBackend("/notifs/unregister/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (res.status != 200) {
    window.alert("Push notifs WERE NOT DISABLED: " + res.statusText);
  }
}

async function enablePushNotifs(email: string, device_id: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    window.alert("Push notifications are not supported.");
    return;
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Permission for notifications was denied.");
      return;
    }

    // 2. Get the service worker registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Get the VAPID public key from the backend
    const response = await fetchBackend("/notifs/publicKey/");
    const json = await response.json();
    const vapidPublicKey = json.publicKey;
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // 4. Subscribe the user
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    // 5. Send the subscription object to the backend
    await fetchBackend("/notifs/register/", {
      method: "POST",
      body: JSON.stringify({ device_id, subscription, email }),
    });

    window.alert("Successfully subscribed to push notifications.");
  } catch (error) {
    window.alert("Failed to subscribe to push notifications:" + error);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
