// Writes a readable record of every prompt as it stood in each release, so that anyone
// can later see what the tool would have sent to a chatbot on a given date (PO-33).
//
//   node tools/prompt-history.js
//
// For each release listed in docs/RELEASES.md it writes docs/prompt-history/vX.Y.Z.md,
// and it rewrites docs/prompt-history/README.md, the index of which release was live
// from which date and what changed in the prompts. A release that has a git tag is read
// from that tag. The release being prepared has no tag yet, so it is read from the files
// as they are now. Running it again changes nothing unless the prompts or the release
// list have changed. It is not part of the site and does not need to be hosted.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'prompt-history');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n');
const tags = new Set(git('tag').split('\n').filter(Boolean));

// The release history table in docs/RELEASES.md gives each version and the date it went live.
function releases() {
  const rows = [...read('docs/RELEASES.md').matchAll(/^\| (v\d+\.\d+\.\d+) \| ([^|]+) \|/gm)].map((m) => ({ version: m[1], date: m[2].trim() }));
  const parts = (v) => v.slice(1).split('.').map(Number);
  return rows.sort((a, b) => { const x = parts(a.version), y = parts(b.version); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
}

// The files of one release: from its tag, or from the working copy for the release in preparation.
function filesOf(version) {
  // The wording of "source" is the same either way, so the record does not change once the tag exists.
  const source = `the files of that release (git tag ${version})`;
  if (tags.has(version)) return { source, prompts: git('show', `${version}:prompts.js`), index: git('show', `${version}:index.html`) };
  const working = (read('version.js').match(/APP_VERSION = '([^']+)'/) || [])[1];
  if ('v' + working === version) return { source, prompts: read('prompts.js'), index: read('index.html') };
  return null;
}

// The source of one method of the page's component, from its first line to its closing "  };".
function method(index, name) {
  const lines = index.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`  ${name} = (`));
  if (start < 0) return null;
  if (/;\s*$/.test(lines[start]) && !lines[start].trimEnd().endsWith('{')) return lines[start].trim();
  const end = lines.findIndex((l, i) => i > start && l === '  };');
  return end < 0 ? null : lines.slice(start, end + 1).map((l) => l.replace(/^ {2}/, '')).join('\n');
}

function extract(files) {
  const sandbox = { window: {} };
  vm.runInNewContext(files.prompts, sandbox, { timeout: 2000 });
  const data = sandbox.window.PROMPTS_DATA || { sections: [] };
  const starterSource = (files.index.match(/const STARTER_PROMPT_DATA = (\{[\s\S]*?\n\});/) || [])[1];
  // Some prompt text carries Windows line endings inside it; the record uses plain ones throughout.
  const text = (v) => String(v || '').replace(/\r\n/g, '\n');
  const starter = starterSource ? text(vm.runInNewContext('(' + starterSource + ')', {}, { timeout: 2000 }).prompt) : null;
  const questions = [];
  (data.sections || []).forEach((s) => (s.questions || []).forEach((q) => questions.push({ section: s.title, id: q.id, summary: text(q.quickSummary), human: text(q.humanVersion), prompt: text(q.aiOptimised) })));
  const styles = Object.keys(data.styleBlocks || {}).map((k) => ({ id: k, label: data.styleBlocks[k].label, text: text(data.styleBlocks[k].text) }));
  const code = {};
  ['generatePrompt', 'copyAllSelected', 'withStyle'].forEach((name) => { const src = method(files.index, name); if (src) code[name] = src; });
  return { starter, styles, questions, code };
}

const fence = (text, lang) => '````' + (lang || 'text') + '\n' + String(text).replace(/\s+$/, '') + '\n````';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// What changed in the prompts between one release and the next.
function changes(prev, cur) {
  if (!prev) return ['First recorded release.'];
  const out = [];
  if (prev.starter !== cur.starter) out.push('Starter prompt changed.');
  const prevStyles = Object.fromEntries(prev.styles.map((s) => [s.id, s.text]));
  const added = cur.styles.filter((s) => !(s.id in prevStyles)), changed = cur.styles.filter((s) => s.id in prevStyles && prevStyles[s.id] !== s.text);
  const gone = prev.styles.filter((s) => !cur.styles.some((c) => c.id === s.id));
  if (added.length) out.push(`${plural(added.length, 'answer-style paragraph')} added (${added.map((s) => s.id).join(', ')}).`);
  if (changed.length) out.push(`${plural(changed.length, 'answer-style paragraph')} changed (${changed.map((s) => s.id).join(', ')}).`);
  if (gone.length) out.push(`${plural(gone.length, 'answer-style paragraph')} removed (${gone.map((s) => s.id).join(', ')}).`);
  const prevQ = Object.fromEntries(prev.questions.map((q) => [q.id, q]));
  const newQ = cur.questions.filter((q) => !prevQ[q.id]), lostQ = prev.questions.filter((q) => !cur.questions.some((c) => c.id === q.id));
  const promptQ = cur.questions.filter((q) => prevQ[q.id] && prevQ[q.id].prompt !== q.prompt);
  const wordingQ = cur.questions.filter((q) => prevQ[q.id] && (prevQ[q.id].human !== q.human || prevQ[q.id].summary !== q.summary));
  if (newQ.length) out.push(`${plural(newQ.length, 'question')} added (${newQ.map((q) => q.id).join(', ')}).`);
  if (lostQ.length) out.push(`${plural(lostQ.length, 'question')} removed (${lostQ.map((q) => q.id).join(', ')}).`);
  if (promptQ.length) out.push(`Prompt changed for ${plural(promptQ.length, 'question')} (${promptQ.map((q) => q.id).join(', ')}).`);
  if (wordingQ.length) out.push(`Wording shown on the site changed for ${plural(wordingQ.length, 'question')} (${wordingQ.map((q) => q.id).join(', ')}).`);
  const names = { generatePrompt: 'personalised prompt', copyAllSelected: 'prompt list', withStyle: 'answer style' };
  const codeChanged = Object.keys(names).filter((k) => (prev.code[k] || '') !== (cur.code[k] || ''));
  if (codeChanged.length) out.push(`How the prompt is put together changed (${codeChanged.map((k) => names[k]).join(', ')}).`);
  return out.length ? out : ['No change to any prompt.'];
}

