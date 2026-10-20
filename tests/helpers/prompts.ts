// The questions and shortlisting answers in prompts.js, read the way the page reads them,
// so the tests can name every stage, topic and style without copying the wording.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'prompts.js');
const sandbox: any = { window: {} };
vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);

export const PROMPTS = sandbox.window.PROMPTS_DATA;
export const STAGES: { id: string; label: string; topics: { id: string; label: string }[] }[] = PROMPTS.shortlist.stages;
export const STYLES = [
  { id: 'caseStudy', label: 'In the style of real world case studies' },
  { id: 'factual', label: 'With numbers and facts' },
  { id: 'simple', label: 'Short and simple descriptions' }
];
