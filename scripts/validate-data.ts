/**
 * Runtime dataset validator.
 *
 * Runs against public/data after the compiler, before the Next.js build. A
 * failure here means the browser would have received something incoherent, so
 * the build stops rather than shipping it.
 *
 * Deliberately pedantic about the failure modes that quietly corrupt a
 * historical visualisation: a reference that points at nothing, a number that
 * was never in the source, time running backwards, and the same death counted
 * twice.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PROVENANCE_ORDER,
  type Battle,
  type CampaignStage,
  type CampaignTotals,
  type CasualtyRecord,
  type Character,
  type Combatant,
  type Commander,
  type Faction,
  type Force,
  type ForcePositionTrack,
  type ForceTrack,
  type FrameState,
  type Manifest,
  type Movement,
  type Nation,
  type Place,
  type Quantity,
  type TermEntry,
  type Territory,
  type TerritoryChange,
  type Theatre,
  type TimelineGap,
  type TimelineIndex,
  type WarEvent,
} from '../src/types/dataset';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'public', 'data');

const errors: string[] = [];
const warnings: string[] = [];
const fail = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

function load<T>(name: string): T {
  const path = join(DATA, name);
  if (!existsSync(path)) throw new Error(`Runtime dataset is missing ${name}. Run "npm run compile-data" first.`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Rejects NaN and Infinity anywhere in a structure, at any depth. */
function assertFinite(value: unknown, path: string): void {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) fail(`NaN at ${path}`);
    else if (!Number.isFinite(value)) fail(`Infinity at ${path}`);
    return;
  }
  if (Array.isArray(value)) value.forEach((v, i) => assertFinite(v, `${path}[${i}]`));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) assertFinite(v, `${path}.${k}`);
}

function uniqueIds<T extends { id: string }>(items: T[], label: string): Set<string> {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.id) fail(`${label}: an entry has an empty id.`);
    else if (seen.has(item.id)) fail(`${label}: duplicate id ${item.id}.`);
    seen.add(item.id);
  }
  return seen;
}

/** A quantity is UNKNOWN or a finite, non-negative integer. */
function checkQuantity(q: Quantity, where: string): void {
  if (q === 'UNKNOWN') return;
  if (typeof q !== 'number' || !Number.isFinite(q)) fail(`${where}: not a quantity (${String(q)}).`);
  else if (q < 0) fail(`${where}: negative quantity ${q}.`);
  else if (!Number.isInteger(q)) fail(`${where}: fractional headcount ${q}.`);
}

const ref = (set: Set<string>, id: string | null | undefined, where: string) => {
  if (id && !set.has(id)) fail(`${where}: references unknown id ${id}.`);
};

