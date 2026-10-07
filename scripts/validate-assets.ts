/**
 * Flag asset validator.
 *
 * Every nation declared in nation-flags.json must resolve to a readable PNG at
 * the exact path the manifest names. A missing flag fails the build with the
 * nation id and the expected path, because the alternative — quietly rendering
 * a different nation's colours — puts a false flag on a historical map.
 *
 * Escape hatch, for previewing the application before the flag PNGs are added
 * to the repository:
 *
 *     FLAGS_OPTIONAL=1 npm run build
 *
 * In that mode missing flags are reported as warnings and the interface draws a
 * hatched tile naming the nation whose flag is absent. It never substitutes.
 */

import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Character, NationFlagManifest, Nation } from '../src/types/dataset';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DATA = join(ROOT, 'public', 'data');
const PUBLIC = join(ROOT, 'public');
const FLAG_ROOT = join(PUBLIC, 'assets', 'nation-flags');

const OPTIONAL = process.env.FLAGS_OPTIONAL === '1';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const EXPECTED_CATEGORIES = [
  'Eastern Empire',
  'Former Demon Lord Territories',
  'Miscellaneous',
  'Octagram Nations',
  'Western Nations',
];

const errors: string[] = [];
const warnings: string[] = [];

/** True when the file exists and begins with the PNG signature. */
function readablePng(absolute: string): boolean {
  try {
    const stat = statSync(absolute);
    if (!stat.isFile() || stat.size < 8) return false;
    const fd = openSync(absolute, 'r');
    const head = Buffer.alloc(8);
    readSync(fd, head, 0, 8, 0);
    closeSync(fd);
    return head.equals(PNG_MAGIC);
  } catch {
    return false;
  }
}

/** Width and height of a PNG or baseline/progressive JPEG, read from the header. */
function imageSize(absolute: string): [number, number] | null {
  const buf = readFileSync(absolute);
  if (buf.subarray(0, 8).equals(PNG_MAGIC)) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  }
  return null;
}

