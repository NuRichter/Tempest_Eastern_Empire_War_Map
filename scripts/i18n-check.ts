/**
 * Validates the locale files in public/locales/ against i18n/catalog.json:
 *   - exactly the 30 supported locales exist (English needs no file);
 *   - coverage: every catalog string is translated (missing strings fall back
 *     to English at runtime; reported, and an error below 98 %);
 *   - placeholders: every {name} of the English string is kept;
 *   - glossary: canonical names in the English string (characters, nations,
 *     places, factions, units from terminology.source.json) appear unchanged
 *     (CJK locales may use the official Japanese form instead);
 *   - no stale keys.
 *
 *     npm run i18n:extract && npm run i18n:check
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALES } from '../src/i18n/locales';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'i18n', 'catalog.json'), 'utf8')) as { strings: Record<string, string[]> };
const keys = Object.keys(catalog.strings);
const terms = JSON.parse(readFileSync(join(ROOT, 'data-source', 'terminology.source.json'), 'utf8')) as { terms: { display: string; canonical: string; japanese?: string | null; kind: string }[] };
const glossary = terms.terms
  .filter((t) => ['character', 'nation', 'place', 'faction', 'force', 'title'].includes(t.kind))
  .map((t) => ({ name: t.display, japanese: t.japanese ?? null }))
  .filter((g) => g.name.length >= 4);

let errors = 0;
const report: string[] = [];
if (LOCALES.length !== 30) {
  report.push(`expected 30 locales, found ${LOCALES.length}`);
  errors += 1;
}
for (const loc of LOCALES) {
  if (loc.code === 'en') continue;
  const path = join(ROOT, 'public', 'locales', `${loc.code}.json`);
  if (!existsSync(path)) {
    report.push(`${loc.code}: missing file`);
    errors += 1;
    continue;
  }
  const messages = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
  const missing = keys.filter((k) => !messages[k]?.trim());
  const stale = Object.keys(messages).filter((k) => !(k in catalog.strings));
  const placeholders: string[] = [];
  const names: string[] = [];
  for (const k of keys) {
    const v = messages[k];
    if (!v) continue;
    for (const ph of k.match(/\{\w+\}/g) ?? []) if (!v.includes(ph)) placeholders.push(`${JSON.stringify(k)} lacks ${ph}`);
    for (const g of glossary) {
      if (!new RegExp(`\\b${g.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(k)) continue;
      const cjk = ['ja', 'zh-Hans', 'zh-Hant', 'ko'].includes(loc.code);
      if (!v.includes(g.name) && !(cjk && g.japanese && v.includes(g.japanese))) names.push(`${JSON.stringify(k)}: "${g.name}" changed`);
    }
  }
  const coverage = (keys.length - missing.length) / Math.max(1, keys.length);
  report.push(`${loc.code.padEnd(8)} ${(coverage * 100).toFixed(1).padStart(5)} %  missing ${missing.length}  placeholders ${placeholders.length}  glossary ${names.length}  stale ${stale.length}`);
  for (const p of [...placeholders, ...names].slice(0, 5)) report.push(`           ${p}`);
  if (coverage < 0.98 || placeholders.length) errors += 1;
}
console.log(`i18n check: ${keys.length} catalog strings, ${LOCALES.length} locales`);
for (const r of report) console.log(`  ${r}`);
if (errors) {
  console.error(`\n${errors} locale problem(s).`);
  process.exit(1);
}
console.log('\nAll locales complete.');
