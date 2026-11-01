import 'dotenv/config';
import fs from 'node:fs/promises';
import { pool } from '../src/db.js';

const sql = await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8');
try {
  await pool.query(sql);
  console.log('Database schema is ready.');
} catch (err) {
  console.error('Failed to initialize database:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
