/**
 * Scenario tests: the invasion operation's force ledger, formation integrity,
 * the geographic model and the timeline checkpoints, on the compiled data.
 * The figures below are the scenario brief's (docs/CAMPAIGN_FORCE_LEDGER.md);
 * the compiler derives every one of them from forces, events and casualty
 * records, and these tests check that it lands on them.
 *
 *     npm run test
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assembleDataset, PART_FILES, type DatasetParts } from '../src/data/loader';
import { forcePositionAt, forceSnapshotAt, ledgerAt, StateResolver } from '../src/simulation/resolver';
import { distanceKm, fromKm, polylineKm, toKm, KM_PER_ATLAS_PX } from '../src/lib/world';
import { simToLngLat, lngLatToSim } from '../src/lib/coords';
import type { FrameState, Quantity } from '../src/types/dataset';
import { TerrainGrid } from './lib/routing';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DATA = join(ROOT, 'public', 'data');
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
const eq = (a: unknown, b: unknown, what: string) => assert(a === b, `${what}: expected ${String(b)}, got ${String(a)}`);

const parts = Object.fromEntries(Object.entries(PART_FILES).map(([k, f]) => [k, read(f)])) as unknown as Omit<DatasetParts, 'checkpoints'>;
const data = assembleDataset({ ...parts, checkpoints: parts.keyframeIndex.files.flatMap((f) => read<FrameState | FrameState[]>(f)) });
const N = data.manifest.clock.frameCount;
const frameOf = (day: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (day - data.manifest.clock.firstDay) * 144 + h * 6 + m / 10;
};
const ev = (id: string) => {
  const e = data.eventById.get(id);
  assert(e, `event ${id} missing`);
  return e.frame;
};
const strength = (id: string, f: number): Quantity | null => forceSnapshotAt(data, id, f)?.strength ?? null;
const drawn = (id: string, f: number) => forcePositionAt(data, id, f) !== null;
const L = (f: number) => {
  const p = ledgerAt(data, f);
  assert(p, `no ledger point at ${f}`);
  return p;
};
const firstNumeric = (id: string) => (data.trackByForce.get(id)?.snapshots ?? []).find((s) => typeof s.strength === 'number')?.strength as number;

const MAIN = 'F-EMP-010';
const A = 'F-EMP-011';
const B = 'F-EMP-012';
const NORTH = 'F-EMP-013';
const P1 = 'F-EMP-017';
const SOUTH = 'F-EMP-018';
const DET = 'F-EMP-019';
const RESERVE = 'F-EMP-080';
const P2 = 'F-EMP-081';
const GATE = 'F-EMP-031';
const REVIVED = 'F-EMP-090';
const GATE_PLACE = 'dwargon-eastern-metropolis';
const HALT = 'jura-forest-edge';
const SPLIT = ev('EVT-0503');
const END = N - 1;

console.log('Scenario tests\n');

/* -- 14.1 initial force accounting ------------------------------------ */

test('main-force allocation: 700,000 + 200,000 + 40,000 + 30,000 + 35,000 = 1,005,000', () => {
  const allocations = data.forces.filter((f) => f.parentId === MAIN && f.ledgerRole === 'ALLOCATION').map((f) => firstNumeric(f.id));
  eq(allocations.sort((a, b) => b - a).join(' + '), '700000 + 200000 + 40000 + 35000 + 30000', 'the five allocations');
  eq(allocations.reduce((a, b) => a + b, 0), 1_005_000, 'their sum');
  eq(firstNumeric(MAIN), 1_005_000, 'main formation strength');
});

test('initial forward deployment: 1,005,000 + 5,000 = 1,010,000', () => {
  eq(firstNumeric(DET), 5_000, 'detachment');
  eq(L(ev('EVT-0502')).committed, 1_010_000, 'committed after both departures');
  eq(L(END).initialForward, 1_010_000, 'initial forward deployment');
});

test('unique personnel committed after Phase 2: 1,010,000 + 30,000 = 1,040,000', () => {
  eq(L(ev('EVT-0516') - 1).committed, 1_010_000, 'before the transfer');
  eq(L(ev('EVT-0516')).committed, 1_040_000, 'from the transfer');
  eq(L(END).committed, 1_040_000, 'at the end');
});

