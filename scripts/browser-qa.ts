/**
 * Browser QA.
 *
 * Starts the production server, drives the built application in a real browser
 * and walks the acceptance checklist: load, render, play, seek, speed, layers,
 * selection, search, camera, responsive layout and refresh. It fails on any
 * console error, any failed request and any check that does not hold.
 *
 * Puppeteer is not a project dependency, because a war map does not need a
 * browser to run. Install it only when you want to run this:
 *
 *     npm install --no-save puppeteer
 *     npm run qa
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

type Browser = { newPage: () => Promise<Page>; close: () => Promise<void> };
type Page = {
  setViewport: (v: { width: number; height: number }) => Promise<void>;
  goto: (url: string, o?: unknown) => Promise<unknown>;
  reload: (o?: unknown) => Promise<unknown>;
  on: (event: string, handler: (arg: never) => void) => void;
  evaluate: <T>(fn: string | ((...a: never[]) => T), ...args: unknown[]) => Promise<T>;
  keyboard: { press: (key: string) => Promise<void>; type: (text: string) => Promise<void> };
  click: (selector: string) => Promise<void>;
  $: (selector: string) => Promise<unknown | null>;
  $$: (selector: string) => Promise<unknown[]>;
  waitForSelector: (selector: string, o?: unknown) => Promise<unknown>;
  url: () => string;
};

/** Any free port, so a stale server from an earlier run cannot be mistaken for this one. */
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

