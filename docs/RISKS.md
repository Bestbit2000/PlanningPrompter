# Risk register and responses (PO-11)

What the Consumer Duty Alliance (CDA) is likely to worry about in the Retirement
Income Prompt Generator, and what has been done about each risk.

Last updated 2 October 2026, against site version v0.1.0. This is a product risk
review, not legal advice: the regulatory points (R1, R6) need sign-off from
someone qualified to give it.

## Why the CDA is exposed

The CDA is an independent, not-for-profit body that helps the financial planning
sector implement the FCA's Consumer Duty, and the Retirement Income Taskforce
exists to set standards for what good guidance looks like. A tool carrying both
logos will be judged against the Duty's own tests, whether or not the Duty
formally applies to it: does it support consumer understanding, avoid foreseeable
harm, and help people pursue their financial objectives?

The setting is also moving. The FCA's Mills Review (July 2026) singled out
general-purpose AI chatbots that shape consumer decisions from outside the
regulatory perimeter, and recommended a short review of how the advice/guidance
boundary applies to conversational journeys. Which? found in November 2025 that
leading chatbots gave inaccurate answers to a large share of consumer money
questions and missed a deliberately wrong ISA allowance. A tool that sends people
to those chatbots with the CDA's name on it sits squarely in that debate.

## How the responses are delivered

The aim is to keep the tool simple: no extra screens and no tick boxes. Each
response is delivered one of three ways.

- **On the site**: built and live in the code.
- **Optimisation rules**: every list prompt is rewritten by the prompt optimiser,
  so prompt-level protections are rules the optimiser must follow
  (`PROMPT_GUARDRAIL_RULES` in `scoring-criteria.js`) and the judge scores
  against. They take effect as each prompt is re-optimised.
- **Governance**: a process or decision outside the code.

## Risks and responses

Rating is likelihood and impact for the CDA together. Status is one of
**Done**, **Partly done** or **Open**.

### R1. The tool looks like, or leads to, personalised advice (High)

The CDA does not give regulated advice, but a prompt can push the AI towards it.

- **Optimisation rules:** the AI must not recommend a specific product,
  provider, fund or course of action, and must explain options and trade-offs
  instead. It must open by saying the answer is general information, not
  regulated advice.
- **On the site:** removed the notes claiming "The prompt asks for factual
  information", which was not true of the personalised prompt.
- **Governance:** legal or compliance review of the advice/guidance boundary and
  the financial promotion rules, repeated when the FCA acts on the Mills Review.
- **Status: Partly done.** The wording that wraps a personalised prompt is built
  by the site, not the optimiser, and still asks for "specific, practical
  guidance", "an honest assessment of my current position" and "strategies". It
  needs rewording by hand. The legal review is open.

### R2. The AI's answer is wrong and the user acts on it (High)

Out-of-date allowances, wrong tax treatment, invented rules.

- **Optimisation rules:** no tax year or figure may be written into a prompt.
  The AI must use the current UK tax year, say which year its figures are for,
  tell the user to check GOV.UK, and say when it is unsure. The judge's safety
  score penalises a missing tax year.
- **On the site:** the launch dialog now carries a "Before you use the answer"
  box whose first line is "Check the figures. AI chatbots can get facts and tax
  rules wrong."
- **Governance:** three-monthly re-test of every prompt in each chatbot, with a
  log of wrong answers found (PO-8).
- **Status: Partly done.** One list prompt still hard-codes 2024/25 figures
  until it is re-optimised. The re-test cycle is open.

### R3. Guardrails are inconsistent across prompts (High)

Only 1 of the 19 list prompts told the AI to say it is not giving advice.

- **Optimisation rules:** six guardrails now apply to every rewrite, so all list
  prompts carry the same protections.
- **Governance:** a named CDA owner signs off prompt wording before release.
- **Status: Partly done.** Takes effect as prompts are re-optimised. The starter
  prompt and the personalised prompt wrapper are written in the site code and do
  not pass through the optimiser, so they need the same six rules applied by
  hand. The three answer-style paragraphs in `prompts.js` (PO-30, added 3
  October 2026) are also written by hand: the optimiser tests each question
  with them attached but does not rewrite them, so they need the same sign-off.

### R4. The privacy claim was inaccurate (High)

The wizard said "Nothing here is saved or sent anywhere" while Microsoft Clarity
session analytics loaded on every page with no consent prompt.

