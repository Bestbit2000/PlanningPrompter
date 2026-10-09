# Usage counter

Counts how the Retirement Income Prompt Generator is used (PO-19). What is
counted, and why it is done this way, is in
[docs/STATS-PLAN.md](../docs/STATS-PLAN.md).

It is a small service that runs apart from the tool. The tool's pages send it
the name of an event, such as "a prompt was copied", and it adds one to that
day's total. It keeps totals only:

- no visitor records, IP addresses or cookies;
- nothing a user typed, and no prompt text;
- one table with four columns: day, event, label and count.

This folder is not part of the public site and does not need to be hosted with
it. The site's side of this is one file, `stats.js`.

## Where it runs today

| | |
|---|---|
| Host | Neon, as one function and one Postgres database, in Frankfurt (EU) |
| Neon project | "PlanningPrompter stats" (`mute-wind-12495248`), in Andrew Storey's Neon account, apart from any other project |
| Function | `usagecounter` |
| Address | https://br-raspy-shadow-b1uel7je-usagecounter.compute.c-5.eu-central-1.aws.neon.tech/ |
| Counts accepted from | `https://bestbit2000.github.io` only |

This is the fallback from the plan: the counter is meant to move to the
Consumer Duty Alliance website if the CDA can host it.

## Seeing the totals

Open the counter's address in a browser. Enter the key, pick the dates and
press "Show totals". The page shows where visits go, the questions ranked by
use, the chatbots launched and a line per day, and "Download CSV" saves the
daily figures.

The key is `STATS_KEY` in `.env` in this folder, on the computer the counter
was deployed from. It is not in git. Whoever needs the totals page needs the
key; pass it on privately, never by putting it in a file that is committed.

To change the key, change it in `.env` and deploy again.

## Files

| File | What it is |
|---|---|
| `handler.mjs` | The counter itself. No dependencies: it is given a database and its settings |
| `totals-page.mjs` | The totals page the counter serves |
| `index.mjs` | Entry point on Neon |
| `local.mjs` | Entry point anywhere else with Node and Postgres |
| `deploy.mjs` | Deploys to Neon |
| `schema.sql` | The one table. The counter creates it by itself on first use |
| `test.mjs` | Checks with a stand-in database. No set-up needed |
| `test-db.mjs` | Checks against the real database, in a separate test table |
| `.env.example` | The settings, to copy to `.env` |

## Settings

Copy `.env.example` to `.env` and fill it in. `.env` is ignored by git.

| Setting | What it is |
|---|---|
| `ALLOWED_ORIGINS` | The addresses the tool is served from, separated by commas, with no trailing slash. Counts from anywhere else are ignored |
| `STATS_KEY` | The key for the totals page. Long and random. Empty switches the totals page off |
| `NEON_PROJECT_ID` | The Neon project, for `deploy.mjs` |
| `DATABASE_URL` | The Postgres address, for `local.mjs` and `test-db.mjs`. Neon gives it to a deployed function by itself |
| `STATS_TABLE` | Optional. A different table name, for testing |

## Checking it

```bash
npm install
```
```bash
node test.mjs
```
```bash
node test-db.mjs
```

## Deploying to Neon

Needs the Neon command-line tool, signed in to the account that owns the
project:

```bash
npm install -g neon
```
```bash
neon auth
```

Then, from this folder:

```bash
node deploy.mjs
```

It prints the counter's address. A new version can take a minute or two to
replace the old one.

## If the tool moves to another address

The counter ignores counts from addresses it does not know. When the tool is
served from somewhere new, such as the CDA website:

1. Add the new address to `ALLOWED_ORIGINS` in `.env`.
2. Run `node deploy.mjs`.

## Moving the counter somewhere else

The site does not care where the counter is. To move it:

1. Run the counter in its new home. With Node and a Postgres database, that is
   `node local.mjs` behind the host's web server, with the settings above. On a
   platform without Node, `handler.mjs` is short enough to rewrite: it accepts
   one kind of message and writes to one table.
2. Copy the rows of `usage_counts` across, to keep the history.
3. Change the one address at the top of `stats.js` in the site, and release.
4. Delete the old Neon project.

To switch counting off altogether, set that address in `stats.js` to empty.

### The message

`POST` to the counter's address, as plain text:

```json
{ "events": [ { "event": "question_used", "detail": "foundation_1|list" } ] }
```

The reply is always empty (204), whether or not anything was counted. The
events and labels that are accepted are listed at the top of `handler.mjs` and
in the plan.

## Limits that protect the numbers

- One address can send 300 events a minute. Held in memory only.
- One message can hold 100 events and 16 KB.
- A day can gain 500 rows at most, so made-up question ids cannot fill the
  table. Real use needs about 170.
- Ten wrong keys a minute from one address, then the totals page asks them to
  wait.

## What the host keeps

Neon's own log shows a line when a request starts and ends, with the time and
no visitor address, and keeps it for three days. The counter writes to the log
only if the database fails, and then only the database's error.
