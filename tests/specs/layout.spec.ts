// The layout baseline (PO-92): every screen and dialog, at desktop and phone width, must
// be laid out exactly as it was when the baseline was recorded. A clean-up that removes
// or moves styling should leave every one of these unchanged.
import { test, expect, type Tool } from '../helpers/tool';
import { layoutRecord } from '../helpers/layout';
import { STAGES, STYLES } from '../helpers/prompts';

const rows = (tool: Tool) => tool.page.locator('label.question-row');
const next = (tool: Tool) => tool.button('Next →').click();

async function toWizardStep(tool: Tool, step: number) {
  await tool.open();
  await tool.button('Personalise a prompt').click();
  await tool.answerQuiz(STAGES[1].label, STAGES[1].topics[0].label, STYLES[1].label);
  await rows(tool).first().click();
  const p = tool.page;
  if (step >= 2) { await next(tool); await p.fill('#age', '58'); await p.fill('#partnerAge', '56'); }
  if (step >= 3) { await next(tool); await p.selectOption('#partnerPensionAccess', 'Not sure'); }
  if (step >= 4) { await next(tool); await p.selectOption('#lifestyle', 'Other'); await p.fill('#target', '£3,000'); }
  if (step >= 5) { await next(tool); await p.check('#src_state'); await p.check('#src_other'); }
  if (step >= 6) { await next(tool); await p.check('#c_runout'); await p.check('#c_other'); }
}

const SCREENS: Record<string, (tool: Tool) => Promise<void>> = {
  'landing': async (tool) => { await tool.open(); },
  'landing-info-dialog': async (tool) => {
    await tool.open();
    await tool.page.getByRole('link', { name: 'Read important information about this site' }).click();
    await expect(tool.page.getByRole('dialog')).toBeVisible();
  },
  'starter': async (tool) => { await tool.open(); await tool.button('Use a starting prompt').click(); },
  'starter-chatbot-dialog': async (tool) => {
    await tool.open();
    await tool.button('Use a starting prompt').click();
    await tool.button('Choose your AI assistant').click();
    await tool.page.locator('#copy-modal input[value="gemini"]').check();
  },
  'list-question-1': async (tool) => { await tool.open(); await tool.button('Choose from a curated list').click(); },
  'list-question-2': async (tool) => {
    await tool.open();
    await tool.button('Choose from a curated list').click();
    await tool.button(STAGES[0].label).click();
  },
  'list-shortlist': async (tool) => {
    await tool.open();
    await tool.button('Choose from a curated list').click();
    await tool.answerQuiz(STAGES[2].label, STAGES[2].topics[1].label, STYLES[0].label);
    await rows(tool).nth(0).click();
    await rows(tool).nth(1).click();
  },
  'list-summary': async (tool) => {
    await tool.open();
    await tool.button('Choose from a curated list').click();
    await tool.answerQuiz(STAGES[2].label, STAGES[2].topics[1].label, STYLES[0].label);
    for (const i of [0, 1, 2]) await rows(tool).nth(i).click();
    await tool.button('Create my prompt →').click();
  },
  'wizard-step-1-quiz': async (tool) => { await tool.open(); await tool.button('Personalise a prompt').click(); },
  'wizard-step-1-warning': async (tool) => {
    await tool.open();
    await tool.button('Personalise a prompt').click();
    await tool.answerQuiz(STAGES[0].label, STAGES[0].topics[0].label, STYLES[2].label);
    await next(tool);
  },
  'wizard-step-2': (tool) => toWizardStep(tool, 2),
  'wizard-step-3': (tool) => toWizardStep(tool, 3),
  'wizard-step-4': (tool) => toWizardStep(tool, 4),
  'wizard-step-5': (tool) => toWizardStep(tool, 5),
  'wizard-step-6': (tool) => toWizardStep(tool, 6),
  'wizard-summary': async (tool) => {
    await toWizardStep(tool, 6);
    await tool.button('Create prompt →').click();
    await tool.button(/^Review the details you provided/, false).click();
  }
};

for (const [width, height, size] of [[1280, 800, 'desktop'], [375, 812, 'phone']] as const) {
  test.describe(`Layout at ${size} width`, () => {
    test.use({ viewport: { width, height } });
    for (const [name, go] of Object.entries(SCREENS)) {
      test(name, async ({ tool, page }) => {
        await go(tool);
        // Let anything that fades or slides in finish
        await page.waitForTimeout(400);
        expect(await layoutRecord(page)).toMatchSnapshot(`layout-${size}-${name}.txt`);
      });
    }
  });
}
