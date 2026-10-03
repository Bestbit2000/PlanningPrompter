// The usage counter for the Retirement Income Prompt Generator (PO-19).
// See ../docs/STATS-PLAN.md for what is counted and why.
//
// It keeps daily totals only: one row per day, event and label. It stores no visitor
// records, no IP addresses and no cookies, and it writes nothing about a request to
// the log.
//
// This file has no dependencies. It is given a "query" function for a Postgres
// database and the settings, so the same code runs on Neon (index.mjs) and on any
// computer with Node (local.mjs).

import { TOTALS_PAGE } from './totals-page.mjs';

const TYPES = ['starter', 'list', 'personalised'];
const CHATBOTS = ['chatgpt', 'claude', 'copilot', 'gemini', 'perplexity'];
const QUESTION_ID = /^[A-Za-z]{1,30}_\d{1,3}$/;

// The fixed list of what may be stored. Anything else is ignored, so free text can
// never be stored by mistake. Keep in step with stats.js on the site.
const DETAIL_OK = {
  landing_view: (d) => d === '',
  route_chosen: (d) => TYPES.includes(d),
  prompt_ready: (d) => TYPES.includes(d),
  prompt_copied: (d) => TYPES.includes(d),
  question_used: (d) => {
    const [id, type, extra] = d.split('|');
    return extra === undefined && QUESTION_ID.test(id || '') && (type === 'list' || type === 'personalised');
  },
  chatbot_launched: (d) => {
    const [bot, type, extra] = d.split('|');
    return extra === undefined && CHATBOTS.includes(bot) && TYPES.includes(type);
  }
};

const MAX_BODY = 16 * 1024;        // bytes in one message
const MAX_EVENTS = 100;            // events in one message
const EVENTS_PER_MINUTE = 300;     // from one address
const KEY_TRIES_PER_MINUTE = 10;   // wrong totals keys from one address
const MAX_ROWS_PER_DAY = 500;      // new rows in one day, so made-up question ids cannot fill the table
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function validEvents(body) {
  let data;
  try { data = JSON.parse(body); } catch (e) { return []; }
  const list = data && Array.isArray(data.events) ? data.events.slice(0, MAX_EVENTS) : [];
  return list
    .map((e) => ({ event: e && e.event, detail: e && typeof e.detail === 'string' ? e.detail : '' }))
    .filter((e) => typeof e.event === 'string' && Object.hasOwn(DETAIL_OK, e.event) && DETAIL_OK[e.event](e.detail));
}

export function createHandler({ query, env }) {
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  const totalsKey = env.STATS_KEY || '';
  const table = /^[a-z_][a-z0-9_]{0,40}$/.test(env.STATS_TABLE || '') ? env.STATS_TABLE : 'usage_counts';

  let ready = null;
  const ensureTable = () => {
    if (!ready) {
      ready = query(
        `create table if not exists ${table} (
           day date not null,
           event text not null,
           detail text not null default '',
           count bigint not null default 0,
           primary key (day, event, detail)
         )`
      ).catch((e) => { ready = null; throw e; });
    }
    return ready;
  };

  // How much one address has sent in the last minute. Held in memory only, to blunt
  // anyone trying to inflate the numbers. The address is never stored or logged.
  const recent = new Map();
  const allow = (bucket, ip, amount, limit) => {
    const now = Date.now();
    if (recent.size > 5000) recent.clear();
    const key = bucket + ' ' + ip;
    let r = recent.get(key);
    if (!r || now - r.start > 60000) { r = { start: now, n: 0 }; recent.set(key, r); }
    if (r.n + amount > limit) return false;
    r.n += amount;
    return true;
  };
  const ipOf = (request) => (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';

  const count = async (request) => {
    // Always the same empty reply, whether or not anything was counted
    const done = new Response(null, { status: 204 });
    const origin = request.headers.get('origin') || '';
    if (!allowedOrigins.includes(origin)) return done;

    const body = await request.text();
    if (body.length > MAX_BODY) return done;
    const events = validEvents(body);
    if (!events.length || !allow('count', ipOf(request), events.length, EVENTS_PER_MINUTE)) return done;

    const totals = new Map();
    events.forEach((e) => {
      const key = e.event + '\n' + e.detail;
      totals.set(key, (totals.get(key) || 0) + 1);
    });
    const names = [], details = [], counts = [];
    totals.forEach((n, key) => {
      const [event, detail] = key.split('\n');
      names.push(event); details.push(detail); counts.push(n);
    });

    try {
      await ensureTable();
      // The day is the date in the UK. A row is added only if it already exists for
      // today or today is still under its limit of rows.
      await query(
        `insert into ${table} (day, event, detail, count)
         select d.day, t.event, t.detail, t.n
         from (select (now() at time zone 'Europe/London')::date as day) d,
              unnest($1::text[], $2::text[], $3::int[]) as t(event, detail, n)
         where exists (select 1 from ${table} u where u.day = d.day and u.event = t.event and u.detail = t.detail)
            or (select count(*) from ${table} u where u.day = d.day) < $4
         on conflict (day, event, detail) do update set count = ${table}.count + excluded.count`,
        [names, details, counts, MAX_ROWS_PER_DAY]
      );
    } catch (e) {
      console.error('Counter could not write: ' + (e && e.message));
    }
    return done;
  };

  const sameKey = (given) => {
    if (!totalsKey || given.length !== totalsKey.length) return false;
    let diff = 0;
    for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ totalsKey.charCodeAt(i);
    return diff === 0;
  };

  const json = (status, data) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

  const totals = async (request, url) => {
    if (!totalsKey) return json(503, { error: 'The totals page is switched off: no key is set.' });
    const ip = ipOf(request);
    const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!sameKey(given)) {
      if (!allow('key', ip, 1, KEY_TRIES_PER_MINUTE)) return json(429, { error: 'Too many tries. Wait a minute.' });
      return json(401, { error: 'That key is not right.' });
    }
    const from = url.searchParams.get('from') || '', to = url.searchParams.get('to') || '';
    if (!DAY.test(from) || !DAY.test(to)) return json(400, { error: 'Give both dates as YYYY-MM-DD.' });
    try {
      await ensureTable();
      const result = await query(
        `select day::text as day, event, detail, count::int as count from ${table}
         where day between $1::date and $2::date order by day, event, detail`,
        [from, to]
      );
      return json(200, { rows: result.rows });
    } catch (e) {
      console.error('Counter could not read: ' + (e && e.message));
      return json(500, { error: 'The totals could not be read.' });
    }
  };

  return async function fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/') return count(request);
    if (request.method === 'GET' && url.pathname === '/totals') return totals(request, url);
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(TOTALS_PAGE, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex',
          'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'"
        }
      });
    }
    return new Response(null, { status: 404 });
  };
}
