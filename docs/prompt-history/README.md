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
| v0.7.2 | 8 October 2026 | 2 questions removed (anythingElse_4, anythingElse_5). | [v0.7.2.md](v0.7.2.md) |
| v0.7.1 | 7 October 2026 | Prompt changed for 27 questions (foundation_6, foundation_1, foundation_7, foundation_2, foundation_3, foundation_5, foundation_8, foundation_9, foundation_4, awareness_1, awareness_2, awareness_3, awareness_4, awareness_5, awareness_6, awareness_7, optimise_7, optimise_8, optimise_2, optimise_1, optimise_4, optimise_5, anythingElse_4, anythingElse_5, anythingElse_1, anythingElse_2, anythingElse_3). | [v0.7.1.md](v0.7.1.md) |
| v0.7.0 | 7 October 2026 | 3 answer-style paragraphs changed (caseStudy, factual, simple). 9 questions added (foundation_6, foundation_7, foundation_8, foundation_9, awareness_7, optimise_7, optimise_8, anythingElse_4, anythingElse_5). 1 question removed (optimise_6). Prompt changed for 18 questions (foundation_1, foundation_2, foundation_3, foundation_5, foundation_4, awareness_1, awareness_2, awareness_3, awareness_4, awareness_5, awareness_6, optimise_2, optimise_1, optimise_4, optimise_5, anythingElse_1, anythingElse_2, anythingElse_3). Wording shown on the site changed for 18 questions (foundation_1, foundation_2, foundation_3, foundation_5, foundation_4, awareness_1, awareness_2, awareness_3, awareness_4, awareness_5, awareness_6, optimise_2, optimise_1, optimise_4, optimise_5, anythingElse_1, anythingElse_2, anythingElse_3). | [v0.7.0.md](v0.7.0.md) |
| v0.6.0 | 6 October 2026 | Starter prompt changed. How the prompt is put together changed (prompt list). | [v0.6.0.md](v0.6.0.md) |
| v0.5.0 | 3 October 2026 | How the prompt is put together changed (prompt list). | [v0.5.0.md](v0.5.0.md) |
| v0.4.0 | 3 October 2026 | 3 answer-style paragraphs added (caseStudy, factual, simple). How the prompt is put together changed (personalised prompt, prompt list, answer style). | [v0.4.0.md](v0.4.0.md) |
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
