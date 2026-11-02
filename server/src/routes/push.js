// /api/push routes: let browsers sign up for push notifications.
import { Router } from 'express';
import { query } from '../db.js';
import { notifyAll, pushEnabled } from '../push.js';

const router = Router();

// GET /api/push/public-key — the VAPID public key a browser needs to subscribe.
router.get('/public-key', (req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: 'Push is not configured. Run "npm run vapid" and add the keys to server/.env' });
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — save a browser's push subscription.
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Invalid subscription' });
  // The endpoint identifies the browser; if it subscribes again, just update its keys.
  await query(
    `INSERT INTO push_subscriptions (endpoint, keys) VALUES ($1, $2)
     ON CONFLICT (endpoint) DO UPDATE SET keys = EXCLUDED.keys`,
    [endpoint, keys],
  );
  res.status(201).json({ ok: true });
});

// POST /api/push/test — send a test notification to every subscribed browser.
router.post('/test', async (req, res) => {
  const sent = await notifyAll({ title: 'CardTracker', body: 'Notifications are working.', url: '/' });
  res.json({ sent });
});

export default router;
