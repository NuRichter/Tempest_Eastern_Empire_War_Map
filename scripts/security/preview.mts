/**
 * Checks a Vercel PREVIEW deployment in a real browser before it is promoted
 * to production: the map loads, no console error, cross-origin isolation is
 * on, every integrity hash matches what Vercel serves, the 3D view and the
 * cinematic intro start.
 *
 *   npm run security:preview -- https://<deployment>.vercel.app
 *
 * Preview deployments are protected. The project's own automation bypass
 * secret is taken from the Vercel CLI (which is how `vercel curl` reaches
 * them) and used only in this process, only for that host. It is never
 * printed or written anywhere.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer';

const target = process.argv[2];
if (!target || !/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(target)) {
  console.error('usage: npm run security:preview -- https://<deployment>.vercel.app');
  process.exit(2);
}
const origin = new URL(target).origin;

// `vercel curl --debug` reports the bypass secret it uses. Read it, do not show it.
// One command string: on Windows the CLI is a .cmd shim that needs a shell. `origin` was validated above.
const probe = spawnSync(`vercel curl /robots.txt --deployment ${origin} --debug -- -s -o ${process.platform === 'win32' ? 'NUL' : '/dev/null'}`, { encoding: 'utf8', shell: true, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
const secret = /protection bypass token[^:]*:\s*([A-Za-z0-9]+)/i.exec((probe.stdout ?? '') + (probe.stderr ?? ''))?.[1];
if (!secret) {
  console.error('Could not obtain the protection bypass from the Vercel CLI (is the project linked and are you logged in?).');
  process.exit(2);
}

let passed = 0;
let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name}${!ok && detail ? ` (${detail})` : ''}`);
};

const headers = { 'x-vercel-protection-bypass': secret };
const html = await (await fetch(origin + '/', { headers })).text();
const pinned = [...html.matchAll(/<(?:script|link)[^>]*\b(?:src|href)="(\/[^"]+)"[^>]*\bintegrity="sha256-([^"]+)"[^>]*>/g)];
let bad = 0;
for (const [, path, want] of pinned) {
  const body = Buffer.from(await (await fetch(origin + path, { headers })).arrayBuffer());
  if (createHash('sha256').update(body).digest('base64') !== want) { bad += 1; console.log(`        mismatch: ${path}`); }
}
check('every integrity hash matches the bytes Vercel serves', pinned.length > 0 && bad === 0, `${pinned.length} checked, ${bad} mismatched`);

const browser = await puppeteer.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 810 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const same = req.url().startsWith(origin);
    void req.continue(same ? { headers: { ...req.headers(), ...headers } } : undefined);
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluateOnNewDocument(() => localStorage.setItem('tempest-atlas.preferences.v3', JSON.stringify({ state: { tourDone: true, music: false }, version: 3 })));
  await page.goto(origin + '/', { waitUntil: 'networkidle2', timeout: 90000 });
  const map = await page.waitForFunction(() => Boolean((window as unknown as { __atlasMap?: { loaded: () => boolean } }).__atlasMap?.loaded()), { timeout: 60000 }).then(() => true, () => false);
  check('the map loads', map);
  check('cross-origin isolation is on', (await page.evaluate('window.crossOriginIsolated')) === true);
  // The held ground: drawn by the GPU layer, evaluated in a worker that the host lets start (COEP).
  const field = (await page.evaluate('window.__atlasField ? window.__atlasField() : null')) as { gpu: boolean } | null;
  check('the held ground is drawn by the GPU layer', Boolean(field?.gpu));
  const f2 = (await page.evaluate('window.__atlasField ? window.__atlasField() : null')) as { worker: boolean } | null;
  check('the held ground is evaluated in its worker (not the main-thread fallback)', Boolean(f2?.worker));
  await page.keyboard.press('v');
  await new Promise((r) => setTimeout(r, 8000));
  check('the 3D view starts', Boolean(await page.evaluate('Boolean(window.__atlas3d)')));
  await page.keyboard.press('v');
  await page.keyboard.press('c');
  await new Promise((r) => setTimeout(r, 2500));
  check('cinematic mode opens with its intro', Boolean(await page.evaluate("Boolean(document.querySelector('.cine-intro'))")));
  // On preview deployments Vercel appends its toolbar loader (a script from vercel.live) for every
  // visitor. The Trusted Types policy refusing it is the protection working, not a fault.
  const toolbarBlocked = errors.filter((e) => /Trusted Types: script URL from another origin refused/.test(e));
  const other = errors.filter((e) => !toolbarBlocked.includes(e));
  if (toolbarBlocked.length) console.log(`        note: ${toolbarBlocked.length} foreign script URL refused by Trusted Types (Vercel preview toolbar)`);
  check('no console errors (other than the refused preview toolbar)', other.length === 0, other.slice(0, 2).join(' | ').slice(0, 300));
} finally {
  await browser.close();
}
console.log(`\n  ${passed}/${passed + failed} preview checks passed on ${origin}.`);
process.exit(failed ? 1 : 0);
