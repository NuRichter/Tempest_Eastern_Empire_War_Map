/**
 * SHA-256 of every JSON file the app fetches (dataset, locales, coastline),
 * written to src/security/integrity.generated.json before the build. The app
 * fetches them with Subresource Integrity, so a file changed after the build
 * (on a CDN, by a proxy, in transit) is refused by the browser.
 *
 * Runs in prebuild, after compile-data. New JSON under these folders is
 * picked up automatically.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const COVERED = ['data', 'locales', 'maps'];

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const out: Record<string, string> = {};
for (const folder of COVERED) {
  for (const file of walk(join(PUBLIC, folder))) {
    if (!file.endsWith('.json')) continue;
    const url = '/' + relative(PUBLIC, file).split(sep).join('/');
    out[url] = `sha256-${createHash('sha256').update(readFileSync(file)).digest('base64')}`;
  }
}
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(ROOT, 'src', 'security', 'integrity.generated.json'), JSON.stringify(sorted, null, 1) + '\n');
console.log(`integrity: ${Object.keys(sorted).length} JSON files hashed.`);
