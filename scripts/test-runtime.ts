/**
 * Engine tests.
 *
 * They exercise the logic where a silent error would be invisible on screen
 * but wrong in substance: the coordinate transform, the deterministic clock,
 * the state resolver, movement interpolation, territory control, search, and
 * the rule that unknown never renders as zero. The dataset itself is covered by
 * validate-data; the interface by browser-qa.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { atlasCorners, lngLatToSim, simToLngLat } from '../src/lib/coords';
import { assembleDataset, PART_FILES, type DatasetParts } from '../src/data/loader';
import { buildIndex, scoreKey, search } from '../src/lib/search';
import { SimulationClock } from '../src/simulation/clock';
import { CONTROL_TRANSITION_FRAMES, forcePositionAt, forceSnapshotAt, StateResolver, territoryControlAt } from '../src/simulation/resolver';
import { formatStrength, strengthFontSize } from '../src/map/overlay/layers/forces';
import type { FrameState } from '../src/types/dataset';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'public', 'data');
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DATA, f), 'utf8')) as T;

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  pass  ${name}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${msg}`);
    console.log(`  FAIL  ${name} — ${msg}`);
  }
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const parts = Object.fromEntries(Object.entries(PART_FILES).map(([k, f]) => [k, read(f)])) as unknown as Omit<DatasetParts, 'checkpoints'>;
const data = assembleDataset({ ...parts, checkpoints: parts.keyframeIndex.files.map((f) => read<FrameState>(f)) });
const N = data.manifest.clock.frameCount;

console.log('Engine tests\n');

/* -- coordinates ---------------------------------------------------- */

test('simulation coordinates round-trip through the synthetic projection', () => {
  for (const [x, y] of [[0, 0], [1, 1], [0.5, 0.5], [0.63833, 0.56247], [0.001, 0.999]]) {
    const back = lngLatToSim(simToLngLat(x, y).lng, simToLngLat(x, y).lat);
    assert(Math.abs(back.x - x) < 1e-9 && Math.abs(back.y - y) < 1e-9, `round-trip failed at ${x},${y}`);
  }
});

test('the atlas sits inside the renderer longitude range', () => {
  for (const [lng] of atlasCorners()) assert(Math.abs(lng) < 180, `corner longitude ${lng} outside ±180`);
});

/* -- clock ------------------------------------------------------------ */

test('the clock clamps seeks to the campaign', () => {
  const clock = new SimulationClock({ frameCount: N });
  clock.seek(-50);
  assert(clock.integerFrame === 0, 'negative seek not clamped');
  clock.seek(N + 500);
  assert(clock.integerFrame === N - 1, 'overshoot not clamped');
  clock.destroy();
});

/* -- resolver: scrubbing equals playing ------------------------------- */

test('seeking to any frame equals playing up to it', () => {
  const sequential = new StateResolver(data);
  const random = new StateResolver(data);
  const probes = [0, 1, 143, 144, 145, Math.floor(N / 3), data.manifest.campaign.firstContactFrame, N - 2, N - 1];
  let s: FrameState | null = null;
  for (let f = 0; f < N; f += 1) {
    s = sequential.at(f);
    if (probes.includes(f)) {
      const r = random.at(f);
      assert(JSON.stringify(r) === JSON.stringify(s), `state differs at frame ${f}`);
    }
  }
});

test('the resolver is deterministic across instances', () => {
  const a = new StateResolver(data).at(Math.floor(N * 0.8));
  const b = new StateResolver(data).at(Math.floor(N * 0.8));
  assert(JSON.stringify(a) === JSON.stringify(b), 'two resolvers disagree');
});

/* -- movement -------------------------------------------------------- */

test('no force teleports between recorded positions', () => {
  // Largest per-keyframe displacement allowed while on the map: 4% of the atlas.
  for (const track of data.positions) {
    let prev: { x: number; y: number } | null = null;
    for (let f = track.keys[0]?.f ?? 0; f < N; f += 1) {
      const p = forcePositionAt(data, track.forceId, f);
      if (!p) {
        prev = null;
        continue;
      }
      // A key reached by an UNKNOWN route (e.g. a space-time transfer) is a
      // recorded discontinuity: the force is not drawn travelling a false line.
      const arrivingUnknown = track.keys.some((k) => k.f === f && k.route === 'UNKNOWN');
      if (prev && !arrivingUnknown) {
        const d = Math.hypot(p.x - prev.x, p.y - prev.y);
        assert(d < 0.04, `${track.forceId} jumps ${d.toFixed(3)} at frame ${f}`);
      }
      prev = { x: p.x, y: p.y };
    }
  }
});

