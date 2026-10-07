/**
 * Build-time data compiler.
 *
 *   data-source/campaign/*.json   (events with effects, forces, movements, casualties, ...)
 *   data-source/gazetteer.source.json, territories.geo.source.json, territory-control.source.json,
 *   data-source/characters.source.json, terminology.source.json
 *        |
 *        v   resolve places -> order events -> apply effects frame by frame -> encode
 *        |
 *   public/data/*.json   (checkpoints + sparse deltas, tracks, reference tables)
 *
 * Rules:
 *   1. Nothing is invented. A value the source does not establish stays UNKNOWN
 *      all the way to the screen. Interpolation is the renderer's job and is
 *      always labelled; the compiler only records what the source states.
 *   2. Every event is placed by (battle day, simulation time). Frames are derived,
 *      never authored, so re-timing an event re-times everything that hangs off it.
 *   3. Output is deterministic: the same sources produce byte-identical JSON.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  Ambiguity,
  Battle,
  BattleType,
  CampaignStage,
  CampaignTotals,
  CasualtyRecord,
  Character,
  Combatant,
  Commander,
  Confidence,
  Contradiction,
  Faction,
  Force,
  ForcePositionTrack,
  ForceSnapshot,
  ForceTrack,
  FrameState,
  GeoMultiPolygon,
  Manifest,
  Movement,
  Nation,
  NationFlagManifest,
  Place,
  PlacementGrade,
  PositionKey,
  Provenance,
  Quantity,
  RouteConfidence,
  SideCasualties,
  SizeStatus,
  TermEntry,
  Territory,
  TerritoryChange,
  TerritoryControlSegment,
  Theatre,
  TheatreFrameState,
  TimelineIndex,
  TimePrecision,
  TimelineGap,
  WarEvent,
} from '../src/types/dataset';
import type {
  BattleSrc,
  CasualtySrc,
  EventSrc,
  ForceEffect,
  ForceSrc,
  MovementSrc,
  RevisionSrc,
  StageSrc,
  TransitKeySrc,
} from './lib/source-types';
import { encodeColumn, sameValue, UNKNOWN } from './lib/normalise';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC = join(ROOT, 'data-source');
const CAMPAIGN = join(SRC, 'campaign');
// COMPILE_OUT lets a reviewer compile into a scratch directory without touching public/data.
const OUT_DIR = process.env.COMPILE_OUT ?? join(ROOT, 'public', 'data');

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const readOptional = <T>(path: string, fallback: T): T => (existsSync(path) ? read<T>(path) : fallback);
const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

interface GazetteerNation { id: string; name: string; category: string; x: number; y: number; placement: PlacementGrade; hasFlag?: boolean }
interface GazetteerPlace { id: string; name: string; theatre: string | null; x?: number; y?: number; placement: PlacementGrade; altitude?: 'AIR' | 'SUBSURFACE'; basis: string }
interface GazetteerSource {
  about: { definition: string; warning: string };
  nations: GazetteerNation[];
  places: GazetteerPlace[];
  aliases: Record<string, string>;
  transitAxis: { from: string; to: string };
}
interface GeoSource {
  about: { sourceImage: string; sourceSha256: string };
  territories: {
    id: string; name: string; display: string; nationId: string | null;
    identification: Territory['identification']; boundarySource: string; boundaryGrade: 'MEASURED';
    areaFraction: number; labelPoint: [number, number]; notes: string; geometry: GeoMultiPolygon;
  }[];
  operationalAreas: { theatreId: string; geometry: GeoMultiPolygon }[];
}
interface ControlSource {
  territories: Record<string, { fromEvent: string | null; controller: string; status: TerritoryControlSegment['status']; role: TerritoryControlSegment['role']; provenance: Provenance; basis: string }[]>;
  defaultForUnlisted: { status: TerritoryControlSegment['status']; role: TerritoryControlSegment['role']; provenance: Provenance; basis: string };
}
interface CharacterSrc {
  id: string; name: string; aliases: string[]; japanese: string | null; faction: string; role: string;
  photocard: { file: string; sourceType: string | null; sourceUrl: string | null; attribution: string | null; licence?: string | null } | null;
}

const revision = read<RevisionSrc>(join(CAMPAIGN, 'revision.json'));
/** Events live in one file per campaign phase; files are read in name order. */
const EVENT_FILES = readdirSync(join(CAMPAIGN, 'events')).filter((f) => f.endsWith('.json')).sort();
const eventSrc = EVENT_FILES.flatMap((f) => read<EventSrc[]>(join(CAMPAIGN, 'events', f)));
const forceSrc = read<ForceSrc[]>(join(CAMPAIGN, 'forces.json'));
const transitSrc = read<TransitKeySrc[]>(join(CAMPAIGN, 'transit.json'));
const movementSrc = read<MovementSrc[]>(join(CAMPAIGN, 'movements.json'));
const casualtySrc = read<CasualtySrc[]>(join(CAMPAIGN, 'casualties.json'));
const commanderSrc = read<Omit<Commander, 'characterId' | 'startFrame' | 'endFrame' | 'forceIds' | 'eventIds' | 'theatreIds'>[]>(join(CAMPAIGN, 'commanders.json'));
const combatantSrc = read<Omit<Combatant, 'characterId' | 'firstFrame' | 'lastFrame'>[]>(join(CAMPAIGN, 'combatants.json'));
const territoryChangeSrc = read<Omit<TerritoryChange, 'changeFrame'>[]>(join(CAMPAIGN, 'territory-changes.json'));
const stageSrc = read<StageSrc[]>(join(CAMPAIGN, 'stages.json'));
const referenceSrc = read<{ contradictions: Contradiction[]; ambiguities: (Ambiguity & { possibleOrder?: string; events?: string })[] }>(join(CAMPAIGN, 'reference.json'));
const battleSrc = readOptional<BattleSrc[]>(join(CAMPAIGN, 'battles.json'), []);

const gazetteer = read<GazetteerSource>(join(SRC, 'gazetteer.source.json'));
const geo = read<GeoSource>(join(SRC, 'territories.geo.source.json'));
const controlSrc = read<ControlSource>(join(SRC, 'territory-control.source.json'));
const characterSrc = read<{ characters: CharacterSrc[] }>(join(SRC, 'characters.source.json')).characters;
const terminologySrc = read<{ terms: (TermEntry & { conflicts?: string | null })[] }>(join(SRC, 'terminology.source.json')).terms;

/* ------------------------------------------------------------------ */
/* Clock                                                               */
/* ------------------------------------------------------------------ */

const { framesPerDay: FPD, minutesPerFrame: MPF, firstDay: FIRST_DAY, lastDay: LAST_DAY } = revision.clock;
const FRAME_COUNT = (LAST_DAY - FIRST_DAY + 1) * FPD;
const CHECKPOINT_INTERVAL = FPD;

function frameOf(day: number, time: string, where: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) throw new Error(`${where}: time "${time}" is not HH:MM.`);
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  if (minutes % MPF !== 0) throw new Error(`${where}: ${time} is not on the ${MPF}-minute grid.`);
  const frame = (day - FIRST_DAY) * FPD + minutes / MPF;
  if (frame < 0 || frame >= FRAME_COUNT) throw new Error(`${where}: D${day} ${time} falls outside the campaign clock.`);
  return frame;
}

