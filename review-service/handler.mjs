// The human review service for the Retirement Income Prompt Generator (PO-79, PO-80).
//
// Invited reviewers score a sample of the chatbots' answers and say what is good or
// bad about them. This service holds the review packs, the reviewers' links, and their
// scores and comments. It is private: nothing can be read without a reviewer's own
// link or the admin key.
//
// What it never holds: which chatbot wrote which answer (that list stays in the
// optimiser, on the owner's computer), reviewers' email addresses, and any model key.
// A reviewer's link is kept only as a hash, so the database alone cannot open one.
//
// This file has no dependencies. It is given a "store" (pg-store.mjs for Postgres,
// memory-store.mjs for tests and the optimiser's mock mode) and the settings, so the
// same code runs on Neon (index.mjs) and on any computer with Node (local.mjs).

import { REVIEW_PAGE } from './page.mjs';

const MAX_PACK = 2 * 1024 * 1024;   // bytes in one review pack
const MAX_SAVE = 16 * 1024;         // bytes in one saved score
const MAX_TEXT = 3000;              // characters in one comment
const MAX_REVIEWERS = 100;
const KEY_TRIES_PER_MINUTE = 10;    // wrong admin keys from one address
const LINK_TRIES_PER_MINUTE = 30;   // links that are not in use, from one address
const SAVES_PER_MINUTE = 120;       // from one reviewer
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const HASH = /^[0-9a-f]{64}$/;
// A group scored at or under this needs a comment saying what is wrong.
export const LOW_SCORE = 5;
const NOT_IN_USE = 'This link is not in use.';

export async function hashKey(key) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(key)));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// One saved score, checked against the pack. Returns the clean data or an error message.
export function cleanScore(body, pack) {
  const text = (v) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT) : '');
  const scores = {};
  for (const g of pack.groups || []) {
    const v = body && body.scores ? body.scores[g.id] : undefined;
    if (!Number.isInteger(v) || v < 0 || v > 10) return { error: `Give "${g.title}" a score from 0 to 10.` };
    scores[g.id] = v;
  }
  if (typeof (body && body.dangerous) !== 'boolean') return { error: 'Say whether anything in the answer is dangerous or misleading.' };
  const data = { scores, dangerous: body.dangerous, dangerNote: body.dangerous ? text(body.dangerNote) : '', good: text(body.good), bad: text(body.bad) };
  if (data.dangerous && !data.dangerNote) return { error: 'Say what is dangerous or misleading, and why.' };
  if (Object.values(scores).some((v) => v <= LOW_SCORE) && !data.bad) return { error: `A score of ${LOW_SCORE} or under needs a comment in "What is bad about this answer".` };
  return { data };
}

// A new review, as the optimiser sends it. Returns the clean review or an error message.
export function cleanReview(body) {
  if (!body || !ID.test(body.id || '')) return { error: 'The review needs an id.' };
  const pack = body.pack;
  if (!pack || !Array.isArray(pack.groups) || !pack.groups.length || !pack.items || typeof pack.items !== 'object') return { error: 'The review pack is not complete.' };
  if (pack.groups.some((g) => !g || !ID.test(g.id || '') || typeof g.title !== 'string')) return { error: 'A scoring group is not complete.' };
  const itemIds = Object.keys(pack.items);
  if (!itemIds.length || itemIds.some((id) => !ID.test(id) || typeof pack.items[id].answer !== 'string' || typeof pack.items[id].question !== 'string')) return { error: 'An answer in the pack is not complete.' };
  const list = Array.isArray(body.reviewers) ? body.reviewers : [];
  if (!list.length || list.length > MAX_REVIEWERS) return { error: `A review needs between 1 and ${MAX_REVIEWERS} reviewers.` };
  const reviewers = [];
  for (const r of list) {
    if (!r || !ID.test(r.id || '') || !HASH.test(r.keyHash || '')) return { error: 'A reviewer is not complete.' };
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 80) : '';
    const items = Array.isArray(r.items) ? r.items.map(String) : [];
    if (!name || !items.length || items.some((id) => !pack.items[id]) || new Set(items).size !== items.length) return { error: 'A reviewer\'s list of answers is not right.' };
    reviewers.push({ id: r.id, name, keyHash: r.keyHash, items });
  }
  if (new Set(reviewers.map((r) => r.id)).size !== reviewers.length || new Set(reviewers.map((r) => r.keyHash)).size !== reviewers.length) return { error: 'Two reviewers share an id or a link.' };
  return { review: { id: body.id, pack, reviewers } };
}

