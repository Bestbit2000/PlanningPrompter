// Back tests for the Retirement Income Prompt Generator (PO-92), with the same runner as
// TheMusicLedger: Playwright and Chromium. They run against tests/server.mjs, which serves
// the repository as it is on disk. See tests/README.md.
import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const PORT = 5199;

export default defineConfig({
  testDir: './specs',
  // Traces go to the system temp folder: the repository is in a OneDrive folder, and
  // OneDrive locking a file mid-write fails a test for reasons that are nothing to do with the tool.
  outputDir: path.join(os.tmpdir(), 'planning-prompter-playwright-results'),
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  // Baselines: the prompts word for word, the counts and the layout, as the tool produced
  // them when they were recorded. Committed, so a change shows up as a failing test.
  // Record new ones with: npm run backtest:update
  snapshotPathTemplate: 'baselines/{arg}{ext}',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `node server.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 15_000
  }
});
