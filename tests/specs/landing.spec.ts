// The first screen: what it offers, its links, and the important information dialog.
import { test, expect, SITE } from '../helpers/tool';

test.describe('Landing page', () => {
  test('shows the hero, the three routes and the footer', async ({ tool, page }) => {
    await tool.open();
    await expect(page).toHaveTitle(SITE);
    await expect(tool.heading(1, 'Ask AI better questions about your retirement income')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Retirement Income Taskforce' })).toBeVisible();
    for (const bot of ['ChatGPT', 'Claude', 'Copilot', 'Gemini', 'Perplexity']) {
      await expect(page.locator('.landing-hero-badge', { hasText: bot })).toBeVisible();
    }
    for (const h of ['Retirement isn’t one decision', 'Most of us are unprepared', 'More of us are using AI', 'This isn’t financial advice']) {
      await expect(tool.heading(3, h)).toBeVisible();
    }
    await expect(tool.heading(2, 'Choose a way to get your prompt')).toBeVisible();
    for (const [h, b] of [['Help me start', 'Use a starting prompt'], ['Let me choose', 'Choose from a curated list'], ['Tailor to me', 'Personalise a prompt']]) {
      await expect(tool.heading(3, h)).toBeVisible();
      await expect(tool.button(b)).toBeVisible();
    }
    await expect(page.locator('.app-version')).toHaveText(/^v\d+\.\d+\.\d+ · Last reviewed .+/);
    await tool.expectCounts([{ event: 'landing_view', detail: '' }]);
  });

  test('runs nothing in the background once the page has loaded (PO-93)', async ({ tool, page }) => {
    await page.addInitScript(() => {
      (window as any).__intervals = 0;
      const set = window.setInterval;
      window.setInterval = ((...args: any[]) => { (window as any).__intervals++; return (set as any)(...args); }) as any;
    });
    await tool.open();
    await tool.button('Use a starting prompt').click();
    await tool.button('Copy prompt').click();
    expect(await page.evaluate(() => (window as any).__intervals)).toBe(0);
  });

  test('"Get started" jumps to the three routes', async ({ tool, page }) => {
    await tool.open();
    await page.getByRole('link', { name: 'Get started ↓' }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(page.locator('#how-it-works')).toBeInViewport();
  });

  test('outside links open in a new tab, are marked as such, and are counted', async ({ tool, page }) => {
    await tool.open();
    const footer = page.locator('footer.landing-footer');
    const links = [
      ['Free guidance from MoneyHelper', 'https://www.moneyhelper.org.uk/en/pensions-and-retirement', 'moneyhelper'],
      ['Report a problem', 'https://consumerduty.org/keep-in-touch', 'report_problem']
    ];
    for (const [name, href, counted] of links) {
      const link = footer.getByRole('link', { name: new RegExp('^' + name) });
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener');
      await expect(link).toContainText('(opens in a new tab)');
      await link.click();
      await tool.expectCounts([{ event: 'help_link', detail: counted }]);
    }
  });

  test('the "Start again" button is on every screen and goes back to the start', async ({ tool, page }) => {
    await tool.open();
    for (const route of ['Use a starting prompt', 'Choose from a curated list', 'Personalise a prompt']) {
      await tool.button(route).click();
      await expect(page.locator('[data-screen-label="Landing"]')).toHaveCount(0);
      await tool.button('Start again').click();
      await expect(tool.heading(1, 'Ask AI better questions about your retirement income')).toBeVisible();
      await expect(page).toHaveTitle(SITE);
      await tool.expectFocusOn('Ask AI better questions about your retirement income');
    }
  });
});

test.describe('Important information dialog', () => {
  const opened = async (tool: any, page: any, linkName: string) => {
    const link = page.locator('footer.landing-footer').getByRole('link', { name: linkName, exact: true });
    await link.click();
    const dialog = page.getByRole('dialog', { name: 'Important information about this site' });
    await expect(dialog).toBeVisible();
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'Close');
    return { link, dialog };
  };

  test('opens from either footer link with all its sections, and is counted', async ({ tool, page }) => {
    await tool.open();
    const { dialog } = await opened(tool, page, 'Read important information about this site');
    for (const s of ['We only help you ask better questions.', 'AI answers aren’t guaranteed to be right.', 'This isn’t financial advice.',
      'You aren’t protected if a chatbot gets it wrong.', 'Free, impartial help is available.', 'Always speak to a professional.',
      'Watch out for scams.', 'Your privacy.', 'What we count.', 'What the companies that host this tool see.',
      'When you launch a chatbot.', 'Who is responsible and your rights.', 'We don’t endorse any chatbot.']) {
      await expect(dialog.locator('strong', { hasText: s })).toBeVisible();
    }
    await expect(dialog.getByRole('link', { name: /^FCA Register/ })).toHaveAttribute('href', 'https://register.fca.org.uk/');
    await expect(dialog.getByRole('link', { name: /^cookie and privacy policy/ })).toHaveAttribute('href', 'https://consumerduty.org/cookie-privacy-policy');
    await tool.expectCounts([{ event: 'help_link', detail: 'important_info' }]);
    await dialog.getByRole('link', { name: /^FCA Register/ }).click();
    await dialog.getByRole('link', { name: /^cookie and privacy policy/ }).click();
    await tool.expectCounts([{ event: 'help_link', detail: 'fca_register' }, { event: 'help_link', detail: 'privacy_policy' }]);

    await tool.button('Close').last().click();
    await expect(dialog).toHaveCount(0);
    await opened(tool, page, 'Privacy');
  });

  test('closes with Esc, the × button, the Close button or a click outside, and gives focus back', async ({ tool, page }) => {
    await tool.open();
    const closers = [
      async () => page.keyboard.press('Escape'),
      async () => page.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click(),
      async () => page.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click(),
      async () => page.locator('.viewport-overlay').click({ position: { x: 5, y: 5 } })
    ];
    for (const close of closers) {
      const { link, dialog } = await opened(tool, page, 'Read important information about this site');
      await close();
      await expect(dialog).toHaveCount(0);
      await expect(link).toBeFocused();
    }
  });

  test('keeps Tab and Shift+Tab inside the dialog', async ({ tool, page }) => {
    await tool.open();
    const { dialog } = await opened(tool, page, 'Read important information about this site');
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  });
});
