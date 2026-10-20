// "Choose your AI assistant": picking a chatbot copies the prompt and opens it.
import { test, expect } from '../helpers/tool';

const CHATBOTS = [
  { value: 'chatgpt', name: 'ChatGPT', url: (q: string) => 'https://chatgpt.com/?q=' + q, autoFill: true },
  { value: 'claude', name: 'Claude', url: (q: string) => 'https://claude.ai/new?q=' + q, autoFill: true },
  { value: 'copilot', name: 'Copilot', url: () => 'https://copilot.microsoft.com', autoFill: false },
  { value: 'gemini', name: 'Gemini', url: () => 'https://gemini.google.com', autoFill: false },
  { value: 'perplexity', name: 'Perplexity', url: (q: string) => 'https://www.perplexity.ai/search/new?q=' + q, autoFill: true }
];

test.describe('Chatbot dialog', () => {
  test.beforeEach(async ({ tool }) => {
    await tool.open();
    await tool.button('Use a starting prompt').click();
  });

  test('starts with nothing chosen and the launch button off, and says what to check first', async ({ tool, page }) => {
    const opener = tool.button('Choose your AI assistant');
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Choose your AI assistant' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    await expect(dialog.getByRole('radio')).toHaveCount(5);
    for (const radio of await dialog.getByRole('radio').all()) await expect(radio).not.toBeChecked();
    await expect(dialog.locator('#launch-chat-btn')).toBeDisabled();
    await expect(dialog.locator('#launch-chat-btn')).toHaveText('Choose a chatbot above');
    await expect(dialog.getByText('Before you use the answer')).toBeVisible();
    await expect(dialog.getByRole('link', { name: /^MoneyHelper/ })).toHaveAttribute('href', 'https://www.moneyhelper.org.uk/en/pensions-and-retirement');
    for (const bot of CHATBOTS) {
      const label = dialog.locator('label', { has: page.locator(`input[value="${bot.value}"]`) });
      await expect(label).toContainText(bot.name);
      if (bot.autoFill) await expect(label).toContainText('Auto-fill'); else await expect(label).not.toContainText('Auto-fill');
    }
  });

  for (const bot of CHATBOTS) {
    test(`${bot.name}: copies the prompt and opens the right address`, async ({ tool, page }) => {
      const prompt = (await page.getByRole('region', { name: 'The starter prompt' }).textContent())!;
      await tool.button('Choose your AI assistant').click();
      const dialog = page.getByRole('dialog', { name: 'Choose your AI assistant' });
      await dialog.locator(`input[value="${bot.value}"]`).check();
      const launch = dialog.locator('#launch-chat-btn');
      await expect(launch).toBeEnabled();
      await expect(launch).toHaveText(`Copy and launch ${bot.name} (opens in a new tab)`);
      const note = dialog.locator('#capability-message');
      if (bot.autoFill) await expect(note).toBeHidden();
      else await expect(note).toHaveText(`${bot.name} can't be filled in for you. Your prompt will be copied: when ${bot.name} opens, paste it into the message box (Ctrl+V, or Cmd+V on a Mac).`);

      await tool.clearClipboard();
      await launch.click();
      await expect.poll(() => tool.opened()).toEqual([bot.url(encodeURIComponent(prompt))]);
      await expect.poll(() => tool.clipboard()).toBe(prompt);
      await tool.expectCounts([{ event: 'chatbot_launched', detail: bot.value + '|starter' }]);
    });
  }

  test('changing the choice changes the button and the note', async ({ tool, page }) => {
    await tool.button('Choose your AI assistant').click();
    const dialog = page.getByRole('dialog', { name: 'Choose your AI assistant' });
    await dialog.locator('input[value="gemini"]').check();
    await expect(dialog.locator('#capability-message')).toBeVisible();
    await dialog.locator('input[value="claude"]').check();
    await expect(dialog.locator('#launch-chat-btn')).toHaveText('Copy and launch Claude (opens in a new tab)');
    await expect(dialog.locator('#capability-message')).toBeHidden();
  });

  test('closes with Esc, the × button or a click outside, and gives focus back', async ({ tool, page }) => {
    const opener = tool.button('Choose your AI assistant');
    const dialog = page.locator('#copy-modal');
    for (const close of [
      () => page.keyboard.press('Escape'),
      () => dialog.getByRole('button', { name: 'Close' }).click(),
      () => dialog.click({ position: { x: 5, y: 5 } })
    ]) {
      await opener.click();
      await expect(dialog).toBeVisible();
      await close();
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
    }
  });

  test('keeps Tab inside the dialog', async ({ tool, page }) => {
    await tool.button('Choose your AI assistant').click();
    const dialog = page.locator('#copy-modal');
    await dialog.locator('input[value="chatgpt"]').check();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
  });

  test('a failed copy still opens the chatbot and leaves a message that stays', async ({ tool, page }) => {
    await page.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error('blocked'));
      document.execCommand = () => false;
    });
    await tool.button('Choose your AI assistant').click();
    await page.locator('#copy-modal input[value="chatgpt"]').check();
    await page.locator('#launch-chat-btn').click();
    await expect.poll(() => tool.opened()).toHaveLength(1);
    await expect(tool.toast()).toHaveText(/The prompt could not be copied\. Select the text under “Your prompt” and copy it yourself\./);
    await page.waitForTimeout(5500);
    await expect(tool.toast()).toBeVisible();
    await tool.toast().getByRole('button', { name: 'Close notification' }).click();
    await expect(tool.toast()).toHaveCount(0);
  });
});
