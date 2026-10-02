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
5. **Commit and tag** — commit with the message `Release vX.Y.Z`, then tag it:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
6. **Publish** — push the commit to production, then push the tag on its own:
   ```bash
   git push origin main
   ```
   ```bash
   git push origin vX.Y.Z
   ```
   Push them separately. Twice, pushing the commit and tag together did not
   start a GitHub Pages build, so the live site stayed on the old version.
7. **Verify** — load https://bestbit2000.github.io/PlanningPrompter/ and confirm
   the footer shows the new number.
8. **Update Jira** — move every Jira item included in the release to the status
   "Released". The items are the ones listed against the version in the release
   history below. Do this on every release, once step 7 has passed.

### Bug fix releases

A bug found in production is fixed on its own, without bundling unfinished
functionality, and goes through steps 2 to 8 as a Z release.

## Release history

| Version | Date | Changes |
|---|---|---|
| v0.3.0 | 2 October 2026 | Accessibility fixes from the PO-12 check: question rows can be selected by keyboard, both dialogs keep focus inside and close with Esc, each screen change moves focus to its heading and updates the page title, buttons and banners use a darker teal that passes contrast, and the focus ring shows on teal and dark backgrounds (PO-21). Unused `image-slot.js` removed. |
| v0.2.0 | 2 October 2026 | Tool placed under the Consumer Duty Alliance header: slim tool bar with "Start again", CDA logo and "Home" removed, Taskforce badge on the landing page (PO-16, PO-20). Footer reduced to two lines (PO-14). AI prompt text removed from the question lists and the list buttons tidied (PO-15). Step tabs scroll with arrows on narrow desktop windows and centre the active step (PO-17). Repository tidied for hand-off, with documents moved to docs/ (part of PO-18). |
| v0.1.1 | 2 October 2026 | Version number added to stylesheet and script addresses so a release is not shown with a cached stylesheet (PO-13). |
| v0.1.0 | 2 October 2026 | First numbered version. Version number shown in the footer (PO-7). Header logos (PO-4). Wizard and prompt changes from user feedback (PO-5). Risk register and site mitigations (PO-11). |