test('capital reserve after the Phase 2 departure: 100,000 - 30,000 = 70,000', () => {
  eq(strength(RESERVE, ev('EVT-0516') - 1), 100_000, 'reserve before');
  eq(strength(RESERVE, ev('EVT-0516')), 70_000, 'reserve after');
  eq(strength(RESERVE, END), 70_000, 'reserve at the end');
  eq(L(END).capitalReserve, 70_000, 'ledger reserve');
});

test('Dwargon Gate reinforcement after both arrivals: 30,000 + 30,000 = 60,000', () => {
  eq(strength(GATE, ev('EVT-0525') - 1) ?? 0, 0, 'before Phase 1');
  eq(strength(GATE, ev('EVT-0525')), 30_000, 'after Phase 1');
  eq(strength(GATE, ev('EVT-0526') - 1), 30_000, 'just before Phase 2');
  eq(strength(GATE, ev('EVT-0526')), 60_000, 'after Phase 2');
});

test('casualty reconciliation: 310,000 not revived, 30,000 never killed, 730,000 active', () => {
  const end = L(END);
  eq(end.killed, 1_010_000, 'cumulative dead');
  eq(end.revived, 700_000, 'revived');
  eq(end.deadNotRevived, 310_000, '1,010,000 - 700,000');
  eq(end.neverKilled, 30_000, '1,040,000 - 1,010,000');
  eq(end.active, 730_000, '700,000 + 30,000');
});

test('unique-personnel accounting is not current formation strength', () => {
  // On D+5, after the Jura dead and before the revival, the operation has
  // committed 1,040,000 while far fewer stand in its formations.
  const f = frameOf(9, '20:00');
  const p = L(f);
  eq(p.committed, 1_040_000, 'committed');
  const leaves = data.ledger.operationForceIds.filter((id) => !data.forceById.get(id)!.childIds.some((c) => data.ledger.operationForceIds.includes(c)));
  const standing = leaves.reduce((n, id) => n + (typeof strength(id, f) === 'number' ? (strength(id, f) as number) : 0), 0);
  assert(standing < p.committed, `standing ${standing} should be below committed ${p.committed}`);
  eq(p.active, p.committed - p.killed + p.revived, 'active identity');
});

test('every compiler ledger identity holds', () => {
  for (const c of data.ledger.checks) assert(c.ok, `${c.name}: ${c.expression}`);
  assert(data.ledger.checks.length >= 8, 'missing ledger checks');
});

/* -- 14.2 formation integrity ----------------------------------------- */

test('the 1,005,000 main formation advances as one unit until the halt point', () => {
  for (const f of [frameOf(-38, '12:00'), frameOf(-20, '00:00'), frameOf(-4, '12:00')]) {
    assert(drawn(MAIN, f), `main formation not drawn at ${f}`);
    eq(strength(MAIN, f), 1_005_000, `main strength at ${f}`);
    for (const id of [A, B, NORTH, P1, SOUTH]) assert(!drawn(id, f), `${id} is drawn as an independent formation at ${f}, before the split`);
  }
});

test('the split happens at the halt point and preserves the parent strength', () => {
  assert(SPLIT > ev('EVT-0019'), 'the split must follow the halt');
  const halt = data.placeById.get(HALT)!;
  for (const id of [A, B, NORTH, P1, SOUTH]) {
    const p = forcePositionAt(data, id, SPLIT);
    assert(p && Math.abs(p.x - halt.x!) < 1e-6 && Math.abs(p.y - halt.y!) < 1e-6, `${id} does not start at the halt point`);
  }
  assert(!drawn(MAIN, SPLIT), 'the main formation is still drawn after the split');
  eq(strength(MAIN, SPLIT), 1_005_000, 'main formation aggregate at the split');
});

test('the 5,000 detachment stays distinct and is never inside the 60,000', () => {
  assert(data.forceById.get(DET)!.parentId !== MAIN, 'the detachment is part of the main formation');
  assert(!data.forces.some((f) => f.mergedInto?.forceId === GATE && f.id === DET), 'the detachment merges into the Gate force');
  const merged = data.forces.filter((f) => f.mergedInto?.forceId === GATE).map((f) => f.id).sort();
  eq(merged.join(','), [P1, P2].sort().join(','), 'formations merged into the Gate force');
  assert(!merged.includes(SOUTH), 'the southern formation is in the Gate total');
});

test('the 40,000, 30,000 and 35,000 allocations do not increase the 1,005,000', () => {
  const f = SPLIT + 1;
  eq(L(f).committed, 1_010_000, 'committed just after the split');
  for (const id of [NORTH, P1, SOUTH]) eq(data.forceById.get(id)!.parentId, MAIN, `${id} parent`);
});

