// What every back test gets (PO-92): a page on the test server that can reach nothing
// outside it, with the counts the tool sends, the addresses it tries to open and any
// script errors all recorded. A test fails if the page logs an error.
import { test as base, expect, type Page, type Locator } from '@playwright/test';

export { expect };

export type Count = { event: string; detail: string };

export const SITE = 'Retirement Income Prompt Generator';

export class Tool {
  readonly counts: Count[] = [];
  readonly errors: string[] = [];
  constructor(readonly page: Page) {}

  async open(path = '/') {
    await this.page.goto(path);
    await expect(this.page.locator('main[data-screen-label]').first()).toBeVisible();
  }

  button(name: string | RegExp, exact = true): Locator {
    return this.page.getByRole('button', { name, exact });
  }

  // Counts are sent a moment after the action, so wait for them
  async expectCounts(expected: Count[]) {
    await expect.poll(() => this.counts.slice(), { timeout: 3000 }).toEqual(expect.arrayContaining(expected));
  }

  countsOf(event: string) {
    return this.counts.filter((c) => c.event === event).map((c) => c.detail);
  }

  // Addresses passed to window.open, which the tests catch instead of opening
  opened(): Promise<string[]> {
    return this.page.evaluate(() => (window as any).__opened.slice());
  }

  // Windows' clipboard turns each line break into CR LF; the tool copies LF only
  async clipboard(): Promise<string> {
    return (await this.page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
  }

  async clearClipboard() {
    await this.page.evaluate(() => navigator.clipboard.writeText(''));
  }

  heading(level: number, name: string | RegExp) {
    return this.page.getByRole('heading', { level, name });
  }

  // The screen's heading should have keyboard focus after a screen change (PO-21)
  async expectFocusOn(name: string | RegExp) {
    await expect(this.page.locator(':focus')).toHaveText(name);
  }

  toast() {
    return this.page.locator('#toast-container [role="alert"]');
  }

  // The prompt list's three shortlisting questions, answered by their labels
  async answerQuiz(stage: string, topic: string, style: string) {
    for (const [n, label] of [stage, topic, style].entries()) {
      await expect(this.page.getByText(`Question ${n + 1} of 3`)).toBeVisible();
      await this.button(label).click();
    }
  }
}

export const test = base.extend<{ tool: Tool }>({
  tool: async ({ page, context }, use) => {
    const tool = new Tool(page);

    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'localhost') return route.abort();
      if (url.pathname === '/__count') {
        const body = JSON.parse(route.request().postData() || '{"events":[]}');
        tool.counts.push(...body.events);
        return route.fulfill({ status: 204 });
      }
      return route.continue();
    });

    await context.addInitScript(() => {
      (window as any).__opened = [];
      window.open = ((url: string) => { (window as any).__opened.push(String(url)); return null; }) as any;
      // Links to outside sites open nothing during a test. Added after stats.js's own
      // listener, which counts the click first.
      window.addEventListener('click', (e) => {
        const a = (e.target as Element)?.closest?.('a[target="_blank"]');
        if (a) e.preventDefault();
      });
    });

    page.on('pageerror', (err) => tool.errors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') tool.errors.push(msg.text()); });

    await use(tool);

    expect(tool.errors, 'script errors on the page').toEqual([]);
  }
});
