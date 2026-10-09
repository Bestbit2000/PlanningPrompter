// Checks the review service against the real database, run with:  node test-db.mjs
// It needs DATABASE_URL in .env. It uses tables of its own (review_test_...), which it
// removes when it has finished, so real reviews are not touched.

import fs from 'node:fs';
import { Pool } from 'pg';
import { createPgStore } from './pg-store.mjs';
import { runChecks } from './checks.mjs';

fs.readFileSync(new URL('./.env', import.meta.url), 'utf8').split(/\r?\n/).forEach((line) => {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
});
if (!process.env.DATABASE_URL) { console.error('Set DATABASE_URL in .env first.'); process.exit(1); }

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const store = createPgStore({ query: (sql, params) => pool.query(sql, params), prefix: 'review_test_' });

let failed = 1;
try {
  failed = await runChecks(store, 'db');
  const tables = await pool.query(`select table_name from information_schema.tables where table_name like 'review\\_test\\_%' order by 1`);
  const ok = tables.rows.map((r) => r.table_name).join() === 'review_test_reviewers,review_test_reviews,review_test_scores';
  console.log((ok ? 'ok   ' : 'FAIL ') + 'the checks used only their own three tables');
  if (!ok) failed++;
} finally {
  await store.dropTables();
  await pool.end();
}
console.log(failed ? '\n' + failed + ' check(s) failed' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