function main(): void {
  const manifest = load<Manifest>('manifest.json');
  const timeline = load<TimelineIndex>('timeline.index.json');
  const events = load<WarEvent[]>('events.json');
  const battles = load<Battle[]>('battles.json');
  const forces = load<Force[]>('forces.json');
  const forceTracks = load<ForceTrack[]>('force-tracks.json');
  const movementFile = load<{ movements: Movement[]; positions: ForcePositionTrack[] }>('movement.json');
  const casualtyFile = load<{ records: CasualtyRecord[]; campaignTotals: CampaignTotals }>('casualties.json');
  const commanders = load<Commander[]>('commanders.json');
  const combatants = load<Combatant[]>('combatants.json');
  const characters = load<Character[]>('characters.json');
  const territoryChanges = load<TerritoryChange[]>('territories.json');
  const geo = load<{ territories: Territory[] }>('territories.geo.json');
  const theatres = load<Theatre[]>('theatres.json');
  const places = load<Place[]>('places.json');
  const nations = load<Nation[]>('nations.json');
  const factions = load<Faction[]>('factions.json');
  const stages = load<CampaignStage[]>('stages.json');
  const terms = load<TermEntry[]>('terms.json');
  const gaps = load<TimelineGap[]>('gaps.json');
  const keyIndex = load<{ interval: number; frames: number[]; files: string[] }>('keyframes.index.json');
  const deltaFile = load<{ deltaFrames: number[]; deltas: Record<string, Partial<FrameState>> }>('state.deltas.json');

  const frameCount = manifest.clock.frameCount;
  if (frameCount !== (manifest.clock.lastDay - manifest.clock.firstDay + 1) * manifest.clock.framesPerDay) {
    fail('manifest: frameCount does not match the day span of the clock.');
  }

  for (const [name, value] of Object.entries({ events, battles, forces, forceTracks, movementFile, casualtyFile, commanders, characters, geo, theatres, places, nations, stages })) {
    assertFinite(value, name);
  }

  /* -- identity ---------------------------------------------------- */

  const eventIds = uniqueIds(events, 'events');
  const battleIds = uniqueIds(battles, 'battles');
  const forceIds = uniqueIds(forces, 'forces');
  const theatreIds = uniqueIds(theatres, 'theatres');
  const placeIds = uniqueIds(places, 'places');
  const nationIds = uniqueIds(nations, 'nations');
  const characterIds = uniqueIds(characters, 'characters');
  const territoryIds = uniqueIds(geo.territories, 'territories');
  const commanderIds = uniqueIds(commanders, 'commanders');
  uniqueIds(combatants, 'combatants');
  uniqueIds(casualtyFile.records, 'casualties');
  uniqueIds(territoryChanges, 'territory changes');
  uniqueIds(movementFile.movements, 'movements');
  uniqueIds(stages, 'stages');
  uniqueIds(terms, 'terms');
  const factionIds = new Set(factions.map((f) => f.id));
  const anyPlace = new Set([...placeIds, ...nationIds]);

  const inRange = (f: number | null, where: string) => {
    if (f === null) return;
    if (!Number.isInteger(f) || f < 0 || f >= frameCount) fail(`${where}: frame ${f} outside 0..${frameCount - 1}.`);
  };

  /* -- events -------------------------------------------------------- */

  let previousFrame = -1;
  let unresolved = 0;
  for (const [i, e] of events.entries()) {
    const where = `event ${e.id}`;
    inRange(e.frame, where);
    if (e.frame < previousFrame) fail(`${where}: events are not in chronological order.`);
    previousFrame = e.frame;
    if (e.prevId !== (events[i - 1]?.id ?? null)) fail(`${where}: prevId does not match the ordered sequence.`);
    if (e.nextId !== (events[i + 1]?.id ?? null)) fail(`${where}: nextId does not match the ordered sequence.`);
    if (!PROVENANCE_ORDER.includes(e.provenance)) fail(`${where}: provenance "${e.provenance}" is not a recognised class.`);
    if (e.provenance === 'UNRESOLVED') unresolved += 1;
    ref(theatreIds, e.theatreId, `${where}.theatreId`);
    ref(anyPlace, e.placeId, `${where}.placeId`);
    ref(battleIds, e.battleId, `${where}.battleId`);
    for (const c of e.characterIds) ref(characterIds, c, `${where}.characterIds`);
    for (const f of e.forceIds) ref(forceIds, f, `${where}.forceIds`);
    checkQuantity(e.tempestStrength, `${where}.tempestStrength`);
    checkQuantity(e.empireStrength, `${where}.empireStrength`);
    checkQuantity(e.kia, `${where}.kia`);
    checkQuantity(e.pow, `${where}.pow`);
    if (!/^\d{2}:\d{2}$/.test(e.simulationTime)) fail(`${where}: simulation time "${e.simulationTime}" is not HH:MM.`);
    if (e.sourceRefs.length === 0) warn(`${where}: no source reference.`);
    if ((e.provenance === 'RECONSTRUCTED' || e.provenance === 'INFERRED') && !e.reconstructionNote && !e.notes) {
      warn(`${where}: ${e.provenance} without a reconstruction note.`);
    }
  }
  if (unresolved) warn(`${unresolved} event(s) are UNRESOLVED; the interface flags them.`);

  /* -- battles ------------------------------------------------------- */

  for (const b of battles) {
    const where = `battle ${b.id}`;
    inRange(b.startFrame, `${where}.startFrame`);
    inRange(b.endFrame, `${where}.endFrame`);
    if (b.startFrame > b.endFrame) fail(`${where}: starts after it ends.`);
    ref(theatreIds, b.theatreId, `${where}.theatreId`);
    ref(anyPlace, b.placeId, `${where}.placeId`);
    for (const id of b.eventIds) ref(eventIds, id, `${where}.eventIds`);
    for (const p of b.participants) for (const f of p.forces) ref(forceIds, f, `${where}.participants`);
    checkQuantity(b.empireLost, `${where}.empireLost`);
    checkQuantity(b.tempestLost, `${where}.tempestLost`);
  }

  /* -- forces & tracks ---------------------------------------------- */

  const forceById = new Map(forces.map((f) => [f.id, f]));
  for (const f of forces) {
    const where = `force ${f.id}`;
    ref(forceIds, f.parentId, `${where}.parentId`);
    for (const c of f.childIds) {
      ref(forceIds, c, `${where}.childIds`);
      if (forceById.get(c)?.parentId !== f.id) fail(`${where}: child ${c} does not name it as parent.`);
    }
    if (f.countedInParent !== Boolean(f.parentId)) fail(`${where}: countedInParent disagrees with parentId.`);
    for (const c of f.commanderIds) ref(characterIds, c, `${where}.commanderIds`);
    if (!factionIds.has(f.faction)) fail(`${where}: faction ${f.faction} is not a declared faction.`);
    checkQuantity(f.initialBest, `${where}.initialBest`);
    checkQuantity(f.finalStrength, `${where}.finalStrength`);
    if (f.sizeStatus === 'UNKNOWN' && f.initialBest !== 'UNKNOWN') warn(`${where}: sizeStatus UNKNOWN but a best estimate is recorded.`);
    if (f.sizeStatus !== 'UNKNOWN' && f.initialBest === 'UNKNOWN') fail(`${where}: sizeStatus ${f.sizeStatus} without a number.`);
  }
  const snapshotAt = new Map<string, ForceTrack>();
  for (const t of forceTracks) {
    ref(forceIds, t.forceId, 'force track');
    snapshotAt.set(t.forceId, t);
    let last = -1;
    for (const s of t.snapshots) {
      const where = `track ${t.forceId}@${s.f}`;
      inRange(s.f, where);
      if (s.f <= last) fail(`${where}: snapshots out of order.`);
      last = s.f;
      for (const k of ['strength', 'effective', 'kia', 'wia', 'pow', 'mia'] as const) checkQuantity(s[k], `${where}.${k}`);
      ref(anyPlace, s.placeId, `${where}.placeId`);
      ref(eventIds, s.eventId, `${where}.eventId`);
      if (typeof s.strength === 'number' && typeof s.effective === 'number' && s.effective > s.strength) {
        warn(`${where}: effective strength exceeds strength.`);
      }
    }
  }
  // A child formation can never be larger than its parent at the same moment.
  const at = (id: string, f: number) => {
    let s: ForceTrack['snapshots'][number] | undefined;
    for (const x of snapshotAt.get(id)?.snapshots ?? []) if (x.f <= f) s = x;
    return s;
  };
  for (const f of forces) {
    if (!f.parentId) continue;
    for (const s of snapshotAt.get(f.id)?.snapshots ?? []) {
      const p = at(f.parentId, s.f);
      if (p && typeof p.strength === 'number' && typeof s.strength === 'number' && s.strength > p.strength) {
        warn(`force ${f.id}@${s.f}: ${s.strength} exceeds parent ${f.parentId} (${p.strength}).`);
      }
    }
  }

  /* -- positions & movements --------------------------------------- */

  for (const track of movementFile.positions) {
    let last = -1;
    for (const k of track.keys) {
      const where = `positions ${track.forceId}@${k.f}`;
      inRange(k.f, where);
      if (k.f < last) fail(`${where}: position keys out of order (movement would run backwards in time).`);
      last = k.f;
      if (k.x < 0 || k.x > 1 || k.y < 0 || k.y > 1) fail(`${where}: coordinate outside the atlas.`);
    }
    for (const [a, b] of track.offMap) if (a > b) fail(`positions ${track.forceId}: inverted off-map run ${a}..${b}.`);
  }
  for (const m of movementFile.movements) {
    const where = `movement ${m.id}`;
    ref(forceIds, m.forceId, `${where}.forceId`);
    ref(anyPlace, m.fromPlaceId, `${where}.fromPlaceId`);
    ref(anyPlace, m.toPlaceId, `${where}.toPlaceId`);
    ref(eventIds, m.startEvent, `${where}.startEvent`);
    ref(eventIds, m.endEvent, `${where}.endEvent`);
    if (m.startFrame !== null && m.endFrame !== null && m.endFrame < m.startFrame) fail(`${where}: ends before it starts.`);
    if (m.destinationUnknown && m.route !== 'UNKNOWN') fail(`${where}: unknown destination drawn with a ${m.route} route.`);
    if (m.route === 'SOLID' && m.basis === 'SIMULATION_RECONSTRUCTED') warn(`${where}: SOLID route on a simulation-reconstructed basis.`);
  }

  /* -- casualties ---------------------------------------------------- */

  const records = casualtyFile.records;
  for (const c of records) {
    const where = `casualty ${c.id}`;
    ref(eventIds, c.eventId, `${where}.eventId`);
    ref(forceIds, c.forceId, `${where}.forceId`);
    for (const k of ['kia', 'wia', 'pow', 'mia', 'revived'] as const) checkQuantity(c[k], `${where}.${k}`);
    const excluded = ['AGGREGATE_CASUALTY', 'COMPONENT_CASUALTY', 'CAMPAIGN_TOTAL', 'UNKNOWN'].includes(c.scope);
    if (excluded === c.countsTowardCampaignTotal) fail(`${where}: scope ${c.scope} contradicts countsTowardCampaignTotal.`);
  }
  // Recompute the campaign totals independently and require agreement.
  const additive = records.filter((c) => c.countsTowardCampaignTotal && c.frame !== null);
  const recompute = (faction: string, k: 'kia' | 'pow' | 'revived'): Quantity => {
    const nums = additive.filter((c) => c.faction === faction).map((c) => c[k]).filter((q): q is number => typeof q === 'number');
    return nums.length ? nums.reduce((a, b) => a + b, 0) : 'UNKNOWN';
  };
  const totals = casualtyFile.campaignTotals;
  const pairs: [string, Quantity, Quantity][] = [
    ['empireKilled', totals.empireKilled, recompute('Eastern Empire', 'kia')],
    ['empireRevived', totals.empireRevived, recompute('Eastern Empire', 'revived')],
    ['empireCaptured', totals.empireCaptured, recompute('Eastern Empire', 'pow')],
    ['tempestKilled', totals.tempestKilled, recompute('Jura-Tempest Federation', 'kia')],
  ];
  for (const [name, stated, again] of pairs) if (stated !== again) fail(`campaign totals: ${name} is ${stated}, recomputed ${again}.`);
  if (typeof totals.empireKilled === 'number' && typeof totals.empireRevived === 'number') {
    if (totals.empireRevived > totals.empireKilled) fail('campaign totals: more revived than killed.');
    if (totals.empirePermanentDead !== totals.empireKilled - totals.empireRevived) fail('campaign totals: permanent dead is not killed minus revived.');
  }

  /* -- people -------------------------------------------------------- */

  for (const c of commanders) {
    ref(eventIds, c.startEvent, `commander ${c.id}.startEvent`);
    ref(eventIds, c.endEvent, `commander ${c.id}.endEvent`);
    ref(characterIds, c.characterId, `commander ${c.id}.characterId`);
    if (c.startFrame !== null && c.endFrame !== null && c.endFrame < c.startFrame) fail(`commander ${c.id}: command ends before it starts.`);
  }
  for (const c of combatants) {
    ref(eventIds, c.firstEvent, `combatant ${c.id}.firstEvent`);
    ref(eventIds, c.lastEvent, `combatant ${c.id}.lastEvent`);
    ref(characterIds, c.characterId, `combatant ${c.id}.characterId`);
    if (c.firstFrame !== null && c.lastFrame !== null && c.lastFrame < c.firstFrame) fail(`combatant ${c.id}: last seen before first seen.`);
  }
  for (const c of characters) {
    for (const id of c.commanderIds) ref(commanderIds, id, `character ${c.id}.commanderIds`);
    for (const id of c.forceIds) ref(forceIds, id, `character ${c.id}.forceIds`);
    for (const id of c.eventIds) ref(eventIds, id, `character ${c.id}.eventIds`);
    for (const id of c.battleIds) ref(battleIds, id, `character ${c.id}.battleIds`);
  }

  /* -- geography ----------------------------------------------------- */

  for (const p of places) {
    if (p.placement !== 'ABSTRACT' && (p.x === null || p.y === null)) fail(`place ${p.id}: ${p.placement} place without coordinates.`);
    if (p.x !== null && (p.x < 0 || p.x > 1 || p.y! < 0 || p.y! > 1)) fail(`place ${p.id}: coordinate outside the atlas.`);
    if (p.placement !== 'ABSTRACT' && !p.basis) fail(`place ${p.id}: no stated basis for its position.`);
    ref(territoryIds, p.territoryId, `place ${p.id}.territoryId`);
    if (p.placement !== 'ABSTRACT' && p.altitude !== 'AIR' && p.territoryId === null) warn(`place ${p.id}: ground position falls outside every traced territory (sea).`);
  }
  for (const n of nations) ref(territoryIds, n.territoryId, `nation ${n.id}.territoryId`);
  for (const t of geo.territories) {
    for (const poly of t.geometry.coordinates) {
      const ring = poly[0];
      if (ring.length < 4) fail(`territory ${t.id}: degenerate ring.`);
      const [a, b] = [ring[0], ring[ring.length - 1]];
      if (a[0] !== b[0] || a[1] !== b[1]) fail(`territory ${t.id}: ring is not closed.`);
      for (const [x, y] of ring) if (x < 0 || x > 1 || y < 0 || y > 1) fail(`territory ${t.id}: vertex outside the atlas.`);
    }
    let last = -1;
    for (const s of t.control) {
      inRange(s.fromFrame, `territory ${t.id} control`);
      ref(eventIds, s.fromEvent, `territory ${t.id} control.fromEvent`);
      if (s.fromFrame < last) fail(`territory ${t.id}: control segments out of order.`);
      last = s.fromFrame;
      if (s.status === 'UNKNOWN' && s.controller) fail(`territory ${t.id}: UNKNOWN control must not name a controller.`);
    }
  }
  for (const t of territoryChanges) ref(eventIds, t.changeEventId, `territory change ${t.id}`);
  for (const s of stages) {
    inRange(s.startFrame, `stage ${s.id}`);
    inRange(s.endFrame, `stage ${s.id}`);
    if (s.endFrame < s.startFrame) fail(`stage ${s.id}: ends before it starts.`);
    for (const a of s.anchorEvents) ref(eventIds, a, `stage ${s.id}.anchorEvents`);
  }

  uniqueIds(gaps, 'timeline gaps');
  for (const g of gaps) {
    ref(eventIds, g.fromEvent, `gap ${g.id}.fromEvent`);
    ref(eventIds, g.toEvent, `gap ${g.id}.toEvent`);
    if (g.toFrame <= g.fromFrame) fail(`gap ${g.id}: ends before it starts.`);
    if (!g.reconstructionBasis) fail(`gap ${g.id}: no reconstruction basis.`);
  }
  for (const t of geo.territories) if (t.sourceGrade !== 'MEASURED' || !['LOW', 'MEDIUM', 'HIGH'].includes(t.uncertainty)) fail(`territory ${t.id}: missing source grade or uncertainty.`);

  /* -- timeline index & state stream ------------------------------- */

  for (const k of ['date', 'phase', 'stage'] as const) {
    if (timeline[k].idx.length !== frameCount) fail(`timeline.${k}: ${timeline[k].idx.length} entries for ${frameCount} frames.`);
    for (const i of timeline[k].idx) if (i < 0 || i >= timeline[k].dict.length) { fail(`timeline.${k}: dictionary index out of range.`); break; }
  }
  for (let f = 1; f < frameCount; f += 1) {
    if (timeline.battleDay[f] < timeline.battleDay[f - 1]) { fail(`timeline: battle day decreases at frame ${f}.`); break; }
  }

  // Dual-path replay. Every frame is resolved twice: sequentially from frame 0
  // through the delta stream, and by seeking from the nearest checkpoint. If
  // the two disagree, scrubbing would show a different campaign from playing.
  const checkpoints = keyIndex.files.map((f) => load<FrameState>(f));
  let sequential: FrameState = checkpoints[0];
  let mismatches = 0;
  for (let f = 0; f < frameCount; f += 1) {
    if (f > 0 && deltaFile.deltas[String(f)]) sequential = { ...sequential, ...deltaFile.deltas[String(f)] };
    const block = Math.floor(f / keyIndex.interval);
    let seeked: FrameState = checkpoints[block];
    for (let g = keyIndex.frames[block] + 1; g <= f; g += 1) if (deltaFile.deltas[String(g)]) seeked = { ...seeked, ...deltaFile.deltas[String(g)] };
    const a = JSON.stringify({ ...sequential, frame: 0 });
    const b = JSON.stringify({ ...seeked, frame: 0 });
    if (a !== b && mismatches++ < 3) fail(`state stream: sequential replay and checkpoint seek disagree at frame ${f}.`);
  }
  // Recorded casualties never decrease.
  let prior: FrameState | null = null;
  sequential = checkpoints[0];
  for (let f = 0; f < frameCount; f += 1) {
    if (f > 0 && deltaFile.deltas[String(f)]) sequential = { ...sequential, ...deltaFile.deltas[String(f)] };
    if (prior) {
      for (const side of ['tempest', 'empire'] as const) {
        for (const k of ['kia', 'pow', 'revived'] as const) {
          const a = prior.casualties[side][k];
          const b = sequential.casualties[side][k];
          if (typeof a === 'number' && typeof b === 'number' && b < a) fail(`state: ${side} ${k} decreases at frame ${f}.`);
        }
      }
    }
    prior = sequential;
  }

  /* -- report -------------------------------------------------------- */

  const t = casualtyFile.campaignTotals;
  console.log(`Validating revision "${manifest.revision}"`);
  console.log(`  frames            ${frameCount} (D${manifest.clock.firstDay}..D+${manifest.clock.lastDay})`);
  console.log(`  events            ${events.length}  (${PROVENANCE_ORDER.map((p) => `${p.toLowerCase()} ${events.filter((e) => e.provenance === p).length}`).join(', ')})`);
  console.log(`  forces            ${forces.length}  battles ${battles.length}  movements ${movementFile.movements.length}  characters ${characters.length}`);
  console.log(`  imperial killed   ${t.empireKilled}  revived ${t.empireRevived}  permanent ${t.empirePermanentDead}`);
  console.log(`  territories       ${geo.territories.length}  places ${places.length}  nations ${nations.length}  timeline gaps ${gaps.length}`);
  for (const w of warnings) console.log(`  warn  ${w}`);
  if (errors.length) {
    console.error(`\nDataset validation FAILED with ${errors.length} error(s):`);
    for (const e of errors.slice(0, 80)) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`\nDataset validation passed${warnings.length ? ` with ${warnings.length} warning(s)` : ''}.`);
}

main();