test('a force holds its position until its recorded movement departs', () => {
  let checked = 0;
  for (const m of data.movements) {
    if (m.startFrame === null || m.endFrame === null || m.endFrame - m.startFrame < 2 || m.startFrame < 1) continue;
    // A chained movement (the previous leg arrives as this one departs) is legitimately in motion.
    const chained = data.movements.some((o) => o !== m && o.forceId === m.forceId && o.endFrame !== null && o.endFrame >= m.startFrame! - 2 && o.endFrame <= m.startFrame!);
    if (chained) continue;
    const before = forcePositionAt(data, m.forceId, m.startFrame - 1);
    const at = forcePositionAt(data, m.forceId, m.startFrame);
    if (!before || !at || before.moving) continue; // still arriving from the previous leg
    assert(Math.hypot(before.x - at.x, before.y - at.y) < 1e-6, `${m.id}: ${m.forceId} drifts before departure`);
    checked += 1;
  }
  assert(checked > 0, 'no movement was checkable');
});

test('a force is not drawn before the record places it', () => {
  for (const f of data.forces) {
    if (f.firstFrame <= 0) continue;
    assert(forceSnapshotAt(data, f.id, f.firstFrame - 1) === null, `${f.id} has a snapshot before it appears`);
  }
});

/* -- territory --------------------------------------------------------- */

test('territory control changes are animated, then settle', () => {
  const t = data.territories.find((x) => x.control.length > 1);
  assert(t, 'no territory with a control change');
  const seg = t.control[1];
  assert(territoryControlAt(t, seg.fromFrame).transition === 0, 'transition does not start at 0');
  assert(territoryControlAt(t, seg.fromFrame + CONTROL_TRANSITION_FRAMES).transition === 1, 'transition does not settle');
  assert(territoryControlAt(t, Math.max(0, seg.fromFrame - 1)).segment === t.control[0], 'previous segment not used before the change');
});

test('unknown control never names a controller', () => {
  for (const t of data.territories) for (const s of t.control) assert(!(s.status === 'UNKNOWN' && s.controller), `${t.id} names a controller for unknown control`);
});

/* -- unknown is never zero -------------------------------------------- */

test('an unknown strength renders as "?" and never as zero', () => {
  assert(formatStrength('UNKNOWN', 'EXPLICIT') === '?', 'UNKNOWN quantity rendered as a number');
  assert(formatStrength(0, 'UNKNOWN') === '?', 'UNKNOWN size status rendered as a number');
  assert(formatStrength(940000, 'DERIVED').startsWith('≈'), 'derived strength not marked');
  assert(formatStrength(940000, 'EXPLICIT') === '940,000', 'explicit strength mis-formatted');
});

test('strength labels grow with size but stay inside their clamp', () => {
  const a = strengthFontSize(1_000, 1);
  const b = strengthFontSize(100_000, 1);
  const c = strengthFontSize(10_000_000, 1);
  assert(a >= 11 && c <= 28 && b > a && c >= b, `sizes ${a}, ${b}, ${c}`);
});

/* -- search ------------------------------------------------------------ */

test('fuzzy search tolerates missing letters', () => {
  assert(scoreKey('clglo', 'caligulio') > 0, 'subsequence not matched');
  assert(scoreKey('zzz', 'caligulio') === 0, 'false positive');
});

test('search finds aliases and Japanese names', () => {
  const index = buildIndex(data);
  const nazca = search(index, 'Nazca');
  assert(nazca.some((r) => r.group === 'Territories' && /Eastern Empire/.test(r.title + r.detail)), 'alias "Nazca" does not find the Eastern Empire');
  const withJapanese = data.characters.find((c) => c.japanese);
  if (withJapanese) {
    const hits = search(index, withJapanese.japanese!.split(/[ (]/)[0]);
    assert(hits.some((r) => 'id' in r.selection && r.selection.id === withJapanese.id), `Japanese name does not find ${withJapanese.name}`);
  }
});

/* -- determinism of the build ------------------------------------------ */

test('the runtime manifest carries no build timestamp', () => {
  assert(!JSON.stringify(data.manifest).includes('generatedAt'), 'manifest contains a timestamp, so builds are not reproducible');
});

console.log(`\n  ${passed}/${passed + failures.length} tests passed\n`);
if (failures.length) {
  console.error('Engine tests FAILED');
  process.exit(1);
}
console.log('Engine tests passed.');