function page(rel, files, data, changed) {
  const bySection = {};
  data.questions.forEach((q) => { (bySection[q.section] = bySection[q.section] || []).push(q); });
  const code = [
    ['generatePrompt', 'Personalised route', 'This builds the prompt from the answers given in the wizard. Text in quotes is sent as written; the rest is filled in from what the user entered.'],
    ['copyAllSelected', 'Prompt list route', 'This joins the prompts of the questions the user selected.'],
    ['withStyle', 'Answer style', 'This adds the paragraph for the answer style the user chose to the bottom of the prompt.']
  ].filter(([name]) => data.code[name]);
  return `# Prompts in ${rel.version}

Live from ${rel.date}. Read from ${files.source}.

This is a record of what the tool would have sent to a chatbot while this release was
live. It is written by \`tools/prompt-history.js\`; do not edit it by hand.

Changes since the release before:

${changed.map((c) => '- ' + c).join('\n')}

## Starter prompt

${data.starter == null ? 'Not found in this release.' : fence(data.starter)}

## Answer-style paragraphs

${data.styles.length ? data.styles.map((s) => `### ${s.label} (\`${s.id}\`)\n\n${fence(s.text)}`).join('\n\n') : 'This release had no answer-style paragraphs. The style the user chose was not sent to the chatbot.'}

## Questions

${plural(data.questions.length, 'question')}. "Shown on the site" is what the user reads and what the personalised route sends. "Prompt" is what the prompt list route sends.

${Object.keys(bySection).map((title) => `### ${title}\n\n${bySection[title].map((q) => `#### ${q.id}: ${q.summary}\n\nShown on the site:\n\n${fence(q.human)}\n\nPrompt:\n\n${fence(q.prompt || '(none)')}`).join('\n\n')}`).join('\n\n')}

## How the prompt is put together

The page code that assembled each kind of prompt in this release, copied from \`index.html\`.

${code.map(([name, title, note]) => `### ${title}\n\n${note}\n\n${fence(data.code[name], 'js')}`).join('\n\n') || 'Not found in this release.'}
`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = [];
  let prev = null;
  releases().forEach((rel) => {
    const files = filesOf(rel.version);
    if (!files) { console.log(`${rel.version}: skipped, no tag and not the version in version.js`); return; }
    const data = extract(files);
    const changed = changes(prev, data);
    fs.writeFileSync(path.join(OUT_DIR, rel.version + '.md'), page(rel, files, data, changed));
    rows.push({ ...rel, changed, questions: data.questions.length });
    prev = data;
    console.log(`${rel.version}: ${data.questions.length} questions, ${data.styles.length} style paragraphs. ${changed.join(' ')}`);
  });
  const index = `# Prompt history

What the tool would have sent to a chatbot at any point since the first numbered release.
Each release has a record of every prompt as it stood: the starter prompt, the answer-style
paragraphs, each question's prompt, and the page code that builds the personalised prompt.

## Finding what was asked on a given date

1. Find the last release in the table that went live on or before that date. Where several
   releases share a date, the later version replaced the earlier one the same day.
2. Open its record.
3. The exact files of any release can also be read from its git tag, for example
   \`git show v0.3.0:prompts.js\`.

| Release | Live from | What changed in the prompts | Record |
|---|---|---|---|
${rows.slice().reverse().map((r) => `| ${r.version} | ${r.date} | ${r.changed.join(' ')} | [${r.version}.md](${r.version}.md) |`).join('\n')}

## Keeping it up to date

The records are written by \`tools/prompt-history.js\`, which is run as a step of every
release (see [RELEASES.md](../RELEASES.md)). Do not edit them by hand.

## What is not recorded

- What a user typed, or the finished personalised prompt they were given. The site does not
  store either.
- What the chatbot answered.
- Changes that were made and replaced between two releases without going live.
`;
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), index);
  console.log(`Wrote ${rows.length} record(s) and the index to ${path.relative(ROOT, OUT_DIR)}`);
}

main();
