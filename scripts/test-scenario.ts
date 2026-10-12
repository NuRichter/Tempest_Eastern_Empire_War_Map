/**
 * Scenario tests: the campaign's force ledger, formation integrity, casualty
 * reconciliation, the geographic model, the cast and the nineteen timeline
 * checkpoints of the owner's scenario (docs/CAMPAIGN_TIMELINE.md, phases A-N),
 * on the compiled data. The compiler derives every figure from forces, events
 * and casualty records; these tests check that it lands on the scenario's
 * numbers (docs/CAMPAIGN_FORCE_LEDGER.md).
 *
 *     npm run test
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assembleDataset, PART_FILES, type DatasetParts } from '../src/data/loader';
import { createFields, decodeFront, evaluateFront, heldCells, HOLDER_EMPIRE, type FrontFile } from '../src/map/field/front';
import { forcePositionAt, forceSnapshotAt, inConvoyAt, ledgerAt, markerStrengthAt, StateResolver, territoryControlAt } from '../src/simulation/resolver';
import { distanceKm, fromKm, polylineKm, toKm, KM_PER_ATLAS_PX } from '../src/lib/world';
import { simToLngLat, lngLatToSim } from '../src/lib/coords';
import type { FrameState, Quantity } from '../src/types/dataset';
import { TerrainGrid } from './lib/routing';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DATA = join(ROOT, 'public', 'data');
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DATA, f), 'utf8')) as T;
const readSrc = <T>(f: string): T => JSON.parse(readFileSync(join(ROOT, 'data-source', f), 'utf8')) as T;

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
const placeAt = (id: string, f: number) => forcePositionAt(data, id, f)?.placeId ?? null;
const L = (f: number) => {
  const p = ledgerAt(data, f);
  assert(p, `no ledger point at ${f}`);
  return p;
};
const firstNumeric = (id: string) => (data.trackByForce.get(id)?.snapshots ?? []).find((s) => typeof s.strength === 'number')?.strength as number;

const CEILING = 'F-EMP-001';
const MAIN = 'F-EMP-010';
const A = 'F-EMP-011';
const LAB = 'F-EMP-011A';
const OUT = 'F-EMP-011B';
const B = 'F-EMP-012';
const FLY = 'F-EMP-013';
const COHORT = 'F-EMP-017';
const EAST_REINF = 'F-EMP-018';
const EAST_COHORT = 'F-EMP-019';
const GATE = 'F-EMP-031';
const RESERVE = 'F-EMP-080';
const THIRD = 'F-EMP-081';
const THIRD_E = 'F-EMP-081E';
const THIRD_T = 'F-EMP-081T';
const REVIVED = 'F-EMP-090';
const HALT = 'jura-forest-edge';
const MAIN_GATE = 'dwargon-main-gate';
const EAST_GATE = 'dwargon-eastern-gate';
const EAST_FRONT = 'dwargon-eastern-front';
const END = N - 1;
const params = JSON.parse(readFileSync(join(ROOT, 'data-source', 'campaign', 'scenario-params.json'), 'utf8')) as { thirdStrike: { total: number; groups: Record<string, number> } };

console.log('Scenario tests\n');

/* -- force accounting ---------------------------------------------------- */

test('main formation: 700,000 + 200,000 = 900,000', () => {
  const allocations = data.forces.filter((f) => f.parentId === MAIN && f.ledgerRole === 'ALLOCATION').map((f) => firstNumeric(f.id)).sort((a, b) => b - a);
  eq(allocations.join(' + '), '700000 + 200000', 'the allocations');
  eq(firstNumeric(MAIN), 900_000, 'main formation');
});

test('the 970,000 crossing is 900,000 + 70,000, two formations drawn as one column', () => {
  const f = frameOf(-20, '12:00');
  eq(firstNumeric(COHORT), 70_000, 'cohort');
  assert(inConvoyAt(data, data.forceById.get(COHORT)!, f), 'the cohort is not in the main column on the approach');
  eq(markerStrengthAt(data, MAIN, f), 970_000, 'the column marker');
  eq(strength(MAIN, f), 900_000, 'the main formation alone');
  eq(L(f).committed, 970_000, 'committed before the eastern cohort leaves');
});

