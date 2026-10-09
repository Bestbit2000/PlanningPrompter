// Checks for the counter, run with:  node test.mjs
// Uses a stand-in for the database, so it needs no set-up and touches no real counts.

import { createHandler, validEvents } from './handler.mjs';

let failed = 0;
const check = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) failed++; };

// A stand-in database: remembers what the counter asked it to add
const makeDb = () => {
  const table = new Map();
  const query = async (sql, params) => {
    if (/^\s*create table/i.test(sql)) return { rows: [] };
    if (/^\s*insert/i.test(sql)) {
      const [names, details, counts, maxRows] = params;
      names.forEach((event, i) => {
        const key = event + '|' + details[i];
        if (table.has(key) || table.size < maxRows) table.set(key, (table.get(key) || 0) + counts[i]);
      });
      return { rows: [] };
    }
    return { rows: [...table].map(([key, count]) => ({ day: '2026-10-03', event: key.split('|')[0], detail: key.split('|').slice(1).join('|'), count })) };
  };
  return { table, query };
};

const ORIGIN = 'https://bestbit2000.github.io';
const env = { ALLOWED_ORIGINS: ORIGIN + ', http://localhost:5173', STATS_KEY: 'test-key-for-checks' };
const post = (handler, events, headers = {}) =>
  handler(new Request('http://counter/', { method: 'POST', headers: { origin: ORIGIN, 'x-forwarded-for': '203.0.113.9', ...headers }, body: typeof events === 'string' ? events : JSON.stringify({ events }) }));

// --- What is accepted ---
const good = [
  { event: 'landing_view', detail: '' },
  { event: 'route_chosen', detail: 'list' },
  { event: 'prompt_ready', detail: 'personalised' },
  { event: 'prompt_copied', detail: 'starter' },
  { event: 'question_used', detail: 'foundation_1|personalised' },
  { event: 'question_used', detail: 'anythingElse_4|list' },
  { event: 'chatbot_launched', detail: 'chatgpt|starter' },
  // Added by PO-77
  { event: 'route_chosen', detail: 'list|landing' },
  { event: 'route_chosen', detail: 'personalised|switch' },
  { event: 'shortlist_answer', detail: 'stage|soon|list' },
  { event: 'shortlist_answer', detail: 'topic|taking_tax|personalised' },
  { event: 'shortlist_answer', detail: 'style|caseStudy|list' },
  { event: 'wizard_step', detail: '3' },
  { event: 'launch_dialog_opened', detail: 'list' },
  { event: 'help_link', detail: 'moneyhelper' },
  { event: 'field_used', detail: 'health' },
  { event: 'field_used', detail: 'c_runout' },
  { event: 'field_used', detail: 'src_state_amt' }
];
check('every real event is accepted', validEvents(JSON.stringify({ events: good })).length === good.length);

const bad = [
  { event: 'landing_view', detail: 'I am 62 and have a pension of 200000' },
  { event: 'route_chosen', detail: 'luxury' },
  { event: 'question_used', detail: 'foundation_1|starter' },
  { event: 'question_used', detail: 'my health is poor|list' },
  { event: 'question_used', detail: 'foundation_1|list|extra' },
  { event: 'chatbot_launched', detail: 'grok|list' },
  { event: 'typed_text', detail: 'anything' },
  { event: 'route_chosen', detail: 'list|advert' },
  { event: 'shortlist_answer', detail: 'stage|soon' },
  { event: 'shortlist_answer', detail: 'stage|retired|list' },
  { event: 'shortlist_answer', detail: 'topic|my pension is small|list' },
  { event: 'shortlist_answer', detail: 'style|simple|starter' },
  { event: 'wizard_step', detail: '7' },
  { event: 'launch_dialog_opened', detail: '' },
  { event: 'help_link', detail: 'https://example.com' },
  { event: 'field_used', detail: 'Poor / chronic conditions' },
  { event: 'field_used', detail: 'health|Poor' },
  { event: 'field_used', detail: 'src_state_amt_11500' },
  { event: 'constructor', detail: '' },
  { event: 'prompt_copied' },
  { detail: 'list' },
  'text', null, 42
];
check('free text and unknown events are dropped', validEvents(JSON.stringify({ events: bad })).length === 0);
check('a body that is not JSON is dropped', validEvents('age=62&health=poor').length === 0);
check('a body with no event list is dropped', validEvents('{"events":"x"}').length === 0 && validEvents('[]').length === 0);
check('at most 100 events are read from one message', validEvents(JSON.stringify({ events: Array(250).fill(good[1]) })).length === 100);

