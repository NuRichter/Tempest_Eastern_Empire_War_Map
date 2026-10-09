/**
 * Runs after `next build`: pins every inline script by hash.
 *
 * Next's static pages carry inline bootstrap scripts (and the layout's theme
 * boot script). Instead of allowing ANY inline script ('unsafe-inline'), the
 * CSP lists the SHA-256 of each one found in the prerendered HTML, so an
 * injected script, whatever it says, does not run.
 *
 * The CSP header lives in .next/routes-manifest.json (written by next build
 * from next.config.mjs), which both `next start` and Vercel read when they
 * serve. This rewrites the placeholder there. Fails the build if a page has
 * an inline script it cannot pin, or if the placeholder is missing.
 *
 * It also completes Subresource Integrity: Next's experimental `sri` covers
 * its bootstrap scripts but not the app chunks React adds to the page, so
 * every <script src="/_next/static/..."> without an integrity attribute gets
 * the SHA-256 of the file it points to. (Inline script hashes are computed
 * after this, on the final HTML.)
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { INLINE_SCRIPT_HASHES } from '../../src/security/policy.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const NEXT = join(ROOT, '.next');

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const sri = (rel: string) => `sha256-${createHash('sha256').update(readFileSync(join(NEXT, 'static', rel))).digest('base64')}`;
let pinnedFiles = 0;
const htmlFiles = [...walk(join(NEXT, 'server', 'app')), ...walk(join(NEXT, 'standalone', '.next', 'server', 'app'))].filter((f) => f.endsWith('.html'));
for (const file of htmlFiles) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(/<script(?![^>]*\bintegrity=)([^>]*?)\bsrc="\/_next\/static\/([^"?#]+)"([^>]*)>/g, (_m, a: string, rel: string, b: string) => {
    if (!existsSync(join(NEXT, 'static', rel))) throw new Error(`harden-build: ${rel} referenced by ${file} does not exist`);
    pinnedFiles += 1;
    return `<script${a}src="/_next/static/${rel}" integrity="${sri(rel)}"${b}>`;
  });
  if (after !== before) writeFileSync(file, after);
}

const hashes = new Set<string>();
let pages = 0;
for (const file of htmlFiles) {
  pages += 1;
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    // JSON data blocks (structured data) are not executed and need no hash.
    if (/type="application\/(ld\+)?json"/.test(m[1])) continue;
    hashes.add(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  }
}
if (!pages) throw new Error('harden-build: no prerendered pages found in .next/server/app');

let patched = 0;
for (const manifest of [join(NEXT, 'routes-manifest.json'), join(NEXT, 'standalone', '.next', 'routes-manifest.json')]) {
  if (!existsSync(manifest)) continue;
  const text = readFileSync(manifest, 'utf8');
  if (!text.includes(INLINE_SCRIPT_HASHES)) throw new Error(`harden-build: CSP placeholder missing in ${manifest}`);
  writeFileSync(manifest, text.split(INLINE_SCRIPT_HASHES).join([...hashes].sort().join(' ')));
  patched += 1;
}
if (!patched) throw new Error('harden-build: routes-manifest.json not found');
console.log(`harden-build: ${hashes.size} inline scripts across ${pages} pages pinned by SHA-256 in ${patched} manifest(s), ${pinnedFiles} script tags given integrity.`);