- **On the site:** Clarity removed, so no cookie banner is needed. The sentence
  now reads "We don't store what you type — it only builds the text of your
  prompt, which is sent to the chatbot you choose." A privacy paragraph was
  added to the important information dialog, reached from a new "Privacy" link
  in the footer.
- **Governance:** short data protection note recording what is collected, why,
  and who receives it.
- **Status: Done on the site.** Session analytics are gone; if recordings of
  that kind are wanted later they need a consent prompt and masking on the
  wizard. The site still loads its font from Google, which sees the visitor's IP
  address. The data protection note is open.
- **Usage counts (PO-19, built 3 October 2026):** the site now counts how often
  each part of the tool is used. This is a different case from session
  recording, and was built so that no consent prompt is needed: it sends only
  the name of an event and fixed labels, never anything typed; it sets no
  cookie, stores nothing on the device and uses no visitor identifier; the
  counter keeps daily totals and no IP addresses; and nothing is sent when the
  browser signals Global Privacy Control or Do Not Track. The privacy paragraph
  says "We count how often each part of the tool is used, for example how many
  prompts are copied. The counts hold nothing about you or what you typed."
  Two points for the data protection note: the counter runs on Neon (a hosting
  company, in Frankfurt) on the maintainer's account until the CDA can host it,
  and Neon, like any host, sees the visitor's IP address when the count
  arrives, though the counter does not keep it. The added privacy sentence and
  the decision that no consent prompt is needed have not been signed off by
  whoever owns data protection for the CDA.

### R5. Personal and health data is sent to AI companies (High)

Launching a chatbot puts the whole prompt, including age, health status, pension
values and debts, into the web address sent to that provider.

- **On the site:** a line under the launch button says "This sends your prompt,
  including any details you entered, to the chatbot you choose. Don't include
  your name, address or account numbers." The same point is in the privacy
  paragraph. "Health status" is labelled optional, with a hint on why it is
  asked.
- **Status: Partly done.** The user is now told, but the data still travels in
  the web address and stays in browser history. Removing that would mean copy
  and paste only, which costs simplicity; this is an accepted trade-off unless
  the CDA decides otherwise.

### R6. Users have no consumer protection and may not realise (Medium)

A chatbot owes no duty of care, and there is no Financial Ombudsman Service or
FSCS route if things go wrong.

- **On the site:** the launch box says "It isn't financial advice, and you
  aren't protected if it's wrong." The important information dialog explains
  that the Ombudsman and FSCS do not apply.
- **Status: Done.**

### R7. Irreversible decisions and scams (Medium)

Follow-up questions could nudge a user towards cashing in, transferring a
defined benefit pension, or an unregulated investment.

- **Optimisation rules:** the AI must flag any step that cannot be undone and
  mention scam warning signs where relevant.
- **On the site:** a "Watch out for scams" paragraph in the important
  information dialog, pointing to the FCA Register.
- **Status: Partly done.** The rule takes effect as prompts are re-optimised. It
  does not carry into follow-up questions the user types themselves.

### R8. Free, impartial guidance was not signposted (Medium)

The only next step offered was a paid adviser, which could read as steering
towards CDA members.

- **Optimisation rules:** the AI must end by pointing to MoneyHelper, Pension
  Wise and a regulated adviser checked on the FCA Register.
- **On the site:** MoneyHelper is linked from the launch box, the footer and the
  important information dialog, which also explains Pension Wise and links the
  FCA Register.
- **Status: Done on the site.**

### R9. Implied endorsement of particular chatbots (Medium)

Claude was pre-selected in the launch dialog, and five logos appear on the
landing page.

- **On the site:** no chatbot is pre-selected; the launch button is disabled
  until the user picks one. The dialog says "We don't endorse any of them", and
  the important information dialog repeats it.
- **Governance:** confirm each provider is content with its logo being used, or
  replace logos with names.
- **Status: Partly done.** Logo permission is open.

### R10. Content goes stale (Medium)

Models and tax rules change; the prompts were tuned against one model.

- **On the site:** the footer shows "Last reviewed" beside the version number,
  set in `version.js`.
- **On the site (PO-23 and PO-24, added 3 October 2026):** step 4 offers the
  three levels of the Pensions UK Retirement Living Standards (Minimum,
  Moderate, Comfortable) with a monthly range beside each, taken from the 2026
  standards. The note under the list names the year and links to the source.
  The amounts are shown on the page only. The prompt names the level and asks
  the AI to use the current published figure, so no amount is written into it.
- **Governance:** the three-monthly re-test (PO-8) and testing across all five
  chatbots (PO-6, PO-9). Update "Last reviewed" only after a re-test.
