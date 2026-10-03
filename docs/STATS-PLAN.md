# Usage stats plan (PO-19)

A plan for counting how the Retirement Income Prompt Generator is used, without
any third-party stats tooling. Nothing in this plan is built yet.

Written 3 October 2026, against site version v0.3.0. The privacy points need
sign-off from whoever owns data protection for the Consumer Duty Alliance; this
is a product plan, not legal advice.

## Summary

- The tool sends a tiny message each time one of six things happens, such as
  "a prompt was copied". The message carries the name of the event and one or
  two fixed labels. It never carries anything the user typed.
- A small endpoint adds one to a daily counter for that event. It keeps totals
  only: no visitor records, no IP addresses, no cookies.
- The site cannot store anything by itself. It is plain files, so the counter
  has to live on a server. Where that server is, is the main decision.
- **Decided (3 October 2026):** the counter will live on the Consumer Duty
  Alliance website, if the CDA can host it. That is still to be confirmed with
  them. If they cannot, the fallback is a small service the Taskforce owns,
  running beside the tool.
- **Hand-over:** everything is delivered as files the CDA's developer installs
  and runs themselves. The Taskforce does not operate any part of it.

## What gets counted

Each row is one event. "Type" is always one of `starter`, `list` or
`personalised`.

| Event | Sent when | Labels sent | Answers |
|---|---|---|---|
| `landing_view` | The tool loads | none | How many visits start |
| `route_chosen` | A visitor leaves the first screen for one of the three routes | type | Where visitors go, and how many leave without choosing |
| `prompt_ready` | The "Use this prompt" dialog opens, or the personalised result screen is reached | type | How many visits get as far as a finished prompt |
| `question_used` | A prompt is built from selected questions. One event per question | question id, type | How often each question is used, and in which route |
| `prompt_copied` | "Copy prompt only" succeeds | type | Copies in total and by type |
| `chatbot_launched` | "Copy and launch" is pressed | chatbot, type | Which chatbot is used as the start point |

How these answer the five questions in PO-19:

1. **Each question, personalised or list:** `question_used` by question id and
   type.
2. **The standard prompt:** `prompt_copied` plus `chatbot_launched` where the
   type is `starter`.
3. **Which chatbot:** `chatbot_launched` by chatbot.
4. **Copies in total and by type:** `prompt_copied` by type. Launching also
   copies the prompt, so the report shows copies and launches side by side.
5. **Drop-off:** `landing_view`, then `route_chosen` by type, then
   `prompt_ready` by type, then copies and launches. Each step's count divided
   by the one before is the share that carried on.

Optional extra: a `wizard_step` event with the step number would show where
people give up inside the personalised route. PO-19 does not ask for it.

### Visits, not people

Telling one person from another needs an identifier kept on their device, which
means a cookie or similar and a consent prompt. This plan does not do that, so
the counts are of visits and actions. Someone who comes back next week counts
again.

To stop one visit counting twice, the page remembers in memory which one-off
events it has already sent (`landing_view`, and each `route_chosen` type). That
memory is gone when the page is closed or reloaded. Nothing is written to the
device.

### What is never sent

- Anything typed into the wizard: ages, amounts, health status, free text.
- The text of any prompt.
- Any visitor, session or device identifier.

Question ids are the fixed ids already in `prompts.js`, such as `foundation_1`.

## How it is stored

One table of daily totals. There is no row per visitor and no row per event.

| Column | Example | Notes |
|---|---|---|
| `day` | 2026-10-03 | Date only, no time |
| `event` | `question_used` | One of the six names above |
| `detail` | `foundation_1\|personalised` | The labels, or empty |
| `count` | 14 | Increased by one per message |

The key is `day` + `event` + `detail`. A message either adds one to an existing
row or creates the row at one. The size does not depend on the number of
visits: there are about 60 possible combinations of event and labels, so at
most about 60 rows a day.

The endpoint:

- accepts `POST` with a small JSON body: `{ "event": "...", "detail": "..." }`;
- accepts only event names and label values on a fixed list, and ignores
  anything else, so free text can never be stored by mistake;
- accepts requests only from the tool's own address;
- does not write the visitor's IP address or browser details anywhere, and has
  request logging switched off or trimmed for this address;
- limits how fast one address can send, held in memory only, to blunt anyone
  trying to inflate the numbers.

## Where the counter lives

