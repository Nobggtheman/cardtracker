import { api } from './api.js';

export const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function base64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function enableNotifications() {
  if (!pushSupported) throw new Error('This browser does not support push notifications');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted');

  const { publicKey } = await api.pushPublicKey();
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(publicKey),
    }));

  await api.pushSubscribe(subscription.toJSON());
}
