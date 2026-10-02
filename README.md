# Retirement Income Prompt Generator

A free tool from the Retirement Income Taskforce, part of the Consumer Duty
Alliance. It helps people in the UK write a clear, well-structured prompt to ask
an AI chatbot about retirement income. It does not give answers or advice. It
builds the text of a prompt, which the user copies or opens in the chatbot they
choose (ChatGPT, Claude, Copilot, Gemini or Perplexity).

It is a static site: plain HTML, CSS and JavaScript. There is no build step, no
server code and no database. Nothing a user types is stored or sent anywhere by
the site.

## Files to host

Copy these, keeping the folder structure, to any web server:

| File | What it is |
|---|---|
| `index.html` | The whole tool: page layout and the code that drives it |
| `styles.css` | Styling |
| `prompts.js` | The questions and prompts. Edit this to change the wording |
| `version.js` | The release number and "last reviewed" date shown in the footer |
| `support.js` | The small runtime that `index.html` is written for. Don't edit |
| `image-slot.js` | Loaded by `index.html`. Keep it for now |
| `images/` | The Taskforce logo and the chatbot icons |

Everything else in the repository is for the people who maintain the tool and
does not need to be hosted:

| Folder | What it is |
|---|---|
| `docs/` | Release process, risk register and planning notes |
| `optimiser/` | A separate admin tool for improving the prompts. It runs only on a maintainer's own computer and must never be published. It is not tracked in git |

## Hosting notes

- Serve the files over `http://` or `https://`. Opening `index.html` straight
  from disk (a `file://` address) does not work fully.
- All addresses are relative, so the tool works from the root of a site or from
  a sub-page.
- The tool is designed to sit under the Consumer Duty Alliance site header,
  with its own slim bar ("Start again") beneath it.
- The only outside request the page makes itself is to Google Fonts for the
  Archivo typeface. The chatbot links open in the user's own browser.
- After changing `styles.css`, `prompts.js`, `version.js` or `support.js`, update
  the `?v=` number on their addresses in `index.html` so browsers fetch the new
  copies. See [docs/RELEASES.md](docs/RELEASES.md).

## Running it locally

Any static file server will do. For example, with Node installed:

```bash
npx serve .
```

Then open the address it prints.

## Releases

Version numbers, environments and the release steps are in
[docs/RELEASES.md](docs/RELEASES.md). The risks and how the site reduces them
are in [docs/RISKS.md](docs/RISKS.md).
