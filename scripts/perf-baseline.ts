/**
 * Performance and responsive baseline: for each device profile, load the atlas
 * (production build), measure network payload, JS heap, long tasks, time to
 * map ready, a 48× playback burst and seeks, and capture a screenshot.
 * Output: qa-artifacts/perf/<label>/report.json + screenshots.
 *
 *     npm run build && npm run qa:perf -- <label>
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const label = process.argv[2] ?? 'current';
const OUT = join(ROOT, 'qa-artifacts', 'perf', label);

const DEVICES = [
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { name: 'laptop-1280', width: 1280, height: 720, mobile: false },
  { name: 'ipad-820', width: 820, height: 1180, mobile: true },
  { name: 'iphone-390', width: 390, height: 844, mobile: true },
  { name: 'android-360', width: 360, height: 780, mobile: true },
  { name: 'phone-landscape-844', width: 844, height: 390, mobile: true },
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
  const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const report: Record<string, unknown>[] = [];
  try {
    for (const d of DEVICES) {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: d.width, height: d.height, isMobile: d.mobile, hasTouch: d.mobile });
      const cdp = await page.createCDPSession();
      await cdp.send('Network.enable');
      await cdp.send('Performance.enable');
      let bytes = 0;
      let requests = 0;
      const perType: Record<string, number> = {};
      const urls = new Map<string, string>();
      cdp.on('Network.responseReceived', (e: { requestId: string; type: string; response: { url: string } }) => {
        urls.set(e.requestId, e.type);
      });
      cdp.on('Network.loadingFinished', (e: { requestId: string; encodedDataLength: number }) => {
        bytes += e.encodedDataLength;
        requests += 1;
        const t = urls.get(e.requestId) ?? 'Other';
        perType[t] = (perType[t] ?? 0) + e.encodedDataLength;
      });
      await page.evaluateOnNewDocument(`
        try { localStorage.clear() } catch {}
        window.__longTasks = [];
        try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longTasks.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch {}
      `);
      const t0 = Date.now();
      await page.goto(`${origin}/`, { waitUntil: 'networkidle0', timeout: 120000 });
      await page.waitForFunction('Boolean(window.__atlasMap && window.__atlasMap.loaded())', { timeout: 90000 });
      const ready = Date.now() - t0;
      await sleep(1500);
      await page.screenshot({ path: join(OUT, `${d.name}.jpg`) as `${string}.jpg`, type: 'jpeg', quality: 70 });
      const heap0 = (await cdp.send('Performance.getMetrics')).metrics.find((m: { name: string }) => m.name === 'JSHeapUsedSize')?.value ?? 0;
      // 48x playback burst through the first contact and a series of seeks.
      await page.evaluate('window.__atlasClock && window.__atlasClock.seek(6100)');
      await page.keyboard.press('8');
      await page.keyboard.press('Space');
      await sleep(3000);
      await page.keyboard.press('Space');
      const seekMs = (await page.evaluate(`(async () => {
        const c = window.__atlasClock; const t = performance.now();
        for (let i = 0; i < 30; i += 1) { c.seek((i * 7919) % 10800); await new Promise((r) => requestAnimationFrame(() => r(null))); }
        return (performance.now() - t) / 30;
      })()`)) as number;
      await sleep(1000);
      const heap1 = (await cdp.send('Performance.getMetrics')).metrics.find((m: { name: string }) => m.name === 'JSHeapUsedSize')?.value ?? 0;
      const longTasks = (await page.evaluate('window.__longTasks')) as number[];
      const overflow = (await page.evaluate('document.documentElement.scrollWidth - window.innerWidth')) as number;
      report.push({
        device: d.name,
        readyMs: ready,
        transferKB: Math.round(bytes / 1024),
        requests,
        perTypeKB: Object.fromEntries(Object.entries(perType).map(([k, v]) => [k, Math.round(v / 1024)])),
        heapAfterLoadMB: +(heap0 / 1e6).toFixed(1),
        heapAfterPlayAndSeekMB: +(heap1 / 1e6).toFixed(1),
        seekMsPerSeek: +seekMs.toFixed(1),
        longTasks: { count: longTasks.length, maxMs: Math.max(0, ...longTasks), totalMs: longTasks.reduce((a, b) => a + b, 0) },
        horizontalOverflowPx: overflow,
      });
      console.log(`  ${d.name}: ready ${ready} ms, ${Math.round(bytes / 1024)} KB / ${requests} req, heap ${(heap0 / 1e6).toFixed(1)} → ${(heap1 / 1e6).toFixed(1)} MB, seek ${seekMs.toFixed(1)} ms, long tasks ${longTasks.length} (max ${Math.max(0, ...longTasks)} ms), overflow ${overflow}px`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server?.kill();
  }
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
