// A store that keeps everything in memory, for the checks in test.mjs and for the
// optimiser's mock mode. It does what pg-store.mjs does, with no database.
//
// "saved" and "onChange" are optional: the optimiser's mock mode uses them to keep the
// made-up reviews in a file, so they are still there after a restart.

export function createMemoryStore({ saved, onChange } = {}) {
  const db = { reviews: {}, reviewers: {}, scores: {}, ...(saved || {}) };
  const changed = () => { if (onChange) onChange(db); };
  const now = () => new Date().toISOString();
  const reviewersOf = (reviewId) => Object.values(db.reviewers).filter((r) => r.reviewId === reviewId).sort((a, b) => (a.id < b.id ? -1 : 1));
  const scoresOf = (reviewerId) => db.scores[reviewerId] || {};
  const publicReviewer = (r) => ({ id: r.id, name: r.name, active: r.active, startedAt: r.startedAt, finishedAt: r.finishedAt, items: r.items });

  return {
    db,
    async init() {},

    async createReview(review) {
      if (db.reviews[review.id]) return false;
      if (review.reviewers.some((r) => db.reviewers[r.id] || Object.values(db.reviewers).some((x) => x.keyHash === r.keyHash))) return false;
      db.reviews[review.id] = { id: review.id, createdAt: now(), closedAt: null, pack: review.pack };
      review.reviewers.forEach((r) => { db.reviewers[r.id] = { id: r.id, reviewId: review.id, name: r.name, keyHash: r.keyHash, items: r.items, active: true, startedAt: null, finishedAt: null }; });
      changed();
      return true;
    },

    async listReviews() {
      return Object.values(db.reviews).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((v) => ({
        id: v.id, createdAt: v.createdAt, closedAt: v.closedAt, info: v.pack.info || {},
        reviewers: reviewersOf(v.id).map((r) => ({ ...publicReviewer(r), items: r.items.length, done: Object.keys(scoresOf(r.id)).length }))
      }));
    },

    async getResults(id) {
      const v = db.reviews[id];
      if (!v) return null;
      const reviewers = reviewersOf(id);
      return {
        id: v.id, createdAt: v.createdAt, closedAt: v.closedAt, reviewers: reviewers.map(publicReviewer),
        scores: reviewers.flatMap((r) => Object.entries(scoresOf(r.id)).map(([itemId, s]) => ({ reviewerId: r.id, itemId, data: s.data, savedAt: s.savedAt })))
      };
    },

    async closeReview(id) {
      if (!db.reviews[id]) return false;
      if (!db.reviews[id].closedAt) db.reviews[id].closedAt = now();
      changed();
      return true;
    },

    async deleteReview(id) {
      if (!db.reviews[id]) return false;
      reviewersOf(id).forEach((r) => { delete db.scores[r.id]; delete db.reviewers[r.id]; });
      delete db.reviews[id];
      changed();
      return true;
    },

    async updateReviewer(id, change) {
      const r = db.reviewers[id];
      if (!r) return false;
      if (typeof change.active === 'boolean') r.active = change.active;
      if (change.keyHash) r.keyHash = change.keyHash;
      changed();
      return true;
    },

    async clearReviewer(id) {
      const r = db.reviewers[id];
      if (!r) return false;
      delete db.scores[id];
      r.active = false; r.startedAt = null; r.finishedAt = null;
      changed();
      return true;
    },

    async findReviewer(keyHash) {
      const r = Object.values(db.reviewers).find((x) => x.keyHash === keyHash);
      if (!r) return null;
      const v = db.reviews[r.reviewId];
      return { reviewer: publicReviewer(r), review: { id: v.id, closedAt: v.closedAt, pack: v.pack }, scores: Object.fromEntries(Object.entries(scoresOf(r.id)).map(([itemId, s]) => [itemId, s.data])) };
    },

    async markStarted(reviewerId) {
      const r = db.reviewers[reviewerId];
      if (!r.startedAt) { r.startedAt = now(); changed(); }
    },

    async saveScore(reviewerId, itemId, data) {
      (db.scores[reviewerId] = db.scores[reviewerId] || {})[itemId] = { data, savedAt: now() };
      changed();
    },

    async setFinished(reviewerId, finished) {
      db.reviewers[reviewerId].finishedAt = finished ? now() : null;
      changed();
    }
  };
}
