import { BACKEND_URL } from "./constants";

export async function enablePushNotifs(userId: number) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('Push notifications are not supported.');
    return;
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permission for notifications was denied.');
      return;
    }

    // 2. Get the service worker registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Get the VAPID public key from the backend
    const response = await fetch(BACKEND_URL + '/notifs/publicKey/');
    const json = await response.json()
    const vapidPublicKey = json.publicKey;
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // 4. Subscribe the user
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    // 5. Send the subscription object to the backend
    await fetch(BACKEND_URL + '/notifs/register/', {
      method: "POST",
      body: JSON.stringify({
        subscription: subscription,
        user_id: userId
      })
    });

    console.log('Successfully subscribed to push notifications.');

  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
  }
};

function urlBase64ToUint8Array(base64String: string) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
 
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
 
  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}