export function createHandler({ store, env }) {
  const adminKey = env.REVIEW_ADMIN_KEY || '';

  // How much one address or reviewer has sent in the last minute. Held in memory only.
  const recent = new Map();
  const allow = (bucket, who, limit) => {
    const now = Date.now();
    if (recent.size > 5000) recent.clear();
    const key = bucket + ' ' + who;
    let r = recent.get(key);
    if (!r || now - r.start > 60000) { r = { start: now, n: 0 }; recent.set(key, r); }
    if (r.n + 1 > limit) return false;
    r.n += 1;
    return true;
  };
  const ipOf = (request) => (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const bearer = (request) => (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');

  const json = (status, data) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  const readJson = async (request, max) => {
    const body = await request.text();
    if (body.length > max) return null;
    try { return JSON.parse(body); } catch (e) { return null; }
  };
  const fail = (what, e) => { console.error('Review service could not ' + what + ': ' + (e && e.message)); return json(500, { error: 'Something went wrong. Please try again.' }); };

  const sameKey = (given) => {
    if (!adminKey || given.length !== adminKey.length) return false;
    let diff = 0;
    for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ adminKey.charCodeAt(i);
    return diff === 0;
  };

  // ---- the reviewer's side: everything is found from the key in their link ----
  // A wrong link, one that has been switched off and one for a closed review all get
  // the same reply, so nothing can be learned by trying.
  const reviewerOf = async (request) => {
    const key = bearer(request);
    if (key.length < 20 || key.length > 200) return null;
    const found = await store.findReviewer(await hashKey(key));
    if (!found || !found.reviewer.active || found.review.closedAt) return null;
    return found;
  };
  const notInUse = (request) => (allow('link', ipOf(request), LINK_TRIES_PER_MINUTE) ? json(401, { error: NOT_IN_USE }) : json(429, { error: 'Too many tries. Wait a minute.' }));

  const me = async (request) => {
    const found = await reviewerOf(request);
    if (!found) return notInUse(request);
    const { reviewer, review, scores } = found;
    // Opening the link counts as having started.
    if (!reviewer.startedAt) await store.markStarted(reviewer.id);
    const pack = review.pack;
    const usedStyles = {};
    const items = reviewer.items.map((id) => {
      const it = pack.items[id];
      if (it.styleKey && pack.styles && pack.styles[it.styleKey]) usedStyles[it.styleKey] = pack.styles[it.styleKey];
      return { id, question: it.question, styleKey: it.styleKey || '', answer: it.answer, saved: scores[id] || null };
    });
    return json(200, { name: reviewer.name, finished: !!reviewer.finishedAt, lowScore: LOW_SCORE, groups: pack.groups, styles: usedStyles, items });
  };

  const score = async (request) => {
    const found = await reviewerOf(request);
    if (!found) return notInUse(request);
    if (!allow('save', found.reviewer.id, SAVES_PER_MINUTE)) return json(429, { error: 'Too many saves at once. Wait a minute and try again.' });
    const body = await readJson(request, MAX_SAVE);
    if (!body || !found.reviewer.items.includes(body.itemId)) return json(400, { error: 'That answer is not one of yours to review.' });
    const clean = cleanScore(body, found.review.pack);
    if (clean.error) return json(400, { error: clean.error });
    await store.saveScore(found.reviewer.id, body.itemId, clean.data);
    return json(200, { ok: true, saved: clean.data });
  };

  const finish = async (request) => {
    const found = await reviewerOf(request);
    if (!found) return notInUse(request);
    const left = found.reviewer.items.filter((id) => !found.scores[id]).length;
    if (left) return json(400, { error: `${left} answer${left === 1 ? ' has' : 's have'} not been scored yet.` });
    await store.setFinished(found.reviewer.id, true);
    return json(200, { ok: true });
  };

  // ---- the owner's side: the optimiser, with the admin key ----
  const admin = async (request, url) => {
    if (!adminKey) return json(503, { error: 'The review service has no admin key set.' });
    if (!sameKey(bearer(request))) {
      if (!allow('admin', ipOf(request), KEY_TRIES_PER_MINUTE)) return json(429, { error: 'Too many tries. Wait a minute.' });
      return json(401, { error: 'That key is not right.' });
    }
    const path = url.pathname, method = request.method;
    if (method === 'GET' && path === '/admin/reviews') return json(200, { reviews: await store.listReviews() });
    if (method === 'POST' && path === '/admin/reviews') {
      const body = await readJson(request, MAX_PACK);
      if (!body) return json(400, { error: 'The review pack could not be read, or is too large.' });
      const clean = cleanReview(body);
      if (clean.error) return json(400, { error: clean.error });
      if (!(await store.createReview(clean.review))) return json(409, { error: 'A review with that id already exists.' });
      return json(200, { ok: true, id: clean.review.id });
    }
    let m = path.match(/^\/admin\/reviews\/([A-Za-z0-9_-]{1,80})(\/close|\/delete)?$/);
    if (m && method === 'GET' && !m[2]) {
      const results = await store.getResults(m[1]);
      return results ? json(200, results) : json(404, { error: 'There is no such review.' });
    }
    if (m && method === 'POST' && m[2]) {
      const ok = m[2] === '/close' ? await store.closeReview(m[1]) : await store.deleteReview(m[1]);
      return ok ? json(200, { ok: true }) : json(404, { error: 'There is no such review.' });
    }
    // Switch one reviewer's link off or on, give them a new link, or remove what they saved.
    m = path.match(/^\/admin\/reviewers\/([A-Za-z0-9_-]{1,80})$/);
    if (m && method === 'POST') {
      const body = (await readJson(request, MAX_SAVE)) || {};
      const change = {};
      if (typeof body.active === 'boolean') change.active = body.active;
      if (body.keyHash !== undefined) { if (!HASH.test(body.keyHash)) return json(400, { error: 'That link is not in the right form.' }); change.keyHash = body.keyHash; }
      // Remove everything this reviewer saved, and switch their link off.
      if (body.clear === true) return (await store.clearReviewer(m[1])) ? json(200, { ok: true }) : json(404, { error: 'There is no such reviewer.' });
      if (!Object.keys(change).length) return json(400, { error: 'Nothing to change.' });
      return (await store.updateReviewer(m[1], change)) ? json(200, { ok: true }) : json(404, { error: 'There is no such reviewer.' });
    }
    return json(404, { error: 'Not found' });
  };

  return async function fetch(request) {
    const url = new URL(request.url);
    try {
      await store.init();
      if (url.pathname.startsWith('/admin/')) return await admin(request, url);
      if (request.method === 'GET' && url.pathname === '/api/me') return await me(request);
      if (request.method === 'POST' && url.pathname === '/api/score') return await score(request);
      if (request.method === 'POST' && url.pathname === '/api/finish') return await finish(request);
    } catch (e) { return fail('answer ' + url.pathname, e); }
    // The page holds no answers and no names. It reads the key from the part of the
    // link after "#", which a browser never sends in the address of a request.
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(REVIEW_PAGE, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow',
          'referrer-policy': 'no-referrer',
          'x-content-type-options': 'nosniff',
          'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
        }
      });
    }
    return new Response(null, { status: 404 });
  };
}
