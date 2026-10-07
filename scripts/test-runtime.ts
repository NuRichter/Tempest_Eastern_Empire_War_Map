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
import { eventVisible, forceHidden } from '../src/map/overlay/context';
import { EMPTY_FILTERS } from '../src/simulation/store';
import type { FrameState } from '../src/types/dataset';
import { createFields, decodeFront, evaluateFront, heldCells, HOLDER_EMPIRE, type FrontFile } from '../src/map/field/front';

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

/* -- timeline gaps and filters -------------------------------------- */

test('timeline gaps cover exactly the unrecorded stretches longer than six hours', () => {
  const byId = new Map(data.events.map((e) => [e.id, e]));
  for (const g of data.gaps) {
    const a = byId.get(g.fromEvent);
    const b = byId.get(g.toEvent);
    assert(a && b, `${g.id} references a missing event`);
    assert(a.frame === g.fromFrame && b.frame === g.toFrame, `${g.id} frames do not match its events`);
    assert(g.toFrame - g.fromFrame > 36, `${g.id} is not longer than six hours`);
    assert(!data.events.some((e) => e.frame > g.fromFrame && e.frame < g.toFrame), `${g.id} contains an event`);
  }
  const sorted = [...data.events].sort((x, y) => x.frame - y.frame);
  const expected = sorted.slice(1).filter((e, i) => e.frame - sorted[i].frame > 36).length;
  assert(data.gaps.length === expected, `expected ${expected} gaps, found ${data.gaps.length}`);
});

test('hiding a formation hides its subordinates, not its parent', () => {
  const parent = data.forces.find((f) => f.childIds.length > 0);
  assert(parent, 'no formation with subordinates');
  const child = parent.childIds[0];
  const filters = { ...EMPTY_FILTERS, hiddenForces: [parent.id] };
  assert(forceHidden(data, filters, parent.id) && forceHidden(data, filters, child), 'parent filter must hide the child');
  const childOnly = { ...EMPTY_FILTERS, hiddenForces: [child] };
  assert(!forceHidden(data, childOnly, parent.id), 'child filter must not hide the parent');
  assert(!forceHidden(data, EMPTY_FILTERS, child), 'nothing is hidden without filters');
});

test('a battle filter hides exactly the events of that battle', () => {
  const withBattle = data.events.filter((e) => e.battleId);
  assert(withBattle.length > 0, 'no event is linked to a battle');
  const battleId = withBattle[0].battleId!;
  const filters = { ...EMPTY_FILTERS, hiddenBattles: [battleId] };
  for (const e of data.events) assert(eventVisible(filters, e) === (e.battleId !== battleId), `${e.id} visibility is wrong under the battle filter`);
});

/* -- held ground (territorial ebb and flow) ---------------------------- */

const front = decodeFront(read<FrontFile>('front.json'));
const fields = createFields(front);
const jtf = front.territoryIds.indexOf('T-JTF');
const evalAt = (T: number) => evaluateFront(front, T, fields);
const empireIn = (T: number, territory = -1) => heldCells(evalAt(T), front, HOLDER_EMPIRE, territory);
const frameOf = (day: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (day - data.manifest.clock.firstDay) * 144 + h * 6 + m / 10;
};
const major = front.episodes.filter((e) => e.cells >= 100);
/** The cells an episode itself changes: a flip of its direction inside its time window. */
const episodeCells = (e: (typeof front.episodes)[number]) => {
  const to = e.gainer === 'empire' ? HOLDER_EMPIRE : 0;
  const cells: number[] = [];
  for (let i = 0; i < front.owner.length; i += 1) {
    for (let k = front.offsets[i]; k < front.offsets[i + 1]; k += 1) {
      const t = front.times[k];
      if (t >= e.startFrame - 0.01 && t <= e.endFrame + 0.01 && front.holders[k] === to) { cells.push(i); break; }
    }
  }
  // Only cells whose sole change in the window is this episode's own flip, so an
  // overlapping episode on the same ground (rapid ebb and flow) does not blur it.
  return cells.filter((i) => {
    let n = 0;
    for (let k = front.offsets[i]; k < front.offsets[i + 1]; k += 1) if (front.times[k] >= e.startFrame - front.lead - 1 && front.times[k] <= e.endFrame + 1) n += 1;
    return n === 1;
  });
};
const empireOn = (cells: number[], T: number) => {
  const f = evalAt(T);
  return cells.reduce((n, i) => n + (f.E[i] > 0 ? 1 : 0), 0);
};

