// "Tailor to me": choose questions, add details over five steps, get one tailored prompt.
import { test, expect, SITE, type Tool } from '../helpers/tool';
import { STAGES, STYLES } from '../helpers/prompts';

const STEP_NAMES = ['Select questions', 'Profile', 'What you have', 'Goals', 'Future income', 'Concerns', 'Summary'];
const STEP_HEADINGS = ['Step 1: Select your questions', 'Step 2: Profile & timeline', 'Step 3: What you have now',
  'Step 4: Retirement goals', 'Step 5: Income you expect in retirement', 'Step 6: Concerns & anything else'];
const SOURCES = ['src_state', 'src_db', 'src_dc', 'src_annuity', 'src_rental', 'src_invest', 'src_business', 'src_inherit', 'src_other'];
const CONCERNS = ['c_runout', 'c_inflation', 'c_care', 'c_tax', 'c_market', 'c_early', 'c_partner', 'c_health', 'c_other'];

const rows = (tool: Tool) => tool.page.locator('label.question-row');
const next = (tool: Tool) => tool.button('Next →').click();

// Into the wizard with the shortlist answered and the given questions ticked
async function startWizard(tool: Tool, pick: number[] = [0, 1], style = STYLES[1].label) {
  await tool.open();
  await tool.button('Personalise a prompt').click();
  await tool.answerQuiz(STAGES[1].label, STAGES[1].topics[0].label, style);
  for (const i of pick) await rows(tool).nth(i).click();
}

async function fillEverything(tool: Tool) {
  const p = tool.page;
  await next(tool);
  await p.fill('#age', '58');
  await p.fill('#partnerAge', '56');
  await p.fill('#retireAge', '65');
  await p.fill('#country', 'United Kingdom');
  await p.selectOption('#employment', 'Self-employed');
  await p.selectOption('#health', 'Good');
  await p.fill('#dependants', '1');
  await p.selectOption('#risk', { index: 2 });
  await next(tool);
  await p.fill('#pension', '£150,000 across two pots');
  await p.fill('#savings', '£30,000 ISAs');
  await p.fill('#property', '£350,000 home, £50,000 owed');
  await p.fill('#income', '£70,000, paying in £8,000');
  await p.selectOption('#pensionAccess', 'Tax-free cash only');
  await p.selectOption('#partnerPensionAccess', 'Not sure');
  await p.fill('#financeNotes', 'One pot is in drawdown');
  await next(tool);
  await p.selectOption('#lifestyle', 'Moderate');
  await p.selectOption('#partTime', 'Possibly / undecided');
  await p.selectOption('#estate', 'Nice to have if possible');
  await p.fill('#plans', 'Travel and help the grandchildren');
  await next(tool);
  for (const id of SOURCES) await p.check('#' + id);
  await p.fill('#srcOtherText', 'Lodger');
  for (const [i, id] of SOURCES.entries()) {
    await p.fill(`#${id}_amt`, `£${i + 1},000 a year`);
    await p.fill(`#${id}_from`, `Age ${60 + i}`);
  }
  await p.fill('#srcNotes', 'My final salary pension is reduced before 65');
  await next(tool);
  for (const id of CONCERNS) await p.check('#' + id);
  await p.fill('#concernOtherText', 'Supporting an elderly parent');
  await p.fill('#question', 'Am I on track to retire at 65?');
}

const promptText = async (tool: Tool) => (await tool.page.getByRole('region', { name: 'Your tailored prompt' }).textContent())!;

