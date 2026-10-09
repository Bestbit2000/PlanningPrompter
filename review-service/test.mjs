// Checks for the review service, run with:  node test.mjs
// Uses a stand-in for the database, so it needs no set-up and touches no real reviews.

import { createMemoryStore } from './memory-store.mjs';
import { runChecks } from './checks.mjs';

const failed = await runChecks(createMemoryStore(), 'memory');
console.log(failed ? '\n' + failed + ' check(s) failed' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
