-- The three tables the review service needs. The service creates them by itself on
-- first use, so this file is for reference, or for setting them up by hand.

create table if not exists review_reviews (
  id         text primary key,
  created_at timestamptz not null default now(),
  closed_at  timestamptz,           -- set when the review is closed; its links then stop working
  pack       jsonb not null         -- the questions, the answers (by a neutral id) and the scoring groups
);

create table if not exists review_reviewers (
  id          text primary key,
  review_id   text not null references review_reviews(id) on delete cascade,
  name        text not null,        -- the display name the reviewer was invited under
  key_hash    text not null unique, -- a hash of the key in their link; the key itself is not kept
  items       jsonb not null,       -- the ids of the answers they were given, in order
  active      boolean not null default true,
  started_at  timestamptz,          -- when they first opened their link
  finished_at timestamptz
);

create table if not exists review_scores (
  reviewer_id text not null references review_reviewers(id) on delete cascade,
  item_id     text not null,
  data        jsonb not null,       -- the five scores, the "dangerous or misleading" answer and the comments
  saved_at    timestamptz not null default now(),
  primary key (reviewer_id, item_id)
);
