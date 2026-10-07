/**
 * Exploratory browser smoke check with Playwright CLI (microsoft/playwright-cli).
 *
 * Complements scripts/browser-qa.ts (Puppeteer, the full scripted matrix) with
 * the agent-oriented Playwright CLI: open the atlas, drive it by keyboard, take
 * screenshots and read the console. Runs through npx, so nothing is installed
 * globally; it uses the Chrome already on the machine.
 *
 *     npm run dev            (or npm run start after a build)
 *     npm run qa:playwright  [-- --origin http://127.0.0.1:3000]   (or QA_ORIGIN=…)
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const origin = args.includes('--origin') ? args[args.indexOf('--origin') + 1] : (process.env.QA_ORIGIN ?? 'http://127.0.0.1:3000');
const OUT = join(process.cwd(), 'qa-artifacts', 'playwright');
mkdirSync(OUT, { recursive: true });

function cli(...a) {
  const r = spawnSync('npx', ['-y', '@playwright/cli@latest', ...a], { encoding: 'utf8', shell: true });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

const steps = [
  ['open', `${origin}/?frame=6266`],
  ['screenshot'],
  ['press', 'm'],
  ['screenshot'],
  ['press', 'm'],
  ['press', 'g'],
  ['screenshot'],
  ['press', 'g'],
  ['press', 'c'],
  ['screenshot'],
  ['press', 'Escape'],
  ['press', '/'],
  ['type', 'Benimaru'],
  ['press', 'Enter'],
  ['screenshot'],
];
let failed = false;
for (const s of steps) {
  const out = cli(...s);
  console.log(`  ${s.join(' ')}`);
  // A page that did not load is a failure, not a console count of zero.
  if (/chrome-error:\/\//.test(out) || /ERR_CONNECTION|net::ERR_/.test(out)) {
    console.log(`  page did not load from ${origin}`);
    failed = true;
    break;
  }
  if (/error/i.test(out) && !/Errors: 0/.test(out)) {
    console.log(out.split('\n').slice(-6).join('\n'));
  }
}
const consoleOut = cli('console');
const m = /Errors:\s*(\d+)/.exec(consoleOut);
const errors = m ? Number(m[1]) : -1;
console.log(`  console errors: ${errors}`);
if (errors !== 0) failed = true;
cli('close');

// Move the CLI's session folder into qa-artifacts.
const session = join(process.cwd(), '.playwright-cli');
try {
  for (const f of readdirSync(session)) renameSync(join(session, f), join(OUT, f));
  rmSync(session, { recursive: true, force: true });
} catch {
  /* nothing captured */
}
console.log(`\n  Playwright CLI smoke ${failed ? 'FAILED' : 'passed'}. Output in qa-artifacts/playwright/.`);
process.exit(failed ? 1 : 0);
