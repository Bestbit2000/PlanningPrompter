// "Help me start": the one all-purpose prompt.
import { test, expect, SITE } from '../helpers/tool';

test.describe('Starting prompt', () => {
  test.beforeEach(async ({ tool }) => {
    await tool.open();
    await tool.button('Use a starting prompt').click();
  });

  test('shows its three cards and the prompt, word for word', async ({ tool, page }) => {
    await expect(page).toHaveTitle('Help me start – ' + SITE);
    await tool.expectFocusOn('Help me start');
    for (const h of ['What it provides', 'How it works', 'What to expect', 'The prompt']) {
      await expect(tool.heading(2, h)).toBeVisible();
    }
    const prompt = page.getByRole('region', { name: 'The starter prompt' });
    expect(await prompt.textContent()).toMatchSnapshot('starter-prompt.txt');
    await tool.expectCounts([{ event: 'route_chosen', detail: 'starter|landing' }]);
  });

  test('"Copy prompt" copies it, says so, and is counted', async ({ tool, page }) => {
    const prompt = (await page.getByRole('region', { name: 'The starter prompt' }).textContent())!;
    await tool.clearClipboard();
    await tool.button('Copy prompt').click();
    await expect(tool.toast()).toHaveText(/Prompt copied/);
    expect(await tool.clipboard()).toBe(prompt);
    await tool.expectCounts([{ event: 'prompt_copied', detail: 'starter' }]);
  });

  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
    test(`the "Prompt copied" message is centred at the bottom, at ${viewport.width}px (PO-100)`, async ({ tool, page }) => {
      await page.setViewportSize(viewport);
      await tool.button('Copy prompt').click();
      await expect(tool.toast()).toBeVisible();
      await page.waitForTimeout(400);
      const box = (await tool.toast().boundingBox())!;
      expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
      expect(Math.round(viewport.height - (box.y + box.height))).toBe(20);
      expect(box.x).toBeGreaterThanOrEqual(16);
    });
  }

  test('"Choose your AI assistant" opens the chatbot dialog for the starter prompt', async ({ tool, page }) => {
    await tool.button('Choose your AI assistant').click();
    await expect(page.getByRole('dialog', { name: 'Choose your AI assistant' })).toBeVisible();
    await tool.expectCounts([{ event: 'launch_dialog_opened', detail: 'starter' }, { event: 'prompt_ready', detail: 'starter' }]);
  });

  test('"Choose from a list" moves to the prompt list', async ({ tool, page }) => {
    await tool.button('Choose from a list →').click();
    await expect(tool.heading(1, 'Prompt list')).toBeVisible();
    await tool.expectCounts([{ event: 'route_chosen', detail: 'list|switch' }]);
  });
});
