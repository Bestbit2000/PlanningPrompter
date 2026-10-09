// Entry point when the review service runs as a Neon Function. The database address
// (DATABASE_URL) is supplied by Neon; the admin key is given at deploy time.
// See README.md.

import { Pool } from 'pg';
import { attachDatabasePool } from '@neon/functions';
import { createHandler } from './handler.mjs';
import { createPgStore } from './pg-store.mjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
attachDatabasePool(pool);

export default {
  fetch: createHandler({ store: createPgStore({ query: (sql, params) => pool.query(sql, params) }), env: process.env })
};
