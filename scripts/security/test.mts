/**
 * Security regression tests (Node, no browser). Part of `npm run verify`.
 *
 *   input validation   URL parameters, record ids, external links
 *   JSON integrity     prototype pollution refused, stored settings restored by type
 *   fetch boundary     only same-origin paths can be fetched
 *   search             bounded cost whatever is pasted in
 *   build pipeline     malformed and hostile sources fail the compile without
 *                      touching public/data; the output directory guard
 *
 * Every test states what it proves. Add a case next to the finding it guards.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, parse } from 'node:path';

import { enumParam, hostOf, idParam, intParam, safeExternalHref, sanitizeLike } from '../../src/security/input';
import { assertSameOriginPath, safeJsonParse } from '../../src/security/fetch';
import { search, MAX_QUERY_LENGTH, type SearchItem } from '../../src/lib/search';

const ROOT = join(import.meta.dirname, '..', '..');
let failed = 0;
let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  pass  ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  FAIL  ${name}\n        ${e instanceof Error ? e.message : String(e)}`);
  }
}
function eq(a: unknown, b: unknown, what = '') {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function throws(fn: () => unknown, what: string) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`expected to throw: ${what}`);
}

/* -- URL parameters --------------------------------------------------- */
test('frame: only plain integers inside the timeline are accepted', () => {
  eq(intParam('120', 0, 10223), 120);
  for (const bad of ['-1', '10224', '1e3', '0x10', '12.5', ' 12', '12abc', '', 'NaN', 'Infinity', '9'.repeat(400), '<script>', '１２']) eq(intParam(bad, 0, 10223), null, bad);
  eq(intParam(null, 0, 10), null);
});
test('view: only the listed values are accepted', () => {
  eq(enumParam('cinematic', ['cinematic'] as const), 'cinematic');
  for (const bad of ['Cinematic', 'cinematic ', 'javascript:alert(1)', '']) eq(enumParam(bad, ['cinematic'] as const), null, bad);
});
test('record ids: short plain identifiers only (no markup, paths or control characters)', () => {
  for (const ok of ['EVT-0015', 'F-EMP-012', 'jura-tempest-federation', 'TH-LAB']) eq(idParam(ok), ok);
  for (const bad of ['"><svg onload=alert(1)>', '../../etc/passwd', 'a b', 'EVT\u0000', 'x'.repeat(65), '', '-lead', 'id\r\nSet-Cookie: x']) eq(idParam(bad), null, bad);
});

/* -- links from data ---------------------------------------------------- */
test('external links: https only, no script, data or credential URLs', () => {
  eq(safeExternalHref('https://www.ten-sura.com/'), 'https://www.ten-sura.com/');
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', 'http://example.com', '//evil.example', '/relative', 'https://user:pass@evil.example', 'not a url', '']) eq(safeExternalHref(bad), null, bad);
  eq(safeExternalHref('java\tscript:alert(1)'), null, 'tab-split scheme');
  eq(hostOf('https://tensura.fandom.com/wiki/X'), 'tensura.fandom.com');
});

/* -- JSON and stored settings ----------------------------------------- */
test('JSON with __proto__, constructor or prototype keys is refused and pollutes nothing', () => {
  throws(() => safeJsonParse('{"__proto__":{"polluted":true}}'), '__proto__');
  throws(() => safeJsonParse('{"a":{"constructor":{"prototype":{"polluted":true}}}}'), 'constructor');
  throws(() => safeJsonParse('[{"prototype":1}]'), 'prototype');
  eq(({} as Record<string, unknown>).polluted, undefined, 'Object.prototype');
  eq(safeJsonParse<{ a: number }>('{"a":1}'), { a: 1 });
});
test('stored settings: unknown keys dropped, wrong types and huge values replaced by defaults', () => {
  const defaults = { volume: 0.5, theme: 'dark', on: true, layers: { a: true, b: false }, list: [] as number[] };
  const hostile = JSON.parse('{"volume":"loud","theme":"' + 'x'.repeat(5000) + '","on":1,"layers":{"a":false,"__proto__":{"polluted":1},"evil":true},"list":{"length":1e9},"extra":"<script>","__proto__":{"polluted":true}}');
  const out = sanitizeLike(hostile, defaults);
  eq(out, { volume: 0.5, theme: 'dark', on: true, layers: { a: false, b: false }, list: [] });
  eq(({} as Record<string, unknown>).polluted, undefined, 'Object.prototype');
  eq(sanitizeLike({ volume: Number.NaN }, defaults).volume, 0.5, 'NaN');
  eq(sanitizeLike(null, defaults), defaults, 'null');
  eq(sanitizeLike('garbage', defaults), defaults, 'string');
});

