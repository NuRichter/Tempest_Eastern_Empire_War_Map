/**
 * Black-box security scan of a deployed (or locally started) site.
 *
 *   npm run security:scan -- http://127.0.0.1:3000          active + passive (local build)
 *   npm run security:scan -- https://tempestwar.vercel.app  passive only (production)
 *
 * PASSIVE (any target, about ten GET/HEAD requests): security headers and
 * the CSP itself, inline-script hashes and script integrity in the served
 * page, HTTPS redirect and HSTS, hotlink and CORS headers on assets,
 * security.txt.
 * ACTIVE (local only, refused for any other host): HTTP methods, files that
 * must never be served, source maps, CRLF (response splitting) and Host
 * header injection, open redirects, path traversal, reflected input (XSS,
 * XML and template payloads). Adversarial requests never go to production
 * or to shared hosting infrastructure.
 * Exits non-zero on any failure.
 *
 * Checks are a plain list: add one by pushing to CHECKS.
 */

// No default target: the URL is always explicit, so a scan never lands on something else by accident.
if (!process.argv[2]) {
  console.error('usage: npm run security:scan -- <url>   (local build: active + passive, any other host: passive only)');
  process.exit(2);
}
const BASE = process.argv[2].replace(/\/$/, '');
const local = /^http:\/\/(127\.0\.0\.1|localhost)/.test(BASE);

interface Result { name: string; ok: boolean; detail?: string; warnOnly?: boolean }
const results: Result[] = [];
const pass = (name: string, detail?: string) => results.push({ name, ok: true, detail });
const fail = (name: string, detail?: string, warnOnly = false) => results.push({ name, ok: false, detail, warnOnly });

async function get(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(BASE + path, { redirect: 'manual', ...init, headers: { 'user-agent': 'tempest-security-scan', ...(init.headers ?? {}) } });
}

/** Directives of a CSP header as a map. */
function parseCsp(v: string): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const part of v.split(';')) {
    const [name, ...vals] = part.trim().split(/\s+/);
    if (name) m.set(name.toLowerCase(), vals);
  }
  return m;
}

type Check = () => Promise<void>;
const CHECKS: Check[] = []; // passive
const ACTIVE: Check[] = []; // local only

