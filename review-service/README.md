# Human review service

Lets invited people check the answers the AI chatbots give (PO-79). After the
optimiser's AI judges have scored a run, a sample of the answers is shared out
between reviewers. Each one scores their answers, says whether anything is
dangerous or misleading, and says what is good or bad about them.

It is a small service that runs apart from the tool and apart from the public
site. It is private: nothing in it can be read without a reviewer's own link or
the admin key.

- A reviewer has no account and no password: they are sent a personal link.
- A link opens only that reviewer's own answers, for one review.
- A link stops working when it is switched off or the review is closed.

Reviews are set up, and their results read, in the optimiser's "Human review"
tab. This folder is the part that has to be on the internet so that reviewers
can reach it.

## What it holds, and what it never holds

It holds, for each review:

- the questions and the answers in the sample, each answer under a neutral id;
- the five scoring groups and the judging statements shown under each;
- each reviewer's display name, and which answers they were given;
- their scores, their "dangerous or misleading" answers and their comments;
- how long each answer was on their screen while they were active, in seconds.

It never holds:

- **which chatbot wrote an answer.** That list stays in the optimiser, on the
  owner's computer, and is put back when the results are fetched;
- **a reviewer's link.** Only a hash of the key in it is kept, so the database
  alone cannot be used to open anyone's page;
- reviewers' email addresses, IP addresses or cookies;
- any model API key.

Reviewers' names and comments are personal data. The reviewer's page says what
is kept and how to have it removed. To remove it: "Remove their scores" beside
a reviewer in the optimiser, or "Remove this review" for the whole review.

## Where it runs

| | |
|---|---|
| Host | Neon, as one function and three Postgres tables, in Frankfurt (EU) |
| Neon project | "PlanningPrompter stats", the same project as the usage counter, in tables of its own (`review_...`) |
| Function | `answerreview` |
| Address | Printed by `deploy.mjs` and kept in `.env` as `REVIEW_ADDRESS` |

## Setting it up

```bash
npm install
```

Copy `.env.example` to `.env` and fill it in. `.env` is ignored by git.

| Setting | What it is |
|---|---|
| `NEON_PROJECT_ID` | The Neon project, for `deploy.mjs` |
| `REVIEW_ADMIN_KEY` | The key the optimiser uses to create reviews and fetch results. Long and random, at least 32 characters, letters and numbers only. Empty switches the owner's side off |
| `REVIEW_ADDRESS` | The address of the deployed service. `deploy.mjs` fills it in. The optimiser reads it from here |
| `DATABASE_URL` | The Postgres address, for `local.mjs` and `test-db.mjs`. Neon gives it to a deployed function by itself |

The admin key is not in git. It can read every score and comment, so it stays
on the owner's computer: never give it to a reviewer, and never put it in a
file that is committed. To change it, change it in `.env` and deploy again.

## Deploying

Needs the Neon command-line tool, signed in (`npm i -g neon`, then `neon auth`).

```bash
node deploy.mjs
```

It prints the service's address and keeps it in `.env`. A redeploy can take
about a minute to start serving the new code. The three tables are created on
first use.

The optimiser finds the service from this folder's `.env`
(`REVIEW_ADDRESS` and `REVIEW_ADMIN_KEY`), or from the same two settings in its
own `.env`.

## Checking it

```bash
node test.mjs
```
```bash
node test-db.mjs
```

`test.mjs` uses a stand-in for the database and needs no set-up. `test-db.mjs`
runs the same checks against the real database, in tables of its own
(`review_test_...`), which it removes when it has finished. Neither touches a
real review.

The optimiser's mock mode (`npm run mock` in `optimiser/`) runs this service
inside the tool, so a whole review can be tried, from set-up to the reviewer's
page to the comparison, with nothing deployed and nothing sent anywhere.

## Switching a link off

In the optimiser's "Human review" tab, open the review:

- **Switch off** beside a reviewer stops their link. What they scored is kept.
- **New link** gives them a different link; the old one stops working.
- **Remove their scores** deletes what they saved and switches their link off.
- **Close the review** stops every link. The scores already in are kept.
- **Remove this review** deletes the review and everything in it.

A wrong link, a switched-off link and a link to a closed review all show the
same page: "This link is not in use".

## What a reviewer sees

One page, served at the service's address. It has no outside fonts or scripts.

1. A welcome: what this is, how long it should take, and what is kept.
2. One answer at a time: the question, the answer style that was asked for,
   then the answer, laid out as the chatbot wrote it. The chatbot is not named.
3. Five scores from 0 to 10, one for each group (accuracy, structure and
   usability, readability, answer style, action and safety). The judging
   statements for each group are listed under it, in the wording the AI judges
   are given, from the version of the rules the run used.
4. "Is anything in this answer dangerous or misleading?" A "yes" needs a
   comment.
5. What is good, and what is bad. A comment on what is bad is needed when any
   score is 5 or under.

The page counts the seconds each answer is on screen while the reviewer is
active, and saves that with the scores. A hidden tab, or three minutes with no
scrolling, typing or clicking, stops the clock. The optimiser uses these times
to adjust how long it tells the next reviewers to allow.

Work is saved after each answer, so a reviewer can stop and come back with the
same link. Scores can be changed until the review is closed.

An answer can give its chatbot away, for example by numbered web sources. The
answers are shown as written, so this cannot be fully hidden.

## Limits it applies

- A review pack of up to 2 MB, and up to 100 reviewers.
- A comment of up to 3,000 characters.
- Ten wrong admin keys a minute from one address, and thirty links that are not
  in use; after that the address has to wait.

## Files

| File | What it is |
|---|---|
| `handler.mjs` | The service itself. No dependencies: it is given a store and its settings |
| `page.mjs` | The reviewer's page |
| `pg-store.mjs` | The store for Postgres |
| `memory-store.mjs` | A store with no database, for `test.mjs` and the optimiser's mock mode |
| `index.mjs` | Entry point on Neon |
| `local.mjs` | Entry point anywhere else with Node and Postgres |
| `deploy.mjs` | Deploys to Neon |
| `schema.sql` | The three tables. The service creates them by itself on first use |
| `checks.mjs` | The checks, shared by the two test files |
| `test.mjs` | Checks with a stand-in database. No set-up needed |
| `test-db.mjs` | Checks against the real database, in separate test tables |
| `.env.example` | The settings, to copy to `.env` |

## Hosting it somewhere else

`local.mjs` runs the same service on any server with Node and a Postgres
database. It must be served over HTTPS. Set `REVIEW_ADDRESS` to its address so
the optimiser can find it.
