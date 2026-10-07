# Release process

How versions of the Retirement Income Prompt Generator are numbered and released.

## Version numbers

Versions are written `vX.Y.Z` and shown at the bottom of every page.

| Part | Name | Increment when | Example |
|---|---|---|---|
| X | Major | A major release: a redesign, a new journey, or a change that alters how people use the tool | `v0.4.2` → `v1.0.0` |
| Y | Functionality | New or changed functionality that is not a major release | `v0.1.3` → `v0.2.0` |
| Z | Bug fix | Bug fixes only, with no new functionality | `v0.1.0` → `v0.1.1` |

When a part is incremented, every part to its right resets to 0. A release that
contains both new functionality and bug fixes is a Y release.

The number lives in two places, which must match:

- `window.APP_VERSION` in [version.js](../version.js), which the footer reads.
- The `?v=X.Y.Z` on the stylesheet and script addresses at the top of
  [index.html](../index.html). Changing it makes browsers fetch fresh copies
  instead of using ones cached from the previous release.

## Environments

| Environment | Where | What it runs |
|---|---|---|
| Dev | Local checkout, opened in a browser | Work in progress |
| Production | The `main` branch on GitHub, served by GitHub Pages at https://bestbit2000.github.io/PlanningPrompter/ | The latest tagged release |

There is no staging environment, so checks before release happen in dev.
GitHub Pages rebuilds the live site from `main` after each push, which can take
a few minutes.

## Release cycle

1. **Build** — do the work for the Jira items in the release in dev. Leave
   `version.js` alone while work is in progress.
2. **Check** — walk through the landing page, the starter prompt, the prompt list
   and the full wizard in dev, on desktop and at phone width.
3. **Decide the number** — from the table above, based on the largest kind of
   change in the release.
4. **Bump** — update `window.APP_VERSION` in `version.js`, change every
   `?v=X.Y.Z` at the top of `index.html` to the same number, and add an entry to
   the release history below.
5. **Record the prompts** — after the bump, write this release's prompts into
   the prompt history:
   ```bash
   node tools/prompt-history.js
   ```
   It adds `docs/prompt-history/vX.Y.Z.md` and updates the index. Include both
   in the release commit. See [prompt-history](prompt-history/README.md).
6. **Commit and tag** — commit with the message `Release vX.Y.Z`, then tag it:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
7. **Publish** — push the commit to production, then push the tag on its own:
   ```bash
   git push origin main
   ```
   ```bash
   git push origin vX.Y.Z
   ```
   Push them separately. Twice, pushing the commit and tag together did not
   start a GitHub Pages build, so the live site stayed on the old version.
8. **Verify** — load https://bestbit2000.github.io/PlanningPrompter/ and confirm
   the footer shows the new number.
9. **Update Jira** — move every Jira item included in the release to the status
   "Released". The items are the ones listed against the version in the release
   history below. Do this on every release, once step 8 has passed.

### Bug fix releases

A bug found in production is fixed on its own, without bundling unfinished
functionality, and goes through steps 2 to 9 as a Z release.

## Release history

