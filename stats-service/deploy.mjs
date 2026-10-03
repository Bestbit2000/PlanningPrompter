// Deploys the counter to Neon as a function, run with:  node deploy.mjs
// Needs the Neon command-line tool, signed in (npm i -g neon, then: neon auth),
// and NEON_PROJECT_ID, ALLOWED_ORIGINS and STATS_KEY in .env.
// Prints the counter's address when done. The key is not printed.

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const SLUG = 'usagecounter';
const env = {};
fs.readFileSync(new URL('./.env', import.meta.url), 'utf8').split(/\r?\n/).forEach((line) => {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
});
for (const name of ['NEON_PROJECT_ID', 'ALLOWED_ORIGINS', 'STATS_KEY']) {
  if (!env[name]) { console.error('Set ' + name + ' in .env first.'); process.exit(1); }
  if (/["\s]/.test(env[name].replace(/, /g, ','))) { console.error(name + ' must not contain spaces or quotes.'); process.exit(1); }
}

const project = '--project-id ' + env.NEON_PROJECT_ID;
const origins = env.ALLOWED_ORIGINS.replace(/\s/g, '');
const run = (cmd) => execSync(cmd, { cwd: new URL('.', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

run(`neon functions deploy ${SLUG} --src index.mjs ${project} --env "ALLOWED_ORIGINS=${origins}" --env "STATS_KEY=${env.STATS_KEY}"`);
const info = JSON.parse(run(`neon functions get ${SLUG} ${project} -o json`));
console.log('Deployed. Status: ' + (info.active_deployment && info.active_deployment.status));
console.log('Counter address: ' + info.invocation_url);
