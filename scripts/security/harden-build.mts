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
 * It also adds Subresource Integrity: every <script src="/_next/static/...">
 * gets the SHA-256 of the file it points to, except the webpack runtime,
 * which Vercel rewrites while serving (it appends its toolbar loader). That
 * one file stays covered by the CSP ('self'), HTTPS and its content-hashed
 * name. `npm run security:scan` compares every published hash with the bytes
 * the host actually serves. (Inline script hashes are computed after this,
 * on the final HTML.)
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { INLINE_SCRIPT_HASHES } from '../../src/security/policy.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const NEXT = join(ROOT, '.next');

const sri = (rel: string) => `sha256-${createHash('sha256').update(readFileSync(join(NEXT, 'static', rel))).digest('base64')}`;
let pinnedFiles = 0;
// Files the host rewrites while serving: Vercel appends its toolbar loader to the webpack runtime.
const HOST_MODIFIED = /^chunks\/webpack-[a-z0-9]+\.js$/;

// Where a build puts its pages depends on the bundler and the host: .next/server/app
// locally, .next/output and .next/server/route-cache under Vercel's Next 16 adapter,
// .next/standalone for output 'standalone'. Every built file is visited, wherever it is.
const SKIP = new Set([join(NEXT, 'cache'), join(NEXT, 'static'), join(NEXT, 'dev')]);
function* built(dir: string): Generator<string> {
  if (!existsSync(dir) || SKIP.has(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* built(p);
    else yield p;
  }
}
const allFiles = [...built(NEXT)];
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
for (const file of htmlFiles) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(/<script(?![^>]*\bintegrity=)([^>]*?)\bsrc="\/_next\/static\/([^"?#]+)"([^>]*)>/g, (m, a: string, rel: string, b: string) => {
    if (HOST_MODIFIED.test(rel)) return m;
    if (!existsSync(join(NEXT, 'static', rel))) throw new Error(`harden-build: ${rel} referenced by ${file} does not exist`);
    pinnedFiles += 1;
    return `<script${a}src="/_next/static/${rel}" integrity="${sri(rel)}"${b}>`;
  });
  if (after !== before) writeFileSync(file, after);
}

const hashes = new Set<string>();
let pages = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  if (!/<html[\s>]/i.test(html)) continue;
  pages += 1;
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    // JSON data blocks (structured data) are not executed and need no hash.
    if (/type="application\/(ld\+)?json"/.test(m[1])) continue;
    hashes.add(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  }
}
if (!pages) throw new Error('harden-build: no prerendered pages found anywhere under .next');

// The CSP placeholder is replaced in every built file that carries it (routes-manifest,
// the host adapter's config, standalone copies): wherever the headers were written.
let patched = 0;
const replacement = [...hashes].sort().join(' ');
for (const file of allFiles) {
  if (!/\.(json|js|mjs|cjs|html|txt)$/.test(file) || statSync(file).size > 20_000_000) continue;
  const text = readFileSync(file, 'utf8');
  if (!text.includes(INLINE_SCRIPT_HASHES)) continue;
  writeFileSync(file, text.split(INLINE_SCRIPT_HASHES).join(replacement));
  patched += 1;
}
if (!patched) throw new Error('harden-build: the CSP placeholder was not found in any built file');
console.log(`harden-build: ${hashes.size} inline scripts across ${pages} pages pinned by SHA-256 in ${patched} file(s), ${pinnedFiles} script tags given integrity.`);