| Version | Date | Changes |
|---|---|---|
| v0.7.1 | 7 October 2026 | No change to how the tool looks or works. The wording of the first two shortlisting questions, their nine answers and the "Where to get help" heading moved from index.html into prompts.js, so that it is edited with the rest of the questions; a question marked "archived" in prompts.js keeps its id but is not shown (PO-68). Prompts: each one now asks for one or two follow-up questions (was two or three), and for the rules as they are now with any change already announced that takes effect within the next year; the tax-year instruction stays (PO-70). The prompt history leaves out archived questions. |
| v0.7.0 | 7 October 2026 | Questions: the list is updated from the working party's 5 October list to 27 questions, nine of them new; "Part-time work impact" is removed and "Taking retirement savings" is left out as it repeats "Turning a pension into income"; existing question ids are kept (PO-63). Shortlisting: "Where are you in your retirement income planning?" is asked first, and "What do you want to know?" then offers three answers that depend on it; the shortlist is the four or five questions under the answer chosen, followed by "Where to get help" with the free guidance and financial advice questions; each question carries a "topics" tag for the answers it is shown under, which the optimiser now keeps when it saves (PO-63). Prompts: every prompt rewritten by hand to the optimiser's prompt and safeguard rules, and the three answer-style paragraphs revised to the style rules; none has been scored by an optimiser run yet (PO-65). Wording: plainer titles and questions, applied ahead of the working party's review, with the review file in docs/ (PO-66). |
| v0.6.0 | 6 October 2026 | Front page: one "Get started" button that scrolls to the three options, the closing "Try it now" banner removed, the three options on a teal band, new option headings and wording, and the chatbot names shown as plain logos (PO-50, PO-51, PO-53, PO-55). Starter prompt: page renamed "Help me start", the prompt rewritten for people who have not thought much about retirement, and the description cards reworded to match (PO-54); the link to the prompt list is a quiet card, not a teal banner (PO-56). Prompt list: the bar fixed to the bottom of the window is replaced by a "Create my prompt" button under the list (PO-52), which opens a new summary page showing the prompt instead of a dialog (PO-58); the route shows the step tabs, "1. Select questions" and "2. Summary" (PO-60). All routes: "Copy prompt" and "Choose your AI assistant" sit together on the right under the prompt (PO-57, PO-58, PO-62); the dialog only chooses and launches a chatbot (PO-58); the teal "Your prompt is ready" banner is replaced by a step heading and a short confirmation line (PO-61). |
| v0.5.0 | 3 October 2026 | Usage counts: the tool counts visits, routes chosen, prompts finished, copied and launched, and each question used, by sending event names to a small counter that keeps daily totals only. Nothing typed is sent, no cookie is set, and nothing is sent when the browser signals "do not track". The privacy paragraph says usage is counted. The counter and its totals page are in `stats-service/` and run apart from the site (PO-19). |
| v0.4.0 | 3 October 2026 | Accessibility follow-ups: 44px controls, 14px minimum text, toast that waits and reports a failed copy, reduced motion, linked help text, new-tab links marked (PO-22). Step 4 lifestyle uses the Retirement Living Standards levels with monthly ranges, or the user's own amount; expected spending and the before/after tax questions removed (PO-23, PO-24). Risk tolerance cut to three options and moved to step 2 (PO-25, PO-26). Step 3 simplified to six boxes; emergency income buffer removed (PO-26, PO-27). "Other concern" now reaches the prompt (PO-28) and "Anything else we should know?" is labelled there (PO-29). The chosen answer style is added to the bottom of the prompt (PO-30). Prompt history added as a release step (PO-33). Usage stats plan added to docs (PO-19, plan only). |
| v0.3.0 | 2 October 2026 | Accessibility fixes from the PO-12 check: question rows can be selected by keyboard, both dialogs keep focus inside and close with Esc, each screen change moves focus to its heading and updates the page title, buttons and banners use a darker teal that passes contrast, and the focus ring shows on teal and dark backgrounds (PO-21). Unused `image-slot.js` removed. |
| v0.2.0 | 2 October 2026 | Tool placed under the Consumer Duty Alliance header: slim tool bar with "Start again", CDA logo and "Home" removed, Taskforce badge on the landing page (PO-16, PO-20). Footer reduced to two lines (PO-14). AI prompt text removed from the question lists and the list buttons tidied (PO-15). Step tabs scroll with arrows on narrow desktop windows and centre the active step (PO-17). Repository tidied for hand-off, with documents moved to docs/ (part of PO-18). |
| v0.1.1 | 2 October 2026 | Version number added to stylesheet and script addresses so a release is not shown with a cached stylesheet (PO-13). |
| v0.1.0 | 2 October 2026 | First numbered version. Version number shown in the footer (PO-7). Header logos (PO-4). Wizard and prompt changes from user feedback (PO-5). Risk register and site mitigations (PO-11). |