test.describe('Personalised wizard', () => {
  test('step 1 asks the shortlisting questions, then shows the shortlist with the step buttons', async ({ tool, page }) => {
    await tool.open();
    await tool.button('Personalise a prompt').click();
    await expect(page).toHaveTitle('Step 1 of 7: Select questions – ' + SITE);
    await tool.expectFocusOn('Build your prompt');
    await expect(tool.heading(2, STEP_HEADINGS[0])).toBeVisible();
    for (const [i, name] of STEP_NAMES.entries()) {
      await expect(page.locator('.wizard-tabs button').nth(i)).toHaveText(`${i + 1}. ${name}`);
    }
    await expect(page.locator('.wizard-tabs button').first()).toHaveAttribute('aria-current', 'step');
    await expect(tool.button('Next →')).toHaveCount(0);

    await tool.answerQuiz(STAGES[0].label, STAGES[0].topics[2].label, STYLES[2].label);
    await expect(page.getByText('Here are the prompts that best match what you\'re looking for.')).toBeVisible();
    await expect(tool.button('← Back')).toBeDisabled();
    await expect(tool.button('Next →')).toBeVisible();
    await tool.expectCounts([
      { event: 'route_chosen', detail: 'personalised|landing' },
      { event: 'wizard_step', detail: '1' },
      { event: 'shortlist_answer', detail: 'stage|building|personalised' },
      { event: 'shortlist_answer', detail: `topic|${STAGES[0].topics[2].id}|personalised` },
      { event: 'shortlist_answer', detail: 'style|simple|personalised' }
    ]);
  });

  test('will not move on until a question is chosen, by Next or by the tabs', async ({ tool, page }) => {
    await startWizard(tool, []);
    const warning = page.getByRole('alert').filter({ hasText: 'Select at least one question below to continue.' });
    await next(tool);
    await expect(warning).toBeVisible();
    await expect(tool.heading(2, STEP_HEADINGS[0])).toBeVisible();
    await page.locator('.wizard-tabs button').nth(3).click();
    await expect(tool.heading(2, STEP_HEADINGS[0])).toBeVisible();
    await page.locator('.wizard-tabs button').nth(6).click();
    await expect(tool.heading(2, STEP_HEADINGS[0])).toBeVisible();
    await rows(tool).first().click();
    await expect(warning).toHaveCount(0);
    await next(tool);
    await expect(tool.heading(2, STEP_HEADINGS[1])).toBeVisible();
  });

  test('each step has its title, focus, tab marks and Back', async ({ tool, page }) => {
    await startWizard(tool);
    for (let n = 2; n <= 6; n++) {
      await next(tool);
      await expect(page).toHaveTitle(`Step ${n} of 7: ${STEP_NAMES[n - 1]} – ${SITE}`);
      await expect(tool.heading(2, STEP_HEADINGS[n - 1])).toBeFocused();
      await expect(page.locator('.wizard-tabs button').nth(n - 1)).toHaveAttribute('aria-current', 'step');
      for (let done = 1; done < n; done++) {
        await expect(page.locator('.wizard-tabs button').nth(done - 1)).toHaveText('✓ ' + STEP_NAMES[done - 1]);
      }
    }
    await expect(tool.button('Next →')).toHaveCount(0);
    await expect(tool.button('Create prompt →')).toBeVisible();
    await tool.button('← Back').click();
    await expect(tool.heading(2, STEP_HEADINGS[4])).toBeVisible();
    // Tabs jump straight to a step
    await page.locator('.wizard-tabs button').nth(1).click();
    await expect(tool.heading(2, STEP_HEADINGS[1])).toBeVisible();
    for (const n of ['2', '3', '4', '5', '6']) await tool.expectCounts([{ event: 'wizard_step', detail: n }]);
  });

  test('extra boxes appear only when they apply', async ({ tool, page }) => {
    await startWizard(tool);
    await next(tool);
    await next(tool);
    // The partner's pension question needs a partner's age with a number in it
    await expect(page.locator('#partnerPensionAccess')).toBeHidden();
    await page.locator('.wizard-tabs button').nth(1).click();
    await page.fill('#partnerAge', 'none');
    await page.locator('.wizard-tabs button').nth(2).click();
    await expect(page.locator('#partnerPensionAccess')).toBeHidden();
    await page.locator('.wizard-tabs button').nth(1).click();
    await page.fill('#partnerAge', '60');
    await page.locator('.wizard-tabs button').nth(2).click();
    await expect(page.locator('#partnerPensionAccess')).toBeVisible();

    await next(tool);
    await expect(page.locator('#target')).toBeHidden();
    await page.selectOption('#lifestyle', 'Other');
    await expect(page.locator('#target')).toBeVisible();

    await next(tool);
    await expect(page.locator('#src_db_amt')).toHaveCount(0);
    await page.check('#src_db');
    await expect(page.locator('#src_db_amt')).toHaveAttribute('placeholder', 'e.g. £9,000 a year');
    await expect(page.locator('#src_db_from')).toHaveAttribute('placeholder', 'e.g. Age 65');
    await expect(page.locator('#srcOtherText')).toHaveCount(0);
    await page.check('#src_other');
    await expect(page.locator('#srcOtherText')).toBeVisible();
    await page.uncheck('#src_db');
    await expect(page.locator('#src_db_amt')).toHaveCount(0);

    await next(tool);
    await expect(page.locator('#concernOtherText')).toHaveCount(0);
    await page.check('#c_other');
    await expect(page.locator('#concernOtherText')).toBeVisible();
  });

  test('with every box filled in: the prompt, the review and the counts', async ({ tool, page }) => {
    await startWizard(tool, [0, 1, 2]);
    await fillEverything(tool);
    await tool.button('Create prompt →').click();

    await expect(page).toHaveTitle('Your prompt is ready – ' + SITE);
    await expect(tool.heading(2, 'Step 7: Summary')).toBeFocused();
    await expect(page.locator('.wizard-tabs button').nth(6)).toHaveAttribute('aria-current', 'step');
    for (let i = 0; i < 6; i++) await expect(page.locator('.wizard-tabs button').nth(i)).toHaveText('✓ ' + STEP_NAMES[i]);
    expect(await promptText(tool)).toMatchSnapshot('wizard-prompt-everything.txt');

    const review = tool.button(/^Review the details you provided/, false);
    await expect(review).toHaveAttribute('aria-expanded', 'false');
    await review.click();
    await expect(review).toHaveAttribute('aria-expanded', 'true');
    const details = page.locator('[data-screen-label="Personalised Prompt"] > div').nth(1);
    expect((await details.innerText()).replace(/[ \t]+\n/g, '\n')).toMatchSnapshot('wizard-review-everything.txt');

    await expect.poll(() => tool.countsOf('field_used').length).toBeGreaterThan(40);
    expect(tool.countsOf('field_used').sort().join('\n')).toMatchSnapshot('wizard-fields-used.txt');
    expect(tool.countsOf('question_used').sort().join('\n')).toMatchSnapshot('wizard-questions-used.txt');
    expect(tool.countsOf('prompt_ready')).toEqual(['personalised']);

    // Edit goes back to that step with everything kept
    await page.getByRole('button', { name: 'Edit' }).nth(2).click();
    await expect(tool.heading(2, STEP_HEADINGS[3])).toBeVisible();
    await expect(page.locator('#plans')).toHaveValue('Travel and help the grandchildren');
    await page.locator('.wizard-tabs button').nth(6).click();
    expect(await promptText(tool)).toMatchSnapshot('wizard-prompt-everything.txt');

    await tool.clearClipboard();
    await tool.button('Copy prompt').click();
    await expect(tool.toast()).toHaveText(/Prompt copied/);
    expect(await tool.clipboard()).toBe(await promptText(tool));
    await tool.button('Choose your AI assistant').click();
    await page.locator('#copy-modal input[value="perplexity"]').check();
    await page.locator('#launch-chat-btn').click();
    await expect.poll(() => tool.opened()).toEqual(['https://www.perplexity.ai/search/new?q=' + encodeURIComponent(await promptText(tool))]);
    await tool.expectCounts([
      { event: 'prompt_copied', detail: 'personalised' },
      { event: 'launch_dialog_opened', detail: 'personalised' },
      { event: 'chatbot_launched', detail: 'perplexity|personalised' }
    ]);
  });

  test('with nothing but one question: the prompt and an empty review', async ({ tool, page }) => {
    await startWizard(tool, [0], STYLES[0].label);
    for (let n = 2; n <= 6; n++) await next(tool);
    await tool.button('Create prompt →').click();
    expect(await promptText(tool)).toMatchSnapshot('wizard-prompt-minimal.txt');
    await tool.button(/^Review the details you provided/, false).click();
    await expect(page.getByText('No additional details were entered.')).toBeVisible();
    expect(tool.countsOf('field_used')).toEqual([]);
  });

  for (const level of ['Minimum', 'Comfortable', 'Other']) {
    test(`lifestyle "${level}" and the boxes that only count in context`, async ({ tool, page }) => {
      await startWizard(tool, [1], STYLES[2].label);
      await next(tool);
      await page.fill('#age', '60');
      await page.fill('#retireAge', '67');
      // A partner's age with no number in it: the partner's pension answer must not count
      await page.fill('#partnerAge', 'n/a');
      await next(tool);
      await page.locator('.wizard-tabs button').nth(1).click();
      await page.fill('#partnerAge', '62');
      await page.locator('.wizard-tabs button').nth(2).click();
      await page.selectOption('#partnerPensionAccess', 'Taxable income or lump sums');
      await page.locator('.wizard-tabs button').nth(1).click();
      await page.fill('#partnerAge', 'n/a');
      await page.locator('.wizard-tabs button').nth(3).click();
      await page.selectOption('#lifestyle', level);
      if (level === 'Other') await page.fill('#target', '£3,500 a month');
      await page.locator('.wizard-tabs button').nth(5).click();
      // "Other concern" ticked with nothing typed adds nothing
      await page.check('#c_other');
      await tool.button('Create prompt →').click();
      expect(await promptText(tool)).toMatchSnapshot(`wizard-prompt-lifestyle-${level}.txt`);
    });
  }
});