test('the Phase 2 30,000 come out of the capital reserve, counted once', () => {
  const p2 = data.forceById.get(P2)!;
  eq(p2.origin?.kind, 'TRANSFER', 'origin kind');
  eq(p2.origin?.fromForceId, RESERVE, 'origin force');
  const f = ev('EVT-0516');
  eq((strength(RESERVE, f) as number) + (strength(P2, f) as number), 100_000, 'reserve + transfer at departure');
  // After the merge the 30,000 are only in the Gate force.
  const g = ev('EVT-0526');
  eq(strength(P2, g), 0, 'Phase 2 after merging');
  assert(!drawn(P2, g + 1), 'Phase 2 still drawn after merging');
});

test('the same 200,000 formation runs northern Tempest, the south-western border and the failed offensive', () => {
  const tracks = data.positionByForce.get(B)!.keys.map((k) => k.placeId).filter(Boolean);
  for (const p of [HALT, 'northern-tempest-front', 'dwargon-sw-border', 'sw-dwargon-front']) assert(tracks.includes(p), `Formation B never reaches ${p}`);
  assert(data.forces.filter((f) => /Magitank|Formation B/.test(f.displayName)).length === 1, 'Formation B is duplicated');
  eq(data.eventById.get('EVT-0515')!.type, 'OFFENSIVE_FAILED', 'the south-western offensive outcome');
  const dwg = data.territories.find((t) => t.id === 'T-DWG')!;
  assert(dwg.control.every((c) => c.controller !== 'Eastern Empire'), 'Dwargon is shown captured');
});

test('resurrection creates no unique personnel and keeps the death record', () => {
  const r = ev('EVT-0220');
  const before = L(r - 1);
  const after = L(r);
  eq(after.committed, before.committed, 'committed across the revival');
  eq(after.killed, before.killed, 'deaths are not erased');
  eq(after.revived - before.revived, 700_000, 'revived');
  eq(strength(REVIVED, r), 700_000, 'revived cohort');
  eq(data.forceById.get(REVIVED)!.ledgerRole, 'REVIVED_COHORT', 'cohort role');
});

test('replaying the ledger history is deterministic', () => {
  const again = assembleDataset({ ...parts, checkpoints: parts.keyframeIndex.files.flatMap((f) => read<FrameState | FrameState[]>(f)) });
  for (let f = 0; f < N; f += 97) eq(JSON.stringify(ledgerAt(again, f)), JSON.stringify(ledgerAt(data, f)), `ledger at ${f}`);
});

/* -- 14.3 geography ----------------------------------------------------- */

test('essential locations have coordinates inside the atlas', () => {
  for (const id of [HALT, GATE_PLACE, 'northern-tempest-front', 'dwargon-sw-border', 'sw-dwargon-front', 'dwargon-south-approach', 'imperial-capital', 'ramiris-labyrinth', 'isthmus-approach']) {
    const p = data.placeById.get(id);
    assert(p && p.x !== null && p.y !== null && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1, `${id} has no valid coordinate`);
  }
});

test('world kilometres are a pure function of the atlas point, independent of zoom', () => {
  const a = data.placeById.get('ramiris-labyrinth')!;
  const b = data.nationById.get('dwargon')!;
  const d = distanceKm(a.x!, a.y!, b.x!, b.y!);
  // Through the renderer's angular projection and back: the same kilometres.
  const pa = lngLatToSim(simToLngLat(a.x!, a.y!).lng, simToLngLat(a.x!, a.y!).lat);
  const n = data.nationById.get('dwargon')!;
  const pb = lngLatToSim(simToLngLat(n.x!, n.y!).lng, simToLngLat(n.x!, n.y!).lat);
  assert(Math.abs(distanceKm(pa.x, pa.y, pb.x, pb.y) - d) < 1e-6, 'distance changes through the projection');
  const k = toKm(0.5, 0.25);
  const back = fromKm(k.e, k.s);
  assert(Math.abs(back.x - 0.5) < 1e-12 && Math.abs(back.y - 0.25) < 1e-12, 'km round trip');
  eq(KM_PER_ATLAS_PX, data.manifest.world.kmPerAtlasPixel, 'scale in the manifest');
});