test('every major front transition shows a real intermediate state at 25 / 50 / 75 %', () => {
  assert(major.length >= 4, `only ${major.length} major episodes`);
  let checked = 0;
  for (const e of major) {
    const cells = episodeCells(e);
    if (cells.length < 20) continue; // the episode re-takes ground still changing hands (rapid ebb and flow)
    checked += 1;
    const losing = e.loser === 'empire';
    const at = (pct: number) => empireOn(cells, e.startFrame + ((e.endFrame - e.startFrame) * pct) / 100);
    const before = empireOn(cells, e.startFrame - front.lead - 0.5);
    const after = empireOn(cells, e.endFrame + 0.5);
    const [q1, q2, q3] = [at(25), at(50), at(75)];
    const lo = Math.min(before, after);
    const hi = Math.max(before, after);
    assert(q2 > lo && q2 < hi, `${e.id} ${e.kind}: at 50 % ${q2} cells, not between ${before} and ${after}`);
    if (losing) assert(q1 >= q2 && q2 >= q3, `${e.id}: held ground does not shrink monotonically (${q1}, ${q2}, ${q3})`);
    else assert(q1 <= q2 && q2 <= q3, `${e.id}: held ground does not grow monotonically (${q1}, ${q2}, ${q3})`);
  }
  assert(checked >= 4, `only ${checked} episodes could be checked`);
});

test('advance: imperial ground in Jura grows after the border crossing and moves west', () => {
  const crossing = data.eventById.get('EVT-0015')!.frame;
  assert(empireIn(crossing - 6, jtf) === 0, 'Jura ground held before the Imperial Army crossed the border');
  const centroidX = (T: number) => {
    const f = evalAt(T);
    let sx = 0;
    let n = 0;
    for (let i = 0; i < f.E.length; i += 1) if (f.E[i] > 0 && front.owner[i] === jtf) { sx += (i % front.w) + 0.5; n += 1; }
    return n ? sx / n / front.w : NaN;
  };
  const a = empireIn(frameOf(-5, '20:00'), jtf);
  const b = empireIn(frameOf(-3, '12:00'), jtf);
  const c = empireIn(frameOf(-1, '18:00'), jtf);
  assert(a > 0 && a < b && b < c, `held cells ${a} → ${b} → ${c}`);
  assert(centroidX(frameOf(-1, '18:00')) < centroidX(frameOf(-5, '20:00')), 'the held area does not move west');
});

test('retreat: ground is lost when the Magitank Force is destroyed on D+0', () => {
  const before = empireIn(frameOf(0, '12:00'), jtf);
  const after = empireIn(frameOf(0, '15:00'), jtf);
  assert(after < before, `held cells ${before} → ${after}`);
});

test('recapture: imperial ground in Jura returns to Tempest after the camp falls on D+11', () => {
  const held = empireIn(frameOf(5, '12:00'), jtf);
  const after = empireIn(frameOf(12, '00:00'), jtf);
  assert(held > 500, `only ${held} cells held on D+5`);
  assert(after === 0, `${after} cells still held after D+11`);
});

