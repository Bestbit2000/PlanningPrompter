// Entry point when the counter runs as a Neon Function. The database address
// (DATABASE_URL) is supplied by Neon; the other settings are given at deploy time.
// See README.md.

import { Pool } from 'pg';
import { attachDatabasePool } from '@neon/functions';
import { createHandler } from './handler.mjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
attachDatabasePool(pool);

export default {
  fetch: createHandler({ query: (sql, params) => pool.query(sql, params), env: process.env })
};