function main(): void {
  console.log('Validating nation flag assets.\n');

  const manifestPath = join(DATA, 'nation-flags.json');
  if (!existsSync(manifestPath)) {
    console.error('Runtime dataset is missing nation-flags.json. Run "npm run compile-data" first.\n');
    process.exit(1);
  }

  const flags = JSON.parse(readFileSync(manifestPath, 'utf8')) as NationFlagManifest;
  const nations = JSON.parse(readFileSync(join(DATA, 'nations.json'), 'utf8')) as Nation[];

  /* -- structure --------------------------------------------------- */

  for (const category of EXPECTED_CATEGORIES) {
    const dir = join(FLAG_ROOT, category);
    if (!existsSync(dir)) {
      errors.push(`Flag category directory is missing: public/assets/nation-flags/${category}/`);
    }
  }

  /* -- uniqueness -------------------------------------------------- */

  const seenIds = new Set<string>();
  const seenAssets = new Map<string, string>();
  for (const [id, entry] of Object.entries(flags)) {
    if (seenIds.has(id)) errors.push(`Duplicate nation id in the flag manifest: ${id}`);
    seenIds.add(id);
    const prior = seenAssets.get(entry.asset);
    if (prior) {
      errors.push(`Nations ${prior} and ${id} both map to ${entry.asset}. One flag may serve one nation only.`);
    }
    seenAssets.set(entry.asset, id);
    if (!EXPECTED_CATEGORIES.includes(entry.category)) {
      errors.push(`Nation ${id} declares category "${entry.category}", which is not one of the five canonical categories.`);
    }
    if (entry.asset.includes('\\')) {
      errors.push(`Nation ${id} declares a Windows-style path: ${entry.asset}. Asset paths are POSIX.`);
    }
    if (!entry.asset.startsWith('/assets/nation-flags/')) {
      errors.push(`Nation ${id} declares an asset outside the flag root: ${entry.asset}`);
    }
    if (entry.thumb && !existsSync(join(PUBLIC, entry.thumb))) {
      errors.push(`Nation ${id} declares a flag thumbnail that does not exist: ${entry.thumb}`);
    }
  }

  /* -- nation coverage --------------------------------------------- */

  for (const nation of nations) {
    if (nation.flag && !flags[nation.id]) {
      errors.push(`Nation ${nation.id} declares a flag but has no entry in the flag manifest.`);
    }
  }

  /* -- files ------------------------------------------------------- */

  const missing: { id: string; path: string }[] = [];
  const unreadable: { id: string; path: string }[] = [];
  let present = 0;

  for (const [id, entry] of Object.entries(flags)) {
    const absolute = join(PUBLIC, entry.asset);
    if (!existsSync(absolute)) {
      missing.push({ id, path: entry.asset });
      continue;
    }
    if (!readablePng(absolute)) {
      unreadable.push({ id, path: entry.asset });
      continue;
    }
    present += 1;
  }

  for (const { id, path } of unreadable) {
    errors.push(`Flag file for ${id} is not a readable PNG.\n      Expected a PNG at: ${path}`);
  }

  for (const { id, path } of missing) {
    const message = `Missing nation flag: ${id}\n      Expected: ${path}`;
    if (OPTIONAL) warnings.push(message);
    else errors.push(message);
  }

  /* -- stray files ------------------------------------------------- */

  const declared = new Set(Object.values(flags).map((f) => f.asset));
  for (const category of EXPECTED_CATEGORIES) {
    const dir = join(FLAG_ROOT, category);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.toLowerCase().endsWith('.png')) continue;
      const url = `/assets/nation-flags/${category}/${file}`;
      if (!declared.has(url)) {
        warnings.push(
          `Unreferenced flag file: ${url}\n      No nation in the dataset maps to it. Add the nation to ` +
            `data-source/gazetteer.source.json, or remove the file.`,
        );
      }
    }
  }

  /* -- base maps ---------------------------------------------------- */

  // Both map styles must exist and share the 2641 x 2035 frame the territory
  // geometry was traced in; otherwise borders would not sit on the map.
  for (const map of ['maps/base-map.png', 'maps/myth-map.jpg']) {
    const absolute = join(PUBLIC, map);
    if (!existsSync(absolute)) {
      errors.push(`Map style asset missing: public/${map}`);
      continue;
    }
    const dims = imageSize(absolute);
    if (!dims) errors.push(`Map style asset is not a readable PNG or JPEG: public/${map}`);
    else if (dims[0] !== 2641 || dims[1] !== 2035) errors.push(`public/${map} is ${dims[0]} x ${dims[1]}; every map style must be 2641 x 2035.`);
  }

  /* -- photocards ---------------------------------------------------- */

  const characters = JSON.parse(readFileSync(join(DATA, 'characters.json'), 'utf8')) as Character[];
  let cards = 0;
  for (const c of characters) {
    if (!c.photocard) continue;
    if (/^https?:/i.test(c.photocard.src)) errors.push(`Character ${c.id}: photocard is a remote hotlink; local assets only.`);
    else if (!existsSync(join(PUBLIC, c.photocard.src))) errors.push(`Character ${c.id}: photocard missing at public${c.photocard.src}. Run python scripts/characters/build_photocards.py.`);
    else cards += 1;
    if (!c.photocard.source) errors.push(`Character ${c.id}: photocard has no recorded source.`);
    if (!c.photocard.licence) errors.push(`Character ${c.id}: photocard has no recorded licence.`);
    if (!c.photocard.thumb || !existsSync(join(PUBLIC, c.photocard.thumb))) errors.push(`Character ${c.id}: photocard thumbnail missing.`);
  }

  /* -- report ------------------------------------------------------ */

  console.log(`  photocards        ${cards} of ${characters.length} characters`);
  console.log(`  declared nations  ${Object.keys(flags).length}`);
  console.log(`  flags present     ${present}`);
  console.log(`  flags missing     ${missing.length}`);
  console.log(`  categories        ${EXPECTED_CATEGORIES.length}`);

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (errors.length) {
    console.error(`\n${errors.length} error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error(
      '\nAsset validation failed.\n' +
        'Place the flag PNGs under public/assets/nation-flags/<Category>/ using the exact\n' +
        'file names above, then run this again. To preview the application before the flags\n' +
        'are in the repository, run with FLAGS_OPTIONAL=1 — missing flags then render as a\n' +
        'hatched tile naming the nation, and are never replaced by another nation\'s flag.\n',
    );
    process.exit(1);
  }

  if (OPTIONAL && missing.length) {
    console.log(
      '\nAsset validation passed in FLAGS_OPTIONAL mode. ' +
        `${missing.length} flag(s) are absent and will render as a hatched placeholder.\n`,
    );
  } else {
    console.log('\nAsset validation passed.\n');
  }
}

main();
