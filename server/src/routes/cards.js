import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { UPLOAD_DIR } from '../paths.js';
import { recordPrice } from '../prices/checker.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

const TEXT_FIELDS = ['player', 'brand', 'set_name', 'card_number', 'parallel', 'serial_number', 'sport', 'grade', 'location', 'notes'];
const INT_FIELDS = ['year', 'quantity'];
const NUM_FIELDS = ['purchase_price', 'alert_threshold_pct'];

const SEARCH_TEXT = `concat_ws(' ', c.player, c.year, c.brand, c.set_name, c.card_number, c.parallel,
  c.serial_number, c.sport, c.grade, c.location, c.notes)`;

const SORTS = {
  newest: 'c.created_at DESC',
  player: 'lower(c.player) ASC, c.year DESC',
  value: 'c.current_price DESC NULLS LAST',
  movers: 'c.current_price / NULLIF(base.price, 0) DESC NULLS LAST',
};

// Multipart form values arrive as strings; convert them to column values.
function parseCard(body) {
  const out = {};
  for (const k of TEXT_FIELDS) if (k in body) out[k] = String(body[k]).trim() || null;
  for (const k of INT_FIELDS) {
    if (k in body) {
      const n = parseInt(body[k], 10);
      out[k] = Number.isFinite(n) ? n : null;
    }
  }
  for (const k of NUM_FIELDS) {
    if (k in body) {
      const n = parseFloat(body[k]);
      out[k] = Number.isFinite(n) ? n : null;
    }
  }
  if ('personal_collection' in body) out.personal_collection = String(body.personal_collection) === 'true';
  if ('quantity' in out && (out.quantity == null || out.quantity < 1)) out.quantity = 1;
  return out;
}

function parsePrice(body) {
  const n = parseFloat(body.current_price);
  return Number.isFinite(n) ? n : null;
}

const withPhotoUrl = (card) => ({ ...card, photo_url: card.photo_path ? `/uploads/${card.photo_path}` : null });

async function removePhoto(filename) {
  if (filename) await fs.rm(path.join(UPLOAD_DIR, filename), { force: true });
}

async function getCard(id) {
  const { rows } = await query('SELECT * FROM cards WHERE id = $1', [id]);
  return rows[0];
}

const router = Router();

router.get('/', async (req, res) => {
  const params = [];
  const where = [];

  // Every word must match somewhere, so "anunoby purple 75" narrows down.
  for (const term of String(req.query.q || '').trim().split(/\s+/).filter(Boolean)) {
    params.push(`%${term}%`);
    where.push(`${SEARCH_TEXT} ILIKE $${params.length}`);
  }
  if (req.query.filter === 'pc') where.push('c.personal_collection');
  if (req.query.filter === 'sale') where.push('NOT c.personal_collection');

  const { rows } = await query(
    `SELECT c.*, base.price AS price_7d_ago
     FROM cards c
     LEFT JOIN LATERAL (
       SELECT price FROM price_history ph
       WHERE ph.card_id = c.id AND ph.recorded_at >= now() - interval '7 days'
       ORDER BY ph.recorded_at ASC LIMIT 1
     ) base ON true
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY ${SORTS[req.query.sort] || SORTS.newest}
     LIMIT 500`,
    params,
  );
  res.json(rows.map(withPhotoUrl));
});

router.get('/stats', async (req, res) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS unique_cards,
            COALESCE(SUM(quantity), 0)::int AS total_cards,
            COALESCE(SUM(quantity * current_price), 0)::float AS total_value,
            COALESCE(SUM(quantity * current_price) FILTER (WHERE NOT personal_collection), 0)::float AS for_sale_value
     FROM cards`,
  );
  res.json(rows[0]);
});

router.get('/:id', async (req, res) => {
  const card = await getCard(req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  const { rows: history } = await query(
    `SELECT price, source, recorded_at FROM price_history
     WHERE card_id = $1 ORDER BY recorded_at DESC LIMIT 90`,
    [card.id],
  );
  res.json({ ...withPhotoUrl(card), history: history.reverse() });
});

router.post('/', upload.single('photo'), async (req, res) => {
  const data = parseCard(req.body);
  if (!data.player) {
    await removePhoto(req.file?.filename);
    return res.status(400).json({ error: 'Player name is required' });
  }
  if (req.file) data.photo_path = req.file.filename;

  const cols = Object.keys(data);
  const { rows } = await query(
    `INSERT INTO cards (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    cols.map((c) => data[c]),
  );
  let card = rows[0];

  const price = parsePrice(req.body);
  if (price != null) {
    await recordPrice(card, price, { source: 'manual', alert: false });
    card = await getCard(card.id);
  }
  res.status(201).json(withPhotoUrl(card));
});

router.put('/:id', upload.single('photo'), async (req, res) => {
  const existing = await getCard(req.params.id);
  if (!existing) {
    await removePhoto(req.file?.filename);
    return res.status(404).json({ error: 'Card not found' });
  }

  const data = parseCard(req.body);
  if ('player' in data && !data.player) return res.status(400).json({ error: 'Player name is required' });
  if (req.file) data.photo_path = req.file.filename;

  const cols = Object.keys(data);
  const { rows } = await query(
    `UPDATE cards SET ${cols.map((c, i) => `${c} = $${i + 2}, `).join('')}updated_at = now()
     WHERE id = $1 RETURNING *`,
    [existing.id, ...cols.map((c) => data[c])],
  );
  let card = rows[0];
  if (req.file) await removePhoto(existing.photo_path);

  const price = parsePrice(req.body);
  if (price != null && price !== existing.current_price) {
    await recordPrice(card, price, { source: 'manual', alert: false });
    card = await getCard(card.id);
  }
  res.json(withPhotoUrl(card));
});

router.delete('/:id', async (req, res) => {
  const { rows } = await query('DELETE FROM cards WHERE id = $1 RETURNING photo_path', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Card not found' });
  await removePhoto(rows[0].photo_path);
  res.status(204).end();
});

export default router;
