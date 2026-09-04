/**
 * Runtime dataset validator.
 *
 * Runs against public/data after the compiler, before the Next.js build. A
 * failure here means the browser would have received something incoherent, so
 * the build stops rather than shipping it.
 *
 * The checks are deliberately pedantic about the two failure modes that would
 * quietly corrupt a historical visualisation: a reference that points at
 * nothing, and a number that was never in the source.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  Battle,
  CampaignStage,
  CasualtyRecord,
  Combatant,
  Commander,
  Faction,
  Force,
  ForcePositionTrack,
  ForceTrack,
  FrameState,
  Manifest,
  Movement,
  Nation,
  Place,
  Quantity,
  TerritoryChange,
  Theatre,
  TimelineIndex,
  WarEvent,
} from '../src/types/dataset';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'public', 'data');

const errors: string[] = [];
const warnings: string[] = [];

function fail(message: string): void {
  errors.push(message);
}
function warn(message: string): void {
  warnings.push(message);
}

function load<T>(name: string): T {
  const path = join(DATA, name);
  if (!existsSync(path)) {
    throw new Error(`Runtime dataset is missing ${name}. Run "npm run compile-data" first.`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Rejects NaN and Infinity anywhere in a structure, at any depth. */
function assertFinite(value: unknown, path: string): void {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) fail(`NaN at ${path}`);
    else if (!Number.isFinite(value)) fail(`Infinity at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertFinite(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) assertFinite(v, `${path}.${k}`);
  }
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

function isQuantity(q: Quantity): boolean {
  return q === 'UNKNOWN' || (typeof q === 'number' && Number.isFinite(q));
}

function main(): void {
  const manifest = load<Manifest>('manifest.json');
  const timeline = load<TimelineIndex>('timeline.index.json');
  const events = load<WarEvent[]>('events.json');
  const battles = load<Battle[]>('battles.json');
  const forces = load<Force[]>('forces.json');
  const forceTracks = load<ForceTrack[]>('force-tracks.json');
  const movementFile = load<{ movements: Movement[]; positions: ForcePositionTrack[] }>('movement.json');
  const casualtyFile = load<{ records: CasualtyRecord[]; campaignTotals: Record<string, unknown> }>('casualties.json');
  const commanders = load<Commander[]>('commanders.json');
  const combatants = load<Combatant[]>('combatants.json');
  const territories = load<TerritoryChange[]>('territories.json');
  const theatres = load<Theatre[]>('theatres.json');
  const places = load<Place[]>('places.json');
  const nations = load<Nation[]>('nations.json');
  const factions = load<Faction[]>('factions.json');
  const stages = load<CampaignStage[]>('stages.json');
  const keyIndex = load<{ interval: number; frames: number[]; files: string[] }>('keyframes.index.json');
  const deltaFile = load<{ interval: number; frameCount: number; deltaFrames: number[]; deltas: Record<string, Partial<FrameState>> }>(
    'state.deltas.json',
  );

  const frameCount = manifest.clock.frameCount;

  /* -- identity ---------------------------------------------------- */

  const eventIds = uniqueIds(events, 'events');
  const battleIds = uniqueIds(battles, 'battles');
  const forceIds = uniqueIds(forces, 'forces');
  uniqueIds(commanders, 'commanders');
  const theatreIds = uniqueIds(theatres, 'theatres');
  const placeIds = uniqueIds(places, 'places');
  const nationIds = uniqueIds(nations, 'nations');
  uniqueIds(casualtyFile.records, 'casualties');
  uniqueIds(combatants, 'combatants');
  uniqueIds(territories, 'territories');
  uniqueIds(movementFile.movements, 'movements');
  uniqueIds(factions.map((f) => ({ ...f, id: f.id })), 'factions');
  uniqueIds(stages, 'stages');

  /* -- frame ranges ------------------------------------------------ */

  const inRange = (f: number | null, where: string): void => {
    if (f === null) return;
    if (!Number.isInteger(f) || f < 0 || f >= frameCount) {
      fail(`${where}: frame ${f} is outside 0..${frameCount - 1}.`);
    }
  };

  for (const e of events) inRange(e.frame, `event ${e.id}`);
  for (const b of battles) {
    inRange(b.startFrame, `battle ${b.id}`);
    inRange(b.endFrame, `battle ${b.id}`);
    if (b.endFrame < b.startFrame) fail(`battle ${b.id}: end frame precedes start frame.`);
  }
  for (const s of stages) {
    inRange(s.startFrame, `stage ${s.id}`);
    inRange(s.endFrame, `stage ${s.id}`);
    if (s.endFrame < s.startFrame) fail(`stage ${s.id}: end frame precedes start frame.`);
  }
  for (const c of casualtyFile.records) inRange(c.frame, `casualty ${c.id}`);
  for (const m of movementFile.movements) {
    inRange(m.startFrame, `movement ${m.id}`);
    inRange(m.endFrame, `movement ${m.id}`);
  }

  /* -- referential integrity --------------------------------------- */

  for (const e of events) {
    if (!theatreIds.has(e.theatreId)) fail(`event ${e.id}: unknown theatre ${e.theatreId}.`);
    if (e.battleId && !battleIds.has(e.battleId)) fail(`event ${e.id}: unknown battle ${e.battleId}.`);
    if (e.placeId && !placeIds.has(e.placeId) && !nationIds.has(e.placeId)) {
      fail(`event ${e.id}: unknown place ${e.placeId}.`);
    }
    if (e.prevId && !eventIds.has(e.prevId)) fail(`event ${e.id}: previous event ${e.prevId} does not exist.`);
    if (e.nextId && !eventIds.has(e.nextId)) fail(`event ${e.id}: next event ${e.nextId} does not exist.`);
  }
  for (const b of battles) {
    if (!theatreIds.has(b.theatreId)) fail(`battle ${b.id}: unknown theatre ${b.theatreId}.`);
    for (const id of b.eventIds) if (!eventIds.has(id)) fail(`battle ${b.id}: unknown event ${id}.`);
    for (const p of b.participants) {
      for (const fid of p.forces) if (!forceIds.has(fid)) fail(`battle ${b.id}: unknown force ${fid}.`);
    }
  }
  for (const f of forces) {
    if (f.parentId && !forceIds.has(f.parentId)) fail(`force ${f.id}: unknown parent ${f.parentId}.`);
    for (const c of f.childIds) if (!forceIds.has(c)) fail(`force ${f.id}: unknown child ${c}.`);
  }
  for (const t of forceTracks) {
    if (!forceIds.has(t.forceId)) fail(`force track: unknown force ${t.forceId}.`);
    let previous = -1;
    for (const s of t.snapshots) {
      inRange(s.f, `force track ${t.forceId}`);
      if (s.f <= previous) fail(`force track ${t.forceId}: snapshots are not strictly ordered at frame ${s.f}.`);
      previous = s.f;
      for (const [k, v] of Object.entries({ strength: s.strength, kia: s.kia, wia: s.wia, pow: s.pow, mia: s.mia })) {
        if (!isQuantity(v as Quantity)) fail(`force track ${t.forceId} @${s.f}: ${k} is neither a finite number nor UNKNOWN.`);
      }
      if (s.placeId && !placeIds.has(s.placeId) && !nationIds.has(s.placeId)) {
        fail(`force track ${t.forceId} @${s.f}: unknown place ${s.placeId}.`);
      }
    }
  }
  for (const p of movementFile.positions) {
    if (!forceIds.has(p.forceId)) fail(`position track: unknown force ${p.forceId}.`);
    let previous = -1;
    for (const k of p.keys) {
      inRange(k.f, `position track ${p.forceId}`);
      if (k.f <= previous) fail(`position track ${p.forceId}: keys are not strictly ordered at frame ${k.f}.`);
      previous = k.f;
      if (k.x < 0 || k.x > 1 || k.y < 0 || k.y > 1) {
        fail(`position track ${p.forceId} @${k.f}: simulation coordinate (${k.x}, ${k.y}) is outside the unit square.`);
      }
    }
  }
  for (const m of movementFile.movements) {
    if (!forceIds.has(m.forceId)) fail(`movement ${m.id}: unknown force ${m.forceId}.`);
    if (m.startEvent && !eventIds.has(m.startEvent)) fail(`movement ${m.id}: unknown start event ${m.startEvent}.`);
    if (m.endEvent && !eventIds.has(m.endEvent)) fail(`movement ${m.id}: unknown end event ${m.endEvent}.`);
    if (!m.destinationUnknown && m.toPlaceId === null) {
      warn(`movement ${m.id}: destination "${m.to}" has no gazetteer position; the arrow is not drawn.`);
    }
  }
  for (const c of commanders) {
    for (const fid of c.forceIds) if (!forceIds.has(fid)) fail(`commander ${c.id}: unknown force ${fid}.`);
    for (const eid of c.eventIds) if (!eventIds.has(eid)) fail(`commander ${c.id}: unknown event ${eid}.`);
    if (c.startEvent && !eventIds.has(c.startEvent)) fail(`commander ${c.id}: unknown start event ${c.startEvent}.`);
    if (c.endEvent && !eventIds.has(c.endEvent)) fail(`commander ${c.id}: unknown end event ${c.endEvent}.`);
  }
  for (const c of combatants) {
    if (c.firstEvent && !eventIds.has(c.firstEvent)) fail(`combatant ${c.id}: unknown first event ${c.firstEvent}.`);
    if (c.lastEvent && !eventIds.has(c.lastEvent)) fail(`combatant ${c.id}: unknown last event ${c.lastEvent}.`);
  }
  for (const t of territories) {
    if (!theatreIds.has(t.theatreId)) fail(`territory ${t.id}: unknown theatre ${t.theatreId}.`);
    if (t.changeEventId && !eventIds.has(t.changeEventId)) fail(`territory ${t.id}: unknown event ${t.changeEventId}.`);
  }
  for (const c of casualtyFile.records) {
    if (c.eventId && !eventIds.has(c.eventId)) fail(`casualty ${c.id}: unknown event ${c.eventId}.`);
    if (c.forceId && !forceIds.has(c.forceId)) fail(`casualty ${c.id}: unknown force ${c.forceId}.`);
  }
  for (const f of factions) {
    for (const fid of f.forceIds) if (!forceIds.has(fid)) fail(`faction ${f.id}: unknown force ${fid}.`);
    if (f.nationId && !nationIds.has(f.nationId)) fail(`faction ${f.id}: unknown nation ${f.nationId}.`);
  }

  /* -- timeline ---------------------------------------------------- */

  if (timeline.frameCount !== frameCount) fail('timeline.index.json disagrees with the manifest frame count.');
  for (const [name, column] of Object.entries({
    date: timeline.date,
    phase: timeline.phase,
    stage: timeline.stage,
    confidence: timeline.confidence,
  })) {
    if (column.idx.length !== frameCount) fail(`timeline column ${name} has ${column.idx.length} entries, expected ${frameCount}.`);
    for (const i of column.idx) {
      if (i < 0 || i >= column.dict.length) fail(`timeline column ${name}: dictionary index ${i} is out of range.`);
    }
  }
  for (const [name, arr] of Object.entries({
    campaignDay: timeline.campaignDay,
    battleDay: timeline.battleDay,
    approachPct: timeline.approachPct,
  })) {
    if (arr.length !== frameCount) fail(`timeline column ${name} has ${arr.length} entries, expected ${frameCount}.`);
  }
  for (let i = 1; i < timeline.campaignDay.length; i += 1) {
    if (timeline.campaignDay[i] < timeline.campaignDay[i - 1]) {
      fail(`campaign day is not monotonic at frame ${i}.`);
    }
    if (timeline.battleDay[i] < timeline.battleDay[i - 1]) {
      fail(`battle day is not monotonic at frame ${i}.`);
    }
  }
  for (let i = 0; i < timeline.approachPct.length; i += 1) {
    const v = timeline.approachPct[i];
    if (v !== -1 && (v < 0 || v > 100)) fail(`approach percentage ${v} at frame ${i} is outside 0..100.`);
  }
  for (const f of timeline.eventFrames) inRange(f, 'timeline.eventFrames');
  for (const f of timeline.stateChangeFrames) inRange(f, 'timeline.stateChangeFrames');

  const eventFrameSet = new Set(timeline.eventFrames);
  for (const e of events) {
    if (!eventFrameSet.has(e.frame)) {
      fail(`event ${e.id} sits at frame ${e.frame}, which the timeline does not mark as an event frame.`);
    }
  }

  /* -- checkpoints and deltas -------------------------------------- */

  const expectedCheckpoints = Math.ceil(frameCount / keyIndex.interval);
  if (keyIndex.frames.length !== expectedCheckpoints) {
    fail(`expected ${expectedCheckpoints} checkpoints at interval ${keyIndex.interval}, found ${keyIndex.frames.length}.`);
  }
  for (let i = 0; i < keyIndex.frames.length; i += 1) {
    if (keyIndex.frames[i] !== i * keyIndex.interval) {
      fail(`checkpoint ${i} sits at frame ${keyIndex.frames[i]}, expected ${i * keyIndex.interval}.`);
    }
    if (!existsSync(join(DATA, keyIndex.files[i]))) fail(`checkpoint file ${keyIndex.files[i]} does not exist.`);
  }

  let previousDelta = -1;
  for (const f of deltaFile.deltaFrames) {
    if (f <= previousDelta) fail(`delta frames are not strictly ascending at ${f}.`);
    previousDelta = f;
    inRange(f, 'state deltas');
    const delta = deltaFile.deltas[String(f)];
    if (!delta) fail(`delta frame ${f} is indexed but has no payload.`);
    else if (Object.keys(delta).length === 0) fail(`delta frame ${f} carries an empty payload; it should not be indexed.`);
  }
  if (Object.keys(deltaFile.deltas).length !== deltaFile.deltaFrames.length) {
    fail('state.deltas.json: the delta index and the delta payload map are different sizes.');
  }

  // Replay the whole campaign from the checkpoints and confirm every frame
  // resolves to a state with the fields the renderer reads.
  const checkpointStates = keyIndex.files.map((file) => JSON.parse(readFileSync(join(DATA, file), 'utf8')) as FrameState);
  let cursor: FrameState | null = null;
  for (let f = 0; f < frameCount; f += 1) {
    if (f % keyIndex.interval === 0) {
      cursor = { ...checkpointStates[f / keyIndex.interval] };
    } else {
      const delta = deltaFile.deltas[String(f)];
      if (delta) cursor = { ...(cursor as FrameState), ...delta };
    }
    if (!cursor) {
      fail(`frame ${f} resolves to no state.`);
      break;
    }
    if (typeof cursor.phase !== 'string' || cursor.phase.length === 0) fail(`frame ${f} resolves to an empty phase.`);
    if (!cursor.theatres || typeof cursor.theatres !== 'object') fail(`frame ${f} resolves without theatre state.`);
  }

  // Two independent resolution paths must agree on every one of the 7,200
  // frames: sequential replay of the delta stream from frame 0, and a seek
  // that jumps to the nearest checkpoint and applies deltas forward. If they
  // diverge, scrubbing the timeline would show a different campaign from
  // playing it.
  const normalise = (s: FrameState): string => JSON.stringify({ ...s, frame: 0 });
  let sequential: FrameState = { ...checkpointStates[0] };
  let divergences = 0;
  for (let f = 0; f < frameCount; f += 1) {
    if (f > 0) {
      const delta = deltaFile.deltas[String(f)];
      if (delta) sequential = { ...sequential, ...delta };
    }
    const cpIndex = Math.floor(f / keyIndex.interval);
    let seeked: FrameState = { ...checkpointStates[cpIndex] };
    for (let g = keyIndex.frames[cpIndex] + 1; g <= f; g += 1) {
      const delta = deltaFile.deltas[String(g)];
      if (delta) seeked = { ...seeked, ...delta };
    }
    if (normalise(sequential) !== normalise(seeked)) {
      divergences += 1;
      if (divergences <= 5) fail(`frame ${f}: sequential playback and seek-from-checkpoint resolve to different states.`);
    }
  }
  if (divergences > 5) fail(`${divergences} frames in total resolve differently under playback and seeking.`);

  /* -- numerics ---------------------------------------------------- */

  assertFinite(timeline, 'timeline');
  assertFinite(events, 'events');
  assertFinite(forces, 'forces');
  assertFinite(forceTracks, 'forceTracks');
  assertFinite(movementFile, 'movement');
  assertFinite(casualtyFile, 'casualties');
  assertFinite(checkpointStates, 'checkpoints');
  assertFinite(deltaFile, 'deltas');

  for (const f of forces) {
    for (const [k, v] of Object.entries({
      initialMin: f.initialMin,
      initialMax: f.initialMax,
      initialBest: f.initialBest,
      finalStrength: f.finalStrength,
      kia: f.kia,
      wia: f.wia,
      pow: f.pow,
      mia: f.mia,
    })) {
      if (!isQuantity(v as Quantity)) fail(`force ${f.id}: ${k} is neither a finite number nor UNKNOWN.`);
      if (typeof v === 'number' && v < 0) fail(`force ${f.id}: ${k} is negative (${v}).`);
    }
  }

  /* -- casualty arithmetic ----------------------------------------- */

  const CATEGORIES = new Set(['EVENT_CASUALTY', 'COMPONENT_CASUALTY', 'AGGREGATE_CASUALTY', 'CAMPAIGN_TOTAL', 'UNKNOWN']);
  for (const c of casualtyFile.records) {
    if (!CATEGORIES.has(c.scope)) fail(`casualty ${c.id}: unrecognised scope ${c.scope}.`);
    for (const [k, v] of Object.entries({ kia: c.kia, wia: c.wia, pow: c.pow, mia: c.mia })) {
      if (!isQuantity(v as Quantity)) fail(`casualty ${c.id}: ${k} is neither a finite number nor UNKNOWN.`);
      if (typeof v === 'number' && v < 0) fail(`casualty ${c.id}: ${k} is negative.`);
    }
    const nonAdditive = c.scope !== 'EVENT_CASUALTY' && c.scope !== 'UNKNOWN';
    if (nonAdditive === c.countsTowardCampaignTotal) {
      fail(`casualty ${c.id}: scope ${c.scope} and countsTowardCampaignTotal=${c.countsTowardCampaignTotal} disagree.`);
    }
  }

  // The Step 1 markdown reconciles the campaign to 830,001 imperial dead from
  // EVENT_CASUALTY rows alone. If our aggregation does not reproduce that, the
  // double-counting guard is wrong.
  const empireKia = casualtyFile.records
    .filter((c) => c.countsTowardCampaignTotal && c.faction === 'Eastern Empire')
    .map((c) => c.kia)
    .filter((q): q is number => typeof q === 'number')
    .reduce((a, b) => a + b, 0);
  if (empireKia !== 830001) {
    fail(`campaign imperial KIA aggregates to ${empireKia}; the Step 1 reconciliation is 830,001. Check the aggregate exclusions.`);
  }

  /* -- hierarchy --------------------------------------------------- */

  for (const f of forces) {
    if (f.parentId && !f.countedInParent) {
      fail(`force ${f.id} has a parent but is not marked as counted inside it; totals would double count.`);
    }
    if (!f.parentId && f.countedInParent) {
      fail(`force ${f.id} has no parent but is marked as counted inside one.`);
    }
  }
  const roots = forces.filter((f) => !f.parentId);
  if (roots.length === 0) fail('the force hierarchy has no root.');

  /* -- geography --------------------------------------------------- */

  for (const p of places) {
    if (p.placement === 'ABSTRACT') {
      if (p.x !== null || p.y !== null) fail(`place ${p.id} is ABSTRACT but carries a coordinate.`);
    } else {
      if (p.x === null || p.y === null) fail(`place ${p.id} is ${p.placement} but carries no coordinate.`);
      else if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        fail(`place ${p.id}: coordinate (${p.x}, ${p.y}) is outside the unit square.`);
      }
    }
    if (!p.basis) fail(`place ${p.id} has no stated basis; every placement must say how it was arrived at.`);
  }
  for (const n of nations) {
    if (n.x === null || n.y === null) continue;
    if (n.x < 0 || n.x > 1 || n.y < 0 || n.y > 1) fail(`nation ${n.id}: coordinate outside the unit square.`);
  }
  for (const t of theatres) {
    if (t.zone) {
      if (t.zone.length < 3) fail(`theatre ${t.id}: zone has fewer than three vertices.`);
      for (const [x, y] of t.zone) {
        if (x < 0 || x > 1 || y < 0 || y > 1) fail(`theatre ${t.id}: zone vertex outside the unit square.`);
      }
    }
  }

  /* -- report ------------------------------------------------------ */

  console.log('Validating the runtime dataset.\n');
  console.log(`  frames            ${frameCount}`);
  console.log(`  checkpoints       ${keyIndex.frames.length}`);
  console.log(`  delta frames      ${deltaFile.deltaFrames.length}`);
  console.log(`  events            ${events.length}`);
  console.log(`  battles           ${battles.length}`);
  console.log(`  forces            ${forces.length} (${roots.length} root, ${forces.length - roots.length} counted inside a parent)`);
  console.log(`  casualty records  ${casualtyFile.records.length}`);
  console.log(`  imperial KIA      ${empireKia.toLocaleString('en-GB')} (EVENT_CASUALTY rows only)`);
  console.log(`  places            ${places.length}   nations ${nations.length}   theatres ${theatres.length}`);

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (errors.length) {
    console.error(`\n${errors.length} error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error('\nDataset validation failed.\n');
    process.exit(1);
  }

  console.log('\nDataset validation passed.\n');
}

main();
