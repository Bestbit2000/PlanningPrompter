# Prompt history

What the tool would have sent to a chatbot at any point since the first numbered release.
Each release has a record of every prompt as it stood: the starter prompt, the answer-style
paragraphs, each question's prompt, and the page code that builds the personalised prompt.

## Finding what was asked on a given date

1. Find the last release in the table that went live on or before that date. Where several
   releases share a date, the later version replaced the earlier one the same day.
2. Open its record.
3. The exact files of any release can also be read from its git tag, for example
   `git show v0.3.0:prompts.js`.

| Release | Live from | What changed in the prompts | Record |
|---|---|---|---|
| v0.3.0 | 2 October 2026 | No change to any prompt. | [v0.3.0.md](v0.3.0.md) |
| v0.2.0 | 2 October 2026 | No change to any prompt. | [v0.2.0.md](v0.2.0.md) |
| v0.1.1 | 2 October 2026 | No change to any prompt. | [v0.1.1.md](v0.1.1.md) |
| v0.1.0 | 2 October 2026 | First recorded release. | [v0.1.0.md](v0.1.0.md) |

## Keeping it up to date

The records are written by `tools/prompt-history.js`, which is run as a step of every
release (see [RELEASES.md](../RELEASES.md)). Do not edit them by hand.

## What is not recorded

- What a user typed, or the finished personalised prompt they were given. The site does not
  store either.
- What the chatbot answered.
- Changes that were made and replaced between two releases without going live.