test('canonical short distances hold under the calibration (about 30 km)', () => {
  const rim = data.nationById.get('jura-tempest-federation')!;
  const dw = data.nationById.get('dwargon')!;
  const camp = data.placeById.get('imperial-infantry-camp')!;
  const front = data.placeById.get('sw-dwargon-front')!;
  const d1 = distanceKm(rim.x!, rim.y!, camp.x!, camp.y!);
  const d2 = distanceKm(dw.x!, dw.y!, front.x!, front.y!);
  assert(Math.abs(d1 - 30) < 5, `infantry camp is ${d1.toFixed(1)} km from Rimuru`);
  assert(Math.abs(d2 - 30) < 5, `magitank array is ${d2.toFixed(1)} km from Dwargon`);
});

test('routes reference real places and stay connected', () => {
  for (const r of data.routes) {
    assert(r.points.length >= 2, `${r.id} has fewer than two points`);
    assert(Math.abs(polylineKm(r.points) - r.lengthKm) < 1, `${r.id} length disagrees with its geometry`);
    eq(r.exception, null, `${r.id} exception`);
  }
  for (const m of data.movements) {
    if (m.fromPlaceId) assert(data.placeById.has(m.fromPlaceId) || data.nationById.has(m.fromPlaceId), `${m.id} from`);
    if (m.toPlaceId) assert(data.placeById.has(m.toPlaceId) || data.nationById.has(m.toPlaceId), `${m.id} to`);
    if (m.routeId) assert(data.routeById.has(m.routeId), `${m.id} route ${m.routeId} missing`);
  }
});

test('ground routes respect terrain: on land, through the massif only by its passes, rivers only at fords', () => {
  const grid = new TerrainGrid(ROOT, join(ROOT, 'data-source'));
  for (const r of data.routes.filter((x) => x.mode === 'GROUND')) {
    for (let i = 1; i < r.points.length; i += 1) {
      assert(grid.segmentClear(r.points[i - 1], r.points[i]), `${r.id} crosses water, the massif outside a pass, or a river without a ford between points ${i - 1} and ${i}`);
    }
  }
  const b = data.movements.filter((m) => m.forceId === B && m.toPlaceId === 'sw-dwargon-front').map((m) => data.routeById.get(m.routeId!)!);
  assert(b.length && b.every((r) => r.passes.includes('dwargon-sw-pass')), 'Formation B does not use the south-western valley');
});

test('every movement is possible at its unit\'s stated march rate', () => {
  for (const m of data.movements) assert(!m.overSpeed, `${m.id} (${m.forceId}): ${m.lengthKm} km at ${m.kmPerDay} km/day`);
});

test('every drawn formation that moves has a route or a recorded exception', () => {
  for (const t of data.positions) {
    for (let i = 1; i < t.keys.length; i += 1) {
      const a = t.keys[i - 1];
      const b = t.keys[i];
      const km = distanceKm(a.x, a.y, b.x, b.y);
      if (km < 15 || b.route === 'UNKNOWN') continue;
      assert(b.path, `${t.forceId} moves ${km.toFixed(0)} km to ${b.placeId ?? 'a waypoint'} at frame ${b.f} without a route`);
    }
  }
});

test('no formation jumps: no frame-to-frame step exceeds its unit top speed', () => {
  // Movements ease in and out (smoothstep), whose peak is 1.5 times the average pace.
  const world = JSON.parse(readFileSync(join(ROOT, 'data-source', 'world.source.json'), 'utf8')) as { speeds: { units: Record<string, { maxKmPerDay: number }> } };
  for (const id of [MAIN, A, B, NORTH, P1, SOUTH, DET, P2]) {
    const cls = data.movementsByForce.get(id)?.[0]?.speedClass ?? 'infantry';
    const limit = (world.speeds.units[cls].maxKmPerDay / 144) * 1.5 + 1;
    let prev = forcePositionAt(data, id, 0);
    for (let f = 1; f < N; f += 1) {
      const p = forcePositionAt(data, id, f);
      if (prev && p) assert(distanceKm(prev.x, prev.y, p.x, p.y) <= limit, `${id} moves ${distanceKm(prev.x, prev.y, p.x, p.y).toFixed(0)} km in one frame at ${f} (limit ${limit.toFixed(0)})`);
      prev = p;
    }
  }
});

test('a strategic location keeps one coordinate across every phase', () => {
  const gate = data.placeById.get(GATE_PLACE)!;
  for (const id of [P1, P2, GATE]) {
    for (const k of data.positionByForce.get(id)?.keys ?? []) {
      if (k.placeId === GATE_PLACE) assert(k.x === gate.x && k.y === gate.y, `${id} reaches the gate at another coordinate`);
    }
  }
  eq(data.places.filter((p) => /Dwargon Gate/.test(p.name)).length, 1, 'places named Dwargon Gate');
});

