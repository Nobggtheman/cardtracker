// Server side of push notifications: sends a message to every browser that
// has subscribed (see client/src/push.js).
import webpush from 'web-push';
import { query } from './db.js';

// Push only works once the VAPID keys are in server/.env (generate them with `npm run vapid`).
export const pushEnabled = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (pushEnabled) {
  // The keys prove to browser push services that messages really come from this server.
  // The subject is a contact address the push services can use if something goes wrong.
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// Sends `payload` ({ title, body, url }) to every saved subscription in parallel.
// Returns how many were delivered.
export async function notifyAll(payload) {
  if (!pushEnabled) return 0;
  const { rows } = await query('SELECT id, endpoint, keys FROM push_subscriptions');
  let sent = 0;
  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
        sent++;
      } catch (err) {
        // The browser unsubscribed or the subscription expired.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        } else {
          console.error('Push failed:', err.message);
        }
      }
    }),
  );
  return sent;
}
