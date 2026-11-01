import { Router } from 'express';
import { query } from '../db.js';
import { notifyAll, pushEnabled } from '../push.js';

const router = Router();

router.get('/public-key', (req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: 'Push is not configured. Run "npm run vapid" and add the keys to server/.env' });
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Invalid subscription' });
  await query(
    `INSERT INTO push_subscriptions (endpoint, keys) VALUES ($1, $2)
     ON CONFLICT (endpoint) DO UPDATE SET keys = EXCLUDED.keys`,
    [endpoint, keys],
  );
  res.status(201).json({ ok: true });
});

router.post('/test', async (req, res) => {
  const sent = await notifyAll({ title: 'CardTracker', body: 'Notifications are working.', url: '/' });
  res.json({ sent });
});

export default router;