| Option | What it is | For | Against |
|---|---|---|---|
| A. On the CDA website | A small plugin adding one address and one table to the site's existing database, with a totals page in the site's admin area | First-party: the data stays with the organisation making the privacy promise. No new supplier or account. Same address as the tool once it is hosted there | Needs the CDA's web developer. Cannot start until the tool is on the CDA site, or the CDA site allows requests from the current address |
| B. A small service the Taskforce owns | One serverless function and one small database on an account the Taskforce controls | Works today with the current GitHub Pages hosting. Independent of the CDA site's release cycle | Another account to own, pay for and hand over. A hosting company holds the totals, though as storage, not as a stats tool |
| C. Web server logs | No endpoint. The page requests a tiny file per event and the totals are read from the server's access logs | No server code | Needs access to the logs, which GitHub Pages does not give. Logs hold IP addresses. Counting is manual |

**Decision: A**, subject to the CDA confirming they can host it. B is the
fallback. The page code and the message format are the same for both, and the
endpoint address is one setting, so switching between them changes one line.

GitHub Pages cannot run the counter by itself. It serves files only, so under B
the tool's pages stay on GitHub Pages and the counter runs on a separate small
service.

### What is handed over

The aim is a set of files the CDA's developer can install and run without help:

| File or folder | What it is |
|---|---|
| The tool: `index.html`, `styles.css`, `prompts.js`, `version.js`, `support.js`, `images/` | As listed in the README today |
| `stats.js` | The page-side counter calls. Does nothing until the endpoint address is set |
| The counter | The endpoint, the one-table database set-up and the totals page, written for the CDA site's platform |
| Install note | Where each file goes, the one setting to change (the endpoint address), and how to check it is counting |

The counter cannot be written until the CDA site's platform is known, because
it has to be in that platform's language and use its database.

### Questions for the CDA's developer

1. What does the CDA website run on (WordPress or something else), and can it
   take a small custom plugin or its own endpoint?
2. Can the plugin create one table in the site's database?
3. Will the tool's files be hosted on the CDA site itself, or shown inside it
   from another address? If from another address, the endpoint must accept
   requests from that address.
4. Who should be able to see the totals page?
5. Can request logging be switched off or trimmed for the endpoint's address,
   so visitor IP addresses are not kept?

## Changes to the tool

- **New file `stats.js`:** one `track(event, detail)` function. It uses the
  browser's `sendBeacon`, which still delivers when the visitor is leaving for
  a chatbot's tab. It fails silently, and it does nothing at all when no
  endpoint address is set, so the tool works unchanged on a host with no
  counter.
- **`index.html`:** about six calls to `track`, at the points in the table
  above. The dialog needs to be told which type of prompt it is showing; today
  it is given only the text.
- **Respecting a "do not track" signal:** when the browser sends Global Privacy
  Control or Do Not Track, send nothing.
- **Wording:** the privacy paragraph in the important information dialog says
  "We don't store or track what you type". That stays true, but add a sentence
  such as "We count how often each part of the tool is used, for example how
  many prompts are copied. The counts hold nothing about you or what you
  typed."
- **Documents:** update R4 in [RISKS.md](RISKS.md), which currently says usage
  analytics need a consent prompt. That was written about session recording.
  Daily totals with no identifier and nothing stored on the device are a
  different case, but the data protection note in R4 should record the decision.
- **README:** add `stats.js` to the files to host and the endpoint address to
  the hosting notes.

## Seeing the numbers

A totals page for administrators only, with a date range and a CSV download:

- the drop-off table: visits, route chosen, prompt ready, copied or launched,
  split by type;
- questions ranked by use, split by list and personalised;
- chatbots by launches;
- copies by type.

On option A this is a page in the site's admin area. On option B it is a
password-protected page, or a query run by a maintainer.

## Order of work

1. Confirm with the CDA that their site can host the counter, using the
   questions above, and agree who signs off the privacy wording.
2. Build the endpoint and table, and test that unknown events and free text are
   rejected.
3. Add `stats.js` and the calls in `index.html`, with the endpoint address
   empty so nothing is sent yet.
4. Update the privacy wording, R4 in the risk register and the README.
5. Set the endpoint address, release, and check the totals against a manual
   walk-through.
6. Build the totals page.

Steps 3 and 4 can be done and released before the endpoint exists.

## Decisions needed

1. **Where the counter lives:** decided as A (CDA website). Waiting on the CDA
   to confirm it is possible; B if not.
2. **Who signs off** the added privacy sentence and the data protection note.
3. **Whether to add `wizard_step`,** to see drop-off inside the personalised
   route.