test('initial forward deployment: 900,000 + 70,000 + 30,000 = 1,000,000, the stated ceiling', () => {
  eq(firstNumeric(EAST_COHORT), 30_000, 'eastern cohort');
  eq(L(END).initialForward, 1_000_000, 'initial forward deployment');
  eq(data.forceById.get(CEILING)!.initialBest, 1_000_000, 'deployable ceiling');
  eq(L(ev('EVT-0502')).committed, 1_000_000, 'committed after the eastern cohort leaves');
});

test('the cohort splits after the ultimatum: 40,000 + 30,000 = 70,000', () => {
  const s = ev('EVT-0531');
  assert(s > ev('EVT-0121'), 'the cohort splits before the ultimatum is rejected');
  eq(strength(FLY, s), 40_000, 'airships for the Main Gate');
  eq(strength(EAST_REINF, s), 30_000, 'infantry for the Eastern Gate');
  eq(strength(COHORT, s), 70_000, 'cohort aggregate at the split');
  for (const id of [FLY, EAST_REINF]) eq(data.forceById.get(id)!.origin?.fromForceId, COHORT, `${id} origin`);
});

test('Main Gate: 200,000, and 240,000 only once the 40,000 arrive', () => {
  const before = ev('EVT-0106') - 1;
  const at = ev('EVT-0106');
  eq(placeAt(B, ev('EVT-0030')) === 'sw-dwargon-front' ? 200_000 : 0, 200_000, '200,000 arrayed before the gate');
  assert(placeAt(FLY, before) !== 'sw-dwargon-airspace', 'the airships are over the gate before they arrive');
  eq((strength(B, at) as number) + (strength(FLY, at) as number), 240_000, 'at the gate after the arrival');
});

test('Eastern Gate: 30,000, then 30,000 + 30,000 = 60,000', () => {
  eq(strength(GATE, ev('EVT-0533')), 30_000, 'after the eastern cohort arrives');
  eq(strength(GATE, ev('EVT-0525') - 1), 30_000, 'before the reinforcement');
  eq(strength(GATE, ev('EVT-0525')), 60_000, 'after the reinforcement');
  const merged = data.forces.filter((f) => f.mergedInto?.forceId === GATE).map((f) => f.id).sort();
  eq(merged.join(','), [EAST_COHORT, EAST_REINF].sort().join(','), 'formations merged into the Gate force');
});

test('Tempest capital: 700,000 = 350,000 + 200,000 + 150,000', () => {
  eq(strength(LAB, ev('EVT-0201')), 350_000, 'day one');
  eq(strength(LAB, ev('EVT-0210')), 550_000, 'inside after day two');
  eq(strength(OUT, ev('EVT-0210')), 150_000, 'outside');
  eq(350_000 + 200_000 + 150_000, firstNumeric(A), 'Formation A');
});

test('Third Strike: the groups sum to 10,100 and come out of the 110,100 reserve', () => {
  const groups = Object.values(params.thirdStrike.groups).reduce((a, b) => a + b, 0);
  eq(groups, 10_100, 'parameter groups');
  eq(params.thirdStrike.total, 10_100, 'parameter total');
  const s = ev('EVT-0541');
  eq((strength(THIRD_E, s) as number) + (strength(THIRD_T, s) as number), 10_100, 'groups at the split');
  eq(strength(THIRD_E, s), params.thirdStrike.groups[THIRD_E], 'eastern group from the parameters');
  assert((strength(THIRD_E, s) as number) > (strength(THIRD_T, s) as number), 'the majority goes east');
  eq(firstNumeric(RESERVE), 110_100, 'reserve before');
  eq(strength(RESERVE, END), 100_000, 'reserve after: 110,100 - 10,100');
  eq(data.forceById.get(THIRD)!.origin?.fromForceId, RESERVE, 'transfer origin');
  eq(L(END).committed, 1_010_100, 'deployed in all: 1,000,000 + 10,100');
});

test('every compiler ledger identity holds', () => {
  for (const c of data.ledger.checks) assert(c.ok, `${c.name}: ${c.expression}`);
  assert(data.ledger.checks.length >= 10, 'missing ledger checks');
});

