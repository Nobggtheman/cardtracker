// Browser side of push notifications: asks for permission, registers the
// service worker (public/sw.js) and sends the subscription to the server.
import { api } from './api.js';

// True when this browser has everything web push needs.
export const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// The server's VAPID public key is URL-safe base64, but pushManager.subscribe()
// wants raw bytes. Restore the padding and standard base64 characters, then decode.
function base64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// Turns on notifications for this browser. Throws with a readable message when
// a step fails (unsupported browser, permission denied, push not set up on the server).
export async function enableNotifications() {
  if (!pushSupported) throw new Error('This browser does not support push notifications');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted');

  const { publicKey } = await api.pushPublicKey();
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // Reuse this browser's existing subscription if it already has one.
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      // Browsers require every push to show a visible notification.
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(publicKey),
    }));

  // Save it on the server so notifyAll() can reach this browser.
  await api.pushSubscribe(subscription.toJSON());
}
