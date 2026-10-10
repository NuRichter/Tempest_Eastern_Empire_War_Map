/**
 * Browser security regression tests, against a LOCAL production build
 * (`npm run build` first). Adversarial input never goes to the deployed site.
 *
 *   npm run security:browser
 *
 * Proves, in a real browser with the real headers:
 *   - hostile deep links neither run code nor break the app, and the clock stays in range
 *   - markup typed into search is shown as text
 *   - a tampered localStorage cannot pollute prototypes or crash the app
 *   - the CSP and Trusted Types refuse eval, Function, innerHTML strings,
 *     injected inline scripts and foreign script URLs
 *   - a data or locale file altered in transit is refused (Subresource Integrity)
 *     and the error screen leaks no paths or stack traces
 *   - the site cannot be framed (clickjacking)
 *   - the 3D view releases its WebGL context and memory when closed
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer';

const ROOT = join(import.meta.dirname, '..', '..');
const PREFS_KEY = 'tempest-atlas.preferences.v3';

async function freePort(): Promise<number> {
  return new Promise((res) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => res(p));
    });
  });
}

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name}${!ok && detail ? ` (${detail})` : ''}`);
}

async function fresh(browser: Browser, base: string, opts: { prefs?: string; intercept?: (url: string) => string | null } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const dialogs: string[] = [];
  const errors: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.evaluateOnNewDocument((key, prefs) => {
    const base = { state: { tourDone: true, music: false }, version: 3 };
    try { localStorage.setItem(key, prefs ?? JSON.stringify(base)); } catch { /* storage blocked */ }
  }, PREFS_KEY, opts.prefs ?? null);
  if (opts.intercept) {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const body = opts.intercept!(req.url());
      if (body === null) void req.continue();
      else void req.respond({ status: 200, contentType: 'application/json', body });
    });
  }
  void base;
  return { page, dialogs, errors };
}

async function ready(page: Page): Promise<boolean> {
  return page.waitForFunction(() => Boolean((window as unknown as { __atlasMap?: { loaded: () => boolean } }).__atlasMap?.loaded()), { timeout: 60000 }).then(() => true, () => false);
}