/* -- casualties ---------------------------------------------------------- */

test('operation dead: 240,000 + 700,000 + 60,000 + 10,100 = 1,010,100, every deployed soldier', () => {
  const end = L(END);
  eq(end.killed, 1_010_100, 'operation dead');
  eq(end.killed, end.committed, 'dead = deployed');
  eq(end.revived, 700_000, 'revived');
  eq(end.deadNotRevived, 310_100, 'not revived');
  eq(end.active, 700_000, 'active (the revived)');
});

test('the scenario\'s ~1,020,000 dead are the Empire-wide toll; no troops are invented for the gap', () => {
  const imperial = data.casualties.filter((c) => c.faction === 'Eastern Empire' && c.scope === 'EVENT_CASUALTY' && typeof c.kia === 'number').reduce((n, c) => n + (c.kia as number), 0);
  assert(Math.abs(imperial - 1_020_000) < 1_000, `Empire-wide dead ${imperial} is not about 1,020,000`);
  eq(imperial - L(END).killed, 10_002, 'outside the operation: Magic Beast Division 10,000 and two individuals');
  assert(!data.casualties.some((c) => c.kia === 9_900), 'a 9,900 record was invented');
  assert(!data.forces.some((f) => f.initialBest === 9_900), 'a 9,900 formation was invented');
});

test('resurrection creates no unique personnel and keeps the death record', () => {
  const r = ev('EVT-0220');
  const before = L(r - 1);
  const after = L(r);
  eq(after.committed, before.committed, 'committed across the revival');
  eq(after.killed, before.killed, 'deaths are not erased');
  eq(after.revived - before.revived, 700_000, 'revived');
  eq(strength(REVIVED, r), 700_000, 'revived cohort');
});

test('replaying the ledger history is deterministic', () => {
  const again = assembleDataset({ ...parts, checkpoints: parts.keyframeIndex.files.flatMap((f) => read<FrameState | FrameState[]>(f)) });
  for (let f = 0; f < N; f += 97) eq(JSON.stringify(ledgerAt(again, f)), JSON.stringify(ledgerAt(data, f)), `ledger at ${f}`);
});

/* -- geography ----------------------------------------------------------- */

const geo = readSrc<{ mountains: { id: string; ring: [number, number][] }[] }>('geography.source.json');
const city = readSrc<{ settlements: { id: string; x: number; y: number }[] }>('settlements.source.json').settlements.find((s) => s.id === 'city-dwargon')!;
const ring = geo.mountains[0].ring;
const ringKm = { w: (Math.max(...ring.map((p) => p[0])) - Math.min(...ring.map((p) => p[0]))) * 5282, h: (Math.max(...ring.map((p) => p[1])) - Math.min(...ring.map((p) => p[1]))) * 4070 };

test('the Kanaat massif is compact: an impassable core under 80 km, summit under 3,200 m', () => {
  assert(ringKm.w < 80 && ringKm.h < 80, `core ${ringKm.w.toFixed(0)} x ${ringKm.h.toFixed(0)} km`);
  const biomes = JSON.parse(readFileSync(join(ROOT, 'public', 'maps', 'terrain-biomes.json'), 'utf8')) as { kanaat: { summitMetres: number } };
  assert(biomes.kanaat.summitMetres < 3_200, `summit ${biomes.kanaat.summitMetres} m`);
});

