// Server entry point: sets up the Express app, mounts the API routes,
// starts listening and kicks off the scheduled price checks.
import 'dotenv/config'; // Loads server/.env into process.env; must come first.
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { CLIENT_DIST, UPLOAD_DIR } from './paths.js';
import { startPriceScheduler } from './prices/checker.js';
import cardsRouter from './routes/cards.js';
import pricesRouter from './routes/prices.js';
import pushRouter from './routes/push.js';

// Make sure the folder for uploaded card photos exists.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
// Parse JSON request bodies into req.body.
app.use(express.json());
// Serve uploaded photos, e.g. /uploads/1700000000-123.jpg
app.use('/uploads', express.static(UPLOAD_DIR));

// API routes.
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/cards', cardsRouter);
app.use('/api/push', pushRouter);
app.use('/api', pricesRouter); // /api/prices/check and /api/alerts
// Any other /api path is a JSON 404, rather than falling through to the React app below.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// In production, serve the built React app.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // Send index.html for any other GET so client-side URLs load the app.
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(CLIENT_DIST, 'index.html')) : next()));
}

// Error handler. Express 5 forwards errors thrown in async route handlers here.
app.use((err, req, res, next) => {
  // Upload problems, e.g. the photo is over the size limit.
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  // Database unreachable (ECONNREFUSED), wrong password (28P01) or database doesn't exist (3D000).
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
