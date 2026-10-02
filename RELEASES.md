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

The number lives in one place: `window.APP_VERSION` in [version.js](version.js).
The footer reads it from there, so nothing else needs editing.

## Environments

| Environment | Where | What it runs |
|---|---|---|
| Dev | Local checkout, opened in a browser | Work in progress |
| Production | The `main` branch on GitHub | The latest tagged release |

There is no staging environment, so checks before release happen in dev.

## Release cycle

1. **Build** — do the work for the Jira items in the release in dev. Leave
   `version.js` alone while work is in progress.
2. **Check** — walk through the landing page, the starter prompt, the prompt list
   and the full wizard in dev, on desktop and at phone width.
3. **Decide the number** — from the table above, based on the largest kind of
   change in the release.
4. **Bump** — update `window.APP_VERSION` in `version.js` and add an entry to the
   release history below.
5. **Commit and tag** — commit with the message `Release vX.Y.Z`, then tag it:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
6. **Publish** — push the commit and the tag to production:
   ```bash
   git push origin main --follow-tags
   ```
7. **Verify** — load production and confirm the footer shows the new number.
8. **Close out** — set the Jira fix version on the released items and move them
   to done.

### Bug fix releases

A bug found in production is fixed on its own, without bundling unfinished
functionality, and goes through steps 2 to 8 as a Z release.

## Release history

| Version | Date | Changes |
|---|---|---|
| v0.1.0 | Unreleased | First numbered version. Version number shown in the footer (PO-7). |
