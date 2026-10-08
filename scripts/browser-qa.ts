/**
 * Browser QA.
 *
 * Starts the production server (run `npm run build` first), drives the atlas in
 * a real Chromium through Puppeteer and walks the acceptance matrix: load, map
 * render, play / pause / speed / seek / scrub, deep links, search, layers, map
 * styles, flat / globe, cinematic mode, legend, filters, dossiers, keyboard,
 * responsive layouts, refresh, console and network cleanliness, and a small
 * performance probe. Screenshots land in qa-artifacts/ (git-ignored).
 *
 *     npm run build && npm run qa
 *
 * Set QA_ORIGIN=http://127.0.0.1:3000 to test an already-running server.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import puppeteer, { type Page } from 'puppeteer';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'qa-artifacts');

const results: { name: string; ok: boolean; detail?: string }[] = [];
const consoleErrors: string[] = [];
const badRequests: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(origin: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  throw new Error('The production server did not start in time. Did you run "npm run build"?');
}

type Probe = { frame: number; playing: boolean; selection: string; viewMode: string };
const probe = (page: Page) =>
  page.evaluate(() => {
    const slider = document.querySelector('[role="slider"][aria-label="Campaign position"]');
    const playBtn = document.querySelector('button[aria-label="Pause"], button[aria-label="Play"]');
    return {
      frame: Number(slider?.getAttribute('aria-valuenow') ?? -1),
      playing: playBtn?.getAttribute('aria-label') === 'Pause',
      selection: new URLSearchParams(location.search).toString(),
      viewMode: document.querySelector('header h1') ? 'standard' : 'cinematic',
    } satisfies { frame: number; playing: boolean; selection: string; viewMode: string };
  }) as Promise<Probe>;

const mapState = (page: Page) =>
  page.evaluate(() => {
    const m = (window as unknown as { __atlasMap?: { loaded: () => boolean; getProjection: () => { type?: string } | undefined; getPaintProperty: (l: string, p: string) => unknown; getLayoutProperty: (l: string, p: string) => unknown; getZoom: () => number } }).__atlasMap;
    if (!m) return null;
    return {
      loaded: m.loaded(),
      projection: m.getProjection()?.type ?? 'mercator',
      base: m.getPaintProperty('base-raster', 'raster-opacity'),
      myth: m.getPaintProperty('myth-raster', 'raster-opacity'),
      territories: m.getLayoutProperty('territory-fill', 'visibility') ?? 'visible',
      zoom: m.getZoom(),
    };
  });

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  let server: ChildProcess | null = null;
  let origin = process.env.QA_ORIGIN ?? '';
  if (!origin) {
    const port = await freePort();
    origin = `http://127.0.0.1:${port}`;
    // Spawn node directly: no shell, no npx, identical on Windows and Linux.
    server = spawn(process.execPath, [join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port)], { cwd: ROOT, stdio: 'ignore' });
  }
  console.log(`Browser QA on ${origin}\n`);

  const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    await waitForServer(origin, 60000);
    const page = await browser.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e instanceof Error ? e.message : String(e)}`));
    page.on('requestfailed', (r) => {
      if (!/favicon/.test(r.url())) badRequests.push(`${r.url()} ${r.failure()?.errorText}`);
    });
    page.on('response', (r) => {
      if (r.status() >= 400) badRequests.push(`${r.status()} ${r.url()}`);
    });
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.clear();
      } catch {
        /* storage unavailable */
      }
    });
    await page.setViewport({ width: 1440, height: 900 });
    const shot = (name: string) => page.screenshot({ path: join(OUT, `${name}.png`) });
    const go = async (q = '', settle = 2500) => {
      await page.goto(`${origin}/${q}`, { waitUntil: 'networkidle0', timeout: 90000 });
      await page.waitForFunction(() => Boolean((window as unknown as { __atlasMap?: { loaded: () => boolean } }).__atlasMap?.loaded()), { timeout: 60000 });
      await sleep(settle);
    };
    const manifest = (await (await fetch(`${origin}/data/manifest.json`)).json()) as { clock: { frameCount: number }; campaign: { firstContactFrame: number }; counts: Record<string, number> };
    const fc = manifest.campaign.firstContactFrame;

    /* -- load ------------------------------------------------------ */
    const t0 = Date.now();
    await go('', 1500);
    const loadMs = Date.now() - t0;
    const ms = await mapState(page);
    check('application loads and the map initialises', Boolean(ms?.loaded), `${loadMs} ms to an idle map`);
    check('Base Map is the default style', ms?.base === 1 && ms?.myth === 0);
    const occupation = await page.evaluate(() => Boolean((window as unknown as { __atlasMap?: { getLayer: (id: string) => unknown } }).__atlasMap?.getLayer('occupation')));
    check('the reconstructed occupation layer is present', occupation);
    check('the dataset is available', manifest.counts.events > 0 && manifest.counts.territories > 0, `${manifest.counts.events} events, ${manifest.counts.territories} territories`);
    const timelineMs = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const mark = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter((r) => r.name.includes('/data/')).reduce((m, r) => Math.max(m, r.responseEnd), 0);
      return Math.round(mark - (nav?.startTime ?? 0));
    });
    check('timeline data is ready quickly', timelineMs < 8000, `${timelineMs} ms from navigation to the last dataset file`);
    await shot('01-default');

    /* -- playback -------------------------------------------------- */
    await go(`?frame=${fc - 30}`);
    const before = await probe(page);
    check('deep link ?frame= seeks', before.frame === fc - 30, `frame ${before.frame}`);
    await page.keyboard.press('Space');
    await sleep(2000);
    const during = await probe(page);
    check('play advances time', during.playing && during.frame > before.frame, `${before.frame} -> ${during.frame}`);
    await page.keyboard.press('Space');
    await sleep(300);
    const paused = await probe(page);
    await sleep(800);
    const still = await probe(page);
    check('pause holds time', !still.playing && still.frame === paused.frame);
    // 48x on a stretch without turning points, so auto-slow does not intervene.
    await go('?frame=3000', 1500);
    const calm = await probe(page);
    await page.keyboard.press('8');
    await page.keyboard.press('Space');
    await sleep(1000);
    const fast = await probe(page);
    await page.keyboard.press('Space');
    check('48x advances about a simulated day per second', fast.frame - calm.frame > 60, `${fast.frame - calm.frame} keyframes in 1 s`);

    // Auto-slow: crossing a turning point at speed drops playback to 1x for a moment.
    await go('?frame=5490', 1500);
    await page.keyboard.press('8');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => Number(document.querySelector('[role="slider"][aria-label="Campaign position"]')?.getAttribute('aria-valuenow')) > 5520, { timeout: 15000 }).catch(() => undefined);
    const slowed = await page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((n) => n.textContent ?? '').find((t) => /turning point/i.test(t)) ?? '');
    await page.keyboard.press('Space');
    check('auto-slow drops to 1x at a turning point', /1×/.test(slowed), slowed || 'no auto-slow indicator');
    await page.keyboard.press('3');

    /* -- stepping & scrubbing -------------------------------------- */
    await go(`?frame=${fc}`);
    await page.keyboard.press(']');
    await sleep(600);
    const next = await probe(page);
    check('] jumps to the next event', next.frame > fc && next.selection.includes('event='), `frame ${next.frame}`);
    const track = await page.$('[role="slider"][aria-label="Campaign position"]');
    const box = await track!.boundingBox();
    await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height / 2);
    await sleep(400);
    const scrubbed = await probe(page);
    check('clicking the timeline seeks', Math.abs(scrubbed.frame - Math.round((manifest.clock.frameCount - 1) * 0.25)) < manifest.clock.frameCount * 0.02, `frame ${scrubbed.frame}`);

    /* -- seek performance ------------------------------------------ */
    const seekMs = await page.evaluate(async () => {
      const slider = document.querySelector('[role="slider"][aria-label="Campaign position"]') as HTMLElement;
      const r = slider.getBoundingClientRect();
      const t = performance.now();
      for (let i = 0; i < 40; i += 1) {
        const x = r.left + ((i * 7919) % 1000) / 1000 * r.width;
        slider.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: r.top + 10, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        await new Promise((res) => requestAnimationFrame(() => res(null)));
      }
      return (performance.now() - t) / 40;
    });
    check('random seeks stay interactive', seekMs < 120, `${seekMs.toFixed(1)} ms per seek incl. a frame (software GL)`);

    /* -- dossier opening time -------------------------------------- */
    await go(`?frame=${fc}`);
    const tOpen = Date.now();
    await page.keyboard.press(']');
    await page.waitForSelector('aside[aria-label="Dossier"]', { timeout: 5000 });
    const dossierMs = Date.now() - tOpen;
    check('a dossier opens promptly', dossierMs < 1500, `${dossierMs} ms from keypress to dossier`);

    /* -- dossiers -------------------------------------------------- */
    await go('?event=EVT-0119');
    check('event deep link opens its dossier', Boolean(await page.$('aside[aria-label="Dossier"]')));
    await shot('02-event-dossier');
    await go(`?frame=${fc + 6}&force=F-EMP-012`);
    check('force dossier opens', (await page.content()).includes('Strength history'));
    await shot('03-force-dossier');
    await go('?character=benimaru');
    const portraitOk = await page.evaluate(() => [...document.querySelectorAll('aside img')].some((i) => (i as HTMLImageElement).alt.includes('Benimaru') && (i as HTMLImageElement).naturalWidth > 0));
    check('character dossier shows the local photocard', portraitOk);
    await shot('04-character');
    await go('?territory=T-JTF');
    check('territory dossier opens with its history', (await page.content()).includes('History'));

    /* -- search ---------------------------------------------------- */
    await go(`?frame=${fc}`);
    await page.keyboard.press('/');
    await sleep(200);
    await page.keyboard.type('Nazca');
    await sleep(400);
    const found = await page.$$eval('#palette-results [role="option"]', (els) => els.map((e) => e.textContent ?? ''));
    check('search finds the Empire by its alias "Nazca"', found.some((t) => /Eastern Empire/i.test(t)), `${found.length} results`);
    await shot('05-search');
    await page.keyboard.press('Enter');
    await sleep(800);
    check('choosing a result selects it', (await probe(page)).selection.length > 0);

    /* -- layers, styles, projection -------------------------------- */
    await go(`?frame=${fc + 30}`);
    await page.keyboard.press('m');
    await sleep(900);
    const myth = await mapState(page);
    check('M switches to the Myth Map', myth?.myth === 1 && myth?.base === 0);
    await shot('06-myth');
    const keptFrame = (await probe(page)).frame;
    check('switching style keeps the campaign moment', keptFrame === fc + 30);
    await page.keyboard.press('m');
    await page.keyboard.press('g');
    await sleep(1500);
    check('G switches to the globe', (await mapState(page))?.projection === 'globe');
    await shot('07-globe');
    await page.keyboard.press('g');
    await sleep(800);
    check('G switches back to flat', (await mapState(page))?.projection === 'mercator');
    await page.click('button[aria-label="Layers"]');
    await sleep(300);
    await page.evaluate(() => [...document.querySelectorAll('label')].find((l) => l.textContent?.startsWith('Territories'))?.querySelector('input')?.click());
    await sleep(400);
    check('the Territories layer toggles off', (await mapState(page))?.territories === 'none');
    await shot('08-layers');

    /* -- filters --------------------------------------------------- */
    await page.click('button[aria-label="Filters"]');
    await sleep(300);
    await page.evaluate(() => [...document.querySelectorAll('label')].find((l) => l.textContent?.includes('Eastern Empire'))?.querySelector('input')?.click());
    await sleep(300);
    check('an active filter is announced on the map', Boolean(await page.$('[role="status"]')) && (await page.content()).includes('filter'));
    await page.click('button[aria-label="Reset filters"]');

    /* -- legend & cinematic ---------------------------------------- */
    await go(`?frame=${fc + 12}`);
    await page.keyboard.press('l');
    await sleep(300);
    check('L opens the legend', Boolean(await page.$('aside[aria-label="Map legend"]')));
    await shot('09-legend');
    await page.keyboard.press('l');
    await page.keyboard.press('c');
    await sleep(1200);
    check('C enters cinematic mode', (await probe(page)).viewMode === 'cinematic');
    await shot('10-cinematic');
    await page.keyboard.press('Escape');
    await sleep(400);
    check('Esc leaves cinematic mode', (await probe(page)).viewMode === 'standard');

    /* -- refresh ----------------------------------------------------- */
    await go(`?frame=${fc + 44}`);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(2000);
    check('refresh restores the moment from the URL', (await probe(page)).frame === fc + 44);

    /* -- first-run tour ---------------------------------------------- */
    await go('?tour=1', 2200);
    const tourOpen = () => page.evaluate(() => Boolean(document.querySelector('[aria-labelledby="tour-title"]')));
    const tourTitle = () => page.evaluate(() => document.getElementById('tour-title')?.textContent ?? '');
    const title0 = await tourTitle();
    await page.keyboard.press('ArrowRight');
    await sleep(700);
    const title1 = await tourTitle();
    check('the first-run tour opens and steps with the arrow keys', (await tourOpen()) && title0 !== title1 && title1.length > 0, `${title0} -> ${title1}`);
    const frameBefore = (await probe(page)).frame;
    await page.keyboard.press('Escape');
    await sleep(500);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tempest-atlas.preferences.v3') || '{}').state?.tourDone === true);
    check('Esc closes the tour, remembers it and leaves the clock alone', !(await tourOpen()) && stored && (await probe(page)).frame === frameBefore);
    await go('', 2200);
    check('the tour does not come back once seen', !(await tourOpen()));

    /* -- responsive -------------------------------------------------- */
    for (const [w, h] of [[320, 640], [375, 812], [390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]] as const) {
      await page.setViewport({ width: w, height: h });
      await go(`?frame=${fc + 30}`, 1500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const mapArea = await page.evaluate(() => {
        const c = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement | null;
        return c ? c.clientWidth * c.clientHeight : 0;
      });
      check(`layout at ${w}px has no horizontal scroll and a usable map`, overflow <= 0 && mapArea > w * h * 0.3, `overflow ${overflow}px`);
      if (w === 390 || w === 768 || w === 1920) await shot(`11-viewport-${w}`);
    }

    /* -- cleanliness ------------------------------------------------- */
    check('console is free of errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    check('no failed or 4xx/5xx requests', badRequests.length === 0, badRequests.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
    server?.kill();
  }

  writeFileSync(join(OUT, 'qa-report.json'), JSON.stringify({ results, consoleErrors, badRequests }, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failed.length}/${results.length} checks passed. Screenshots in qa-artifacts/.\n`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
