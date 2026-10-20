# Back tests

Automated run-throughs of every route of the tool in a real browser (PO-92), with the
same runner as TheMusicLedger: [Playwright](https://playwright.dev) and Chromium. Run
them before and after a change: if they pass both times, the change kept the tool
working and looking as it did.

```bash
cd tests
```

```bash
npm install
```

```bash
npm run backtest
```

The first `npm install` on a machine also needs the browser:
`npx playwright install chromium`. TheMusicLedger's copy is the same version, so if it is
installed this step is already done.

## What they check

| Spec | Covers |
|---|---|
| `landing.spec.ts` | The first screen, its links and counts, "Start again", the important information dialog (opening, closing four ways, focus) |
| `starter.spec.ts` | "Help me start": its prompt word for word, copying, the chatbot dialog, moving to the list |
| `chatbot-dialog.spec.ts` | "Choose your AI assistant" for each of the five chatbots: what is copied, which address opens, the paste note, closing, focus, a failed copy |
| `prompt-list.spec.ts` | "Let me choose": the three questions and Back, the shortlist for every stage and topic, select and deselect, the summary and its prompt in each answer style, moving on to personalise |
| `wizard.spec.ts` | "Tailor to me": every step and box, the warning, the tabs and their arrows, the boxes that only appear when they apply, the prompt with everything, nothing, and each lifestyle level, the review and Edit |
| `embed.spec.ts` | The tool in a frame on another site (PO-91), with and without the host page's snippet |
| `layout.spec.ts` | Every screen and dialog at desktop and phone width laid out exactly as recorded |

Every test also fails if the page logs a script error, and checks the counts each action
sends. No test reaches the live counter, a chatbot or any other site: the test server
points the counts at itself, and anything else outside it is blocked.

## Baselines

`baselines/` holds what the tool produced when the tests were last recorded: each
prompt word for word, the shortlists, the counts, and a layout record of every screen
(where every element is and its computed style). A test fails if any of these change.

When a change is meant to alter one of them, for example new wording in `prompts.js`,
record them again and check the difference in git before committing:

```bash
npm run backtest:update
```

## The test server

`server.mjs` serves the repository as it is on disk on port 5199. The tests start it
themselves. Run it by hand with `npm run serve` to look at the tool the way the tests
see it; `/__host` is the mock of the consumerduty.org page that frames the tool.
