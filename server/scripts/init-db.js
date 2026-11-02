t// One-off script: creates the database tables by running server/schema.sql.
import 'dotenv/config';
import fs from 'node:fs/promises';
import { pool } from '../src/db.js';

// Resolve schema.sql relative to this file, not the current working directory.
const sql = await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8');
try {
  await pool.query(sql);
  console.log('Database schema is ready.');
} catch (err) {
  console.error('Failed to initialize database:', err.message);
  // Report failure without exiting immediately, so the cleanup below still runs.
  process.exitCode = 1;
} finally {
  // Close the connection pool so the script can exit.
  await pool.end();
}
