// Price check and alert routes, mounted under /api.
import { Router } from 'express';
import { query } from '../db.js';
import { runPriceCheck } from '../prices/checker.js';

const router = Router();

// POST /api/prices/check — run a price check now (the "check prices" button)
// and return its summary. Waits for every card to be checked before responding.
router.post('/prices/check', async (req, res) => {
  res.json(await runPriceCheck());
});

// GET /api/alerts — the 50 most recent price alerts, newest first, with the
// card details needed to display them.
router.get('/alerts', async (req, res) => {
  const { rows } = await query(
    `SELECT a.*, c.player, c.year, c.brand, c.set_name, c.parallel, c.serial_number, c.location
     FROM alerts a JOIN cards c ON c.id = a.card_id
     ORDER BY a.created_at DESC LIMIT 50`,
  );
  res.json(rows);
});

// POST /api/alerts/read — mark every unread alert as read.
router.post('/alerts/read', async (req, res) => {
  await query('UPDATE alerts SET read = true WHERE NOT read');
  res.status(204).end();
});

export default router;
