// Opening index.html straight from disk, with no server (PO-97), and the hash check on
// React that still applies whenever the page is served.
import { test as base, expect } from '@playwright/test';
import { test } from '../helpers/tool';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const INDEX = pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'index.html')).href;

// Messages a page opened from disk always logs, and that do not stop it working: the
// runtime re-reads its own page for its editor and carries on when it cannot.
const EXPECTED_FROM_DISK = [/Fetch API cannot load file:/];

base.describe('Opened from disk', () => {
  base('starts, and a route works end to end', async ({ page, context }) => {
    // Nothing leaves the machine: the live counter and every other site are blocked
    await context.route(/^https?:/, (route) => route.abort());
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(INDEX);
    await expect(page.getByRole('heading', { level: 1, name: 'Ask AI better questions about your retirement income' })).toBeVisible();
    expect(await page.evaluate(() => typeof (window as any).React)).toBe('object');

    // The new-tab mark is part of the stylesheet, so it shows from disk too
    const mark = await page.locator('footer a[target="_blank"]').first().evaluate((a) => {
      const cs = getComputedStyle(a, '::after');
      return { mask: cs.getPropertyValue('mask-image') || cs.getPropertyValue('-webkit-mask-image'), width: cs.width };
    });
    expect(mark.mask).toMatch(/^url\("data:image\/svg\+xml/);
    expect(parseFloat(mark.width)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Use a starting prompt', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Help me start' })).toBeVisible();
    await page.getByRole('button', { name: 'Choose your AI assistant' }).click();
    await expect(page.getByRole('dialog', { name: 'Choose your AI assistant' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Start again' }).click();
    await page.getByRole('button', { name: 'Choose from a curated list', exact: true }).click();
    await expect(page.getByText('Question 1 of 3')).toBeVisible();

    // The live counter's address is blocked here, so its failed request is expected too
    const unexpected = errors.filter((e) => !EXPECTED_FROM_DISK.some((re) => re.test(e)) && !/Failed to load resource/.test(e));
    expect(unexpected).toEqual([]);
  });
});

test.describe('Served over http', () => {
  test('React is loaded with its hashes', async ({ tool, page }) => {
    await tool.open();
    const scripts = await page.locator('script[src*="vendor/react"]').evaluateAll((els) =>
      els.map((s) => ({ src: s.getAttribute('src'), integrity: s.getAttribute('integrity'), crossorigin: s.getAttribute('crossorigin') })));
    expect(scripts).toHaveLength(2);
    for (const s of scripts) {
      expect(s.integrity).toMatch(/^sha384-/);
      expect(s.crossorigin).toBe('anonymous');
    }
  });
});

base('Served over http, a React file that does not match its hash is refused', async ({ page, context, baseURL }) => {
  await context.route(/^https?:/, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'localhost') return route.abort();
    if (url.pathname.endsWith('/vendor/react.production.min.js')) {
      const real = await route.fetch();
      return route.fulfill({ response: real, body: (await real.text()) + '\n// changed' });
    }
    return route.continue();
  });
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(baseURL + '/');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => typeof (window as any).React)).toBe('undefined');
  expect(errors.join('\n')).toMatch(/integrity/i);
});
