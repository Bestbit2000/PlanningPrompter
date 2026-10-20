// The tool inside a frame on another site (PO-91), using the mock of the consumerduty.org
// page that tests/server.mjs serves at /__host.
import { test, expect, type Tool } from '../helpers/tool';
import type { Page, Frame } from '@playwright/test';

// Positions can be a fraction of a pixel apart after rounding
const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) <= 1);

const ROUTES = ['Use a starting prompt', 'Choose from a curated list', 'Personalise a prompt'];

async function openHost(page: Page, query = '') {
  await page.goto('/__host' + query);
  const handle = await page.locator('#blockrandom').elementHandle();
  const frame = (await handle!.contentFrame()) as Frame;
  await expect(frame.locator('main[data-screen-label]').first()).toBeVisible();
  return frame;
}

// The frame's height, the tool's own height, and whether the frame scrolls inside
const measure = (page: Page) => page.evaluate(() => {
  const f = document.getElementById('blockrandom') as HTMLIFrameElement;
  const d = f.contentDocument!, w = f.contentWindow!;
  const shell = d.querySelector('.app-shell')!;
  return {
    frame: Math.round(f.getBoundingClientRect().height),
    tool: Math.ceil(shell.getBoundingClientRect().height),
    innerScroll: d.documentElement.scrollHeight > w.innerHeight + 1 && getComputedStyle(d.documentElement).overflowY !== 'hidden',
    classes: d.documentElement.className
  };
});

test.describe('In a frame, with the host page snippet', () => {
  for (const viewport of [{ width: 1600, height: 860 }, { width: 375, height: 812 }]) {
    test(`the frame fits every screen, growing and shrinking, at ${viewport.width}px`, async ({ tool, page }) => {
      await page.setViewportSize(viewport);
      const frame = await openHost(page);
      const fits = async () => {
        await expect.poll(async () => { const m = await measure(page); return m.frame === m.tool; }).toBe(true);
        const m = await measure(page);
        expect(m.innerScroll).toBe(false);
        expect(m.classes).toBe('embedded embed-fit');
        return m.frame;
      };
      const heights = [await fits()];
      for (const route of ROUTES) {
        await frame.getByRole('button', { name: 'Start again' }).click();
        await frame.getByRole('button', { name: route, exact: true }).click();
        heights.push(await fits());
      }
      await frame.getByRole('button', { name: 'Start again' }).click();
      expect(await fits()).toBe(heights[0]);
      expect(new Set(heights).size).toBeGreaterThan(2);
    });
  }

  test('a new screen brings the top of the tool back into view', async ({ tool, page }) => {
    await page.setViewportSize({ width: 1600, height: 860 });
    const frame = await openHost(page);
    await page.evaluate(() => window.scrollTo(0, 900));
    await frame.getByRole('button', { name: 'Use a starting prompt', exact: true }).click();
    await expect.poll(() => page.locator('#blockrandom').evaluate((f) => f.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  });

  test('dialogs and messages appear in the part of the frame on screen', async ({ tool, page }) => {
    await page.setViewportSize({ width: 1600, height: 860 });
    const frame = await openHost(page);
    // The part of the frame in the window, in the frame's own coordinates
    const visible = () => page.evaluate(() => {
      const r = document.getElementById('blockrandom')!.getBoundingClientRect();
      return [Math.round(Math.max(0, -r.top)), Math.round(Math.min(r.height, innerHeight - r.top))];
    });
    const box = (sel: string) => frame.locator(sel).evaluate((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; });

    await page.evaluate(() => window.scrollTo(0, 1200));
    await frame.getByRole('link', { name: 'Read important information about this site' }).last().click();
    await expect(frame.getByRole('dialog')).toBeVisible();
    await expect.poll(async () => near(await box('.viewport-overlay'), await visible())).toBe(true);
    const [top, bottom] = await visible();
    const dialog = await box('#info-modal-content');
    expect(dialog[0]).toBeGreaterThanOrEqual(top);
    expect(dialog[1]).toBeLessThanOrEqual(bottom);
    await frame.locator('body').press('Escape');

    await frame.getByRole('button', { name: 'Start again' }).click();
    await frame.getByRole('button', { name: 'Use a starting prompt', exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 700));
    await frame.getByRole('button', { name: 'Copy prompt' }).click();
    await frame.getByRole('button', { name: 'Choose your AI assistant' }).click();
    await expect.poll(async () => near(await box('#copy-modal'), await visible())).toBe(true);
    await expect.poll(async () => near([(await box('#toast-container'))[1]], [(await visible())[1] - 20])).toBe(true);
  });

  test('the snippet still wins if the old "height: 100vh !important" line is left in', async ({ tool, page }) => {
    await page.setViewportSize({ width: 1600, height: 860 });
    await openHost(page, '?keep100vh=1');
    await expect.poll(async () => { const m = await measure(page); return m.frame === m.tool && m.frame > 860; }).toBe(true);
  });
});

test.describe('In a frame, without the snippet', () => {
  test('works as it did before: the frame is one window tall and scrolls inside', async ({ tool, page }) => {
    await page.setViewportSize({ width: 1600, height: 860 });
    const frame = await openHost(page, '?snippet=0');
    const m = await measure(page);
    expect(m.classes).toBe('embedded');
    expect(m.frame).toBe(860);
    expect(m.innerScroll).toBe(true);
    await frame.getByRole('button', { name: 'Choose from a curated list', exact: true }).click();
    await expect(frame.getByRole('heading', { level: 1, name: 'Prompt list' })).toBeVisible();
  });
});

test('opened on its own, nothing changes', async ({ tool, page }) => {
  await tool.open();
  expect(await page.evaluate(() => document.documentElement.className)).toBe('');
  expect(await page.locator('.app-shell').evaluate((el) => getComputedStyle(el).minHeight)).toBe('800px');
  expect(await page.evaluate(() => typeof (window as any).embedFrame)).toBe('undefined');
});