/* -- fetch boundary ----------------------------------------------------- */
test('fetchVerified accepts same-origin paths only', () => {
  eq(assertSameOriginPath('/data/events.json'), '/data/events.json');
  for (const bad of ['https://evil.example/x.json', '//evil.example/x.json', '/\\evil.example', 'data/x.json', '/data/../package.json', '/data/%2e%2e/x', 'javascript:alert(1)', '/data/x.json?u=https://evil']) throws(() => assertSameOriginPath(bad), bad);
});

/* -- search ------------------------------------------------------------- */
test('search cost stays bounded for hostile input (1 MB paste, 100k words, markup)', () => {
  const index: SearchItem[] = Array.from({ length: 2000 }, (_, i) => ({ group: 'Events', title: `Event ${i}`, keys: [`event ${i} rimuru tempest`, `alias ${i}`], selection: { kind: 'event', id: `EVT-${i}` } }) as unknown as SearchItem);
  for (const q of ['a'.repeat(1_000_000), 'a '.repeat(100_000), '<img src=x onerror=alert(1)>'.repeat(2000), '\u0000￿'.repeat(50_000)]) {
    const t0 = performance.now();
    search(index, q);
    const ms = performance.now() - t0;
    if (ms > 250) throw new Error(`took ${ms.toFixed(0)} ms for a ${q.length}-character query`);
  }
  if (MAX_QUERY_LENGTH > 200) throw new Error('query cap too large');
});

/* -- build pipeline ---------------------------------------------------- */
function compile(src: string, out: string) {
  return spawnSync(process.execPath, [join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(ROOT, 'scripts', 'compile-data.ts')], {
    cwd: ROOT,
    env: { ...process.env, COMPILE_SRC: src, COMPILE_OUT: out },
    encoding: 'utf8',
    timeout: 120_000,
  });
}
const publicManifest = readFileSync(join(ROOT, 'public', 'data', 'manifest.json'), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'tempest-sec-'));
try {
  const brokenSrc = join(scratch, 'src-broken');
  cpSync(join(ROOT, 'data-source'), brokenSrc, { recursive: true });
  test('malformed source JSON fails the compile and leaves public/data untouched', () => {
    writeFileSync(join(brokenSrc, 'gazetteer.source.json'), '{"places": [ {"id": "x", ');
    const r = compile(brokenSrc, join(scratch, 'out1'));
    if (r.status === 0) throw new Error('compile succeeded on malformed JSON');
    eq(readFileSync(join(ROOT, 'public', 'data', 'manifest.json'), 'utf8') === publicManifest, true, 'public/data changed');
    eq(existsSync(join(scratch, 'out1', 'manifest.json')), false, 'partial output written');
  });
  const hostileSrc = join(scratch, 'src-hostile');
  cpSync(join(ROOT, 'data-source'), hostileSrc, { recursive: true });
  test('a source with a __proto__ key fails the compile (prototype pollution through data)', () => {
    const p = join(hostileSrc, 'terminology.source.json');
    const text = readFileSync(p, 'utf8');
    writeFileSync(p, text.replace('{', '{"__proto__":{"polluted":true},'));
    const r = compile(hostileSrc, join(scratch, 'out2'));
    if (r.status === 0) throw new Error('compile accepted a __proto__ key');
    if (!/forbidden key "__proto__"/.test(r.stderr + r.stdout)) throw new Error('not refused for the right reason: ' + (r.stderr || r.stdout).slice(0, 200));
  });
  test('the compile refuses to wipe the repository, a drive root or an unrelated folder', () => {
    for (const out of [ROOT, join(ROOT, '..'), parse(scratch).root]) {
      const r = compile(join(ROOT, 'data-source'), out);
      if (r.status === 0) throw new Error(`compile wrote to ${out}`);
      if (!/refusing to write/.test(r.stderr + r.stdout)) throw new Error(`not refused by the guard for ${out}: ${(r.stderr || r.stdout).slice(0, 160)}`);
    }
    const unrelated = join(scratch, 'my-documents');
    mkdirSync(unrelated);
    writeFileSync(join(unrelated, 'thesis.docx'), 'precious');
    const r = compile(join(ROOT, 'data-source'), unrelated);
    if (r.status === 0) throw new Error('compile wiped an unrelated folder');
    eq(readFileSync(join(unrelated, 'thesis.docx'), 'utf8'), 'precious', 'unrelated file');
    if (!existsSync(join(ROOT, 'package.json'))) throw new Error('repository damaged');
  });
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log(`\n  ${passed}/${passed + failed} security regression tests passed.`);
process.exit(failed ? 1 : 0);
