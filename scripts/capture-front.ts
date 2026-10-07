/**
 * Captures held-ground transitions in a real browser at 0 / 25 / 50 / 75 / 100 %
 * of each major front episode, zoomed on the episode, for the visual audit
 * (docs/research/REFERENCE_MATCH_AUDIT.md). Output: qa-artifacts/front/.
 *
 *     npm run build && npm run qa:front            (or QA_ORIGIN=... to use a running server)
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

import { simToLngLatTuple } from '../src/lib/coords';
import type { FrontFile } from '../src/map/field/front';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'qa-artifacts', 'front');
const front = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'front.json'), 'utf8')) as FrontFile;
const only = process.argv.slice(2);

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
  const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluateOnNewDocument('try { localStorage.clear() } catch {}');
    const episodes = front.episodes.filter((e) => e.cells >= 100 && (only.length === 0 || only.includes(e.id)));
    for (const ep of episodes) {
      for (const pct of [0, 25, 50, 75, 100]) {
        const T = ep.startFrame + ((ep.endFrame - ep.startFrame) * pct) / 100;
        const frame = Math.floor(T);
        await page.goto(`${origin}/?frame=${frame}`, { waitUntil: 'networkidle0', timeout: 90000 });
        await page.waitForFunction(() => Boolean((window as unknown as { __atlasMap?: { loaded: () => boolean } }).__atlasMap?.loaded()), { timeout: 60000 });
        const [lng, lat] = simToLngLatTuple(ep.centroid[0], ep.centroid[1]);
        // Seek the exact fractional time and frame the episode.
        await page.evaluate(
          `(() => { const m = window.__atlasMap; m.jumpTo({ center: [${lng}, ${lat}], zoom: 5.4 }); const c = window.__atlasClock; if (c) c.seek(${T}); })()`,
        );
        await sleep(2500);
        await page.screenshot({ path: join(OUT, `${ep.id}-${ep.kind.toLowerCase()}-${String(pct).padStart(3, '0')}.jpg`) as `${string}.jpg`, type: 'jpeg', quality: 72 });
      }
      console.log(`  ${ep.id} ${ep.kind} ${ep.cells} cells captured`);
    }
  } finally {
    await browser.close();
    server?.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
