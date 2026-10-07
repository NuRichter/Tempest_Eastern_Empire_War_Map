/**
 * Visual regression checkpoints.
 *
 * Captures the ten views the brief asks for (initial, mid-campaign, major
 * battle, end of campaign, flat, globe, territory-heavy, movement-heavy,
 * selected force, selected character) and compares each with the committed
 * reference in docs/qa/checkpoints/. Comparison happens in the browser on a
 * canvas, so no image library is needed.
 *
 *     npm run build && npm run qa:visual            compare
 *     npm run build && npm run qa:visual -- --update  write new references
 *
 * Set QA_ORIGIN to test an already-running server.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import puppeteer, { type KeyInput, type Page } from 'puppeteer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF = join(ROOT, 'docs', 'qa', 'checkpoints');
const OUT = join(ROOT, 'qa-artifacts', 'visual');
const UPDATE = process.argv.includes('--update');
/** Share of pixels that may differ (by more than 40/255 on any channel) before a checkpoint fails. */
const TOLERANCE = 0.08;

interface Checkpoint {
  name: string;
  query: string;
  keys?: KeyInput[];
  prefs?: Record<string, unknown>;
}

const CHECKPOINTS: Checkpoint[] = [
  { name: 'initial', query: '' },
  { name: 'mid-campaign', query: '?frame=7300' },
  { name: 'major-battle', query: '?frame=6266' },
  { name: 'end-campaign', query: '?frame=10799' },
  { name: 'flat', query: '?frame=8930' },
  { name: 'globe', query: '?frame=8930', keys: ['g'] },
  { name: 'territory-heavy', query: '?frame=6266', prefs: { territoryOpacity: 1 } },
  { name: 'movement-heavy', query: '?frame=6240', prefs: { trails: true } },
  { name: 'selected-force', query: '?frame=6262&force=F-EMP-012' },
  { name: 'selected-character', query: '?frame=6266&character=testarossa' },
];

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const a = s.address();
      const port = typeof a === 'object' && a ? a.port : 0;
      s.close(() => resolve(port));
    });
  });
}

async function ready(origin: string): Promise<void> {
  for (let i = 0; i < 150; i += 1) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {
      /* not yet */
    }
    await sleep(400);
  }
  throw new Error('Server did not start; run "npm run build" first.');
}

async function capture(page: Page, origin: string, cp: Checkpoint): Promise<Buffer> {
  await page.evaluateOnNewDocument((prefs: Record<string, unknown> | null) => {
    try {
      localStorage.clear();
      if (prefs) {
        const layers = prefs.trails ? { trails: true } : {};
        const state = { ...prefs, ...(prefs.trails ? { layers: { ...layers } } : {}) };
        localStorage.setItem('tempest-atlas.preferences.v3', JSON.stringify({ state, version: 3 }));
      }
    } catch {
      /* storage unavailable */
    }
  }, cp.prefs ?? null);
  await page.goto(`${origin}/${cp.query}`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __atlasMap?: { loaded: () => boolean } }).__atlasMap?.loaded()), { timeout: 60000 });
  for (const k of cp.keys ?? []) {
    await page.keyboard.press(k);
    await sleep(500);
  }
  await sleep(3500);
  return Buffer.from(await page.screenshot({ type: 'jpeg', quality: 70 }));
}

/**
 * Fraction of differing pixels, computed in the page on two decoded images.
 * The page code is a string: tsx would otherwise inject helpers (`__name`)
 * that do not exist in the browser.
 */
const DIFF_IN_PAGE = `async (x, y) => {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [ia, ib] = await Promise.all([load(x), load(y)]);
  const w = 480;
  const h = Math.round((ia.height * w) / ia.width);
  const read = (img) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const da = read(ia);
  const db = read(ib);
  let n = 0;
  for (let i = 0; i < da.length; i += 4) {
    if (Math.abs(da[i] - db[i]) > 40 || Math.abs(da[i + 1] - db[i + 1]) > 40 || Math.abs(da[i + 2] - db[i + 2]) > 40) n += 1;
  }
  return n / (w * h);
}`;

async function diff(page: Page, a: Buffer, b: Buffer): Promise<number> {
  const x = JSON.stringify(`data:image/jpeg;base64,${a.toString('base64')}`);
  const y = JSON.stringify(`data:image/jpeg;base64,${b.toString('base64')}`);
  return (await page.evaluate(`(${DIFF_IN_PAGE})(${x}, ${y})`)) as number;
}

async function main(): Promise<void> {
  mkdirSync(REF, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  let server: ChildProcess | null = null;
  let origin = process.env.QA_ORIGIN ?? '';
  if (!origin) {
    const port = await freePort();
    origin = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port)], { cwd: ROOT, stdio: 'ignore' });
  }
  const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const report: { name: string; diff: number | null; ok: boolean }[] = [];
  try {
    await ready(origin);
    // Compare on a blank page: the atlas's content security policy rightly refuses data: images.
    const diffPage = await browser.newPage();
    await diffPage.goto('about:blank');
    for (const cp of CHECKPOINTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      const shot = await capture(page, origin, cp);
      writeFileSync(join(OUT, `${cp.name}.jpg`), shot);
      const refPath = join(REF, `${cp.name}.jpg`);
      if (UPDATE || !existsSync(refPath)) {
        writeFileSync(refPath, shot);
        report.push({ name: cp.name, diff: null, ok: true });
        console.log(`  ref   ${cp.name}`);
      } else {
        const d = await diff(diffPage, readFileSync(refPath), shot);
        const ok = d <= TOLERANCE;
        report.push({ name: cp.name, diff: d, ok });
        console.log(`  ${ok ? 'pass' : 'FAIL'}  ${cp.name} — ${(d * 100).toFixed(1)}% of pixels differ`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server?.kill();
  }
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  const failed = report.filter((r) => !r.ok);
  console.log(`\n  ${report.length - failed.length}/${report.length} checkpoints ${UPDATE ? 'written' : 'within tolerance'}.`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