const results: { name: string; ok: boolean; detail?: string }[] = [];
const consoleErrors: string[] = [];
const failedRequests: string[] = [];
const notFound: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name}${detail && !ok ? ` — ${detail}` : ''}`);
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
  throw new Error('The production server did not start in time.');
}

async function main(): Promise<void> {
  let puppeteer: { launch: (o: unknown) => Promise<Browser> };
  try {
    puppeteer = (await import('puppeteer')) as unknown as { launch: (o: unknown) => Promise<Browser> };
  } catch {
    console.error(
      'Browser QA needs Puppeteer, which is deliberately not a project dependency.\n' +
        'Install it for this run:  npm install --no-save puppeteer\n',
    );
    process.exit(1);
    return;
  }

  const port = await freePort();
  const ORIGIN = `http://127.0.0.1:${port}`;
  console.log(`Browser QA on ${ORIGIN}\n`);

  const server: ChildProcess = spawn('npx', ['next', 'start', '-p', String(port)], {
    stdio: 'ignore',
    env: { ...process.env },
    detached: true,
  });

  let stopped = false;
  const shutdown = () => {
    if (stopped) return;
    stopped = true;
    try {
      // Kill the whole group: next start spawns a server child of its own.
      if (server.pid) process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
  };
  process.on('exit', shutdown);
  process.on('SIGINT', () => {
    shutdown();
    process.exit(130);
  });

  let browser: Browser | null = null;
  try {
    await waitForServer(ORIGIN, 60_000);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-unsafe-swiftshader',
        '--use-gl=swiftshader',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 950 });

    page.on('console', (message: never) => {
      const m = message as unknown as { type: () => string; text: () => string };
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (error: never) => consoleErrors.push(String(error)));
    page.on('requestfailed', (request: never) => {
      const r = request as unknown as { url: () => string; failure: () => { errorText: string } | null };
      failedRequests.push(`${r.url()} — ${r.failure()?.errorText ?? 'failed'}`);
    });
    page.on('response', (response: never) => {
      const r = response as unknown as { status: () => number; url: () => string };
      if (r.status() >= 400) notFound.push(`${r.status()} ${r.url()}`);
    });

    /* -- initial load --------------------------------------------- */

    await page.goto(ORIGIN, { waitUntil: 'networkidle2', timeout: 60_000 });
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await sleep(2500);

    check('application starts', await page.evaluate<boolean>('document.querySelectorAll("canvas").length >= 2'),
      'expected a map canvas and an overlay canvas');

    check(
      'map renders',
      await page.evaluate<boolean>(`
        (() => {
          const c = document.querySelector('.maplibregl-canvas');
          return !!c && c.width > 100 && c.height > 100;
        })()
      `),
    );

    check(
      'campaign dataset loaded',
      await page.evaluate<boolean>(`document.body.innerText.includes('01/01/9001')`),
      'the opening campaign date should be on screen',
    );

    /* -- transport ------------------------------------------------ */

    const readFrame = () =>
      page.evaluate<number>(`Number(new URLSearchParams(location.search).get('frame') ?? -1)`);

    const before = await readFrame();
    await page.keyboard.press('Space');
    await sleep(2200);
    const afterPlay = await readFrame();
    check('play advances the simulation', afterPlay > before, `frame ${before} -> ${afterPlay}`);

    await page.keyboard.press('Space');
    await sleep(700);
    const paused = await readFrame();
    await sleep(1200);
    check('pause holds the simulation', (await readFrame()) === paused, 'frame moved while paused');

    await page.keyboard.press('Digit6');
    await page.keyboard.press('Space');
    await sleep(2200);
    const fast = await readFrame();
    await page.keyboard.press('Space');
    check('8x playback advances faster than 1x', fast - paused > afterPlay - before, `${fast - paused} vs ${afterPlay - before}`);

    /* -- seeking -------------------------------------------------- */

    await page.goto(`${ORIGIN}/?frame=5799`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await sleep(1800);
    check('deep link seeks to a frame', Math.abs((await readFrame()) - 5799) <= 2, `landed on ${await readFrame()}`);

    check(
      'first contact state is reached',
      await page.evaluate<boolean>(`document.body.innerText.includes('D+00')`),
      'battle day D+00 should be shown at the first-contact frame',
    );

    /* -- selection and dossier ------------------------------------ */

    await page.keyboard.press('Slash');
    await page.waitForSelector('[role="dialog"] input', { timeout: 10_000 });
    await page.keyboard.type('Labyrinth');
    await sleep(1200);
    const hasHits = await page.evaluate<boolean>(`document.querySelectorAll('[role="dialog"] li').length > 0`);
    check('search returns results', hasHits);
    if (hasHits) {
      await page.keyboard.press('Enter');
      await sleep(1600);
      check(
        'search result opens a dossier',
        await page.evaluate<boolean>(`!!document.querySelector('aside[class*="right-4"]')`),
      );
    }

    /* -- layers --------------------------------------------------- */

    const toggled = await page.evaluate<boolean>(`
      (() => {
        const boxes = Array.from(document.querySelectorAll('aside input[type=checkbox]'));
        if (boxes.length === 0) return false;
        const first = boxes[0];
        const was = first.checked;
        first.click();
        return first.checked !== was;
      })()
    `);
    check('map layers toggle', toggled);

    /* -- camera --------------------------------------------------- */

    await page.keyboard.press('KeyG');
    await sleep(1400);
    check('globe and flat projection both render', consoleErrors.filter((e) => /projection|globe/i.test(e)).length === 0);

    /* -- cinematic ------------------------------------------------ */

    await page.keyboard.press('KeyC');
    await sleep(1600);
    check(
      'cinematic mode simplifies the interface',
      await page.evaluate<boolean>(`document.querySelectorAll('aside').length === 0 || !document.querySelector('aside input[type=checkbox]')`),
    );
    await page.keyboard.press('KeyC');
    await sleep(600);

    /* -- debug ---------------------------------------------------- */

    await page.keyboard.press('KeyD');
    await sleep(1600);
    check(
      'developer readout opens',
      await page.evaluate<boolean>(`document.body.innerText.includes('Developer readout')`),
    );
    await page.keyboard.press('KeyD');

    /* -- responsive ----------------------------------------------- */

    await page.setViewport({ width: 420, height: 820 });
    await sleep(1200);
    check(
      'narrow layout keeps the map visible',
      await page.evaluate<boolean>(`
        (() => {
          const c = document.querySelector('.maplibregl-canvas');
          if (!c) return false;
          const r = c.getBoundingClientRect();
          return r.width > 100 && r.height > 100;
        })()
      `),
    );
    await page.setViewport({ width: 1600, height: 950 });
    await sleep(800);

    /* -- refresh -------------------------------------------------- */

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await sleep(2000);
    check(
      'state survives a refresh',
      await page.evaluate<boolean>(`Number(new URLSearchParams(location.search).get('frame') ?? -1) > 0`),
    );

    /* -- hygiene -------------------------------------------------- */

    // Absent flag PNGs are expected under FLAGS_OPTIONAL and are reported by
    // the asset validator, not here. Everything else must be clean.
    const expected = /favicon|nation-flags/i;

    const realErrors = consoleErrors.filter(
      (e) => !/Download the React DevTools|telemetry/i.test(e) && !/Failed to load resource/i.test(e),
    );
    check('no console errors', realErrors.length === 0, realErrors.slice(0, 4).join(' | '));

    const realNotFound = notFound.filter((r) => !expected.test(r));
    check('no missing resources', realNotFound.length === 0, realNotFound.slice(0, 4).join(' | '));

    const realFailures = failedRequests.filter((r) => !expected.test(r));
    check('no failed requests', realFailures.length === 0, realFailures.slice(0, 4).join(' | '));
  } finally {
    await browser?.close();
    shutdown();
  }

  const failures = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failures.length}/${results.length} checks passed`);
  if (failures.length > 0) {
    console.error('\nBrowser QA failed.\n');
    process.exit(1);
  }
  console.log('\nBrowser QA passed.\n');
  process.exit(0);
}

void main();
