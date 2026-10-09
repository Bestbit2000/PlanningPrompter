# Retirement Income Prompt Generator

A free tool from the Retirement Income Taskforce, part of the Consumer Duty
Alliance. It helps people in the UK write a clear, well-structured prompt to ask
an AI chatbot about retirement income. It does not give answers or advice. It
builds the text of a prompt, which the user copies or opens in the chatbot they
choose (ChatGPT, Claude, Copilot, Gemini or Perplexity).

It is a static site: plain HTML, CSS and JavaScript. There is no build step, no
server code and no database. Nothing a user types is stored or sent anywhere by
the site.

The site counts how often each part of the tool is used, such as how many
prompts are copied. It sends the name of the event to a small separate counter,
which keeps daily totals and nothing about the visitor. See
[Usage counts](#usage-counts).

## Files to host

Copy these, keeping the folder structure, to any web server:

| File | What it is |
|---|---|
| `index.html` | The whole tool: page layout and the code that drives it |
| `styles.css` | Styling |
| `prompts.js` | The questions, their prompts and the three answer-style paragraphs added to the bottom of a prompt. Edit this to change the wording |
| `version.js` | The release number and "last reviewed" date shown in the footer |
| `stats.js` | Sends the usage counts. The counter's address is the one setting at the top; leave it empty to send nothing |
| `support.js` | The small runtime that `index.html` is written for. Don't edit, with one exception: the three addresses under "src/cdn.ts" point at `vendor/`. If this file is ever replaced, point them there again |
| `vendor/` | React and React DOM, as published and unchanged. `support.js` checks each against a hash, so they must be copied byte for byte |
| `images/` | The Taskforce logo and the chatbot icons |

Everything else in the repository is for the people who maintain the tool and
does not need to be hosted:

| Folder | What it is |
|---|---|
| `docs/` | Release process, risk register and planning notes |
| `docs/prompt-history/` | A record of every prompt as it stood in each release, to show what the tool would have asked at any point in the past |
| `tools/` | The script that writes the prompt history, run as a step of each release |
| `stats-service/` | The usage counter: a small service that runs apart from the site. See [stats-service/README.md](stats-service/README.md) |
| `optimiser/` | A separate admin tool for improving the prompts. It runs only on a maintainer's own computer and must never be published. It is not tracked in git |

## Hosting notes

- Serve the files over `http://` or `https://`. Opening `index.html` straight
  from disk (a `file://` address) does not work fully.
- All addresses are relative, so the tool works from the root of a site or from
  a sub-page.
- The tool is designed to sit under the Consumer Duty Alliance site header,
  with its own slim bar ("Start again") beneath it.
- The page makes one kind of outside request itself: the usage counter named in
  `stats.js`. The font is the one already on the visitor's device, and the
  React scripts are served from `vendor/`, so nothing else is fetched
  from another company. The counter's host sees the visitor's IP address and
  is named in the privacy notice in the important information dialog: update
  the notice if the hosts change. If the host blocks outside connections,
  allow the counter's address, or the counts are lost; the tool still works.
  The chatbot links open in the user's own browser.
- After changing `styles.css`, `prompts.js`, `version.js`, `stats.js` or `support.js`, update
  the `?v=` number on their addresses in `index.html` so browsers fetch the new
  copies. See [docs/RELEASES.md](docs/RELEASES.md).

## Running it locally

Any static file server will do. For example, with Node installed:

```bash
npx serve .
```

Then open the address it prints.

## Usage counts

`stats.js` sends a count when the tool loads, when a route is chosen, when a
prompt is finished, copied or launched in a chatbot, and for each question used.
It also counts which shortlisting answers are picked, each step of the
personalised route reached, which boxes had something in them when a
personalised prompt was built, and clicks on the links to outside help (PO-77).
It sends the event's name and up to three fixed labels, such as the question's
id or the id of a box. It never sends anything typed, sets no cookie and stores nothing on the
device, and it sends nothing when the browser signals Global Privacy Control or
Do Not Track.

The counter is in [stats-service/](stats-service/README.md), with how to see
the totals. The optimiser's "Usage" page shows them as charts, with a
printable report. It accepts counts only from addresses it has been told about, so
when the tool moves to a new address, add that address to the counter. The plan
behind it is in [docs/STATS-PLAN.md](docs/STATS-PLAN.md).

## Releases

Version numbers, environments and the release steps are in
[docs/RELEASES.md](docs/RELEASES.md). The risks and how the site reduces them
are in [docs/RISKS.md](docs/RISKS.md).
