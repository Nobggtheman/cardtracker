import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { CLIENT_DIST, UPLOAD_DIR } from './paths.js';
import { startPriceScheduler } from './prices/checker.js';
import cardsRouter from './routes/cards.js';
import pricesRouter from './routes/prices.js';
import pushRouter from './routes/push.js';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/cards', cardsRouter);
app.use('/api/push', pushRouter);
app.use('/api', pricesRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// In production, serve the built React app.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(CLIENT_DIST, 'index.html')) : next()));
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  if (err.code === 'ECONNREFUSED' || err.code === '28P01' || err.code === '3D000') {
    console.error('Database error:', err.code, err.message);
    return res.status(503).json({ error: 'Cannot reach the database. Check DATABASE_URL in server/.env and that PostgreSQL is running.' });
  }
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`CardTracker API listening on http://localhost:${port}`);
  startPriceScheduler();
});