let server: ChildProcess | null = null;
let browser: Browser | null = null;
try {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    if (await fetch(base).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await puppeteer.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  /* -- hostile deep links ------------------------------------------- */
  const N = (await (await fetch(`${base}/data/manifest.json`)).json()).clock.frameCount as number;
  const links = [
    '?frame=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
    '?frame=-5',
    '?frame=99999999999999999999',
    '?frame=1e309',
    '?day=NaN&frame=',
    '?event=%22%3E%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E',
    '?event=javascript:alert(1)',
    '?view=javascript:alert(1)',
    '?battle=%00%0d%0aSet-Cookie:x=1',
    '?character=__proto__&force=constructor',
    `?event=${'A'.repeat(8000)}`,
  ];
  for (const q of links) {
    const { page, dialogs, errors } = await fresh(browser, base);
    await page.goto(base + '/' + q, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const ok = await ready(page);
    await new Promise((r) => setTimeout(r, 600));
    const frame = (await page.evaluate('window.__atlasClock?.frame ?? -1')) as number;
    const sameOrigin = new URL(page.url()).origin === base;
    const polluted = await page.evaluate(() => ({}) as Record<string, unknown>).then(() => page.evaluate(() => (Object.prototype as Record<string, unknown>).polluted !== undefined));
    const markup = await page.evaluate(() => document.querySelectorAll('img[src="x"], img[onerror]').length);
    check(`deep link ${q.slice(0, 48)}${q.length > 48 ? '…' : ''}: no code runs, app loads, frame in range`, ok && dialogs.length === 0 && errors.length === 0 && sameOrigin && frame >= 0 && frame <= N - 1 && !polluted && markup === 0, `loaded=${ok} dialogs=${dialogs.length} errors=${errors[0] ?? 0} frame=${frame} url=${page.url().slice(0, 60)}`);
    await page.close();
  }

  // A URL far beyond any real link is refused by the server itself, which keeps serving.
  {
    const r = await fetch(`${base}/?event=${'A'.repeat(60000)}`).catch(() => null);
    const alive = await fetch(base).then((x) => x.ok, () => false);
    check('an oversized URL (60 KB) is refused by the server, which stays up', r !== null && (r.status === 414 || r.status === 431 || r.status === 400) && alive, `status=${r?.status} alive=${alive}`);
  }

  /* -- search box ------------------------------------------------------ */
  {
    const { page, dialogs, errors } = await fresh(browser, base);
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await ready(page);
    await page.keyboard.press('/');
    await page.waitForSelector('[role="dialog"] input', { timeout: 10000 });
    await page.focus('[role="dialog"] input');
    const payload = '<img src=x onerror=alert(1)><svg/onload=alert(2)>';
    await page.keyboard.type(payload, { delay: 2 });
    await new Promise((r) => setTimeout(r, 500));
    const shown = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? '');
    const injected = await page.evaluate(() => document.querySelectorAll('[role="dialog"] img, [role="dialog"] svg[onload]').length);
    const value = await page.evaluate(() => (document.querySelector('[role="dialog"] input') as HTMLInputElement | null)?.value.length ?? 0);
    check('markup typed into search is shown as text, never parsed', dialogs.length === 0 && errors.length === 0 && injected === 0 && shown.includes('onerror'), `dialogs=${dialogs.length} injected=${injected}`);
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.keyboard.type('x'.repeat(400), { delay: 0 });
    const len = await page.evaluate(() => (document.querySelector('[role="dialog"] input') as HTMLInputElement | null)?.value.length ?? 0);
    check('search input is capped (no unbounded scoring work)', len <= 120 && value > 0, `length=${len}`);
    await page.close();
  }

  /* -- tampered localStorage -------------------------------------------- */
  {
    const hostile = JSON.stringify({ state: { tourDone: true, music: 'yes', musicVolume: 'NaN', mapStyle: { evil: 1 }, uiTheme: '<img src=x onerror=alert(1)>'.repeat(20), layers: { territories: 'no', __proto__: { polluted: 1 } }, bookmarks: [{ id: '<x>', frame: 'NaN', label: 5 }, { id: 'ok', frame: 3, eventId: null, label: 'fine' }, null], speedIndex: 1e309 }, version: 3 }).replace('"layers":{', '"__proto__":{"polluted":true},"layers":{');
    const { page, dialogs, errors } = await fresh(browser, base, { prefs: hostile });
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    const ok = await ready(page);
    const polluted = await page.evaluate(() => (Object.prototype as Record<string, unknown>).polluted !== undefined);
    const theme = await page.evaluate(() => document.documentElement.dataset.uiTheme);
    check('a tampered localStorage cannot pollute prototypes, inject markup or crash the app', ok && !polluted && dialogs.length === 0 && errors.length === 0 && (theme === 'dark' || theme === 'light'), `loaded=${ok} polluted=${polluted} errors=${errors[0] ?? 0} theme=${theme}`);
    await page.close();
  }

  /* -- CSP and Trusted Types ---------------------------------------------- */
  {
    const { page } = await fresh(browser, base);
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await ready(page);
    // Plain JavaScript (not compiled TypeScript) so nothing the bundler adds runs in the page.
    const r = (await page.evaluate(`(async () => {
      const w = window;
      const out = {};
      // Code run through DevTools is exempt from CSP eval checks, so eval is tried
      // inside a worker the page starts: it inherits the page's CSP like any page script.
      const tryInWorker = (code) => new Promise((res) => {
        try {
          const wk = new Worker(URL.createObjectURL(new Blob(['try{' + code + ';postMessage(true)}catch(e){postMessage(false)}'], { type: 'text/javascript' })));
          wk.onmessage = (e) => { res(e.data === true); wk.terminate(); };
          wk.onerror = () => { res(false); wk.terminate(); };
          setTimeout(() => res(false), 3000);
        } catch (e) { res(false); }
      });
      out.workerRuns = await tryInWorker('1');
      out.eval = await tryInWorker("eval('1+1')");
      out.fn = await tryInWorker("new Function('return 1')()");
      try { const d = document.createElement('div'); d.innerHTML = '<img src=x onerror="window.__c=1">'; document.body.append(d); out.innerHTML = true; } catch (e) { out.innerHTML = false; }
      try { const s = document.createElement('script'); s.textContent = 'window.__d = 1'; document.head.append(s); out.inline = true; } catch (e) { out.inline = false; }
      try { const s = document.createElement('script'); s.src = 'https://evil.example/x.js'; out.foreignSrc = true; } catch (e) { out.foreignSrc = false; }
      try { document.body.insertAdjacentHTML('beforeend', '<b onclick="x">x</b>'); out.insertHTML = true; } catch (e) { out.insertHTML = false; }
      await new Promise((res) => setTimeout(res, 300));
      out.ran = w.__c === 1 || w.__d === 1;
      return out;
    })()`)) as Record<string, boolean>;
    check('control: a plain worker script runs (so the next two results mean something)', r.workerRuns);
    check('CSP refuses eval', !r.eval);
    check('CSP refuses new Function', !r.fn);
    check('Trusted Types refuse an innerHTML string', !r.innerHTML);
    check('Trusted Types refuse an injected inline script', !r.inline);
    check('Trusted Types refuse a script from another origin', !r.foreignSrc);
    // The hosting toolbar's URL passes Trusted Types (so its module cannot crash the app),
    // and the CSP must still refuse to fetch it: not one request may leave for vercel.live.
    const toolbarRequests: string[] = [];
    // A request the CSP blocks is reported, then fails without a response: only responses mean it went out.
    page.on('response', (q) => { if (q.url().startsWith('https://vercel.live')) toolbarRequests.push(q.url()); });
    const toolbar = (await page.evaluate(`(async () => {
      try { const s = document.createElement('script'); s.src = 'https://vercel.live/_next-live/feedback/feedback.js'; document.head.append(s); } catch (e) { return 'threw'; }
      await new Promise((res) => setTimeout(res, 800));
      return typeof window.__vercelToolbar;
    })()`)) as string;
    check('the hosting toolbar loader neither crashes the app nor loads (CSP)', toolbar !== 'threw' && toolbarRequests.length === 0, `result=${toolbar} responses=${toolbarRequests.length}`);
    check('Trusted Types refuse insertAdjacentHTML', !r.insertHTML);
    check('no injected code ran', !r.ran);
    await page.close();
  }

  /* -- integrity: a file altered in transit --------------------------------- */
  {
    const original = await (await fetch(`${base}/data/events.json`)).text();
    const tampered = original.replace(/"title":"[^"]*"/, '"title":"PWNED BY A PROXY"');
    const { page } = await fresh(browser, base, { intercept: (url) => (url.endsWith('/data/events.json') ? tampered : null) });
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    const loaded = await ready(page);
    await new Promise((r) => setTimeout(r, 1500));
    const text = await page.evaluate(() => document.body.innerText);
    check('a dataset file altered in transit is refused (Subresource Integrity)', !loaded && !text.includes('PWNED'), `loaded=${loaded}`);
    check('the error screen leaks no paths, stack traces or build commands', /did not load/i.test(text) && !/[A-Z]:\\|\/Users\/|node_modules|\bat \w+ \(|npm run/.test(text), text.slice(0, 120));
    await page.close();
  }
  {
    const tampered = JSON.stringify({ 'Search the campaign': 'PWNED LOCALE' });
    const prefs = JSON.stringify({ state: { tourDone: true, music: false }, version: 3 });
    const { page, errors } = await fresh(browser, base, { prefs, intercept: (url) => (url.endsWith('/locales/id.json') ? tampered : null) });
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await ready(page);
    await page.evaluate(async () => {
      const sel = document.querySelector('label[data-tour="language"] select') as HTMLSelectElement | null;
      if (sel) { sel.value = 'id'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await new Promise((r) => setTimeout(r, 1500));
    const text = await page.evaluate(() => document.body.innerText);
    check('a locale file altered in transit is refused, the app stays usable', !text.includes('PWNED') && errors.length === 0, errors[0] ?? '');
    await page.close();
  }

  /* -- clickjacking ---------------------------------------------------------- */
  {
    const page = await browser.newPage();
    const blocked: string[] = [];
    page.on('console', (m) => { if (/frame-ancestors|X-Frame-Options|refused to (display|frame)/i.test(m.text())) blocked.push(m.text()); });
    await page.setContent(`<iframe id="f" src="${base}/" width="400" height="300"></iframe>`);
    await new Promise((r) => setTimeout(r, 2500));
    const framed = await page.evaluate(() => { try { return Boolean((document.getElementById('f') as HTMLIFrameElement).contentDocument?.querySelector('main')); } catch { return false; } });
    const childFrames = page.frames().filter((f) => f.url().startsWith(base));
    const rendered = childFrames.length ? await childFrames[0].evaluate(() => document.querySelectorAll('main').length).catch(() => 0) : 0;
    check('the site refuses to be framed (clickjacking)', !framed && rendered === 0, `rendered=${rendered} console=${blocked.length}`);
    await page.close();
  }

  /* -- 3D cleanup ---------------------------------------------------------- */
  {
    const { page, errors } = await fresh(browser, base);
    const warnings: string[] = [];
    page.on('console', (m) => { if (/too many active webgl contexts|context lost/i.test(m.text())) warnings.push(m.text()); });
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await ready(page);
    const cdp = await page.createCDPSession();
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); return ((await cdp.send('Runtime.getHeapUsage')) as { usedSize: number }).usedSize / 1048576; };
    await page.keyboard.press('v'); await new Promise((r) => setTimeout(r, 5000)); await page.keyboard.press('v'); await new Promise((r) => setTimeout(r, 1500));
    const h0 = await heap();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('v'); await new Promise((r) => setTimeout(r, 3500));
      await page.keyboard.press('v'); await new Promise((r) => setTimeout(r, 1200));
    }
    const h1 = await heap();
    const left = await page.evaluate(() => ({ handle: Boolean((window as unknown as { __atlas3d?: unknown }).__atlas3d), canvases: document.querySelectorAll('canvas').length }));
    check('the 3D view releases its WebGL context and memory when closed (6 open/close cycles)', !left.handle && warnings.length === 0 && errors.length === 0 && h1 - h0 < 25, `heap ${h0.toFixed(1)} -> ${h1.toFixed(1)} MB, handle=${left.handle}, canvases=${left.canvases}, warnings=${warnings.length}`);
    await page.close();
  }
} finally {
  await browser?.close();
  server?.kill();
}

console.log(`\n  ${passed}/${passed + failed} browser security tests passed.`);
process.exit(failed ? 1 : 0);
