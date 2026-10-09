// The store the review service uses on Neon, or on any Postgres database. It is given
// a "query" function. The three tables are created on first use; schema.sql shows them.

const iso = (v) => (v ? new Date(v).toISOString() : null);

export function createPgStore({ query, prefix }) {
  const p = /^[a-z_][a-z0-9_]{0,30}$/.test(prefix || '') ? prefix : 'review_';
  const reviews = p + 'reviews', reviewers = p + 'reviewers', scores = p + 'scores';

  let ready = null;
  const init = () => {
    if (!ready) {
      ready = (async () => {
        await query(`create table if not exists ${reviews} (
          id text primary key,
          created_at timestamptz not null default now(),
          closed_at timestamptz,
          pack jsonb not null
        )`);
        await query(`create table if not exists ${reviewers} (
          id text primary key,
          review_id text not null references ${reviews}(id) on delete cascade,
          name text not null,
          key_hash text not null unique,
          items jsonb not null,
          active boolean not null default true,
          started_at timestamptz,
          finished_at timestamptz
        )`);
        await query(`create table if not exists ${scores} (
          reviewer_id text not null references ${reviewers}(id) on delete cascade,
          item_id text not null,
          data jsonb not null,
          saved_at timestamptz not null default now(),
          primary key (reviewer_id, item_id)
        )`);
      })().catch((e) => { ready = null; throw e; });
    }
    return ready;
  };

  const reviewerRow = (r) => ({ id: r.id, name: r.name, active: r.active, startedAt: iso(r.started_at), finishedAt: iso(r.finished_at), items: r.items });

  return {
    init,

    // The review and its reviewers go in together, or not at all.
    async createReview(review) {
      try {
        await query(
          `with v as (insert into ${reviews} (id, pack) values ($1, $2::jsonb) returning id)
           insert into ${reviewers} (id, review_id, name, key_hash, items)
           select t.id, v.id, t.name, t.key_hash, t.items::jsonb
           from v, unnest($3::text[], $4::text[], $5::text[], $6::text[]) as t(id, name, key_hash, items)`,
          [review.id, JSON.stringify(review.pack), review.reviewers.map((r) => r.id), review.reviewers.map((r) => r.name), review.reviewers.map((r) => r.keyHash), review.reviewers.map((r) => JSON.stringify(r.items))]
        );
        return true;
      } catch (e) {
        if (e && e.code === '23505') return false;   // the id, or a link, is already there
        throw e;
      }
    },

    async listReviews() {
      const v = await query(`select id, created_at, closed_at, pack->'info' as info from ${reviews} order by created_at desc`);
      const w = await query(
        `select w.id, w.review_id, w.name, w.active, w.started_at, w.finished_at, jsonb_array_length(w.items)::int as items,
                (select count(*)::int from ${scores} s where s.reviewer_id = w.id) as done
         from ${reviewers} w order by w.id`
      );
      return v.rows.map((r) => ({
        id: r.id, createdAt: iso(r.created_at), closedAt: iso(r.closed_at), info: r.info || {},
        reviewers: w.rows.filter((x) => x.review_id === r.id).map((x) => ({ ...reviewerRow(x), done: x.done }))
      }));
    },

    async getResults(id) {
      const v = await query(`select id, created_at, closed_at from ${reviews} where id = $1`, [id]);
      if (!v.rows.length) return null;
      const w = await query(`select id, name, active, started_at, finished_at, items from ${reviewers} where review_id = $1 order by id`, [id]);
      const s = await query(
        `select s.reviewer_id, s.item_id, s.data, s.saved_at from ${scores} s
         join ${reviewers} w on w.id = s.reviewer_id where w.review_id = $1 order by s.reviewer_id, s.item_id`,
        [id]
      );
      return {
        id, createdAt: iso(v.rows[0].created_at), closedAt: iso(v.rows[0].closed_at), reviewers: w.rows.map(reviewerRow),
        scores: s.rows.map((r) => ({ reviewerId: r.reviewer_id, itemId: r.item_id, data: r.data, savedAt: iso(r.saved_at) }))
      };
    },

    async closeReview(id) {
      const r = await query(`update ${reviews} set closed_at = coalesce(closed_at, now()) where id = $1 returning id`, [id]);
      return r.rows.length > 0;
    },

    // Removes the review, its reviewers and their scores and comments.
    async deleteReview(id) {
      const r = await query(`delete from ${reviews} where id = $1 returning id`, [id]);
      return r.rows.length > 0;
    },

    async updateReviewer(id, change) {
      const r = await query(
        `update ${reviewers} set active = coalesce($2::boolean, active), key_hash = coalesce($3::text, key_hash) where id = $1 returning id`,
        [id, typeof change.active === 'boolean' ? change.active : null, change.keyHash || null]
      );
      return r.rows.length > 0;
    },

    async clearReviewer(id) {
      await query(`delete from ${scores} where reviewer_id = $1`, [id]);
      const r = await query(`update ${reviewers} set active = false, started_at = null, finished_at = null where id = $1 returning id`, [id]);
      return r.rows.length > 0;
    },

    async findReviewer(keyHash) {
      const w = await query(
        `select w.id, w.name, w.active, w.started_at, w.finished_at, w.items, v.id as review_id, v.closed_at, v.pack
         from ${reviewers} w join ${reviews} v on v.id = w.review_id where w.key_hash = $1`,
        [keyHash]
      );
      if (!w.rows.length) return null;
      const r = w.rows[0];
      const s = await query(`select item_id, data from ${scores} where reviewer_id = $1`, [r.id]);
      return { reviewer: reviewerRow(r), review: { id: r.review_id, closedAt: iso(r.closed_at), pack: r.pack }, scores: Object.fromEntries(s.rows.map((x) => [x.item_id, x.data])) };
    },

    async saveScore(reviewerId, itemId, data) {
      await query(
        `insert into ${scores} (reviewer_id, item_id, data) values ($1, $2, $3::jsonb)
         on conflict (reviewer_id, item_id) do update set data = excluded.data, saved_at = now()`,
        [reviewerId, itemId, JSON.stringify(data)]
      );
    },

    async markStarted(reviewerId) {
      await query(`update ${reviewers} set started_at = coalesce(started_at, now()) where id = $1`, [reviewerId]);
    },

    async setFinished(reviewerId, finished) {
      await query(`update ${reviewers} set finished_at = case when $2::boolean then now() else null end where id = $1`, [reviewerId, finished]);
    },

    // For test-db.mjs only: removes the tables it made.
    async dropTables() {
      await query(`drop table if exists ${scores}`);
      await query(`drop table if exists ${reviewers}`);
      await query(`drop table if exists ${reviews}`);
      ready = null;
    }
  };
}
