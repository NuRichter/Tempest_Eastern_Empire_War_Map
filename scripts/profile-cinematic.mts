/**
 * Where does the main thread spend its time during the film?
 *
 *   npm run build && npx tsx scripts/profile-cinematic.mts [2d|3d] [seconds]
 *
 * Plays cinematic mode on a local production build, records a V8 CPU profile
 * and frame timings, and prints the heaviest functions by self time, grouped
 * by source file. Software GL in headless Chrome inflates GPU-bound costs:
 * compare runs with each other, not with a real GPU.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = join(import.meta.dirname, '..');
const mode = (process.argv[2] ?? '2d') as '2d' | '3d';
const seconds = Number(process.argv[3] ?? 12);

const port: number = await new Promise((res) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => res(p)); });
});
const server = spawn(process.execPath, [join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 60 && !(await fetch(base).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 500));

// PROFILE_GPU=1 uses the machine's real GPU (ANGLE on D3D11/Metal/GL) instead of software rendering.
const gpu = process.env.PROFILE_GPU === '1';
const browser = await puppeteer.launch({
  headless: true,
  args: gpu
    ? ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', `--use-angle=${process.platform === 'win32' ? 'd3d11' : 'default'}`, '--enable-precise-memory-info']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 810 });
  await page.evaluateOnNewDocument((cinema3d: boolean) => {
    localStorage.setItem('tempest-atlas.preferences.v3', JSON.stringify({ state: { tourDone: true, music: false, cinema3d, autoTiming: false }, version: 3 }));
  }, mode === '3d');
  await page.goto(base + '/', { waitUntil: 'networkidle2', timeout: 90000 });
  const renderer = await page.evaluate(`(() => { const c = document.createElement('canvas').getContext('webgl2'); const d = c && c.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
  await page.waitForFunction('Boolean(window.__atlasMap && window.__atlasMap.loaded())', { timeout: 60000 });
  // Into the first battles, at 8x: the busiest stretch of the film.
  await page.evaluate('window.__atlasClock.seek(6200)');
  await page.keyboard.press('c');
  await new Promise((r) => setTimeout(r, 800));
  await page.keyboard.press('Enter'); // skip the intro
  await new Promise((r) => setTimeout(r, 11000)); // past the cold open
  await page.keyboard.press('6');
  const cdp = await page.createCDPSession();
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await page.evaluate(`window.__frames = []; (function loop(t){ window.__frames.push(t); if (window.__frames.length < 100000) requestAnimationFrame(loop); })(performance.now());`);
  await cdp.send('Profiler.start');
  await new Promise((r) => setTimeout(r, seconds * 1000));
  const { profile } = (await cdp.send('Profiler.stop')) as { profile: { nodes: { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; hitCount?: number }[]; samples: number[]; timeDeltas: number[] } };
  const frames = (await page.evaluate('window.__frames')) as number[];
  const gaps = frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b);
  const pct = (q: number) => gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))]?.toFixed(1);

  // Self time per node from samples.
  const self = new Map<number, number>();
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  const byFn = new Map<string, number>();
  const byFile = new Map<string, number>();
  for (const n of profile.nodes) {
    const t = self.get(n.id) ?? 0;
    if (!t) continue;
    const file = n.callFrame.url.replace(base, '').replace(/^.*\/_next\/static\//, '') || `(${n.callFrame.functionName || 'native'})`;
    const fn = `${n.callFrame.functionName || '(anonymous)'} ${file}:${n.callFrame.lineNumber}`;
    byFn.set(fn, (byFn.get(fn) ?? 0) + t);
    byFile.set(file, (byFile.get(file) ?? 0) + t);
  }
  const top = (m: Map<string, number>, k: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([name, us]) => `  ${(us / 1000).toFixed(0).padStart(6)} ms  ${((us / total) * 100).toFixed(1).padStart(5)}%  ${name.slice(0, 120)}`);
  const out = [
    `GPU: ${renderer}`,
    `cinematic ${mode}, ${seconds}s at 8x: ${frames.length} frames (${(frames.length / seconds).toFixed(1)} fps), frame gap p50 ${pct(0.5)} ms, p90 ${pct(0.9)} ms, p99 ${pct(0.99)} ms`,
    `sampled main-thread time ${(total / 1000).toFixed(0)} ms`,
    '', 'by file:', ...top(byFile, 12), '', 'by function:', ...top(byFn, 25),
  ].join('\n');
  console.log(out);
  mkdirSync(join(ROOT, 'qa-artifacts', 'profile'), { recursive: true });
  writeFileSync(join(ROOT, 'qa-artifacts', 'profile', `cinematic-${mode}${gpu ? '-gpu' : ''}.txt`), out);
  writeFileSync(join(ROOT, 'qa-artifacts', 'profile', `cinematic-${mode}${gpu ? '-gpu' : ''}.cpuprofile`), JSON.stringify(profile));
} finally {
  await browser.close();
  server.kill();
}
