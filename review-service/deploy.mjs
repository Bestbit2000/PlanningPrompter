// Deploys the review service to Neon as a function, run with:  node deploy.mjs
// Needs the Neon command-line tool, signed in (npm i -g neon, then: neon auth),
// and NEON_PROJECT_ID and REVIEW_ADMIN_KEY in .env.
// Prints the service's address when done, and keeps it in .env as REVIEW_ADDRESS,
// which is where the optimiser looks for it. The key is not printed.

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const SLUG = 'answerreview';
const envFile = new URL('./.env', import.meta.url);
const text = fs.readFileSync(envFile, 'utf8');
const env = {};
text.split(/\r?\n/).forEach((line) => {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
});
for (const name of ['NEON_PROJECT_ID', 'REVIEW_ADMIN_KEY']) {
  if (!env[name]) { console.error('Set ' + name + ' in .env first.'); process.exit(1); }
  if (/["\s]/.test(env[name])) { console.error(name + ' must not contain spaces or quotes.'); process.exit(1); }
}
if (env.REVIEW_ADMIN_KEY.length < 32) { console.error('REVIEW_ADMIN_KEY must be at least 32 characters, and random.'); process.exit(1); }

const project = '--project-id ' + env.NEON_PROJECT_ID;
const run = (cmd) => execSync(cmd, { cwd: new URL('.', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

run(`neon functions deploy ${SLUG} --src index.mjs ${project} --env "REVIEW_ADMIN_KEY=${env.REVIEW_ADMIN_KEY}"`);
const info = JSON.parse(run(`neon functions get ${SLUG} ${project} -o json`));
const address = info.invocation_url;
console.log('Deployed. Status: ' + (info.active_deployment && info.active_deployment.status));
console.log('Review service address: ' + address);
if (address && env.REVIEW_ADDRESS !== address) {
  const line = 'REVIEW_ADDRESS=' + address;
  fs.writeFileSync(envFile, /^\s*REVIEW_ADDRESS\s*=.*$/m.test(text) ? text.replace(/^\s*REVIEW_ADDRESS\s*=.*$/m, line) : text.replace(/\s*$/, '\n') + line + '\n');
  console.log('Kept in .env as REVIEW_ADDRESS.');
}