test('a cut-off pocket collapses from the rim inward, interior last', () => {
  const ep = front.episodes.find((e) => e.kind === 'COLLAPSE' && e.territoryIds.includes('T-JTF') && e.cells >= 500);
  assert(ep, 'no major collapse in Jura');
  const T0 = ep.startFrame - front.lead - 0.5;
  const f0 = evalAt(T0);
  const held = new Uint8Array(f0.E.length);
  for (let i = 0; i < held.length; i += 1) held[i] = f0.E[i] > 0 && front.owner[i] === jtf ? 1 : 0;
  // Distance (in cells) from the rim of the held area.
  const dist = new Int32Array(held.length).fill(-1);
  const queue: number[] = [];
  for (let i = 0; i < held.length; i += 1) {
    if (!held[i]) continue;
    const x = i % front.w;
    const rim = [x > 0 ? i - 1 : -1, x < front.w - 1 ? i + 1 : -1, i - front.w, i + front.w].some((j) => j < 0 || j >= held.length || !held[j]);
    if (rim) { dist[i] = 0; queue.push(i); }
  }
  for (let q = 0; q < queue.length; q += 1) {
    const i = queue[q];
    const x = i % front.w;
    for (const j of [x > 0 ? i - 1 : -1, x < front.w - 1 ? i + 1 : -1, i - front.w, i + front.w]) {
      if (j >= 0 && j < held.length && held[j] && dist[j] < 0) { dist[j] = dist[i] + 1; queue.push(j); }
    }
  }
  // Flip time of each held cell in the episode: its first flip after T0.
  const pairs: [number, number][] = [];
  for (let i = 0; i < held.length; i += 1) {
    if (!held[i]) continue;
    for (let k = front.offsets[i]; k < front.offsets[i + 1]; k += 1) {
      if (front.times[k] >= ep.startFrame - 0.01 && front.times[k] <= ep.endFrame + 0.01) { pairs.push([dist[i], front.times[k]]); break; }
    }
  }
  const maxD = Math.max(...pairs.map((p) => p[0]));
  const mean = (lo: number, hi: number) => {
    const sel = pairs.filter((p) => p[0] >= lo && p[0] <= hi);
    return sel.reduce((n, p) => n + p[1], 0) / sel.length;
  };
  const outer = mean(0, Math.floor(maxD / 3));
  const inner = mean(Math.ceil((2 * maxD) / 3), maxD);
  assert(inner > outer, `interior falls at ${inner.toFixed(1)}, rim at ${outer.toFixed(1)}`);
});

test('held ground is a pure function of time: scrubbing equals playing, backwards too', () => {
  const T = frameOf(11, '11:00');
  const direct = Float32Array.from(evalAt(T).E);
  evalAt(frameOf(-2, '06:00'));
  evalAt(frameOf(19, '01:00'));
  const again = evalAt(T).E;
  assert(direct.every((v, i) => v === again[i]), 'the same time gave a different field');
});

test('the front moves continuously through a transition, not in one jump', () => {
  for (const e of major) {
    const cells = episodeCells(e);
    if (cells.length < 20) continue;
    const samples: number[] = [];
    for (let k = 0; k <= 20; k += 1) samples.push(empireOn(cells, e.startFrame - front.lead + ((e.endFrame - e.startFrame + front.lead) * k) / 20));
    const total = Math.abs(samples[20] - samples[0]);
    const biggest = Math.max(...samples.slice(1).map((v, k) => Math.abs(v - samples[k])));
    assert(new Set(samples).size >= 6, `${e.id}: only ${new Set(samples).size} distinct states in 21 samples`);
    assert(biggest <= 0.5 * total, `${e.id}: one step carries ${biggest} of ${total} cells`);
  }
});

test('the runtime manifest carries no build timestamp', () => {
  assert(!JSON.stringify(data.manifest).includes('generatedAt'), 'manifest contains a timestamp, so builds are not reproducible');
});

console.log(`\n  ${passed}/${passed + failures.length} tests passed\n`);
if (failures.length) {
  console.error('Engine tests FAILED');
  process.exit(1);
}
console.log('Engine tests passed.');