/** The artificial calendar: day FIRST_DAY is calendarStart. Never canon. */
const [cd, cm, cy] = revision.clock.calendarStart.split('/').map(Number);
function calendarDate(dayIndex: number): string {
  const d = new Date(Date.UTC(cy - 7000, cm - 1, cd + dayIndex)); // shift into a range Date handles; year restored below
  const year = d.getUTCFullYear() + 7000;
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${year}`;
}

const dayLabel = (day: number) => (day < 0 ? `D-${String(-day).padStart(2, '0')}` : `D+${String(day).padStart(2, '0')}`);

/* ------------------------------------------------------------------ */
/* Geometry & places                                                   */
/* ------------------------------------------------------------------ */

function pointInRing(x: number, y: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const pointInMulti = (x: number, y: number, g: GeoMultiPolygon) => g.coordinates.some((poly) => pointInRing(x, y, poly[0]));
function boundsOf(g: GeoMultiPolygon): [number, number, number, number] {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const poly of g.coordinates) for (const [x, y] of poly[0]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [round(x0), round(y0), round(x1), round(y1)];
}
function territoryAt(x: number | null | undefined, y: number | null | undefined): string | null {
  if (x == null || y == null) return null;
  return geo.territories.find((t) => pointInMulti(x, y, t.geometry))?.id ?? null;
}

const placeById = new Map(gazetteer.places.map((p) => [p.id, p]));
const nationById = new Map(gazetteer.nations.map((n) => [n.id, n]));
function coordsOf(id: string | null | undefined): { x: number; y: number; placement: PlacementGrade } | null {
  if (!id) return null;
  const p = placeById.get(id);
  if (p) return p.x === undefined || p.y === undefined || p.placement === 'ABSTRACT' ? null : { x: p.x, y: p.y!, placement: p.placement };
  const n = nationById.get(id);
  if (n) return { x: n.x, y: n.y, placement: n.placement };
  throw new Error(`Unknown place id "${id}".`);
}
function checkPlace(id: string | null | undefined, where: string): void {
  if (id && !placeById.has(id) && !nationById.has(id)) throw new Error(`${where}: unknown place id "${id}".`);
}
function placeName(id: string | null | undefined): string {
  if (!id) return '';
  return placeById.get(id)?.name ?? nationById.get(id)?.name ?? id;
}

/* ------------------------------------------------------------------ */
/* Factions & theatres                                                 */
/* ------------------------------------------------------------------ */

const FACTION_DEFS: { id: string; colorKey: Faction['colorKey']; nationId: string | null; major: boolean }[] = [
  { id: 'Eastern Empire', colorKey: 'empire', nationId: 'nasca-namrium-ulmeria', major: true },
  { id: 'Jura-Tempest Federation', colorKey: 'tempest', nationId: 'jura-tempest-federation', major: true },
  { id: 'Armed Nation of Dwargon', colorKey: 'dwargon', nationId: 'dwargon', major: true },
  { id: 'Beast Kingdom of Eurazania', colorKey: 'neutral', nationId: 'eurazania', major: false },
  { id: 'Western Nations', colorKey: 'neutral', nationId: null, major: false },
];
const FACTION_ALIAS: Record<string, string> = {
  'Beast Kingdom Eurazania': 'Beast Kingdom of Eurazania',
  'Jura Tempest Federation': 'Jura-Tempest Federation',
};
const faction = (name: string) => FACTION_ALIAS[name] ?? name;

const THEATRE_DEFS = [
  { id: 'TH-DWG', code: 'DWG', name: 'Dwargon Gate Front', region: 'Great Jura Forest', anchorPlace: 'dwargon-gate-front', colorKey: 'tempest' },
  { id: 'TH-LAB', code: 'LAB', name: "Ramiris's Labyrinth Front", region: "Ramiris's Labyrinth", anchorPlace: 'ramiris-labyrinth', colorKey: 'tempest' },
  { id: 'TH-CAP', code: 'CAP', name: 'Imperial Capital', region: 'Eastern Empire', anchorPlace: 'imperial-capital', colorKey: 'empire' },
  { id: 'TH-DWE', code: 'DWE', name: 'Dwargon Eastern Metropolis', region: 'Armed Nation of Dwargon', anchorPlace: 'dwargon-eastern-metropolis', colorKey: 'dwargon' },
  { id: 'TH-DRG', code: 'DRG', name: 'Dragon Theatre', region: 'Great Jura Forest (airspace)', anchorPlace: 'jura-airspace', colorKey: 'neutral' },
  { id: 'TH-DIP', code: 'DIP', name: 'Settlement', region: 'Inter-state', anchorPlace: 'settlement-table', colorKey: 'neutral' },
];

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const TIME_PRECISION: Record<string, TimePrecision> = {
  EXPLICIT_RELATIVE: 'CANONICAL_RELATIVE',
  DAY_LEVEL_CANON: 'DAY_LEVEL',
  SEQUENTIAL_CANON: 'SEQUENTIAL',
  SIMULATION_RECONSTRUCTED: 'RECONSTRUCTED',
};

const ids = new Set<string>();
for (const e of eventSrc) {
  if (ids.has(e.id)) throw new Error(`Duplicate event id ${e.id}.`);
  ids.add(e.id);
}

const ordered = eventSrc
  .map((e, sourceIndex) => ({ e, sourceIndex, frame: frameOf(e.day, e.time, `Event ${e.id}`) }))
  .sort((a, b) => a.frame - b.frame || a.sourceIndex - b.sourceIndex);

/* -- characters, used to link events by name ----------------------- */

const characterNames = characterSrc.map((c) => ({
  id: c.id,
  patterns: [c.name, ...c.aliases]
    .filter((n) => n.length >= 3 && !/^(the|his|your|boss|master|papa)\b/i.test(n))
    .map((n) => new RegExp(`(^|[^A-Za-z])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`)),
}));
function charactersIn(...texts: string[]): string[] {
  const hay = texts.join(' ‖ ');
  return characterNames.filter((c) => c.patterns.some((p) => p.test(hay))).map((c) => c.id);
}

/* -- battles ------------------------------------------------------- */

/** An event's own toll, when the source event omits it: summed from its EVENT_CASUALTY rows only. */
function eventCasualty(eventId: string, k: 'kia' | 'pow'): Quantity {
  const rows = casualtySrc.filter((c) => c.eventId === eventId && c.scope === 'EVENT_CASUALTY');
  const nums = rows.map((c) => c[k]).filter((q): q is number => typeof q === 'number');
  return nums.length ? nums.reduce((a, b) => a + b, 0) : UNKNOWN;
}

const battleIdByName = new Map<string, string>();
for (const { e } of ordered) {
  if (e.battle && !battleIdByName.has(e.battle)) battleIdByName.set(e.battle, `BTL-${String(battleIdByName.size + 1).padStart(3, '0')}`);
}

const events: WarEvent[] = ordered.map(({ e, frame }, i) => {
  checkPlace(e.location, `Event ${e.id}.location`);
  const prev = ordered[i - 1]?.e.id ?? null;
  const next = ordered[i + 1]?.e.id ?? null;
  const provenance: Provenance = e.provenance ?? 'UNRESOLVED';
  return {
    id: e.id,
    prevId: prev,
    nextId: next,
    frame,
    battleDay: e.day,
    warDay: dayLabel(e.day),
    simulationTime: e.time,
    timePrecision: e.timePrecision ?? TIME_PRECISION[e.timeBasis ?? ''] ?? 'RECONSTRUCTED',
    canonicalTime: e.canonicalTime && e.canonicalTime !== '-' ? e.canonicalTime : '',
    phase: '',
    theatreId: e.theatreId,
    theatre: THEATRE_DEFS.find((t) => t.id === e.theatreId)?.name ?? e.theatreId,
    battleId: e.battle ? battleIdByName.get(e.battle)! : null,
    battle: e.battle,
    location: e.locationText || placeName(e.location),
    placeId: e.location,
    actor: e.actor,
    actorFaction: faction(e.actorFaction),
    opponent: e.opponent,
    opponentFaction: faction(e.opponentFaction),
    // Explicit links from the source, plus any character the event's own text names.
    characterIds: [...new Set([...(e.characters ?? []), ...charactersIn(e.actor, e.opponent, e.title, e.immediateResult)])],
    forceIds: e.forces ?? Object.keys(e.effects.forces),
    type: e.type,
    title: e.title,
    immediateResult: e.immediateResult,
    operationalResult: e.operationalResult,
    strategicResult: e.strategicResult,
    tempestStrength: e.strength.tempest,
    empireStrength: e.strength.empire,
    strengthNote: e.strength.note ?? '',
    kia: e.kia ?? eventCasualty(e.id, 'kia'),
    pow: e.pow ?? eventCasualty(e.id, 'pow'),
    significance: e.significance,
    provenance,
    confidence: e.confidence.overall,
    timeConfidence: e.confidence.time,
    numericalConfidence: e.confidence.numbers,
    sourceRefs: e.sources,
    evidence: e.evidence,
    reconstructionNote: e.reconstructionNote ?? '',
    notes: e.notes,
    auditStatus: e.audit.status,
    auditChanges: e.audit.changes,
    turningPoint: Boolean(e.turningPoint),
    turningPointRank: e.turningPoint?.rank ?? null,
    turningPointSummary: e.turningPoint?.summary ?? null,
  };
});
const eventById = new Map(events.map((e) => [e.id, e]));
const frameOfEvent = (id: string | null | undefined): number | null => (id && eventById.has(id) ? eventById.get(id)!.frame : null);
const requireEvent = (id: string | null | undefined, where: string) => {
  if (id && !eventById.has(id)) throw new Error(`${where}: unknown event ${id}.`);
};

/* ------------------------------------------------------------------ */
/* Forces                                                              */
/* ------------------------------------------------------------------ */

const forces: Force[] = forceSrc.map((f) => ({
  id: f.id,
  faction: faction(f.faction),
  army: f.army,
  formation: f.formation,
  displayName: f.displayName ?? f.formation,
  parentId: f.parentId && f.parentId !== '-' ? f.parentId : null,
  childIds: [],
  depth: 0,
  commander: f.commander,
  commanderIds: f.commanderIds ?? charactersIn(f.commander),
  role: f.role,
  unitType: f.unitType ?? '',
  initialStrengthRaw: f.initialStrengthRaw,
  initialBest: f.initialBest,
  sizeStatus: f.sizeStatus ?? (f.initialBest === UNKNOWN ? 'UNKNOWN' : f.strengthBasis === 'CANONICAL' ? 'EXPLICIT' : 'DERIVED'),
  sizeEvidence: f.sizeEvidence ?? f.initialStrengthRaw,
  finalStrength: f.finalStrength,
  finalStatus: f.finalStatus,
  source: f.source,
  sourceRefs: f.sourceRefs ?? [],
  confidence: f.confidence,
  hierarchyProvenance: f.hierarchyProvenance ?? 'UNRESOLVED',
  notes: f.notes,
  countedInParent: false,
  firstFrame: -1,
  lastFrame: -1,
}));
const forceById = new Map(forces.map((f) => [f.id, f]));
for (const f of forces) {
  if (!f.parentId) continue;
  const parent = forceById.get(f.parentId);
  if (!parent) throw new Error(`Force ${f.id} names parent ${f.parentId}, which is not in the register.`);
  parent.childIds.push(f.id);
  f.countedInParent = true;
}
for (const f of forces) {
  let depth = 0;
  let cursor: Force | undefined = f;
  while (cursor?.parentId) {
    cursor = forceById.get(cursor.parentId);
    depth += 1;
    if (depth > 16) throw new Error(`Cycle or excessive depth in the force hierarchy at ${f.id}.`);
  }
  f.depth = depth;
}

/* ------------------------------------------------------------------ */
/* Movements                                                           */
/* ------------------------------------------------------------------ */

const ROUTE_FROM_BASIS: Record<string, RouteConfidence> = {
  EXPLICIT_RELATIVE: 'RECONSTRUCTED',
  DAY_LEVEL_CANON: 'RECONSTRUCTED',
  SEQUENTIAL_CANON: 'RECONSTRUCTED',
  SIMULATION_RECONSTRUCTED: 'SCHEMATIC',
};
const movements: Movement[] = movementSrc.map((m) => {
  requireEvent(m.startEvent, `Movement ${m.id}.startEvent`);
  requireEvent(m.endEvent, `Movement ${m.id}.endEvent`);
  checkPlace(m.fromPlace, `Movement ${m.id}.fromPlace`);
  checkPlace(m.toPlace, `Movement ${m.id}.toPlace`);
  if (!forceById.has(m.forceId)) throw new Error(`Movement ${m.id} references unknown force ${m.forceId}.`);
  // An arrival after the clock: draw the march only as far as the recorded
  // pace carries it by the last frame, so it never reads as arriving.
  let reach = 1;
  let endFrame = frameOfEvent(m.endEvent);
  const afterClock = m.arrival === 'AFTER_CLOCK';
  if (afterClock) {
    if (!m.pace) throw new Error(`Movement ${m.id}: an AFTER_CLOCK arrival needs a recorded pace.`);
    const dist = (p: string | null, q: string | null) => {
      const a = coordsOf(p);
      const b = coordsOf(q);
      if (!a || !b) throw new Error(`Movement ${m.id}: pace places need positions.`);
      return Math.hypot(b.x - a.x, b.y - a.y);
    };
    const paceFrames = (frameOfEvent(m.pace.endEvent) ?? 0) - (frameOfEvent(m.pace.startEvent) ?? 0);
    if (paceFrames <= 0) throw new Error(`Movement ${m.id}: pace interval must be positive.`);
    const perFrame = dist(m.pace.fromPlace, m.pace.toPlace) / paceFrames;
    endFrame = FRAME_COUNT - 1;
    reach = Math.min(1, (perFrame * (endFrame - (frameOfEvent(m.startEvent) ?? endFrame))) / dist(m.fromPlace, m.toPlace));
  }
  return {
    id: m.id,
    forceId: m.forceId,
    from: m.from,
    to: m.to,
    fromPlaceId: m.fromPlace,
    toPlaceId: m.destinationUnknown ? null : m.toPlace,
    startEvent: m.startEvent,
    endEvent: m.endEvent,
    startFrame: frameOfEvent(m.startEvent),
    endFrame,
    type: m.type,
    route: m.destinationUnknown ? 'UNKNOWN' : m.route ?? ROUTE_FROM_BASIS[m.basis] ?? 'SCHEMATIC',
    basis: m.basis,
    confidence: m.confidence,
    strengthAtStart: UNKNOWN,
    strengthAtEnd: UNKNOWN,
    notes: m.notes,
    destinationUnknown: m.destinationUnknown,
    reach: Math.round(reach * 1e4) / 1e4,
    arrivesAfterClock: afterClock,
  };
});

/* ------------------------------------------------------------------ */
/* Replay: effects -> frame states, force tracks, position keys        */
/* ------------------------------------------------------------------ */

const effectsByFrame = new Map<number, EventSrc[]>();
for (const { e, frame } of ordered) effectsByFrame.set(frame, [...(effectsByFrame.get(frame) ?? []), e]);

interface ForceState {
  strength: Quantity; effective: Quantity; sizeStatus: SizeStatus;
  kia: Quantity; wia: Quantity; pow: Quantity; mia: Quantity;
  status: string; movement: string; direction: string; confidence: Confidence;
  location: string | null; locationText: string;
}
const forceState = new Map<string, ForceState>();
const tracks = new Map<string, ForceSnapshot[]>();
const locationChanges = new Map<string, { f: number; place: string | null; eventId: string }[]>();

function applyForceEffect(forceId: string, effect: ForceEffect, frame: number, eventId: string): void {
  const force = forceById.get(forceId);
  if (!force) throw new Error(`Event ${eventId} has an effect on unknown force ${forceId}.`);
  if (effect.location !== undefined) checkPlace(effect.location, `Event ${eventId} effect on ${forceId}`);
  const prev = forceState.get(forceId);
  const next: ForceState = {
    strength: effect.strength ?? prev?.strength ?? force.initialBest,
    effective: effect.effective ?? prev?.effective ?? UNKNOWN,
    sizeStatus: effect.sizeStatus ?? prev?.sizeStatus ?? force.sizeStatus,
    kia: effect.kia ?? prev?.kia ?? UNKNOWN,
    wia: effect.wia ?? prev?.wia ?? UNKNOWN,
    pow: effect.pow ?? prev?.pow ?? UNKNOWN,
    mia: effect.mia ?? prev?.mia ?? UNKNOWN,
    status: effect.status ?? prev?.status ?? '',
    movement: effect.movement ?? prev?.movement ?? '',
    direction: effect.direction ?? prev?.direction ?? '',
    confidence: effect.confidence ?? prev?.confidence ?? force.confidence,
    location: effect.location !== undefined ? effect.location : prev?.location ?? null,
    locationText: effect.locationText ?? (effect.location !== undefined ? placeName(effect.location) : prev?.locationText ?? ''),
  };
  if (!prev || effect.location !== undefined) {
    const list = locationChanges.get(forceId) ?? [];
    const last = list[list.length - 1];
    if (!last || last.place !== next.location) list.push({ f: frame, place: next.location, eventId });
    locationChanges.set(forceId, list);
  }
  forceState.set(forceId, next);
  const list = tracks.get(forceId) ?? [];
  list.push({
    f: frame,
    strength: next.strength, effective: next.effective, sizeStatus: next.sizeStatus,
    kia: next.kia, wia: next.wia, pow: next.pow, mia: next.mia,
    status: next.status, movement: next.movement, direction: next.direction,
    locationText: next.locationText, placeId: next.location, transitPct: null,
    eventId, confidence: next.confidence,
  });
  tracks.set(forceId, list);
  if (force.firstFrame === -1) force.firstFrame = frame;
  force.lastFrame = FRAME_COUNT - 1;
}

/* -- casualty records ---------------------------------------------- */

const NON_ADDITIVE = new Set(['AGGREGATE_CASUALTY', 'COMPONENT_CASUALTY', 'CAMPAIGN_TOTAL']);
const casualties: CasualtyRecord[] = casualtySrc.map((c) => {
  requireEvent(c.eventId, `Casualty ${c.id}.eventId`);
  return {
    id: c.id,
    eventId: c.eventId,
    frame: frameOfEvent(c.eventId),
    faction: faction(c.faction),
    forceId: c.forceId && forceById.has(c.forceId) ? c.forceId : null,
    formation: c.formation,
    cause: c.cause,
    kia: c.kia, wia: c.wia, pow: c.pow, mia: c.mia,
    revived: c.revived ?? UNKNOWN,
    scope: c.scope,
    aggregateOf: c.aggregateOf,
    basis: c.basis,
    confidence: c.confidence,
    sourceRefs: c.sourceRefs ?? (c.source ? [{ volume: c.source, chapter: null, locator: null }] : []),
    evidence: c.evidence,
    notes: c.notes,
    countsTowardCampaignTotal: !NON_ADDITIVE.has(c.scope) && c.scope !== 'UNKNOWN',
  };
});
const additive = casualties.filter((c) => c.countsTowardCampaignTotal && c.frame !== null);
const SIDE_OF: Record<string, 'tempest' | 'empire' | null> = {
  'Eastern Empire': 'empire',
  'Jura-Tempest Federation': 'tempest',
};
/** A field is UNKNOWN until some record states a number for it; never assumed zero. */
const statedFields = { tempest: new Set<string>(), empire: new Set<string>() };
for (const c of additive) {
  const side = SIDE_OF[c.faction];
  if (!side) continue;
  for (const k of ['kia', 'wia', 'pow', 'mia', 'revived'] as const) if (typeof c[k] === 'number') statedFields[side].add(k);
}

function casualtiesAt(frame: number): FrameState['casualties'] {
  const sum = (side: 'tempest' | 'empire'): SideCasualties => {
    const out: Record<string, Quantity> = {};
    for (const k of ['kia', 'wia', 'pow', 'mia', 'revived'] as const) {
      if (!statedFields[side].has(k)) { out[k] = UNKNOWN; continue; }
      out[k] = additive
        .filter((c) => SIDE_OF[c.faction] === side && c.frame! <= frame)
        .reduce((n, c) => n + (typeof c[k] === 'number' ? (c[k] as number) : 0), 0);
    }
    return out as unknown as SideCasualties;
  };
  return { tempest: sum('tempest'), empire: sum('empire') };
}

/* -- frame replay --------------------------------------------------- */

const theatreState: Record<string, TheatreFrameState> = {};
for (const def of THEATRE_DEFS) {
  theatreState[def.id] = { status: 'INACTIVE', frontline: '', battleStatus: null, control: null, ...revision.initial.theatres[def.id] };
}
const campaign = {
  phase: '', stage: '',
  tempestTotal: UNKNOWN as Quantity, tempestEffective: UNKNOWN as Quantity,
  empireTotal: UNKNOWN as Quantity, empireEffective: UNKNOWN as Quantity,
  activeCommanders: '', majorCombatants: '',
  ...revision.initial.campaign,
};

const DELTA_FIELDS = ['phase', 'stage', 'strength', 'casualties', 'theatres', 'activeCommanders', 'majorCombatants', 'eventIds'] as const satisfies readonly (keyof FrameState)[];

const checkpoints: Record<string, FrameState> = {};
const checkpointFrames: number[] = [];
const deltas: Record<string, Partial<FrameState>> = {};
const deltaFrames: number[] = [];
const dates: string[] = [];
const battleDays: number[] = [];
const phases: string[] = [];
const stages: string[] = [];
const eventFrames: number[] = [];
const stateChangeFrames: number[] = [];
let previous: FrameState | null = null;
let firstContactFrame = -1;

const phaseMarks = new Map<number, { phase?: string; stage?: string }>();
for (const m of revision.phaseMarks) phaseMarks.set(frameOf(m.day, m.time, 'Phase mark'), { ...phaseMarks.get(frameOf(m.day, m.time, 'Phase mark')), ...m });

for (let f = 0; f < FRAME_COUNT; f += 1) {
  const mark = phaseMarks.get(f);
  if (mark?.phase) campaign.phase = mark.phase;
  if (mark?.stage) campaign.stage = mark.stage;
  const here = effectsByFrame.get(f) ?? [];
  for (const e of here) {
    for (const [fid, eff] of Object.entries(e.effects.forces)) applyForceEffect(fid, eff, f, e.id);
    for (const [tid, eff] of Object.entries(e.effects.theatres)) {
      if (!theatreState[tid]) throw new Error(`Event ${e.id} has an effect on unknown theatre ${tid}.`);
      theatreState[tid] = { ...theatreState[tid], ...eff };
    }
    Object.assign(campaign, e.effects.campaign);
    eventById.get(e.id)!.phase = campaign.phase;
  }
  if (here.length) eventFrames.push(f);

  const state: FrameState = {
    frame: f,
    phase: campaign.phase,
    stage: campaign.stage,
    strength: {
      tempest: { total: campaign.tempestTotal, effective: campaign.tempestEffective },
      empire: { total: campaign.empireTotal, effective: campaign.empireEffective },
    },
    casualties: casualtiesAt(f),
    theatres: structuredClone(theatreState),
    activeCommanders: campaign.activeCommanders,
    majorCombatants: campaign.majorCombatants,
    eventIds: here.map((e) => e.id),
  };
  if (firstContactFrame === -1 && state.phase === 'FIRST_CONTACT') firstContactFrame = f;

  dates.push(calendarDate(Math.floor(f / FPD)));
  battleDays.push(Math.floor(f / FPD) + FIRST_DAY);
  phases.push(state.phase);
  stages.push(state.stage);

  if (f % CHECKPOINT_INTERVAL === 0) {
    checkpoints[String(f)] = state;
    checkpointFrames.push(f);
  }
  if (previous) {
    const delta: Record<string, unknown> = {};
    for (const k of DELTA_FIELDS) if (!sameValue(previous[k], state[k])) delta[k] = state[k];
    if (Object.keys(delta).length) {
      deltas[String(f)] = delta as Partial<FrameState>;
      deltaFrames.push(f);
      if (Object.keys(delta).some((k) => k !== 'eventIds')) stateChangeFrames.push(f);
    }
  }
  previous = state;
}
if (firstContactFrame === -1) throw new Error('No event sets the FIRST_CONTACT phase.');

/* -- position keys --------------------------------------------------- */

/** Pace of a relocation with no recorded duration: about a fifth of the atlas per simulated day. */
const SCHEMATIC_SPEED = 0.0015;

const transitAxis = { from: coordsOf(gazetteer.transitAxis.from)!, to: coordsOf(gazetteer.transitAxis.to)! };
const positionTracks: ForcePositionTrack[] = [];
for (const force of forces) {
  const changes = locationChanges.get(force.id) ?? [];
  const transit = transitSrc
    .filter((t) => t.forceId === force.id)
    .map((t) => ({ f: frameOf(t.day, t.time, `Transit key ${force.id}`), pct: t.pct }));
  if (changes.length === 0) continue;

  type Raw = { f: number; x: number; y: number; placeId: string | null; placement: PlacementGrade; route: RouteConfidence } | { f: number; off: true };
  const raw: Raw[] = [];
  for (const c of changes) {
    const xy = coordsOf(c.place);
    if (!xy) { raw.push({ f: c.f, off: true }); continue; }
    const mv = movements.find((m) => m.forceId === force.id && m.endFrame === c.f && m.toPlaceId === c.place)
      ?? movements.find((m) => m.forceId === force.id && m.endFrame === c.f);
    raw.push({ f: c.f, x: xy.x, y: xy.y, placeId: c.place, placement: xy.placement, route: mv?.route ?? 'SCHEMATIC' });
  }
  for (const t of transit) {
    const p = Math.min(100, Math.max(0, t.pct)) / 100;
    raw.push({
      f: t.f,
      x: transitAxis.from.x + (transitAxis.to.x - transitAxis.from.x) * p,
      y: transitAxis.from.y + (transitAxis.to.y - transitAxis.from.y) * p,
      placeId: null, placement: 'RECONSTRUCTED', route: 'RECONSTRUCTED',
    });
  }
  // Open-ended marches: at the start place on departure, part of the way by the last frame.
  for (const m of movements.filter((x) => x.forceId === force.id && x.arrivesAfterClock && x.startFrame !== null)) {
    const a = coordsOf(m.fromPlaceId)!;
    const b = coordsOf(m.toPlaceId)!;
    raw.push({ f: m.startFrame!, x: a.x, y: a.y, placeId: m.fromPlaceId, placement: a.placement, route: m.route });
    raw.push({ f: FRAME_COUNT - 1, x: a.x + (b.x - a.x) * m.reach, y: a.y + (b.y - a.y) * m.reach, placeId: null, placement: 'RECONSTRUCTED', route: m.route });
  }
  raw.sort((a, b) => a.f - b.f);

  const keys: PositionKey[] = [];
  const offMap: [number, number][] = [];
  let offStart: number | null = null;
  for (let i = 0; i < raw.length; i += 1) {
    const r = raw[i];
    if ('off' in r) {
      if (offStart === null) offStart = r.f;
      continue;
    }
    if (offStart !== null) {
      offMap.push([offStart, r.f - 1]);
      offStart = null;
    }
    const prev = keys[keys.length - 1];
    if (prev && prev.x === round(r.x) && prev.y === round(r.y)) continue;
    if (prev) {
      // Hold at the previous position until the movement towards this one
      // starts. A recorded movement supplies the departure; without one the
      // relocation is drawn as a short schematic transition, never as a slow
      // drift across the whole interval between two records.
      const mv = movements.find((m) => m.forceId === force.id && m.endFrame === r.f);
      const isTransit = r.placeId === null && r.route === 'RECONSTRUCTED';
      const gap = r.f - prev.f;
      // Without a recorded duration, a relocation takes time in proportion to
      // its length (SCHEMATIC_SPEED atlas units per keyframe), never less than
      // one simulated hour, so a long move is never drawn as a jump.
      const distance = Math.hypot(r.x - prev.x, r.y - prev.y);
      const schematicSpan = Math.max(6, Math.ceil(distance / SCHEMATIC_SPEED));
      const depart = mv?.startFrame != null && mv.startFrame < r.f && mv.startFrame >= prev.f
        ? Math.min(mv.startFrame, r.f - Math.ceil(distance / 0.035))
        : isTransit
          ? (gap > 2 * FPD ? r.f - FPD : prev.f)
          : Math.max(prev.f, r.f - schematicSpan);
      if (depart > prev.f) keys.push({ ...prev, f: depart });
      // No recorded movement and too little time for any plausible journey: the
      // transfer is not traced by the source, so it is drawn as a discontinuity
      // (route UNKNOWN), never as an invented high-speed line.
      if (!mv && !isTransit && r.f - prev.f < schematicSpan && distance > 0.02) r.route = 'UNKNOWN';
    }
    keys.push({ f: r.f, x: round(r.x), y: round(r.y), placeId: r.placeId, placement: r.placement, route: r.route });
  }
  if (offStart !== null) offMap.push([offStart, FRAME_COUNT - 1]);
  positionTracks.push({ forceId: force.id, keys, offMap });
}

for (const m of movements) {
  const track = tracks.get(m.forceId) ?? [];
  const at = (frame: number | null): Quantity => {
    if (frame === null) return UNKNOWN;
    let s: ForceSnapshot | undefined;
    for (const x of track) if (x.f <= frame) s = x;
    return s ? s.strength : UNKNOWN;
  };
  m.strengthAtStart = at(m.startFrame);
  m.strengthAtEnd = m.endFrame !== m.startFrame ? at(m.endFrame) : UNKNOWN;
}

const forceTracks: ForceTrack[] = [...tracks.entries()].map(([forceId, snapshots]) => ({
  forceId,
  snapshots: snapshots.filter((s, i) => {
    const n = snapshots[i + 1];
    return !n || n.f !== s.f; // keep the last snapshot within one frame
  }),
}));

/* ------------------------------------------------------------------ */
/* Battles                                                             */
/* ------------------------------------------------------------------ */

function deriveBattleType(own: WarEvent[]): BattleType {
  const types = new Set(own.map((e) => e.type));
  if (types.has('SIEGE')) return 'SIEGE';
  if (types.has('INTERCEPTION') || types.has('ASSASSINATION')) return 'INTERCEPTION';
  if (types.has('POLITICAL') || types.has('NEGOTIATION')) return 'POLITICAL_EVENT';
  if (own.some((e) => e.significance === 'CRITICAL') && own.length > 2) return 'MAJOR_BATTLE';
  return 'ENGAGEMENT';
}
const battles: Battle[] = [...battleIdByName.entries()].map(([name, id]) => {
  const own = events.filter((e) => e.battleId === id);
  const meta = battleSrc.find((b) => b.name === name);
  const byFaction = new Map<string, Set<string>>();
  for (const e of own) {
    for (const fid of e.forceIds) {
      const f = forceById.get(fid);
      if (!f) continue;
      if (!byFaction.has(f.faction)) byFaction.set(f.faction, new Set());
      byFaction.get(f.faction)!.add(fid);
    }
  }
  const lost = (side: string) => {
    const rows = casualties.filter((c) => c.countsTowardCampaignTotal && c.eventId && own.some((e) => e.id === c.eventId) && c.faction === side);
    const nums = rows.map((c) => c.kia).filter((q): q is number => typeof q === 'number');
    return nums.length ? nums.reduce((a, b) => a + b, 0) : UNKNOWN;
  };
  const empireStrengths = own.map((e) => e.empireStrength).filter((q): q is number => typeof q === 'number');
  const provenances = own.map((e) => e.provenance);
  return {
    id,
    name,
    type: meta?.type ?? deriveBattleType(own),
    theatreId: own[0]?.theatreId ?? '',
    placeId: own.find((e) => e.placeId && coordsOf(e.placeId))?.placeId ?? null,
    startFrame: Math.min(...own.map((e) => e.frame)),
    endFrame: Math.max(...own.map((e) => e.frame)),
    eventIds: own.map((e) => e.id),
    participants: [...byFaction.entries()].map(([f, set]) => ({ faction: f, forces: [...set].sort() })),
    characterIds: [...new Set(own.flatMap((e) => e.characterIds))],
    empireCommitted: empireStrengths.length ? Math.max(...empireStrengths) : UNKNOWN,
    empireLost: lost('Eastern Empire'),
    tempestLost: lost('Jura-Tempest Federation'),
    result: meta?.result ?? own[own.length - 1]?.strategicResult ?? '',
    significance: own.some((e) => e.significance === 'CRITICAL') ? 'CRITICAL' : own[0]?.significance ?? '',
    provenance: meta?.provenance ?? (provenances.every((p) => p === 'CANONICAL') ? 'CANONICAL' : 'CANONICAL_WITH_VISUAL_RECONSTRUCTION'),
    confidence: own[0]?.confidence ?? UNKNOWN,
  };
});
battles.sort((a, b) => a.startFrame - b.startFrame);

/* ------------------------------------------------------------------ */
/* Casualty totals                                                     */
/* ------------------------------------------------------------------ */

const sumStated = (side: 'tempest' | 'empire', k: 'kia' | 'wia' | 'pow' | 'mia' | 'revived'): Quantity =>
  casualtiesAt(FRAME_COUNT - 1)[side][k];
const empireKilled = sumStated('empire', 'kia');
const empireRevived = sumStated('empire', 'revived');
const campaignTotals: CampaignTotals = {
  empireKilled,
  empireRevived,
  empirePermanentDead: typeof empireKilled === 'number' && typeof empireRevived === 'number' ? empireKilled - empireRevived : UNKNOWN,
  empireCaptured: sumStated('empire', 'pow'),
  tempestKilled: sumStated('tempest', 'kia'),
  wiaBothSides: UNKNOWN,
  miaBothSides: UNKNOWN,
  excludedRows: casualties.filter((c) => !c.countsTowardCampaignTotal).map((c) => c.id),
  note:
    'Only EVENT_CASUALTY and RESTORATION rows are summed. AGGREGATE, COMPONENT and CAMPAIGN_TOTAL rows restate ' +
    'other rows and are excluded so that no death is counted twice. Killed and later revived are kept apart: ' +
    'a resurrection does not erase a death from the record, it is reported beside it.',
};

/* ------------------------------------------------------------------ */
/* Characters, commanders, combatants                                  */
/* ------------------------------------------------------------------ */

const commanders: Commander[] = commanderSrc.map((c) => {
  requireEvent(c.startEvent, `Commander ${c.id}.startEvent`);
  requireEvent(c.endEvent, `Commander ${c.id}.endEvent`);
  const characterId = charactersIn(c.name)[0] ?? null;
  const own = events.filter((e) => (characterId ? e.characterIds.includes(characterId) : e.actor.includes(c.name)));
  return {
    ...c,
    characterId,
    startFrame: frameOfEvent(c.startEvent),
    endFrame: frameOfEvent(c.endEvent),
    forceIds: forces.filter((f) => (characterId ? f.commanderIds.includes(characterId) : f.commander.includes(c.name))).map((f) => f.id),
    eventIds: own.map((e) => e.id),
    theatreIds: [...new Set(own.map((e) => e.theatreId))],
  };
});
const combatants: Combatant[] = combatantSrc.map((c) => {
  requireEvent(c.firstEvent, `Combatant ${c.id}.firstEvent`);
  requireEvent(c.lastEvent, `Combatant ${c.id}.lastEvent`);
  return { ...c, faction: faction(c.faction), characterId: charactersIn(c.name)[0] ?? null, firstFrame: frameOfEvent(c.firstEvent), lastFrame: frameOfEvent(c.lastEvent) };
});

const characters: Character[] = characterSrc.map((c) => {
  const evs = events.filter((e) => e.characterIds.includes(c.id));
  const frames = evs.map((e) => e.frame);
  return {
    id: c.id,
    name: c.name,
    aliases: c.aliases,
    japanese: c.japanese,
    faction: faction(c.faction),
    role: [...new Set(c.role.split(/;\s*/).map((r) => r.trim()).filter(Boolean))].join('; '),
    photocard: c.photocard
      ? { src: `/assets/characters/${c.id}.webp`, thumb: `/assets/characters/thumb/${c.id}.webp`, source: c.photocard.attribution ?? c.photocard.sourceType ?? 'Character photocard repository', sourceUrl: c.photocard.sourceUrl, licence: c.photocard.licence ?? null }
      : null,
    commanderIds: commanders.filter((m) => m.characterId === c.id).map((m) => m.id),
    combatantIds: combatants.filter((m) => m.characterId === c.id).map((m) => m.id),
    forceIds: forces.filter((f) => f.commanderIds.includes(c.id)).map((f) => f.id),
    eventIds: evs.map((e) => e.id),
    battleIds: [...new Set(evs.map((e) => e.battleId).filter((b): b is string => Boolean(b)))],
    theatreIds: [...new Set(evs.map((e) => e.theatreId))],
    firstFrame: frames.length ? Math.min(...frames) : null,
    lastFrame: frames.length ? Math.max(...frames) : null,
  };
});

/* ------------------------------------------------------------------ */
/* Geography                                                           */
/* ------------------------------------------------------------------ */

const datasetFactions = new Set<string>();
for (const f of forces) datasetFactions.add(f.faction);
for (const e of events) for (const x of [e.actorFaction, e.opponentFaction]) if (x && x !== UNKNOWN) datasetFactions.add(x);
const nationsInDataset = new Set(FACTION_DEFS.filter((d) => datasetFactions.has(d.id)).map((d) => d.nationId).filter(Boolean) as string[]);

const flagManifest: NationFlagManifest = {};
const nations: Nation[] = gazetteer.nations.map((n) => {
  const asset = n.hasFlag !== false ? `/assets/nation-flags/${n.category}/Flag - ${n.name}.png` : null;
  const thumb = `/assets/nation-flags/thumb/${n.id}.webp`;
  if (asset) flagManifest[n.id] = { name: n.name, category: n.category, asset, thumb: existsSync(join(ROOT, 'public', thumb)) ? thumb : null };
  return {
    id: n.id, name: n.name, category: n.category, x: n.x, y: n.y, placement: n.placement, flag: asset,
    inDataset: nationsInDataset.has(n.id),
    territoryId: geo.territories.find((t) => t.nationId === n.id)?.id ?? null,
  };
});

const factions: Faction[] = [...datasetFactions]
  .filter((f) => f && f !== UNKNOWN && f !== '-')
  .sort()
  .map((id) => {
    const def = FACTION_DEFS.find((d) => d.id === id);
    return { id, name: id, colorKey: def?.colorKey ?? 'unknown', nationId: def?.nationId ?? null, forceIds: forces.filter((f) => f.faction === id).map((f) => f.id), isMajorCombatant: def?.major ?? false };
  });

const theatres: Theatre[] = THEATRE_DEFS.map((def) => {
  const own = events.filter((e) => e.theatreId === def.id);
  const anchor = coordsOf(def.anchorPlace);
  const area = geo.operationalAreas.find((a) => a.theatreId === def.id)?.geometry ?? null;
  return {
    id: def.id, code: def.code, name: def.name, region: def.region,
    anchor: anchor ? { x: anchor.x, y: anchor.y } : null,
    placement: anchor?.placement ?? 'ABSTRACT',
    area: area && area.coordinates.length ? area : null,
    bounds: area && area.coordinates.length ? boundsOf(area) : null,
    firstEvent: own[0]?.id ?? null, lastEvent: own[own.length - 1]?.id ?? null,
    firstFrame: own[0]?.frame ?? null, lastFrame: own[own.length - 1]?.frame ?? null,
    eventCount: own.length, colorKey: def.colorKey,
  };
});

const places: Place[] = gazetteer.places.map((p) => ({
  id: p.id, name: p.name, theatre: p.theatre, x: p.x ?? null, y: p.y ?? null, placement: p.placement,
  altitude: p.altitude ?? (p.placement === 'ABSTRACT' ? null : 'GROUND'), basis: p.basis,
  territoryId: territoryAt(p.x, p.y),
}));

const territories: Territory[] = geo.territories.map((t) => {
  const nation = t.nationId ? nationById.get(t.nationId) : null;
  const entries = controlSrc.territories[t.id];
  const control: TerritoryControlSegment[] = entries
    ? entries.map((c) => {
        requireEvent(c.fromEvent, `Territory control ${t.id}`);
        return { fromFrame: c.fromEvent ? frameOfEvent(c.fromEvent)! : 0, fromEvent: c.fromEvent, controller: faction(c.controller), status: c.status, role: c.role, provenance: c.provenance, basis: c.basis };
      })
    : [{ fromFrame: 0, fromEvent: null, controller: nation?.name ?? null, ...controlSrc.defaultForUnlisted }];
  control.sort((a, b) => a.fromFrame - b.fromFrame);
  return {
    id: t.id, name: t.name, display: t.display, nationId: t.nationId,
    faction: control[0]?.controller ?? null,
    identification: t.identification,
    sourceGrade: 'MEASURED',
    uncertainty: t.identification === 'LABELLED' ? 'LOW' : t.identification === 'PARTIAL' ? 'MEDIUM' : 'HIGH',
    boundarySource: t.boundarySource, boundaryGrade: t.boundaryGrade, labelPoint: t.labelPoint,
    bounds: boundsOf(t.geometry), areaFraction: t.areaFraction, notes: t.notes, geometry: t.geometry, control,
  };
});

const territoryChanges: TerritoryChange[] = territoryChangeSrc.map((t) => {
  requireEvent(t.changeEventId, `Territory change ${t.id}`);
  return { ...t, changeFrame: frameOfEvent(t.changeEventId) };
});

const campaignStages: CampaignStage[] = stageSrc.map((s) => {
  const start = s.startEvent ? frameOfEvent(s.startEvent) : s.startWarDay ? (Number(s.startWarDay.replace('D', '').replace('+', '')) - FIRST_DAY) * FPD : null;
  const end = s.endEvent ? frameOfEvent(s.endEvent) : s.endWarDay ? (Number(s.endWarDay.replace('D', '').replace('+', '')) - FIRST_DAY + 1) * FPD - 1 : null;
  if (start === null || end === null) throw new Error(`Stage ${s.id} has no resolvable span.`);
  for (const a of s.anchorEvents) requireEvent(a, `Stage ${s.id}.anchorEvents`);
  return { id: s.id, name: s.name, startFrame: start, endFrame: Math.min(FRAME_COUNT - 1, end), definition: s.definition, anchorEvents: s.anchorEvents, source: s.source };
});

const terms: TermEntry[] = terminologySrc.map((t) => ({ id: t.id, kind: t.kind, canonical: t.canonical, display: t.display, japanese: t.japanese, aliases: t.aliases }));

/* ------------------------------------------------------------------ */
/* Timeline gaps                                                       */
/* ------------------------------------------------------------------ */

// Every stretch longer than six simulated hours between consecutive events is
// recorded as a gap: its length is a placement, and the record says on what basis.
const GAP_FRAMES = 36;
const GAP_CONFIDENCE: Record<TimePrecision, Confidence> = { CANONICAL_RELATIVE: 'HIGH', DAY_LEVEL: 'MEDIUM', SEQUENTIAL: 'MEDIUM', RECONSTRUCTED: 'LOW' };
const timelineGaps: TimelineGap[] = [];
for (let i = 1; i < events.length; i += 1) {
  const a = events[i - 1];
  const b = events[i];
  if (b.frame - a.frame <= GAP_FRAMES) continue;
  timelineGaps.push({
    id: `GAP-${String(timelineGaps.length + 1).padStart(3, '0')}`,
    fromEvent: a.id,
    toEvent: b.id,
    fromFrame: a.frame,
    toFrame: b.frame,
    hours: Math.round(((b.frame - a.frame) * MPF) / 60),
    canonicalWording: b.canonicalTime,
    timePrecision: b.timePrecision,
    reconstructionBasis: b.reconstructionNote || (b.timePrecision === 'CANONICAL_RELATIVE' ? 'Interval stated by the source.' : 'Placement between canonical anchors; see the clock skeleton in AUDIT-PLAN.md.'),
    confidence: GAP_CONFIDENCE[b.timePrecision],
    sourceRefs: b.sourceRefs,
  });
}

/* ------------------------------------------------------------------ */
/* Manifest & write                                                    */
/* ------------------------------------------------------------------ */

const sourceFiles = [
  'campaign/revision.json', ...EVENT_FILES.map((f) => `campaign/events/${f}`), 'campaign/forces.json', 'campaign/movements.json', 'campaign/casualties.json',
  'gazetteer.source.json', 'territories.geo.source.json', 'territory-control.source.json', 'characters.source.json', 'terminology.source.json',
];
const manifest: Manifest = {
  schemaVersion: 2,
  revision: revision.revision,
  source: Object.fromEntries(sourceFiles.map((f) => [f, sha256(join(SRC, f)).slice(0, 16)])),
  clock: {
    frameCount: FRAME_COUNT, minutesPerFrame: MPF, framesPerHour: 60 / MPF, framesPerDay: FPD,
    checkpointInterval: CHECKPOINT_INTERVAL, firstDay: FIRST_DAY, lastDay: LAST_DAY,
    calendarNote:
      'The year 9001 is an artificial simulation calendar marker. The novels give no calendar dates and no ' +
      'clock times; every date and HH:MM shown is a reconstructed placement on a 10-minute grid, not canon.',
  },
  campaign: { startDate: dates[0], endDate: dates[dates.length - 1], firstContactFrame, battleDayMin: FIRST_DAY, battleDayMax: LAST_DAY },
  coordinateSystem: {
    id: 'SIM_NORMALISED', description: gazetteer.about.definition, atlasPixelWidth: 2641, atlasPixelHeight: 2035,
    lngSpanDeg: 260, latExtentDeg: 70.26, disclaimer: gazetteer.about.warning,
  },
  counts: {
    frames: FRAME_COUNT, checkpoints: checkpointFrames.length, deltaFrames: deltaFrames.length, events: events.length,
    turningPoints: events.filter((e) => e.turningPoint).length, battles: battles.length, forces: forces.length,
    forceSnapshots: forceTracks.reduce((n, t) => n + t.snapshots.length, 0),
    positionKeys: positionTracks.reduce((n, t) => n + t.keys.length, 0),
    casualties: casualties.length, commanders: commanders.length, combatants: combatants.length, characters: characters.length,
    movements: movements.length, territories: territories.length, territoryChanges: territoryChanges.length,
    theatres: theatres.length, nations: nations.length, factions: factions.length, stages: campaignStages.length,
    contradictions: referenceSrc.contradictions.length, ambiguities: referenceSrc.ambiguities.length, terms: terms.length, gaps: timelineGaps.length,
  },
};

const timelineIndex: TimelineIndex = {
  frameCount: FRAME_COUNT, date: encodeColumn(dates), battleDay: battleDays,
  phase: encodeColumn(phases), stage: encodeColumn(stages), eventFrames, stateChangeFrames,
};

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(join(OUT_DIR, 'keyframes'), { recursive: true });
const written: Record<string, number> = {};
function put(name: string, value: unknown): void {
  const body = JSON.stringify(value);
  writeFileSync(join(OUT_DIR, name), body);
  written[name] = Buffer.byteLength(body);
}

put('manifest.json', manifest);
put('timeline.index.json', timelineIndex);
put('state.deltas.json', { interval: CHECKPOINT_INTERVAL, frameCount: FRAME_COUNT, deltaFrames, deltas });
// All checkpoints in one file: one request instead of one per simulated day.
put('keyframes.index.json', { interval: CHECKPOINT_INTERVAL, frames: checkpointFrames, files: ['keyframes/checkpoints.json'] });
put('keyframes/checkpoints.json', checkpointFrames.map((f) => checkpoints[String(f)]));
put('events.json', events);
put('battles.json', battles);
put('forces.json', forces);
put('force-tracks.json', forceTracks);
put('movement.json', { movements, positions: positionTracks });
put('casualties.json', { records: casualties, campaignTotals });
put('commanders.json', commanders);
put('combatants.json', combatants);
put('characters.json', characters);
put('territories.json', territoryChanges);
put('territories.geo.json', { territories, about: { sourceImage: geo.about.sourceImage } });
put('theatres.json', theatres);
put('places.json', places);
put('nations.json', nations);
put('nation-flags.json', flagManifest);
put('factions.json', factions);
put('stages.json', campaignStages);
put('terms.json', terms);
put('gaps.json', timelineGaps);
put('reference.json', {
  contradictions: referenceSrc.contradictions,
  ambiguities: referenceSrc.ambiguities.map((a) => ({ id: a.id, subject: a.subject, ambiguity: a.ambiguity ?? a.possibleOrder ?? '', chosenPlacement: a.chosenPlacement, confidence: a.confidence })),
});

const total = Object.values(written).reduce((a, b) => a + b, 0);
console.log(`Compiled revision "${revision.revision}"`);
console.log(`  clock          D${FIRST_DAY}..D+${LAST_DAY}  ${FRAME_COUNT} frames, ${checkpointFrames.length} checkpoints, ${deltaFrames.length} delta frames`);
console.log(`  events         ${events.length}  battles ${battles.length}  forces ${forces.length}  characters ${characters.length}`);
console.log(`  snapshots      ${manifest.counts.forceSnapshots}  position keys ${manifest.counts.positionKeys}  movements ${movements.length}`);
console.log(`  territories    ${territories.length}  casualty records ${casualties.length}`);
console.log(`  runtime data   ${(total / 1024).toFixed(0)} KB in ${Object.keys(written).length} files`);

function round(n: number): number {
  return Math.round(n * 100000) / 100000;
}
