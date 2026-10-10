/**
 * The adaptive quality governor under load (src/perf/quality.ts).
 *
 *   npm run build && npx tsx scripts/qa-governor.mts
 *
 * Software GL on a pixel-ratio-2 screen makes the 3D view slow:
 *   - on 'auto' the level must step down;
 *   - the low level must be measurably faster than the high one (pinned
 *     levels, so the comparison does not depend on when the governor acts);
 *   - a pinned level must be kept even when frames are slow.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import puppeteer, { type Browser } from 'puppeteer';

const ROOT = join(import.meta.dirname, '..');
const port: number = await new Promise((res) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => res(p)); });
});
const server = spawn(process.execPath, [join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 60 && !(await fetch(base).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 500));

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function open3d(browser: Browser, graphics: string) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument((g: string) => localStorage.setItem('tempest-atlas.preferences.v3', JSON.stringify({ state: { tourDone: true, music: false, view3d: true, graphics: g }, version: 3 })), graphics);
  await page.goto(base + '/?frame=6300', { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction('Boolean(window.__atlas3d)', { timeout: 60000 });
  await page.keyboard.press('Space');
  await sleep(3000);
  return page;
}
const fps = async (page: Awaited<ReturnType<typeof open3d>>, ms: number) => {
  const n = await page.evaluate(`new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n += 1; if (performance.now() - t0 < ${ms}) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); })`);
  return ((n as number) * 1000) / ms;
};

const browser = await puppeteer.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  {
    const page = await open3d(browser, 'auto');
    let level = 2;
    for (let i = 0; i < 40 && level === 2; i++) {
      await sleep(500);
      level = (await page.evaluate('window.__atlasQuality()')) as number;
    }
    check('on auto, slow frames lower the quality level', level < 2, `level 2 -> ${level}`);
    await page.close();
  }
  {
    const high = await open3d(browser, 'high');
    const fHigh = await fps(high, 6000);
    const keptHigh = (await high.evaluate('window.__atlasQuality()')) === 2;
    await high.close();
    const low = await open3d(browser, 'low');
    const fLow = await fps(low, 6000);
    await low.close();
    check('a pinned level is kept even when frames are slow', keptHigh);
    check('the low level renders faster than the high one', fLow > fHigh * 1.2, `high ${fHigh.toFixed(1)} fps, low ${fLow.toFixed(1)} fps (software GL, pixel ratio 2)`);
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