test('the Main Gate stands at the foot of the range, about 22 km from the city (the magitanks array about 30 km out)', () => {
  const g = data.placeById.get(MAIN_GATE)!;
  const d = distanceKm(city.x, city.y, g.x!, g.y!);
  assert(d > 15 && d < 30, `Main Gate ${d.toFixed(1)} km from the city`);
  const grid = new TerrainGrid(ROOT, join(ROOT, 'data-source'));
  assert(grid.segmentClear([g.x!, g.y!], [g.x! - 0.004, g.y! + 0.006]), 'the Main Gate is not reachable from the south-west');
  const inCore = (() => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > g.y! !== yj > g.y! && g.x! < ((xj - xi) * (g.y! - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  })();
  assert(!inCore, 'the Main Gate is inside the impassable core, not at its foot');
});

test('the Eastern Gate is a different place, far from the Main Gate', () => {
  const a = data.placeById.get(MAIN_GATE)!;
  const b = data.placeById.get(EAST_GATE)!;
  assert(distanceKm(a.x!, a.y!, b.x!, b.y!) > 200, 'the two gates are too close');
  eq(data.places.filter((p) => /Main Gate \(foot/.test(p.name)).length, 1, 'places named Main Gate');
  eq(data.places.filter((p) => /Eastern Gate \(Isthmus\)/.test(p.name)).length, 1, 'places named Eastern Gate');
});

test('world kilometres are a pure function of the atlas point, independent of zoom', () => {
  const a = data.placeById.get('ramiris-labyrinth')!;
  const b = data.nationById.get('dwargon')!;
  const d = distanceKm(a.x!, a.y!, b.x!, b.y!);
  const pa = lngLatToSim(simToLngLat(a.x!, a.y!).lng, simToLngLat(a.x!, a.y!).lat);
  const pb = lngLatToSim(simToLngLat(b.x!, b.y!).lng, simToLngLat(b.x!, b.y!).lat);
  assert(Math.abs(distanceKm(pa.x, pa.y, pb.x, pb.y) - d) < 1e-6, 'distance changes through the projection');
  const k = toKm(0.5, 0.25);
  const back = fromKm(k.e, k.s);
  assert(Math.abs(back.x - 0.5) < 1e-12 && Math.abs(back.y - 0.25) < 1e-12, 'km round trip');
  eq(KM_PER_ATLAS_PX, data.manifest.world.kmPerAtlasPixel, 'scale in the manifest');
});

test('canonical short distances hold under the calibration (about 30 km)', () => {
  const rim = data.nationById.get('jura-tempest-federation')!;
  const camp = data.placeById.get('imperial-infantry-camp')!;
  const front = data.placeById.get('sw-dwargon-front')!;
  const d1 = distanceKm(rim.x!, rim.y!, camp.x!, camp.y!);
  const d2 = distanceKm(city.x, city.y, front.x!, front.y!);
  assert(Math.abs(d1 - 30) < 5, `infantry camp is ${d1.toFixed(1)} km from Rimuru`);
  assert(Math.abs(d2 - 30) < 8, `magitank array is ${d2.toFixed(1)} km from Dwargon`);
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
  const tracks = data.positionByForce.get(B)!.keys.map((k) => k.placeId).filter(Boolean);
  for (const p of [HALT, 'dwargon-sw-border', 'sw-dwargon-front']) assert(tracks.includes(p), `the 200,000 never reach ${p}`);
});

test('every movement is possible at its unit\'s stated march rate', () => {
  for (const m of data.movements) assert(!m.overSpeed, `${m.id} (${m.forceId}): ${m.lengthKm} km at ${m.kmPerDay} km/day`);
});

test('no formation jumps: no frame-to-frame step exceeds its unit top speed', () => {
  const world = readSrc<{ speeds: { units: Record<string, { maxKmPerDay: number }> } }>('world.source.json');
  for (const id of [MAIN, COHORT, A, B, FLY, EAST_REINF, EAST_COHORT, THIRD_E, THIRD_T]) {
    const classes = (data.movementsByForce.get(id) ?? []).map((m) => m.speedClass);
    const fastest = Math.max(...(classes.length ? classes : ['infantry']).map((c) => world.speeds.units[c].maxKmPerDay));
    const limit = (fastest / 144) * 1.5 + 1;
    let prev = forcePositionAt(data, id, 0);
    for (let f = 1; f < N; f += 1) {
      const p = forcePositionAt(data, id, f);
      if (prev && p) assert(distanceKm(prev.x, prev.y, p.x, p.y) <= limit, `${id} moves ${distanceKm(prev.x, prev.y, p.x, p.y).toFixed(0)} km in one frame at ${f} (limit ${limit.toFixed(0)})`);
      prev = p;
    }
  }
});

/* -- territory ----------------------------------------------------------- */

const front = decodeFront(read<FrontFile>('front.json'));
const fields = createFields(front);
const dwgIdx = front.territoryIds.indexOf('T-DWG');
const jtfIdx = front.territoryIds.indexOf('T-JTF');
const empireIn = (T: number, t: number) => heldCells(evaluateFront(front, T, fields), front, HOLDER_EMPIRE, t);

test('Dwargon is at war from the eastern crossing, and imperial ground there rises and falls', () => {
  const cross = ev('EVT-0521');
  eq(territoryControlAt(data.territories.find((t) => t.id === 'T-DWG')!, cross).segment.role, 'CO_BELLIGERENT', 'Dwargon role at the crossing');
  eq(empireIn(cross - 6, dwgIdx), 0, 'imperial ground in Dwargon before the crossing');
  const east = empireIn(ev('EVT-0525') + 12, dwgIdx);
  const sw = empireIn(ev('EVT-0030'), dwgIdx);
  assert(east > 0, 'no imperial ground at the Eastern Gate');
  assert(sw > east, 'the south-western thrust adds no ground');
  assert(empireIn(ev('EVT-0515') + 72, dwgIdx) < sw, 'no south-western withdrawal after the Main Gate battle');
  assert(empireIn(ev('EVT-0515') + 72, dwgIdx) > 0, 'the eastern occupation is gone after the Main Gate battle');
  eq(empireIn(ev('EVT-0548') + 36, dwgIdx), 0, 'imperial ground in Dwargon after the final counter-attacks');
});

test('the Third Strike advances on the Tempest capital, then both fronts are back on the pre-war line', () => {
  assert(empireIn(ev('EVT-0545') + 6, jtfIdx) > 0, 'no imperial ground from the Third Strike in Tempest');
  eq(empireIn(ev('EVT-0220'), jtfIdx), 0, 'imperial ground in Jura after the annihilation');
  eq(empireIn(ev('EVT-0548') + 36, jtfIdx), 0, 'imperial ground in Jura at the end');
});

/* -- cast ---------------------------------------------------------------- */

test('cast per event: the 970,000 crossing shows the imperial command, not Tempest\'s', () => {
  const e = data.eventById.get('EVT-0015')!;
  assert(e.presentIds.includes('calgurio'), 'Caligulio is not at the crossing');
  for (const id of ['rimuru', 'benimaru']) assert(!e.presentIds.includes(id), `${id} is drawn at the crossing`);
  assert(e.characterIds.includes('rudra') && !e.presentIds.includes('rudra'), 'Rudra is not the remote commander');
  for (const ev2 of data.events) for (const c of ev2.presentIds) assert(ev2.characterIds.includes(c), `${ev2.id}: ${c} present but not in the cast`);
});

/* -- the nineteen timeline checkpoints (A-N) ------------------------------ */

const resolver = new StateResolver(data);
const checkpoints: [string, number, () => void][] = [
  ['A1 main column leaves', ev('EVT-0003'), () => eq(markerStrengthAt(data, MAIN, ev('EVT-0003')), 970_000, 'column')],
  ['A2 eastern cohort leaves', ev('EVT-0502'), () => eq(L(ev('EVT-0502')).committed, 1_000_000, 'committed')],
  ['A3 970,000 cross the Tempest border', ev('EVT-0015'), () => eq(markerStrengthAt(data, MAIN, ev('EVT-0015')), 970_000, 'column at the border')],
  ['A4 eastern cohort crosses into Dwargon', ev('EVT-0521'), () => eq(placeAt(EAST_COHORT, ev('EVT-0521')), 'empire-dwargon-border', 'eastern cohort place')],
  ['C1 halt and Eastern Gate together', ev('EVT-0019'), () => {
    eq(ev('EVT-0019'), ev('EVT-0522'), 'same frame');
    eq(placeAt(MAIN, ev('EVT-0019')), HALT, 'main formation');
    eq(placeAt(EAST_COHORT, ev('EVT-0522')), EAST_FRONT, 'eastern cohort');
  }],
  ['C2 split at the halt, cohort staged', ev('EVT-0503'), () => {
    eq(strength(A, ev('EVT-0503')), 700_000, 'Formation A');
    eq(strength(B, ev('EVT-0503')), 200_000, 'Formation B');
    eq(placeAt(COHORT, ev('EVT-0503') + 6), HALT, 'cohort staged');
    assert(drawn(COHORT, ev('EVT-0503') + 6), 'the staged cohort is not drawn');
  }],
  ['E1 Testarossa\'s group at the Main Gate before the 200,000', ev('EVT-0535'), () => {
    assert(ev('EVT-0535') < ev('EVT-0030'), 'Testarossa arrives after the magitanks');
    eq(placeAt('F-DEM-001', ev('EVT-0535')), MAIN_GATE, 'Testarossa');
  }],
  ['E2 200,000 at the Main Gate as 700,000 reach the capital', ev('EVT-0030'), () => {
    eq(ev('EVT-0030'), ev('EVT-0029'), 'same frame');
    eq(placeAt(A, ev('EVT-0029')), 'imperial-infantry-camp', 'Formation A');
  }],
  ['E3 ultimatum waited on, then rejected', ev('EVT-0121'), () => assert(ev('EVT-0121') - ev('EVT-0005') >= 12, 'less than two hours between the envoy and the rejection')],
  ['F1 cohort splits after the rejection', ev('EVT-0531'), () => assert(ev('EVT-0531') > ev('EVT-0121'), 'split before the rejection')],
  ['F2 240,000 at the Main Gate', ev('EVT-0106'), () => eq(placeAt(FLY, ev('EVT-0106')), 'sw-dwargon-airspace', 'airships')],
  ['G1 labyrinth: 350,000, then 200,000; 150,000 outside', ev('EVT-0210'), () => eq((strength(LAB, ev('EVT-0210')) as number) + (strength(OUT, ev('EVT-0210')) as number), 700_000, 'Formation A')],
  ['H1 Main Gate counter-attack', ev('EVT-0119'), () => eq(L(ev('EVT-0119')).killed, 240_000, 'dead after D+0')],
  ['F3 60,000 at the Eastern Gate', ev('EVT-0525'), () => eq(L(ev('EVT-0525')).gateForce, 60_000, 'Gate force')],
  ['I1 capital counter-attack and revival', ev('EVT-0220'), () => {
    eq(L(ev('EVT-0219')).killed, 940_000, 'dead after D+10');
    eq(L(ev('EVT-0220')).revived, 700_000, 'revived');
  }],
  ['J1 allied push east during the coup', ev('EVT-0538'), () => {
    assert(ev('EVT-0538') < ev('EVT-0323') && ev('EVT-0323') < ev('EVT-0325'), 'push, coup and the 60,000 out of order');
    eq(L(ev('EVT-0325')).killed, 1_000_000, 'dead after the 60,000');
  }],
  ['L1 Third Strike leaves the reserve', ev('EVT-0540'), () => eq(L(ev('EVT-0540')).capitalReserve, 100_000, 'reserve')],
  ['M1 final counter-attacks on both fronts', ev('EVT-0548'), () => {
    assert(ev('EVT-0546') <= ev('EVT-0548') && ev('EVT-0547') <= ev('EVT-0548'), 'status quo before both groups fall');
    eq(L(ev('EVT-0548')).killed, 1_010_100, 'dead');
    eq(resolver.at(ev('EVT-0548')).eventIds.includes('EVT-0548'), true, 'status quo event');
  }],
  ['N1 festival, settlement, the West and the Octagram', ev('EVT-0564'), () => {
    const order = ['EVT-0450', 'EVT-0562', 'EVT-0563', 'EVT-0564'].map(ev);
    for (let i = 1; i < order.length; i += 1) assert(order[i] > order[i - 1], 'ending out of order');
    eq(data.eventById.get('EVT-0562')!.provenance, 'SCENARIO', 'puppet-state reading is labelled scenario');
    eq(data.eventById.get('EVT-0564')!.provenance, 'CANONICAL', 'Walpurgis summons is canon');
  }],
];
test('nineteen timeline checkpoints land on the scenario figures', () => {
  eq(checkpoints.length, 19, 'checkpoints');
  for (const [name, , check] of checkpoints) {
    try {
      check();
    } catch (e) {
      throw new Error(`${name}: ${(e as Error).message}`);
    }
  }
});

test('seeking to a checkpoint equals replaying up to it', () => {
  for (const [, f] of checkpoints.filter((_, i) => i % 3 === 0)) {
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
