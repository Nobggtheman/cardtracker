// PostgreSQL connection shared by the whole server.
import pg from 'pg';

// Return NUMERIC columns as JS numbers instead of strings.
// (1700 is Postgres's internal type ID for NUMERIC.)
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

// A pool reuses a few open connections instead of connecting for every query.
// DATABASE_URL comes from server/.env.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Runs a parameterized query: values in `params` replace $1, $2, ... in `text`,
// which keeps user input out of the SQL string itself.
export const query = (text, params) => pool.query(text, params);
