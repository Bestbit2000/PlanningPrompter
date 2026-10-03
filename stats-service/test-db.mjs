// Checks the counter against the real database, run with:  node test-db.mjs
// It needs DATABASE_URL in .env. It counts into a separate table, usage_counts_test,
// so the real totals are not touched.

import fs from 'node:fs';
import { Pool } from 'pg';
import { createHandler } from './handler.mjs';

fs.readFileSync(new URL('./.env', import.meta.url), 'utf8').split(/\r?\n/).forEach((line) => {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
});

let failed = 0;
const check = (name, ok, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) failed++; };

const ORIGIN = 'https://bestbit2000.github.io';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const handler = createHandler({
  query: (sql, params) => pool.query(sql, params),
  env: { ALLOWED_ORIGINS: ORIGIN, STATS_KEY: 'key-for-this-check-only', STATS_TABLE: 'usage_counts_test' }
});

const post = (events, origin = ORIGIN) =>
  handler(new Request('http://counter/', { method: 'POST', headers: { origin, 'x-forwarded-for': '203.0.113.9' }, body: JSON.stringify({ events }) }));
const totals = async () => {
  const res = await handler(new Request('http://counter/totals?from=2000-01-01&to=2100-01-01', { headers: { authorization: 'Bearer key-for-this-check-only' } }));
  const data = await res.json();
  const map = {};
  (data.rows || []).forEach((r) => { map[r.event + ' ' + r.detail] = (map[r.event + ' ' + r.detail] || 0) + r.count; });
  return { status: res.status, rows: data.rows || [], map };
};
const n = (t, key) => t.map[key] || 0;

const before = await totals();
check('totals can be read', before.status === 200, before.rows.length + ' rows in the test table');

await post([
  { event: 'landing_view', detail: '' },
  { event: 'route_chosen', detail: 'personalised' },
  { event: 'question_used', detail: 'foundation_1|personalised' },
  { event: 'question_used', detail: 'foundation_1|personalised' },
  { event: 'question_used', detail: 'foundation_2|list' },
  { event: 'chatbot_launched', detail: 'claude|starter' },
  { event: 'question_used', detail: 'my pension is 200000|list' },
  { event: 'typed_text', detail: 'anything' }
]);
await post([{ event: 'landing_view', detail: '' }]);
await post([{ event: 'prompt_copied', detail: 'list' }], 'https://example.com');

const after = await totals();
check('a new event adds one', n(after, 'route_chosen personalised') - n(before, 'route_chosen personalised') === 1);
check('two messages add to the same row', n(after, 'landing_view ') - n(before, 'landing_view ') === 2);
check('repeats in one message are added up', n(after, 'question_used foundation_1|personalised') - n(before, 'question_used foundation_1|personalised') === 2);
check('labels are stored as sent', n(after, 'question_used foundation_2|list') - n(before, 'question_used foundation_2|list') === 1 && n(after, 'chatbot_launched claude|starter') - n(before, 'chatbot_launched claude|starter') === 1);
check('free text and unknown events are not stored', !after.rows.some((r) => /pension|typed_text|anything/.test(r.event + r.detail)));
check('another website is not counted', n(after, 'prompt_copied list') === n(before, 'prompt_copied list'));

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
check('rows carry today\'s UK date and nothing else', after.rows.some((r) => r.day === today) && after.rows.every((r) => Object.keys(r).sort().join() === 'count,day,detail,event'), today);

const columns = await pool.query(`select column_name from information_schema.columns where table_name = 'usage_counts_test' order by 1`);
check('the table has only day, event, detail and count', columns.rows.map((r) => r.column_name).join() === 'count,day,detail,event');

await pool.end();
console.log(failed ? '\n' + failed + ' check(s) failed' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
