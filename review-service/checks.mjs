// The checks for the review service, shared by test.mjs (a stand-in store, no set-up)
// and test-db.mjs (the real database, in tables of its own).

import { createHandler, hashKey, cleanScore, LOW_SCORE } from './handler.mjs';
import { REVIEW_PAGE } from './page.mjs';

export async function runChecks(store, label) {
  let failed = 0;
  const check = (name, ok, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) failed++; };

  const ADMIN = 'admin-key-for-these-checks-only-0123456789';
  const handler = createHandler({ store, env: { REVIEW_ADMIN_KEY: ADMIN } });
  let ipCount = 0;
  const call = async (method, path, key, body, ip) => {
    const res = await handler(new Request('http://review' + path, {
      method, headers: { ...(key ? { authorization: 'Bearer ' + key } : {}), 'x-forwarded-for': ip || '203.0.113.' + (ipCount++ % 200) },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
    }));
    let data = null;
    try { data = await res.clone().json(); } catch (e) { /* not JSON */ }
    return { status: res.status, data, res };
  };

  const id = 'check-' + label + '-' + Date.now();
  const keyA = 'reviewer-a-key-' + id + '-abcdefghijklmnop', keyB = 'reviewer-b-key-' + id + '-abcdefghijklmnop';
  const pack = {
    info: { runId: 'run-1', rulesVersion: 2 },
    groups: [
      { id: 'accuracy', title: 'Accuracy', statements: [{ name: 'Factually correct', description: 'No errors.' }] },
      { id: 'actionSafety', title: 'Action and safety', statements: [{ name: 'No personal recommendation', description: 'Does not tell the reader what to do.' }] }
    ],
    styles: { simple: { name: 'Short and simple', reader: 'I want it short.', rules: ['Short sentences.'] }, factual: { name: 'Numbers and facts', reader: 'I want figures.', rules: ['Gives figures.'] } },
    items: {
      i1: { question: 'When can I take my pension?', styleKey: 'simple', answer: '## Answer one\n\nFrom age 55.' },
      i2: { question: 'How is my pension taxed?', styleKey: 'factual', answer: 'Answer two.' },
      i3: { question: 'What is an annuity?', styleKey: 'simple', answer: 'Answer three.' }
    }
  };
  const review = () => ({
    id, pack,
    reviewers: [
      { id: id + '-r1', name: 'Reviewer one', keyHash: null, items: ['i1', 'i2'] },
      { id: id + '-r2', name: 'Reviewer two', keyHash: null, items: ['i3'] }
    ]
  });
  const body = review();
  body.reviewers[0].keyHash = await hashKey(keyA);
  body.reviewers[1].keyHash = await hashKey(keyB);
  const good = { scores: { accuracy: 8, actionSafety: 9 }, dangerous: false, good: 'Clear.', bad: '' };

  // --- The page ---
  const page = await call('GET', '/');
  check('the page is served, and tells search engines to stay away', page.status === 200 && /noindex/.test(page.res.headers.get('x-robots-tag') || ''));
  check('the page loads nothing from anywhere else', !/(src|href)\s*=\s*["']https?:/i.test(REVIEW_PAGE) && /default-src 'none'/.test(page.res.headers.get('content-security-policy') || ''));
  check('the page holds no answers, names or keys', !REVIEW_PAGE.includes('Reviewer one') && !REVIEW_PAGE.includes(ADMIN));
  check('anything else is not found', (await call('GET', '/reviews')).status === 404 && (await call('GET', '/admin')).status === 404);

  // --- The admin key ---
  check('no admin key, no list', (await call('GET', '/admin/reviews')).status === 401);
  check('a wrong admin key is refused', (await call('GET', '/admin/reviews', 'not-the-key')).status === 401);
  check('a reviewer\'s key is not an admin key', (await call('GET', '/admin/reviews', keyA)).status === 401);
  let tries = 0, limited = false;
  for (; tries < 15; tries++) if ((await call('GET', '/admin/reviews', 'guess-' + tries, undefined, '198.51.100.7')).status === 429) { limited = true; break; }
  check('guessing the admin key is slowed down', limited, 'after ' + tries + ' tries');
  const off = createHandler({ store, env: {} });
  check('with no admin key set, the admin side is switched off', (await off(new Request('http://review/admin/reviews', { headers: { authorization: 'Bearer ' } }))).status === 503);

  // --- Creating a review ---
  check('a review with a missing answer is refused', (await call('POST', '/admin/reviews', ADMIN, { ...body, reviewers: [{ ...body.reviewers[0], items: ['i1', 'nope'] }] })).status === 400);
  check('a review holding a key instead of its hash is refused', (await call('POST', '/admin/reviews', ADMIN, { ...body, reviewers: [{ ...body.reviewers[0], keyHash: keyA }] })).status === 400);
  check('a review that is not JSON is refused', (await call('POST', '/admin/reviews', ADMIN, 'not json')).status === 400);
  const made = await call('POST', '/admin/reviews', ADMIN, body);
  check('a review is created', made.status === 200 && made.data.id === id);
  check('the same review cannot be created twice', (await call('POST', '/admin/reviews', ADMIN, body)).status === 409);

  // --- A reviewer's link ---
  check('no key: not in use', (await call('GET', '/api/me')).status === 401);
  check('a made-up key: not in use', (await call('GET', '/api/me', 'made-up-key-0123456789-abcdefghij')).status === 401);
  check('the admin key does not open a reviewer\'s page', (await call('GET', '/api/me', ADMIN)).status === 401);
  const meA = await call('GET', '/api/me', keyA);
  check('a reviewer gets their own answers, in order', meA.status === 200 && meA.data.name === 'Reviewer one' && meA.data.items.map((i) => i.id).join() === 'i1,i2');
  check('and nobody else\'s', !JSON.stringify(meA.data).includes('Answer three') && !JSON.stringify(meA.data).includes('Reviewer two'));
  check('they get the scoring groups and only the styles they need', meA.data.groups.length === 2 && Object.keys(meA.data.styles).sort().join() === 'factual,simple' && meA.data.lowScore === LOW_SCORE);
  const meB = await call('GET', '/api/me', keyB);
  check('the second reviewer gets only theirs', meB.status === 200 && meB.data.items.map((i) => i.id).join() === 'i3' && Object.keys(meB.data.styles).join() === 'simple');
  check('nothing in a reply names a chatbot or the run', !/run-1|openai|gemini|anthropic|perplexity/i.test(JSON.stringify(meA.data)));

  // --- Saving scores ---
  check('a score for someone else\'s answer is refused', (await call('POST', '/api/score', keyA, { itemId: 'i3', ...good })).status === 400);
  check('a missing group score is refused', (await call('POST', '/api/score', keyA, { itemId: 'i1', ...good, scores: { accuracy: 8 } })).status === 400);
  check('a score out of range is refused', (await call('POST', '/api/score', keyA, { itemId: 'i1', ...good, scores: { accuracy: 11, actionSafety: 9 } })).status === 400);
  check('a score that is not a whole number is refused', (await call('POST', '/api/score', keyA, { itemId: 'i1', ...good, scores: { accuracy: 7.5, actionSafety: 9 } })).status === 400);
  check('"dangerous" must be answered', (await call('POST', '/api/score', keyA, { itemId: 'i1', scores: good.scores, good: 'x' })).status === 400);
  check('"dangerous: yes" needs a comment', (await call('POST', '/api/score', keyA, { itemId: 'i1', ...good, dangerous: true, dangerNote: '  ' })).status === 400);
  check('a low score needs a comment on what is bad', (await call('POST', '/api/score', keyA, { itemId: 'i1', ...good, scores: { accuracy: LOW_SCORE, actionSafety: 9 } })).status === 400);
  const saved = await call('POST', '/api/score', keyA, { itemId: 'i1', ...good, extra: 'ignored', dangerNote: 'dropped when not dangerous' });
  check('a good score is saved, with nothing extra kept', saved.status === 200 && Object.keys(saved.data.saved).sort().join() === 'bad,dangerNote,dangerous,good,scores' && saved.data.saved.dangerNote === '');
  const again = await call('POST', '/api/score', keyA, { itemId: 'i1', scores: { accuracy: 3, actionSafety: 4 }, dangerous: true, dangerNote: 'Tells the reader to cash in.', good: '', bad: 'Wrong age.' });
  check('a score can be changed', again.status === 200 && again.data.saved.scores.accuracy === 3);
  const back = await call('GET', '/api/me', keyA);
  check('saved scores come back with the answers', back.data.items[0].saved.scores.accuracy === 3 && back.data.items[0].saved.dangerous === true && back.data.items[1].saved === null);
  const timed = await call('POST', '/api/score', keyA, { itemId: 'i1', scores: { accuracy: 3, actionSafety: 4 }, dangerous: true, dangerNote: 'Tells the reader to cash in.', good: '', bad: 'Wrong age.', seconds: 187 });
  check('the time spent on an answer is kept with its scores', timed.status === 200 && timed.data.saved.seconds === 187 && (await call('GET', '/api/me', keyA)).data.items[0].saved.seconds === 187);
  check('a time that makes no sense is not kept', cleanScore({ ...good, seconds: -5 }, pack).data.seconds === undefined && cleanScore({ ...good, seconds: 'long' }, pack).data.seconds === undefined && cleanScore({ ...good, seconds: 99999999 }, pack).data.seconds === undefined && cleanScore({ ...good, seconds: 12.5 }, pack).data.seconds === undefined);
  check('a long comment is cut to its limit', cleanScore({ ...good, good: 'x'.repeat(5000) }, pack).data.good.length === 3000);

  // --- Finishing ---
  check('cannot finish with answers left', (await call('POST', '/api/finish', keyA, {})).status === 400);
  await call('POST', '/api/score', keyA, { itemId: 'i2', ...good });
  check('can finish when all are scored', (await call('POST', '/api/finish', keyA, {})).status === 200 && (await call('GET', '/api/me', keyA)).data.finished === true);

  // --- What the owner gets back ---
  const list = await call('GET', '/admin/reviews', ADMIN);
  const mine = (list.data.reviews || []).find((r) => r.id === id);
  check('the list shows who has started and finished', !!mine && mine.reviewers.length === 2 && mine.reviewers[0].done === 2 && mine.reviewers[0].items === 2 && !!mine.reviewers[0].finishedAt && !!mine.reviewers[1].startedAt && mine.reviewers[1].done === 0);
  check('the list does not carry the answers or the links', !JSON.stringify(list.data).includes('Answer one') && !JSON.stringify(list.data).includes(body.reviewers[0].keyHash));
  const results = await call('GET', '/admin/reviews/' + id, ADMIN);
  check('results hold every saved score', results.status === 200 && results.data.scores.length === 2 && results.data.scores.find((s) => s.itemId === 'i1').data.dangerNote === 'Tells the reader to cash in.');
  check('results do not carry the links', !JSON.stringify(results.data).includes(body.reviewers[0].keyHash));
  check('results for a review that is not there', (await call('GET', '/admin/reviews/none-such', ADMIN)).status === 404);

  // --- Switching a link off, and a new link ---
  check('a link can be switched off', (await call('POST', '/admin/reviewers/' + id + '-r2', ADMIN, { active: false })).status === 200 && (await call('GET', '/api/me', keyB)).status === 401);
  check('and on again', (await call('POST', '/admin/reviewers/' + id + '-r2', ADMIN, { active: true })).status === 200 && (await call('GET', '/api/me', keyB)).status === 200);
  const keyB2 = 'reviewer-b-new-key-' + id + '-abcdefghijkl';
  check('a new link replaces the old one', (await call('POST', '/admin/reviewers/' + id + '-r2', ADMIN, { keyHash: await hashKey(keyB2) })).status === 200 && (await call('GET', '/api/me', keyB)).status === 401 && (await call('GET', '/api/me', keyB2)).data.items[0].id === 'i3');
  check('a reviewer who is not there', (await call('POST', '/admin/reviewers/none-such', ADMIN, { active: false })).status === 404);

  // --- Removing one reviewer's scores ---
  await call('POST', '/api/score', keyB2, { itemId: 'i3', ...good });
  const cleared = await call('POST', '/admin/reviewers/' + id + '-r2', ADMIN, { clear: true });
  const afterClear = await call('GET', '/admin/reviews/' + id, ADMIN);
  check('one reviewer\'s scores can be removed, and their link stops', cleared.status === 200 && afterClear.data.scores.length === 2 && !afterClear.data.scores.some((s) => s.itemId === 'i3') && (await call('GET', '/api/me', keyB2)).status === 401);

  // --- Closing ---
  check('a review can be closed', (await call('POST', '/admin/reviews/' + id + '/close', ADMIN)).status === 200);
  check('a closed review\'s links stop working', (await call('GET', '/api/me', keyA)).status === 401 && (await call('POST', '/api/score', keyA, { itemId: 'i1', ...good })).status === 401);
  const closed = await call('GET', '/admin/reviews/' + id, ADMIN);
  check('its results are kept', !!closed.data.closedAt && closed.data.scores.length === 2);

  // --- Removing ---
  check('a review can be removed, with its scores', (await call('POST', '/admin/reviews/' + id + '/delete', ADMIN)).status === 200 && (await call('GET', '/admin/reviews/' + id, ADMIN)).status === 404);

  return failed;
}