/* -- headers --------------------------------------------------------- */
CHECKS.push(async () => {
  const r = await get('/');
  const h = r.headers;
  const want: [string, (v: string | null) => boolean, string][] = [
    ['content-security-policy', (v) => Boolean(v), 'present'],
    ['strict-transport-security', (v) => local || /max-age=(\d+)/.test(v ?? '') && Number(/max-age=(\d+)/.exec(v!)![1]) >= 31536000, 'max-age >= 1 year'],
    ['x-content-type-options', (v) => v === 'nosniff', 'nosniff'],
    ['x-frame-options', (v) => v === 'DENY', 'DENY'],
    ['referrer-policy', (v) => Boolean(v) && !/unsafe-url|no-referrer-when-downgrade/.test(v!), 'strict policy'],
    ['permissions-policy', (v) => /camera=\(\)/.test(v ?? '') && /microphone=\(\)/.test(v ?? '') && /geolocation=\(\)/.test(v ?? ''), 'camera, microphone, geolocation off'],
    ['cross-origin-opener-policy', (v) => v === 'same-origin', 'same-origin'],
    ['cross-origin-embedder-policy', (v) => v === 'require-corp' || v === 'credentialless', 'require-corp'],
    ['cross-origin-resource-policy', (v) => v === 'same-origin', 'same-origin'],
    ['origin-agent-cluster', (v) => v === '?1', '?1'],
  ];
  for (const [name, ok, what] of want) (ok(h.get(name)) ? pass : fail)(`header ${name}`, `${what}, got ${h.get(name) ?? 'none'}`);
  for (const leak of ['x-powered-by', 'server-timing', 'x-aspnet-version']) (h.get(leak) ? fail : pass)(`no ${leak} header`, h.get(leak) ?? undefined);
  (h.get('set-cookie') ? fail : pass)('no cookies set', h.get('set-cookie') ?? undefined);
  const acao = h.get('access-control-allow-origin');
  (acao === '*' ? fail : pass)('page not readable cross-origin (CORS)', acao ?? 'no ACAO');

  /* CSP content */
  const csp = parseCsp(h.get('content-security-policy') ?? '');
  const script = csp.get('script-src') ?? csp.get('default-src') ?? [];
  (script.includes("'unsafe-eval'") ? fail : pass)("CSP script-src has no 'unsafe-eval'");
  (script.includes("'unsafe-inline'") ? fail : pass)("CSP script-src has no 'unsafe-inline' (inline scripts pinned by hash)", script.filter((s) => s.startsWith("'sha")).length + ' hashes');
  (script.some((s) => s === '*' || s === 'https:' || s === 'http:' || s === 'data:') ? fail : pass)('CSP script-src allows no wildcard, scheme or data: sources');
  for (const d of ['object-src', 'base-uri', 'frame-ancestors', 'form-action']) (csp.has(d) ? pass : fail)(`CSP sets ${d}`);
  ((csp.get('object-src') ?? []).includes("'none'") ? pass : fail)("CSP object-src 'none'");
  ((csp.get('frame-ancestors') ?? []).includes("'none'") ? pass : fail)("CSP frame-ancestors 'none'");
  (csp.has('require-trusted-types-for') ? pass : fail)('CSP enforces Trusted Types (DOM XSS sinks locked)');
  if (!local) (csp.has('upgrade-insecure-requests') ? pass : fail)('CSP upgrade-insecure-requests');

  /* Inline scripts in the page must all be covered by the CSP hashes. */
  const html = await r.text();
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)].filter((m) => !/type="application\/(ld\+)?json"/.test(m[1]));
  const { createHash } = await import('node:crypto');
  const missing = inline.filter((m) => !script.includes(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`));
  (missing.length === 0 ? pass : fail)('every inline script is allowed by hash', `${inline.length} inline, ${missing.length} not covered`);
  const external = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)];
  const noSri = external.filter((m) => !/\bintegrity="sha(256|384|512)-/.test(m[0]));
  (noSri.length === 0 ? pass : fail)('every script file carries Subresource Integrity', `${external.length} scripts, ${noSri.length} without integrity`);
  const thirdParty = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith(BASE));
  // The canonical site URL (in metadata) and plain outbound links are not resources the page loads.
  const loads = thirdParty.filter((u) => !/^https:\/\/(tempestwar\.vercel\.app|github\.com|www\.ten-sura\.com)(\/|$)/.test(u));
  (loads.length === 0 ? pass : fail)('no third-party resources in the page', loads.slice(0, 3).join(' '));
});

/* -- transport ------------------------------------------------------- */
CHECKS.push(async () => {
  if (local) return;
  const r = await fetch(BASE.replace('https://', 'http://') + '/', { redirect: 'manual' });
  ([301, 302, 307, 308].includes(r.status) && (r.headers.get('location') ?? '').startsWith('https://') ? pass : fail)('plain HTTP redirects to HTTPS', `${r.status} ${r.headers.get('location')}`);
});

/* -- methods --------------------------------------------------------- */
ACTIVE.push(async () => {
  for (const m of ['TRACE', 'PUT', 'DELETE', 'PATCH', 'POST']) {
    const r = await get('/', { method: m, body: m === 'TRACE' ? undefined : 'x' }).catch(() => null);
    if (!r) { pass(`${m} / refused`, 'connection refused'); continue; }
    const body = await r.text();
    // A static host may answer 200 or 405, but must never echo the request (TRACE) or accept a write.
    const echoed = m === 'TRACE' && body.includes('tempest-security-scan');
    const wrote = [201, 202, 204].includes(r.status);
    (echoed || wrote ? fail : pass)(`${m} / does not echo or write`, String(r.status));
  }
});

/* -- files that must never be served -------------------------------- */
ACTIVE.push(async () => {
  const paths = ['/.env', '/.env.local', '/.env.production', '/.git/config', '/.git/HEAD', '/.vercel/project.json', '/package.json', '/package-lock.json', '/next.config.mjs', '/tsconfig.json', '/.next/BUILD_ID', '/server.js', '/.npmrc', '/Sources%20of%20Truth/README.md', '/data-source/campaign/front-rules.json', '/scripts/compile-data.ts', '/src/app/layout.tsx', '/.gitignore', '/README.md'];
  for (const p of paths) {
    const r = await get(p);
    const t = r.status === 200 ? await r.text() : '';
    const leaked = r.status === 200 && !/<!DOCTYPE html/i.test(t);
    (leaked ? fail : pass)(`not served: ${p}`, String(r.status));
  }
  const page = await (await get('/')).text();
  const chunk = /\/_next\/static\/chunks\/[^"']+\.js/.exec(page)?.[0];
  if (chunk) {
    const r = await get(chunk + '.map');
    (r.status === 200 ? fail : pass)('no source maps published', `${chunk}.map -> ${r.status}`);
  }
});

/* -- injection ------------------------------------------------------- */
ACTIVE.push(async () => {
  // CRLF: a response must never carry a header smuggled in through the URL.
  for (const p of ['/%0d%0aSet-Cookie:%20pwned=1', '/?x=%0d%0aSet-Cookie:%20pwned=1', '/%0aX-Injected:%201']) {
    const r = await get(p);
    (r.headers.get('set-cookie')?.includes('pwned') || r.headers.get('x-injected') ? fail : pass)(`CRLF injection blocked: ${p}`, String(r.status));
  }
  // Host header: no redirect or link to a foreign host.
  for (const hdr of [{ host: 'evil.example' }, { 'x-forwarded-host': 'evil.example' }]) {
    const r = await get('/', { headers: hdr }).catch(() => null);
    if (!r) { pass(`Host injection ${Object.keys(hdr)[0]}`, 'refused'); continue; }
    const t = await r.text();
    ((r.headers.get('location') ?? '').includes('evil.example') || t.includes('evil.example') ? fail : pass)(`Host header injection: ${Object.keys(hdr)[0]}`, String(r.status));
  }
  // Open redirects.
  for (const p of ['//evil.example/', '/\\evil.example', '/%2f%2fevil.example', '/?next=https://evil.example', '/?redirect=//evil.example']) {
    const r = await get(p);
    // An open redirect sends the browser to another host. A same-origin path that merely contains the text is fine.
    const loc = r.headers.get('location');
    const target = loc ? new URL(loc, BASE + '/') : null;
    (target && target.host !== new URL(BASE).host ? fail : pass)(`no open redirect: ${p}`, `${r.status} ${loc ?? ''}`);
  }
  // Path traversal.
  for (const p of ['/..%2f..%2f..%2fetc%2fpasswd', '/data/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/package.json', '/data/%2e%2e%2f%2e%2e%2fnext.config.mjs', '/assets/..%252f..%252fpackage.json']) {
    const r = await get(p);
    const t = r.status === 200 ? await r.text() : '';
    (/root:x:0|"dependencies"|nextConfig/.test(t) ? fail : pass)(`no path traversal: ${p}`, String(r.status));
  }
  // Reflected input: XSS, XML entities, template syntax. A static site must not echo any of it.
  const payloads = ['<script>alert(1)</script>', '"><svg onload=alert(1)>', '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>', '{{7*7}}${7*7}<%= 7*7 %>', "javascript:alert(1)//'"];
  for (const pl of payloads) {
    for (const path of ['/', '/sitemap.xml', '/robots.txt', '/not-a-page']) {
      const r = await get(`${path}?frame=${encodeURIComponent(pl)}&event=${encodeURIComponent(pl)}`);
      const t = await r.text();
      (t.includes(pl) || t.includes('root:x:0') ? fail : pass)(`input not reflected on ${path}: ${pl.slice(0, 18)}…`, String(r.status));
    }
  }
  // XML endpoints must stay well-formed static XML.
  const sm = await get('/sitemap.xml');
  ((sm.headers.get('content-type') ?? '').includes('xml') && !(await sm.text()).includes('<!ENTITY') ? pass : fail)('sitemap is static XML without entities');
});

/* -- data and assets ------------------------------------------------- */
CHECKS.push(async () => {
  for (const p of ['/data/manifest.json', '/assets/music/cine-battle.mp3', '/maps/coast.json', '/tiles/myth/0/0/0.jpg']) {
    const r = await get(p, { method: 'HEAD' });
    if (r.status === 404) continue;
    (r.headers.get('cross-origin-resource-policy') === 'same-origin' ? pass : fail)(`hotlink protection on ${p}`, r.headers.get('cross-origin-resource-policy') ?? 'none');
    (r.headers.get('access-control-allow-origin') === '*' ? fail : pass)(`${p} not readable cross-origin`, r.headers.get('access-control-allow-origin') ?? 'no ACAO');
    (r.headers.get('x-content-type-options') === 'nosniff' ? pass : fail)(`${p} nosniff`);
  }
  const st = await get('/.well-known/security.txt');
  (st.status === 200 && /Contact:/i.test(await st.text()) ? pass : fail)('security.txt published', String(st.status));
});

/* -- run ------------------------------------------------------------- */
if (!local) console.log(`  Passive mode on ${BASE}: headers only, no adversarial requests.
`);
for (const c of local ? [...CHECKS, ...ACTIVE] : CHECKS) {
  try {
    await c();
  } catch (e) {
    fail('check crashed', e instanceof Error ? e.message : String(e));
  }
}
let bad = 0;
for (const r of results) {
  if (!r.ok && !r.warnOnly) bad += 1;
  console.log(`  ${r.ok ? 'pass' : r.warnOnly ? 'WARN' : 'FAIL'}  ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
}
console.log(`\n  ${results.length - bad}/${results.length} security checks passed on ${BASE}.`);
process.exit(bad ? 1 : 0);
