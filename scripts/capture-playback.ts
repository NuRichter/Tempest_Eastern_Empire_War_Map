/**
 * Playback acceptance for the held-ground layer (Phase 38 of the brief):
 *   1. play through the D+11 collapse at 1× and capture frames while playing;
 *   2. pause mid-transition and check the map is frozen;
 *   3. scrub away and back to the same time and check the picture is identical.
 * Output: qa-artifacts/front/playback-*.jpg and a pass/fail summary.
 *
 *     npm run build && npm run qa:playback
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import puppeteer, { type Page } from 'puppeteer';

import { simToLngLatTuple } from '../src/lib/coords';
import type { FrontFile } from '../src/map/field/front';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'qa-artifacts', 'front');
const front = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'front.json'), 'utf8')) as FrontFile;

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

/** Share of differing pixels between two screenshots of the map area, computed in a blank page. */
async function diff(page: Page, a: Buffer, b: Buffer): Promise<number> {
  const x = JSON.stringify(`data:image/png;base64,${a.toString('base64')}`);
  const y = JSON.stringify(`data:image/png;base64,${b.toString('base64')}`);
  return (await page.evaluate(`(async () => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ia, ib] = await Promise.all([load(${x}), load(${y})]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(ia, 0, 0); const da = ctx.getImageData(0, 0, c.width, c.height).data;
    ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(ib, 0, 0); const db = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) n += 1;
    return n / (c.width * c.height);
  })()`)) as number;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  let server: ChildProcess | null = null;
  let origin = process.env.QA_ORIGIN ?? '';
  if (!origin) {
    const port = await freePort();
    origin = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port)], { cwd: ROOT, stdio: 'ignore' });
    for (let i = 0; i < 150; i += 1) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {
        /* not yet */
      }
      await sleep(400);
    }
  }
  const results: [string, boolean, string][] = [];
  const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    // The comparison page first, so the atlas tab stays in front (animation frames run).
    const blank = await browser.newPage();
    await blank.goto('about:blank');
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluateOnNewDocument('try { localStorage.clear() } catch {}');
    const ep = front.episodes.find((e) => e.kind === 'COLLAPSE' && e.cells >= 500)!;
    const [lng, lat] = simToLngLatTuple(ep.centroid[0], ep.centroid[1]);
    const start = Math.floor(ep.startFrame - 1);
    await page.goto(`${origin}/?frame=${start}`, { waitUntil: 'networkidle0', timeout: 90000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __atlasMap?: { loaded: () => boolean } }).__atlasMap?.loaded()), { timeout: 60000 });
    await page.evaluate(`window.__atlasMap.jumpTo({ center: [${lng}, ${lat}], zoom: 4.6 })`);
    await page.keyboard.press('3'); // 1x
    await sleep(2500);
    const clip = { x: 48, y: 44, width: 848, height: 610 };
    const shot = async () => Buffer.from(await page.screenshot({ clip, type: 'png' }));

    // 1. Playing: the picture keeps changing.
    await page.keyboard.press('Space');
    const frames: Buffer[] = [];
    const times: number[] = [];
    for (let k = 0; k < 8; k += 1) {
      await sleep(350);
      frames.push(await shot());
      times.push((await page.evaluate('window.__atlasClock.frame')) as number);
      await page.screenshot({ path: join(OUT, `playback-${k}.jpg`) as `${string}.jpg`, type: 'jpeg', quality: 70 });
    }
    // Pairs of captures that both fall inside the transition must differ.
    let inside = 0;
    let moving = 0;
    for (let k = 1; k < frames.length; k += 1) {
      if (times[k - 1] < ep.startFrame - 3 || times[k] > ep.endFrame) continue;
      inside += 1;
      if ((await diff(blank, frames[k - 1], frames[k])) > 0.002) moving += 1;
    }
    results.push(['the front moves while playing', inside >= 3 && moving === inside, `${moving}/${inside} captures inside the transition differ; frames ${times.map((t) => t.toFixed(1)).join(', ')} (transition ${ep.startFrame}–${ep.endFrame})`]);

    // 2. Paused: frozen.
    await page.keyboard.press('Space');
    await sleep(600);
    const p1 = await shot();
    const tPause = (await page.evaluate('window.__atlasClock.frame')) as number;
    await sleep(1500);
    const p2 = await shot();
    const frozen = await diff(blank, p1, p2);
    results.push(['the map is frozen while paused', frozen < 0.001, `${(frozen * 100).toFixed(2)}% pixels changed in 1.5 s at frame ${tPause.toFixed(2)}`]);

    // 3. Scrub away (forwards and backwards) and back: same picture.
    await page.evaluate(`window.__atlasClock.seek(${ep.endFrame + 60})`);
    await sleep(800);
    await page.evaluate(`window.__atlasClock.seek(${ep.startFrame - 200})`);
    await sleep(800);
    await page.evaluate(`window.__atlasClock.seek(${tPause})`);
    await sleep(1500);
    const p3 = await shot();
    const back = await diff(blank, p1, p3);
    results.push(['scrubbing back to a time restores its picture', back < 0.003, `${(back * 100).toFixed(2)}% pixels differ`]);
  } finally {
    await browser.close();
    server?.kill();
  }
  for (const [name, ok, detail] of results) console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name} — ${detail}`);
  if (results.some((r) => !r[1])) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