test.describe('Personalised wizard on a narrow desktop window', () => {
  test.use({ viewport: { width: 860, height: 800 } });

  test('the step tabs have arrows when they do not fit, which switch off at each end', async ({ tool, page }) => {
    await startWizard(tool);
    const left = page.getByRole('button', { name: 'Show earlier steps' });
    const right = page.getByRole('button', { name: 'Show later steps' });
    const tabs = page.locator('.wizard-tabs');
    await expect(left).toBeVisible();
    await expect(left).toBeDisabled();
    await expect(right).toBeEnabled();
    while (await right.isEnabled()) {
      await right.click();
      await page.waitForTimeout(400);
    }
    expect(await tabs.evaluate((el) => el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)).toBe(true);
    await expect(left).toBeEnabled();
    await left.click();
    await expect.poll(() => tabs.evaluate((el) => el.scrollLeft + el.clientWidth < el.scrollWidth - 1)).toBe(true);
  });
});

test.describe('Personalised wizard at phone width', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the step tabs are swiped, not arrowed, and the current one is brought into view', async ({ tool, page }) => {
    await startWizard(tool);
    await expect(page.getByRole('button', { name: 'Show later steps' })).toBeHidden();
    const tabs = page.locator('.wizard-tabs');
    expect(await tabs.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    for (let n = 2; n <= 6; n++) {
      await next(tool);
      await expect.poll(() => page.locator('.wizard-tabs button[aria-current="step"]').evaluate((b) => {
        const t = b.getBoundingClientRect(), bar = b.parentElement!.getBoundingClientRect();
        return t.left >= bar.left - 1 && t.right <= bar.right + 1;
      })).toBe(true);
    }
  });
});