- **Governance:** Pensions UK publishes new standards each year (the 2026 set
  came out on 3 June 2026). When it does, update the three ranges and the year
  in step 4 of `index.html`, at the comment marked "UPDATE EACH YEAR". The
  comment lists the yearly figures used and the rounding rule.
- **Status: Partly done.** The date shown is the date of this risk review, not
  of a prompt re-test; the re-test cycle is open. The yearly update of the
  lifestyle amounts has no named owner.

### R11. Vulnerable users (Medium)

People in poor health, recently bereaved or under financial pressure are the
most likely to act on a confident answer.

- **On the site:** health status is optional and explained; free guidance is
  signposted at the point of launch.
- **Status: Partly done.** The personalised prompt does not yet ask the AI to
  take extra care when the user reports poor health or certain concerns. That
  sits in the hand-written wrapper, alongside R1.

### R12. Internal tools are public (Low)

`prompt-editor.html` and `prompt-evaluater.html` are deployed with the site and
ask for an API key.

- **On the site:** both pages now tell search engines not to index them.
- **Status: Partly done.** Anyone with the address can still open them. Removing
  them from production depends on how the site is hosted.

### R13. No route to report a problem (Low)

- **On the site:** a "Report a problem" link in the footer goes to the CDA's
  "Keep in touch" page.
- **Governance:** name an owner who receives and acts on reports.
- **Status: Partly done.** The owner is open.

## Summary

| # | Risk | Rating | Status |
|---|---|---|---|
| R1 | Looks like, or leads to, personalised advice | High | Partly done |
| R2 | AI answer is wrong and the user acts on it | High | Partly done |
| R3 | Guardrails inconsistent across prompts | High | Partly done |
| R4 | Privacy claim inaccurate | High | Done on the site |
| R5 | Personal and health data sent to AI companies | High | Partly done |
| R6 | No consumer protection | Medium | Done |
| R7 | Irreversible decisions and scams | Medium | Partly done |
| R8 | Free guidance not signposted | Medium | Done on the site |
| R9 | Implied endorsement of chatbots | Medium | Partly done |
| R10 | Content goes stale | Medium | Partly done |
| R11 | Vulnerable users | Medium | Partly done |
| R12 | Internal tools public | Low | Partly done |
| R13 | No route to report a problem | Low | Partly done |

## Still open

1. Re-optimise all list prompts so the six guardrail rules take effect (R1, R2,
   R3, R7, R8).
2. Reword the personalised prompt wrapper and the starter prompt by hand to the
   same rules (R1, R3, R11).
3. Legal or compliance review of the advice/guidance boundary (R1, R6).
4. Three-monthly re-test cycle with a test log, PO-8 (R2, R10).
5. Named owner for prompt sign-off and for problem reports (R3, R13).
6. Chatbot logo permission (R9).
7. Data protection note (R4, R5).
8. Take the editor and evaluator pages out of production (R12).

## What cannot be fully mitigated

- The tool has no control over what the chatbot says. Prompt guardrails make a
  bad answer less likely; they do not prevent one, and they do not carry into
  follow-up questions the user types themselves.
- Once the user is in the chatbot, the CDA cannot see or correct the answer.
- A chatbot provider can change its model at any time, which is why the re-test
  cycle matters.

## Sources

- [Retirement Income Taskforce, Consumer Duty Alliance](https://consumerduty.org/working-groups/retirement-income-taskforce)
- [FCA: Advice Guidance Boundary Review](https://www.fca.org.uk/firms/advice-guidance-boundary-review) (targeted support in force from 6 April 2026)
- [FCA: AI and the future of retail financial services (the Mills Review)](https://www.fca.org.uk/publications/corporate-documents/mills-review)
- [A&O Shearman: Mills Review recommendations](https://www.aoshearman.com/en/insights/report-issued-by-the-mills-review-the-future-of-ai-in-retail-financial-services)
- [Which?: Can you trust AI? Chatbots put to the test](https://www.which.co.uk/news/article/can-you-trust-ai-chatgpt-and-other-ai-chatbots-put-to-the-test-aetjt5e0RnPB)
- [City AM: FCA eyes tougher AI rules as Brits turn to chatbots](https://www.cityam.com/fca-eyes-tougher-ai-rules-as-brits-turn-to-chatbots-for-financial-advice/)
- [Microsoft Clarity and GDPR guide](https://cookie-script.com/guides/microsoft-clarity-session-replay-gdpr)