/* -- 14.4 timeline checkpoints ----------------------------------------- */

const resolver = new StateResolver(data);
const checkpoints: [string, number, () => void][] = [
  ['initial deployment', frameOf(-38, '00:00'), () => {
    eq(L(frameOf(-38, '00:00')).committed, 1_010_000, 'committed');
    eq(strength(RESERVE, frameOf(-38, '00:00')), 100_000, 'reserve');
  }],
  ['halt point', ev('EVT-0019'), () => {
    const p = forcePositionAt(data, MAIN, ev('EVT-0019'))!;
    eq(p.placeId, HALT, 'main formation place');
  }],
  ['main-force split', SPLIT, () => eq(strength(A, SPLIT), 700_000, 'Formation A')],
  ['northern reinforcement arrival', ev('EVT-0507'), () => eq(forcePositionAt(data, NORTH, ev('EVT-0507'))!.placeId, 'northern-tempest-front', 'northern reinforcement place')],
  ['Dwargon Gate Phase 1 arrival', ev('EVT-0509'), () => eq(forcePositionAt(data, P1, ev('EVT-0509'))!.placeId, GATE_PLACE, 'Phase 1 place')],
  ['southern approach', ev('EVT-0511'), () => eq(forcePositionAt(data, SOUTH, ev('EVT-0511'))!.placeId, 'dwargon-south-approach', 'southern formation place')],
  ['south-western offensive', ev('EVT-0030'), () => eq(forcePositionAt(data, B, ev('EVT-0030'))!.placeId, 'sw-dwargon-front', 'Formation B place')],
  ['logistics threatened then secure', ev('EVT-0515'), () => {
    eq(resolver.at(ev('EVT-0505')).logistics['tempest-dwargon-road'], 'THREATENED', 'road at the interdiction');
    eq(resolver.at(ev('EVT-0515')).logistics['tempest-dwargon-road'], 'SECURE', 'road after the failure');
  }],
  ['Dwargon Gate Phase 2 arrival', ev('EVT-0526'), () => eq(L(ev('EVT-0526')).gateForce, 60_000, 'Gate force')],
  ['capital reserve reduction', ev('EVT-0516'), () => eq(L(ev('EVT-0516')).capitalReserve, 70_000, 'reserve')],
  ['surface battle dead', ev('EVT-0119'), () => eq(L(ev('EVT-0119')).killed, 240_000, 'dead after D+0')],
  ['Jura annihilation', ev('EVT-0219'), () => eq(L(ev('EVT-0219')).killed, 940_000, 'dead after D+10')],
  ['resurrection', ev('EVT-0220'), () => eq(L(ev('EVT-0220')).active, 800_000, 'active after the revival')],
  ['Gate force destroyed', ev('EVT-0325'), () => eq(L(ev('EVT-0325')).killed, 1_000_000, 'dead after D+15')],
  ['ledger closure', ev('EVT-0519'), () => eq(L(ev('EVT-0519')).killed, 1_010_000, 'cumulative dead')],
];
test('timeline checkpoints land on the scenario figures, in a documented order', () => {
  let last = -1;
  for (const [name, f, check] of checkpoints) {
    try {
      check();
    } catch (e) {
      throw new Error(`${name}: ${(e as Error).message}`);
    }
    if (name !== 'capital reserve reduction' && name !== 'Dwargon Gate Phase 1 arrival' && name !== 'southern approach' && name !== 'logistics threatened then secure' && name !== 'Dwargon Gate Phase 2 arrival') {
      assert(f >= last, `${name} out of order`);
      last = f;
    }
  }
});

test('seeking to a checkpoint equals replaying up to it', () => {
  for (const [, f] of checkpoints) {
    const fresh = new StateResolver(data);
    let s = fresh.at(0);
    for (let k = 1; k <= f; k += 1) s = fresh.at(k);
    eq(JSON.stringify(new StateResolver(data).at(f)), JSON.stringify(s), `state at ${f}`);
  }
});

console.log(`\n  ${passed}/${passed + failures.length} tests passed\n`);
if (failures.length) {
  console.error('Scenario tests FAILED');
  process.exit(1);
}
console.log('Scenario tests passed.');
