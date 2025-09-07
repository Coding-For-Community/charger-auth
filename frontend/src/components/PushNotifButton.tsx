// src/PushNotificationButton.js

import { BACKEND_URL } from "../utils/constants";
import { urlBase64ToUint8Array } from "../utils/urlBase64ToUint8Array";

export function PushNotificationButton () {
  const handleSubscribe = async () => {
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
      console.log("RUNNING!!!")

      // 2. Get the service worker registration
      const registration = await navigator.serviceWorker.ready;

      console.log("RUNNING 2")

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
          user_id: 3310360
        })
      });

      console.log('Successfully subscribed to push notifications.');

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  };

  return (
    <button onClick={handleSubscribe}>
      Enable Push Notifications
    </button>
  );
};

export default PushNotificationButton;