// --- Counting ---
{
  const db = makeDb();
  const handler = createHandler({ query: db.query, env });
  const res = await post(handler, [...good, good[1], good[1], ...bad]);
  check('reply is empty (204)', res.status === 204 && (await res.text()) === '');
  check('repeats in one message are added up', db.table.get('route_chosen|list') === 3);
  check('only the real events are stored', db.table.size === good.length);
  await post(handler, [good[0]]);
  check('a second message adds to the same row', db.table.get('landing_view|') === 2);
}
{
  const db = makeDb();
  const handler = createHandler({ query: db.query, env });
  await post(handler, good, { origin: 'https://example.com' });
  check('another website is ignored', db.table.size === 0);
  await handler(new Request('http://counter/', { method: 'POST', body: JSON.stringify({ events: good }) }));
  check('a request with no origin is ignored', db.table.size === 0);
  await post(handler, good, { origin: 'http://localhost:5173' });
  check('a second allowed address is counted', db.table.size === good.length);
  await post(handler, JSON.stringify({ events: good, pad: 'x'.repeat(20000) }));
  check('an oversized message is ignored', db.table.get('landing_view|') === 1);
}
{
  const db = makeDb();
  const handler = createHandler({ query: db.query, env });
  for (let i = 0; i < 5; i++) await post(handler, Array(100).fill(good[0]));
  check('one address is limited to 300 events a minute', db.table.get('landing_view|') === 300);
  await post(handler, [good[0]], { 'x-forwarded-for': '198.51.100.7' });
  check('another address is still counted', db.table.get('landing_view|') === 301);
}
{
  const db = makeDb();
  const handler = createHandler({ query: db.query, env });
  for (let i = 0; i < 7; i++) {
    const events = Array.from({ length: 100 }, (_, j) => ({ event: 'question_used', detail: 'fake_' + ((i * 100 + j) % 1000) + '|list' }));
    await post(handler, events, { 'x-forwarded-for': '203.0.113.' + i });
  }
  check('made-up ids cannot add more than 500 rows in a day', db.table.size === 500);
}
{
  let said = '';
  const original = console.error;
  console.error = (m) => { said += m; };
  const handler = createHandler({ query: async () => { throw new Error('database is down'); }, env });
  const res = await post(handler, good);
  console.error = original;
  check('a database fault still gives the empty reply', res.status === 204);
  check('the fault is logged without the visitor address or the message', said.includes('database is down') && !said.includes('203.0.113') && !said.includes('foundation_1'));
}

// --- Totals ---
{
  const db = makeDb();
  const handler = createHandler({ query: db.query, env });
  await post(handler, good);
  const get = (path, key) => handler(new Request('http://counter' + path, { headers: { 'x-forwarded-for': '203.0.113.9', ...(key ? { authorization: 'Bearer ' + key } : {}) } }));
  check('totals need the key', (await get('/totals?from=2026-10-01&to=2026-10-31')).status === 401);
  check('a wrong key is refused', (await get('/totals?from=2026-10-01&to=2026-10-31', 'test-key-for-checkz')).status === 401);
  const ok = await get('/totals?from=2026-10-01&to=2026-10-31', env.STATS_KEY);
  const data = await ok.json();
  check('the right key gives the rows', ok.status === 200 && data.rows.length === good.length);
  check('dates must be dates', (await get('/totals?from=yesterday&to=2026-10-31', env.STATS_KEY)).status === 400);
  for (let i = 0; i < 10; i++) await get('/totals?from=2026-10-01&to=2026-10-31', 'guess' + i);
  check('repeated wrong keys are slowed down', (await get('/totals?from=2026-10-01&to=2026-10-31', 'guess')).status === 429);
  const page = await get('/');
  const html = await page.text();
  check('the totals page is served and holds no figures or key', page.status === 200 && html.includes('Usage totals') && !html.includes(env.STATS_KEY) && !html.includes('foundation_1'));
  check('other addresses give 404', (await get('/admin')).status === 404);

  const off = createHandler({ query: db.query, env: { ALLOWED_ORIGINS: ORIGIN } });
  check('with no key set, totals are switched off', (await off(new Request('http://counter/totals?from=2026-10-01&to=2026-10-31', { headers: { authorization: 'Bearer ' } }))).status === 503);
}

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
