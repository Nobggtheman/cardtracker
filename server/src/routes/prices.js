import { Router } from 'express';
import { query } from '../db.js';
import { runPriceCheck } from '../prices/checker.js';

const router = Router();

router.post('/prices/check', async (req, res) => {
  res.json(await runPriceCheck());
});

router.get('/alerts', async (req, res) => {
  const { rows } = await query(
    `SELECT a.*, c.player, c.year, c.brand, c.set_name, c.parallel, c.serial_number, c.location
     FROM alerts a JOIN cards c ON c.id = a.card_id
     ORDER BY a.created_at DESC LIMIT 50`,
  );
  res.json(rows);
});

router.post('/alerts/read', async (req, res) => {
  await query('UPDATE alerts SET read = true WHERE NOT read');
  res.status(204).end();
});

export default router;
