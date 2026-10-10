/**
 * Renderer main-thread breakdown during the film (what V8 reports as "(program)").
 *
 *   npx tsx scripts/trace-cinematic.mts [2d|3d] [seconds] [cpuSlowdown]
 *
 * Records a Chrome trace (the DevTools Performance categories) on a local
 * production build with the real GPU, and sums the top-level main-thread
 * events by name: script, style, layout, paint, raster, compositing.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = join(import.meta.dirname, '..');
const mode = (process.argv[2] ?? '2d') as '2d' | '3d';
const seconds = Number(process.argv[3] ?? 6);
const slowdown = Number(process.argv[4] ?? 4);

const port: number = await new Promise((res) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => res(p)); });
});
const server = spawn(process.execPath, [join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 60 && !(await fetch(base).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 500));

const browser = await puppeteer.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', `--use-angle=${process.platform === 'win32' ? 'd3d11' : 'default'}`] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 810 });
  await page.evaluateOnNewDocument((cinema3d: boolean) => {
    localStorage.setItem('tempest-atlas.preferences.v3', JSON.stringify({ state: { tourDone: true, music: false, cinema3d, autoTiming: false }, version: 3 }));
  }, mode === '3d');
  await page.goto(base + '/', { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction('Boolean(window.__atlasMap && window.__atlasMap.loaded())', { timeout: 60000 });
  await page.evaluate('window.__atlasClock.seek(6200)');
  await page.keyboard.press('c');
  await new Promise((r) => setTimeout(r, 800));
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 11000));
  await page.keyboard.press('6');
  const cdp = await page.createCDPSession();
  if (slowdown > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: slowdown });
  await page.tracing.start({ categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink', 'cc', 'v8.execute', 'toplevel'] });
  await new Promise((r) => setTimeout(r, seconds * 1000));
  const buf = await page.tracing.stop();
  const trace = JSON.parse(Buffer.from(buf!).toString('utf8')) as { traceEvents: { name: string; ph: string; dur?: number; tid: number; pid: number; args?: { name?: string } }[] };
  const ev = trace.traceEvents;
  // The renderer main thread: thread_name metadata 'CrRendererMain'.
  const mains = new Set(ev.filter((e) => e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain').map((e) => `${e.pid}:${e.tid}`));
  const sums = new Map<string, number>();
  let total = 0;
  for (const e of ev) {
    if (e.ph !== 'X' || !e.dur || !mains.has(`${e.pid}:${e.tid}`)) continue;
    sums.set(e.name, (sums.get(e.name) ?? 0) + e.dur);
    if (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') total += e.dur;
  }
  const rows = [...sums.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28);
  console.log(`cinematic ${mode}, CPU ${slowdown}x slower, ${seconds}s. Main-thread busy (RunTask): ${(total / 1000).toFixed(0)} ms of ${seconds * 1000} ms`);
  for (const [name, us] of rows) console.log(`  ${(us / 1000).toFixed(0).padStart(6)} ms  ${name}`);
} finally {
  await browser.close();
  server.kill();
}
