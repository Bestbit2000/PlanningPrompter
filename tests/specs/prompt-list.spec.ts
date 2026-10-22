// "Let me choose": three shortlisting questions, a shortlist, and one combined prompt.
import { test, expect, SITE, type Tool } from '../helpers/tool';
import { STAGES, STYLES } from '../helpers/prompts';

const rows = (tool: Tool) => tool.page.locator('label.question-row');
const shortlistText = async (tool: Tool) =>
  (await rows(tool).evaluateAll((els) => els.map((el) => el.textContent!.replace(/\s+/g, ' ').trim()))).join('\n');

test.describe('Prompt list', () => {
  test.beforeEach(async ({ tool }) => {
    await tool.open();
    await tool.button('Choose from a curated list').click();
  });

  test('asks three questions, one at a time, with Back', async ({ tool, page }) => {
    await expect(page).toHaveTitle('Step 1 of 2: Select questions – ' + SITE);
    await tool.expectFocusOn('Prompt list');
    await expect(tool.heading(3, STAGES[0] && 'Where are you in your retirement income planning?')).toBeVisible();
    await expect(page.getByRole('button', { name: '← Back' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Summary' })).toBeDisabled();

    await tool.button(STAGES[1].label).click();
    await expect(page.getByText('Question 2 of 3')).toBeVisible();
    await tool.expectFocusOn('What do you want to know?');
    for (const t of STAGES[1].topics) await expect(tool.button(t.label)).toBeVisible();

    // Back keeps the answer and shows it as chosen
    await tool.button('← Back').click();
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    await expect(tool.button(STAGES[1].label)).toHaveCSS('border-top-width', '2px');

    // A different stage offers that stage's topics
    await tool.button(STAGES[2].label).click();
    for (const t of STAGES[2].topics) await expect(tool.button(t.label)).toBeVisible();
    await tool.button(STAGES[2].topics[0].label).click();
    await expect(tool.heading(3, 'How do you want your results?')).toBeVisible();
    for (const s of STYLES) await expect(tool.button(s.label)).toBeVisible();
    await tool.button(STYLES[0].label).click();
    await expect(page.getByText("Here are the prompts that best match what you're looking for.", { exact: false })).toBeVisible();

    await tool.expectCounts([
      { event: 'route_chosen', detail: 'list|landing' },
      { event: 'shortlist_answer', detail: 'stage|soon|list' },
      { event: 'shortlist_answer', detail: 'stage|taking|list' },
      { event: 'shortlist_answer', detail: `topic|${STAGES[2].topics[0].id}|list` },
      { event: 'shortlist_answer', detail: 'style|caseStudy|list' }
    ]);
  });

  for (const stage of STAGES) {
    for (const topic of stage.topics) {
      test(`shortlist for "${stage.label}" / "${topic.label}"`, async ({ tool }) => {
        await tool.answerQuiz(stage.label, topic.label, STYLES[1].label);
        expect(await shortlistText(tool)).toMatchSnapshot(`shortlist-${topic.id}.txt`);
      });
    }
  }

  test('select, deselect and unselect, and the create button follows', async ({ tool, page }) => {
    await tool.answerQuiz(STAGES[0].label, STAGES[0].topics[0].label, STYLES[0].label);
    const create = tool.button('Create my prompt →');
    await expect(page.getByText('No questions selected')).toBeVisible();
    await expect(create).toBeDisabled();

    // No "Select all": at most three questions go in one prompt (PO-126)
    await expect(tool.button('Select all')).toHaveCount(0);
    for (const i of [0, 1, 2]) await rows(tool).nth(i).click();
    await expect(tool.button('Unselect 3 questions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Summary' })).toBeEnabled();
    await tool.button('Deselect all').click();
    await expect(create).toBeDisabled();

    await rows(tool).first().click();
    await expect(rows(tool).first()).toHaveCSS('border-top-color', 'rgb(44, 132, 148)');
    await expect(tool.button('Unselect 1 question')).toBeVisible();
    await rows(tool).nth(1).click();
    await tool.button('Unselect 2 questions').click();
    await expect(page.getByText('No questions selected')).toBeVisible();

    // "Change your answers" starts the questions again and clears the choice
    await rows(tool).first().click();
    await tool.button('Change your answers').click();
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
  });

  for (const style of STYLES) {
    test(`the combined prompt, answer style "${style.label}"`, async ({ tool, page }) => {
      const topic = STAGES[1].topics[1];
      await tool.answerQuiz(STAGES[1].label, topic.label, style.label);
      const n = 3;
      for (let i = 0; i < n; i++) await rows(tool).nth(i).click();
      await tool.button('Create my prompt →').click();

      await expect(tool.heading(2, 'Step 2: Summary')).toBeFocused();
      await expect(page).toHaveTitle('Your prompt is ready – ' + SITE);
      await expect(tool.heading(3, `${n} questions in this prompt`)).toBeVisible();
      await expect(page.locator('main li')).toHaveCount(n);
      await expect(page.getByRole('button', { name: '✓ Select questions' })).toBeVisible();
      const prompt = (await page.getByRole('region', { name: 'Your prompt' }).textContent())!;
      expect(prompt).toMatchSnapshot(`list-prompt-${style.id}.txt`);
      await expect.poll(() => tool.countsOf('question_used').length).toBe(n);
      expect(tool.countsOf('question_used').sort().join('\n')).toMatchSnapshot(`list-questions-used-${style.id}.txt`);
      await tool.expectCounts([{ event: 'prompt_ready', detail: 'list' }]);

      await tool.clearClipboard();
      await tool.button('Copy prompt').click();
      await expect(tool.toast()).toHaveText(/Prompt copied/);
      expect(await tool.clipboard()).toBe(prompt);
      await tool.expectCounts([{ event: 'prompt_copied', detail: 'list' }]);

      await tool.button('Choose your AI assistant').click();
      await page.locator('#copy-modal input[value="chatgpt"]').check();
      await page.locator('#launch-chat-btn').click();
      await expect.poll(() => tool.opened()).toEqual(['https://chatgpt.com/?q=' + encodeURIComponent(prompt)]);
      await tool.expectCounts([{ event: 'launch_dialog_opened', detail: 'list' }, { event: 'chatbot_launched', detail: 'chatgpt|list' }]);
      expect(tool.countsOf('prompt_ready')).toEqual(['list']);
    });
  }

  test('a fourth question is refused with a message, and freeing a place lets it in (PO-126)', async ({ tool, page }) => {
    await tool.answerQuiz(STAGES[1].label, STAGES[1].topics[1].label, STYLES[0].label);
    await expect(page.getByText('Select up to 3 topics you want to cover', { exact: false })).toBeVisible();
    for (const i of [0, 1, 2]) await rows(tool).nth(i).click();
    await rows(tool).nth(3).click();
    await expect(rows(tool).nth(3).locator('input')).not.toBeChecked();
    await expect(tool.toast()).toHaveText(/You can choose up to 3 questions for one prompt/);
    await expect(tool.button('Unselect 3 questions')).toBeVisible();
    await rows(tool).nth(0).click();
    await rows(tool).nth(3).click();
    await expect(rows(tool).nth(3).locator('input')).toBeChecked();
    await expect(tool.button('Unselect 3 questions')).toBeVisible();
  });

  test('the word budget is added for two or more questions, and not for one (PO-127)', async ({ tool, page }) => {
    const promptText = async () => (await page.getByRole('region', { name: 'Your prompt' }).textContent())!;
    await tool.answerQuiz(STAGES[1].label, STAGES[1].topics[1].label, STYLES[2].label);
    await rows(tool).nth(0).click();
    await tool.button('Create my prompt →').click();
    expect(await promptText()).not.toContain('How to answer these together');
    await tool.button('Change my questions').click();
    await rows(tool).nth(1).click();
    await tool.button('Create my prompt →').click();
    const two = await promptText();
    expect(two).toContain('How to answer these together:');
    expect(two).toContain('I have asked 2 questions.');
    // Short and simple has its own, smaller budget: 100 + 150 for each question
    expect(two).toContain('no more than 400 words: about 150 words for each question');
    expect(two.trim().endsWith('Everything else I asked for in each question still applies.')).toBe(true);
  });

  test('one question says "1 question", and "Change my questions" goes back with the choice kept', async ({ tool, page }) => {
    await tool.answerQuiz(STAGES[0].label, STAGES[0].topics[1].label, STYLES[2].label);
    await rows(tool).first().click();
    await tool.button('Create my prompt →').click();
    await expect(tool.heading(3, '1 question in this prompt')).toBeVisible();
    await tool.button('Change my questions').click();
    await expect(rows(tool).first().locator('input')).toBeChecked();
    await page.getByRole('button', { name: '2. Summary' }).click();
    await expect(tool.heading(2, 'Step 2: Summary')).toBeVisible();
    await page.getByRole('button', { name: '✓ Select questions' }).click();
    await expect(tool.button('Create my prompt →')).toBeVisible();
  });

  test('"Personalise the prompt" carries the chosen questions into step 2 of the wizard', async ({ tool, page }) => {
    await tool.answerQuiz(STAGES[0].label, STAGES[0].topics[0].label, STYLES[0].label);
    await rows(tool).nth(0).click();
    await rows(tool).nth(2).click();
    await tool.button('Create my prompt →').click();
    await tool.button('Personalise the prompt →').click();
    // A new route puts focus on its page heading, not the step's
    await expect(tool.heading(1, 'Build your prompt')).toBeFocused();
    await expect(tool.heading(2, 'Step 2: Profile & timeline')).toBeVisible();
    await page.getByRole('button', { name: '✓ Select questions' }).click();
    await expect(page.locator('label.question-row input:checked')).toHaveCount(2);
    await tool.expectCounts([{ event: 'route_chosen', detail: 'personalised|switch' }, { event: 'wizard_step', detail: '2' }]);
  });
});
