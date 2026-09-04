/**
 * Build-time data compiler.
 *
 *   data-source/*.xlsx  ->  parse  ->  normalise  ->  validate  ->  public/data/*.json
 *
 * The browser never sees the workbook. This script is the only place in the
 * project that knows what a spreadsheet is.
 *
 * Two rules govern every transformation here:
 *   1. Nothing is invented. A value the workbook does not establish stays
 *      UNKNOWN all the way to the screen.
 *   2. Nothing is duplicated. 7,200 frames of mostly-identical state are
 *      stored as 51 checkpoints plus sparse per-frame deltas.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

import type {
  Ambiguity,
  Battle,
  CampaignStage,
  CampaignTotals,
  CasualtyRecord,
  Combatant,
  Commander,
  Contradiction,
  Faction,
  Force,
  ForcePositionTrack,
  ForceSnapshot,
  ForceTrack,
  FrameState,
  Manifest,
  Movement,
  Nation,
  NationFlagManifest,
  Place,
  PlacementGrade,
  PositionKey,
  Quantity,
  StateStream,
  TerritoryChange,
  Theatre,
  TheatreFrameState,
  TimelineIndex,
  WarEvent,
} from '../src/types/dataset';

import {
  confidence,
  encodeColumn,
  frameIdToIndex,
  optionalFrameIndex,
  optionalText,
  parseLabelledSegments,
  quantity,
  requiredInt,
  sameValue,
  splitList,
  text,
  UNKNOWN,
} from './lib/normalise';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SOURCE_DIR = join(ROOT, 'data-source');
const OUT_DIR = join(ROOT, 'public', 'data');

const WORKBOOK = join(SOURCE_DIR, 'Tempest_Eastern_Empire_War_Timeline.xlsx');
const MARKDOWN = join(SOURCE_DIR, 'Tempest_Eastern_Empire_War_Timeline.md');
const GAZETTEER = join(SOURCE_DIR, 'gazetteer.source.json');

const FRAME_COUNT = 7200;
const MINUTES_PER_FRAME = 10;
const FRAMES_PER_DAY = 144;
const CHECKPOINT_INTERVAL = FRAMES_PER_DAY;

/* ------------------------------------------------------------------ */
/* Gazetteer                                                           */
/* ------------------------------------------------------------------ */

interface GazetteerNation {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  placement: PlacementGrade;
  hasFlag?: boolean;
}

interface GazetteerPlace {
  id: string;
  name: string;
  theatre: string | null;
  x?: number;
  y?: number;
  placement: PlacementGrade;
  altitude?: 'AIR' | 'SUBSURFACE';
  basis: string;
}

interface GazetteerSource {
  about: { coordinateSystem: string; definition: string; warning: string };
  nations: GazetteerNation[];
  places: GazetteerPlace[];
  theatreZones: { placement: PlacementGrade; zones: Record<string, [number, number][]> };
  aliases: Record<string, string>;
  transitAxis: { from: string; to: string; pattern: string };
}

const gazetteer = JSON.parse(readFileSync(GAZETTEER, 'utf8')) as GazetteerSource;
const placeById = new Map<string, GazetteerPlace>(gazetteer.places.map((p) => [p.id, p]));
const transitPattern = new RegExp(gazetteer.transitAxis.pattern);

const unresolvedLocations = new Map<string, number>();

interface ResolvedLocation {
  placeId: string | null;
  x: number | null;
  y: number | null;
  placement: PlacementGrade;
  transitPct: number | null;
}

const OFF_MAP: ResolvedLocation = {
  placeId: null,
  x: null,
  y: null,
  placement: 'ABSTRACT',
  transitPct: null,
};

function transitPoint(pct: number): ResolvedLocation {
  const from = placeById.get(gazetteer.transitAxis.from);
  const to = placeById.get(gazetteer.transitAxis.to);
  if (!from || !to || from.x === undefined || to.x === undefined) {
    throw new Error('Transit axis endpoints missing from the gazetteer.');
  }
  const t = Math.min(100, Math.max(0, pct)) / 100;
  return {
    placeId: null,
    x: from.x + (to.x - from.x) * t,
    y: from.y! + (to.y! - from.y!) * t,
    placement: 'RECONSTRUCTED',
    transitPct: pct,
  };
}

/**
 * Resolves a workbook location string to a position.
 *
 * Returns OFF_MAP rather than a guess whenever the gazetteer has no entry, and
 * records the miss so the build can report it. An unresolved location is a data
 * problem to be fixed in the gazetteer, never patched over in code.
 */
function resolveLocation(raw: string): ResolvedLocation {
  const t = text(raw);
  if (!t) return OFF_MAP;

  const transit = transitPattern.exec(t);
  if (transit) return transitPoint(Number(transit[1]));

  const direct = gazetteer.aliases[t];
  if (direct) return fromPlaceId(direct);

  // "A; later B" and "A -> B": the force's station over the campaign. Resolve
  // to the first component; the workbook's own per-frame rows carry the change.
  const head = t.split(/\s*(?:;|->)\s*/)[0].trim();
  if (head && head !== t) {
    const viaHead = gazetteer.aliases[head];
    if (viaHead) return fromPlaceId(viaHead);
  }

  if (placeById.has(t)) return fromPlaceId(t);

  unresolvedLocations.set(t, (unresolvedLocations.get(t) ?? 0) + 1);
  return OFF_MAP;
}

function fromPlaceId(id: string): ResolvedLocation {
  const place = placeById.get(id);
  if (place) {
    if (place.placement === 'ABSTRACT' || place.x === undefined || place.y === undefined) {
      return { placeId: id, x: null, y: null, placement: 'ABSTRACT', transitPct: null };
    }
    return { placeId: id, x: place.x, y: place.y, placement: place.placement, transitPct: null };
  }
  const nation = gazetteer.nations.find((n) => n.id === id);
  if (nation) {
    return { placeId: id, x: nation.x, y: nation.y, placement: nation.placement, transitPct: null };
  }
  throw new Error(`Gazetteer alias points at an unknown id: ${id}`);
}

/* ------------------------------------------------------------------ */
/* Workbook                                                            */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function sheet(book: XLSX.WorkBook, name: string): Row[] {
  const ws = book.Sheets[name];
  if (!ws) throw new Error(`Workbook is missing the required sheet "${name}".`);
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: '', raw: false });
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/* ------------------------------------------------------------------ */
/* Theatres                                                            */
/* ------------------------------------------------------------------ */

/**
 * Theatre identity. The ids and names come from the Step 1 dataset; the display
 * labels used inside the compound Battle_Status / Territorial_Control strings
 * are shorter, so both spellings are mapped here.
 */
const THEATRE_DEFS: {
  id: string;
  name: string;
  region: string;
  labels: string[];
  anchorPlace: string | null;
  colorKey: string;
}[] = [
  {
    id: 'TH-DWG',
    name: 'Dwargon Gate Front',
    region: 'Great Jura Forest',
    labels: ['Dwargon Gate', 'Dwargon Gate Front'],
    anchorPlace: 'dwargon-gate-front',
    colorKey: 'tempest',
  },
  {
    id: 'TH-LAB',
    name: 'Ramiris Labyrinth Front',
    region: 'Ramiris Labyrinth',
    labels: ['Labyrinth', 'Ramiris Labyrinth'],
    anchorPlace: 'ramiris-labyrinth',
    colorKey: 'tempest',
  },
  {
    id: 'TH-CAP',
    name: 'Imperial Capital',
    region: 'Eastern Empire',
    labels: ['Imperial Capital'],
    anchorPlace: 'imperial-capital',
    colorKey: 'empire',
  },
  {
    id: 'TH-DWE',
    name: 'Dwargon Eastern Metropolis',
    region: 'Armed Nation of Dwargon',
    labels: ['Dwargon East', 'Dwargon Eastern Metropolis'],
    anchorPlace: 'dwargon-eastern-metropolis',
    colorKey: 'dwargon',
  },
  {
    id: 'TH-DRG',
    name: 'Dragon Theatre',
    region: 'Great Jura Forest (airspace)',
    labels: ['Dragon Theatre'],
    anchorPlace: 'jura-airspace',
    colorKey: 'neutral',
  },
  {
    id: 'TH-DIP',
    name: 'Diplomatic / Settlement',
    region: 'Inter-state',
    labels: ['Settlement', 'Diplomatic'],
    anchorPlace: 'settlement-table',
    colorKey: 'neutral',
  },
];

const THEATRE_BY_LABEL = new Map<string, string>();
for (const def of THEATRE_DEFS) {
  for (const label of def.labels) THEATRE_BY_LABEL.set(label, def.id);
}

/** Timeline sheet column prefixes, one pair per theatre. */
const THEATRE_COLUMN_KEY: Record<string, string> = {
  'TH-DWG': 'TH_DWG',
  'TH-LAB': 'TH_LAB',
  'TH-CAP': 'TH_CAP',
  'TH-DWE': 'TH_DWE',
  'TH-DRG': 'TH_DRG',
  'TH-DIP': 'TH_DIP',
};

/* ------------------------------------------------------------------ */
/* Factions                                                            */
/* ------------------------------------------------------------------ */

const FACTION_DEFS: { id: string; match: RegExp; colorKey: Faction['colorKey']; nationId: string | null; major: boolean }[] = [
  { id: 'Eastern Empire', match: /^eastern empire$/i, colorKey: 'empire', nationId: 'nasca-namrium-ulmeria', major: true },
  { id: 'Jura-Tempest Federation', match: /^jura[- ]tempest federation$/i, colorKey: 'tempest', nationId: 'jura-tempest-federation', major: true },
  { id: 'Armed Nation of Dwargon', match: /^armed nation of dwargon$/i, colorKey: 'dwargon', nationId: 'dwargon', major: true },
  { id: 'Beast Kingdom Eurazania', match: /^beast kingdom eurazania$/i, colorKey: 'neutral', nationId: 'eurazania', major: false },
  { id: 'Western Nations', match: /^western nations$/i, colorKey: 'neutral', nationId: null, major: false },
];

function factionColorKey(faction: string): Faction['colorKey'] {
  const def = FACTION_DEFS.find((f) => f.match.test(faction));
  return def ? def.colorKey : 'unknown';
}

function factionNationId(faction: string): string | null {
  const def = FACTION_DEFS.find((f) => f.match.test(faction));
  return def ? def.nationId : null;
}

/* ------------------------------------------------------------------ */
/* Turning points (from the Step 1 markdown)                           */
/* ------------------------------------------------------------------ */

function readTurningPoints(): Map<string, { rank: number; summary: string }> {
  const md = readFileSync(MARKDOWN, 'utf8');
  const section = md.split('## Major Turning Points')[1];
  const out = new Map<string, { rank: number; summary: string }>();
  if (!section) return out;
  const body = section.split(/\n#{1,2} /)[0];
  const line = /^(\d+)\.\s+\*\*FRAME_(\d+)\s+\((EVT-\d+)\)\*\*\s+[-\u2014]\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = line.exec(body)) !== null) {
    out.set(m[3], { rank: Number(m[1]), summary: m[4].trim() });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Frame state                                                         */
/* ------------------------------------------------------------------ */

function buildFrameState(row: Row, index: number): FrameState {
  const theatres: Record<string, TheatreFrameState> = {};
  const battleStatus = parseLabelledSegments(row['Battle_Status']);
  const control = parseLabelledSegments(row['Territorial_Control']);

  for (const def of THEATRE_DEFS) {
    const key = THEATRE_COLUMN_KEY[def.id];
    const status = text(row[`${key}_Status`]);
    const frontline = text(row[`${key}_Frontline`]);
    if (!status && !frontline) continue;

    let bs: string | null = null;
    let ct: string | null = null;
    for (const label of def.labels) {
      if (bs === null && battleStatus.has(label)) bs = battleStatus.get(label)!;
      if (ct === null && control.has(label)) ct = control.get(label)!;
    }
    theatres[def.id] = { status, frontline, battleStatus: bs, control: ct };
  }

  const approachRaw = text(row['Approach_Progress_Pct_SIMULATED']);
  const approachPct = /^\d+$/.test(approachRaw) ? Number(approachRaw) : null;

  return {
    frame: index,
    phase: text(row['Campaign_Phase']),
    stage: text(row['Campaign_Stage']),
    columnLocation: text(row['Empire_Column_Location']),
    approachPct,
    tempestTotal: quantity(row['Tempest_Total_Force'], 'Tempest_Total_Force'),
    tempestEffective: quantity(row['Tempest_Effective_Force'], 'Tempest_Effective_Force'),
    empireTotal: quantity(row['Empire_Total_Force'], 'Empire_Total_Force'),
    empireEffective: quantity(row['Empire_Effective_Force'], 'Empire_Effective_Force'),
    tempestMovement: {
      advancing: text(row['Tempest_Advancing']),
      retreating: text(row['Tempest_Retreating']),
    },
    empireMovement: {
      advancing: text(row['Empire_Advancing']),
      retreating: text(row['Empire_Retreating']),
    },
    casualties: {
      tempest: {
        kia: quantity(row['Tempest_KIA_Cumulative'], 'Tempest_KIA_Cumulative'),
        wia: quantity(row['Tempest_WIA_Cumulative'], 'Tempest_WIA_Cumulative'),
        pow: quantity(row['Tempest_POW_Cumulative'], 'Tempest_POW_Cumulative'),
        mia: quantity(row['Tempest_MIA_Cumulative'], 'Tempest_MIA_Cumulative'),
      },
      empire: {
        kia: quantity(row['Empire_KIA_Cumulative'], 'Empire_KIA_Cumulative'),
        wia: quantity(row['Empire_WIA_Cumulative'], 'Empire_WIA_Cumulative'),
        pow: quantity(row['Empire_POW_Cumulative'], 'Empire_POW_Cumulative'),
        mia: quantity(row['Empire_MIA_Cumulative'], 'Empire_MIA_Cumulative'),
      },
    },
    theatres,
    activeTheatres: text(row['Active_Theaters']),
    activeFronts: text(row['Active_Fronts']),
    activeBattles: text(row['Active_Battles']),
    activeCommanders: text(row['Active_Commanders']),
    majorCombatants: text(row['Major_Combatants_Active']),
    majorEvents: text(row['Major_Events']),
    eventIds: splitList(row['Event_IDs'], /\s*[;,]\s*/),
    frameStatus: text(row['Frame_Status']),
    eventStatus: text(row['Event_Status']),
    stateStatus: text(row['State_Status']),
    informationStatus: text(row['Information_Status']),
    confidence: confidence(row['Overall_Confidence']),
    sourceReferences: text(row['Source_References']),
    evidence: text(row['Evidence']),
    notes: optionalText(row['Notes']),
  };
}

const DELTA_FIELDS = [
  'phase',
  'stage',
  'columnLocation',
  'approachPct',
  'tempestTotal',
  'tempestEffective',
  'empireTotal',
  'empireEffective',
  'tempestMovement',
  'empireMovement',
  'casualties',
  'theatres',
  'activeTheatres',
  'activeFronts',
  'activeBattles',
  'activeCommanders',
  'majorCombatants',
  'majorEvents',
  'eventIds',
  'frameStatus',
  'eventStatus',
  'stateStatus',
  'informationStatus',
  'confidence',
  'sourceReferences',
  'evidence',
  'notes',
] as const satisfies readonly (keyof FrameState)[];

function diffState(prev: FrameState, next: FrameState): Partial<FrameState> {
  const delta: Record<string, unknown> = {};
  for (const field of DELTA_FIELDS) {
    if (!sameValue(prev[field], next[field])) delta[field] = next[field];
  }
  return delta as Partial<FrameState>;
}

/* ------------------------------------------------------------------ */
/* Compile                                                             */
/* ------------------------------------------------------------------ */

function writeJson(name: string, value: unknown): number {
  const path = join(OUT_DIR, name);
  mkdirSync(dirname(path), { recursive: true });
  const body = JSON.stringify(value);
  writeFileSync(path, body);
  return Buffer.byteLength(body);
}

function main(): void {
  const started = Date.now();
  console.log('Compiling the Step 1 dataset into the runtime dataset.\n');

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(join(OUT_DIR, 'keyframes'), { recursive: true });

  const book = XLSX.readFile(WORKBOOK, { cellDates: false, raw: false });

  const timelineRows = sheet(book, 'Timeline');
  const armyRows = sheet(book, 'Army Sizes');
  const casualtyRows = sheet(book, 'Casualties');
  const eventRows = sheet(book, 'Events');
  const forceRows = sheet(book, 'Force Register');
  const movementRows = sheet(book, 'Movements');
  const commanderRows = sheet(book, 'Commanders');
  const combatantRows = sheet(book, 'Combatants');
  const territoryRows = sheet(book, 'Territory');
  const contradictionRows = sheet(book, 'Contradictions');
  const ambiguityRows = sheet(book, 'Temporal Ambiguities');
  const stageRows = sheet(book, 'Campaign Stages');

  if (timelineRows.length !== FRAME_COUNT) {
    throw new Error(
      `Timeline sheet holds ${timelineRows.length} rows; the simulation clock requires exactly ${FRAME_COUNT}.`,
    );
  }

  /* -------------------------------------------------- events ------ */

  const turningPoints = readTurningPoints();
  const battleIdByName = new Map<string, string>();
  const events: WarEvent[] = eventRows.map((row) => {
    const id = text(row['Event_ID']);
    const frame = frameIdToIndex(row['Frame_ID'], `Events.${id}.Frame_ID`);
    const battleName = optionalText(row['Battle']);
    let battleId: string | null = null;
    if (battleName) {
      if (!battleIdByName.has(battleName)) {
        battleIdByName.set(battleName, `BTL-${String(battleIdByName.size + 1).padStart(3, '0')}`);
      }
      battleId = battleIdByName.get(battleName)!;
    }
    const location = text(row['Location']);
    const tp = turningPoints.get(id);
    return {
      id,
      prevId: optionalText(row['Previous_Event_ID']) === 'UNKNOWN' ? null : optionalText(row['Previous_Event_ID']),
      nextId: optionalText(row['Next_Event_ID']) === 'UNKNOWN' ? null : optionalText(row['Next_Event_ID']),
      frame,
      warDay: text(row['War_Day']),
      simulationTime: text(row['Simulation_Time']),
      canonicalTime: text(row['Canonical_Time']),
      phase: text(row['War_Phase']),
      theatreId: text(row['Theater_ID']),
      theatre: text(row['Theater']),
      front: text(row['Front']),
      battleId,
      battle: battleName,
      location,
      placeId: resolveLocation(location).placeId,
      actor: text(row['Actor']),
      actorFaction: text(row['Actor_Faction']),
      opponent: text(row['Opponent']),
      opponentFaction: text(row['Opponent_Faction']),
      type: text(row['Event_Type']),
      action: text(row['Action']),
      immediateResult: text(row['Immediate_Result']),
      operationalResult: text(row['Operational_Result']),
      strategicResult: text(row['Strategic_Result']),
      tempestStrength: quantity(row['Tempest_Strength'], `Events.${id}.Tempest_Strength`),
      empireStrength: quantity(row['Empire_Strength'], `Events.${id}.Empire_Strength`),
      kia: quantity(row['KIA_Event'], `Events.${id}.KIA_Event`),
      pow: quantity(row['POW_Event'], `Events.${id}.POW_Event`),
      commandStatus: text(row['Command_Status']),
      intensity: text(row['Event_Intensity']),
      significance: text(row['Battlefield_Significance']),
      timeBasis: text(row['Time_Basis']),
      timeConfidence: confidence(row['Time_Confidence']),
      numericalConfidence: confidence(row['Numerical_Confidence']),
      confidence: confidence(row['Overall_Confidence']),
      sourceVolume: text(row['Source_Volume']),
      sourceChapter: text(row['Source_Chapter']),
      evidence: text(row['Evidence']),
      notes: text(row['Notes']),
      turningPoint: Boolean(tp),
      turningPointRank: tp ? tp.rank : null,
      turningPointSummary: tp ? tp.summary : null,
    };
  });
  events.sort((a, b) => a.frame - b.frame || a.id.localeCompare(b.id));
  const eventById = new Map(events.map((e) => [e.id, e]));

  /* -------------------------------------------------- forces ------ */

  const forces: Force[] = forceRows.map((row) => {
    const id = text(row['Force_ID']);
    const parent = optionalText(row['Parent_Force_ID']);
    return {
      id,
      faction: text(row['Faction']),
      army: text(row['Army']),
      formation: text(row['Formation']),
      parentId: parent && parent !== '-' ? parent : null,
      childIds: [],
      depth: 0,
      commander: text(row['Commander']),
      role: text(row['Role']),
      initialStrengthRaw: text(row['Initial_Strength_Raw']),
      initialMin: quantity(row['Initial_Min'], `Force.${id}.Initial_Min`),
      initialMax: quantity(row['Initial_Max'], `Force.${id}.Initial_Max`),
      initialBest: quantity(row['Initial_Best_Estimate'], `Force.${id}.Initial_Best_Estimate`),
      finalStrength: quantity(row['Final_Strength'], `Force.${id}.Final_Strength`),
      kia: quantity(row['KIA'], `Force.${id}.KIA`),
      wia: quantity(row['WIA'], `Force.${id}.WIA`),
      pow: quantity(row['POW'], `Force.${id}.POW`),
      mia: quantity(row['MIA'], `Force.${id}.MIA`),
      finalLocation: text(row['Final_Location']),
      finalMovementStatus: text(row['Final_Movement_Status']),
      finalStatus: text(row['Final_Status']),
      strengthBasis: text(row['Strength_Basis']),
      source: text(row['Source']),
      confidence: confidence(row['Confidence']),
      notes: text(row['Notes']),
      countedInParent: false,
      firstFrame: FRAME_COUNT,
      lastFrame: -1,
    };
  });
  const forceById = new Map(forces.map((f) => [f.id, f]));

  for (const force of forces) {
    if (force.parentId) {
      const parent = forceById.get(force.parentId);
      if (!parent) {
        throw new Error(`Force ${force.id} names parent ${force.parentId}, which is not in the register.`);
      }
      parent.childIds.push(force.id);
      force.countedInParent = true;
    }
  }
  for (const force of forces) {
    let depth = 0;
    let cursor: Force | undefined = force;
    const seen = new Set<string>();
    while (cursor?.parentId) {
      if (seen.has(cursor.id)) throw new Error(`Cycle in the force hierarchy at ${cursor.id}.`);
      seen.add(cursor.id);
      cursor = forceById.get(cursor.parentId);
      depth += 1;
      if (depth > 16) throw new Error(`Force hierarchy deeper than 16 at ${force.id}.`);
    }
    force.depth = depth;
  }

  /* ------------------------------------- force tracks & positions - */

  const tracks = new Map<string, ForceSnapshot[]>();
  const positions = new Map<string, PositionKey[]>();
  const offMapRuns = new Map<string, [number, number][]>();

  const armySorted = armyRows
    .map((row) => ({ row, frame: frameIdToIndex(row['Frame_ID'], 'ArmySizes.Frame_ID') }))
    .sort((a, b) => a.frame - b.frame);

  for (const { row, frame } of armySorted) {
    const forceId = text(row['Force_ID']);
    const force = forceById.get(forceId);
    if (!force) {
      throw new Error(`Army Sizes references force ${forceId}, which is not in the Force Register.`);
    }
    force.firstFrame = Math.min(force.firstFrame, frame);
    force.lastFrame = Math.max(force.lastFrame, frame);

    const locationRaw = text(row['Location']);
    const resolved = resolveLocation(locationRaw);

    const snapshot: ForceSnapshot = {
      f: frame,
      strength: quantity(row['Current_Strength'], `ArmySizes.${forceId}.Current_Strength`),
      effective: quantity(row['Current_Effective_Strength'], `ArmySizes.${forceId}.Current_Effective_Strength`),
      kia: quantity(row['KIA_Cumulative'], `ArmySizes.${forceId}.KIA_Cumulative`),
      wia: quantity(row['WIA_Cumulative'], `ArmySizes.${forceId}.WIA_Cumulative`),
      pow: quantity(row['POW_Cumulative'], `ArmySizes.${forceId}.POW_Cumulative`),
      mia: quantity(row['MIA_Cumulative'], `ArmySizes.${forceId}.MIA_Cumulative`),
      status: text(row['Status']),
      movement: text(row['Movement_Status']),
      direction: text(row['Movement_Direction']),
      locationRaw,
      placeId: resolved.placeId,
      transitPct: resolved.transitPct,
      info: text(row['Information_Status']),
      confidence: confidence(row['Confidence']),
    };

    // Collapse consecutive identical snapshots: identical state is inherited,
    // not restated. This is where 15,075 rows become a few hundred.
    const list = tracks.get(forceId) ?? [];
    const last = list[list.length - 1];
    if (!last || !snapshotsEqual(last, snapshot)) list.push(snapshot);
    tracks.set(forceId, list);

    const keys = positions.get(forceId) ?? [];
    const runs = offMapRuns.get(forceId) ?? [];
    if (resolved.x !== null && resolved.y !== null) {
      const prev = keys[keys.length - 1];
      if (!prev || prev.x !== resolved.x || prev.y !== resolved.y) {
        keys.push({
          f: frame,
          x: round(resolved.x),
          y: round(resolved.y),
          placeId: resolved.placeId,
          placement: resolved.placement,
        });
      }
    } else {
      const lastRun = runs[runs.length - 1];
      if (lastRun && lastRun[1] === frame - 1) lastRun[1] = frame;
      else runs.push([frame, frame]);
    }
    positions.set(forceId, keys);
    offMapRuns.set(forceId, runs);
  }

  const forceTracks: ForceTrack[] = [...tracks.entries()].map(([forceId, snapshots]) => ({
    forceId,
    snapshots,
  }));
  const positionTracks: ForcePositionTrack[] = [...positions.entries()].map(([forceId, keys]) => ({
    forceId,
    keys,
    offMap: offMapRuns.get(forceId) ?? [],
  }));

  for (const force of forces) {
    if (force.lastFrame === -1) {
      force.firstFrame = -1;
    }
  }

  /* -------------------------------------------------- timeline ---- */

  const dates: string[] = [];
  const phases: string[] = [];
  const stages: string[] = [];
  const confidences: string[] = [];
  const campaignDays: number[] = [];
  const battleDays: number[] = [];
  const approach: number[] = [];
  const eventFrames: number[] = [];
  const stateChangeFrames: number[] = [];

  const checkpoints: Record<string, FrameState> = {};
  const checkpointFrames: number[] = [];
  const deltas: Record<string, Partial<FrameState>> = {};
  const deltaFrames: number[] = [];

  let previous: FrameState | null = null;
  let firstContactFrame = -1;

  for (let i = 0; i < timelineRows.length; i += 1) {
    const row = timelineRows[i];
    const declared = frameIdToIndex(row['Frame_ID'], `Timeline[${i}].Frame_ID`);
    if (declared !== i) {
      throw new Error(`Timeline row ${i} declares ${text(row['Frame_ID'])}; frames must be contiguous and ordered.`);
    }

    const state = buildFrameState(row, i);

    dates.push(text(row['Date']));
    phases.push(state.phase);
    stages.push(state.stage);
    confidences.push(String(state.confidence));
    campaignDays.push(requiredInt(row['Campaign_Day'], `Timeline[${i}].Campaign_Day`));
    battleDays.push(requiredInt(row['Battle_Day'], `Timeline[${i}].Battle_Day`));
    approach.push(state.approachPct ?? -1);

    if (state.eventStatus === 'NEW_EVENT') eventFrames.push(i);
    if (state.stateStatus === 'STATE_CHANGED') stateChangeFrames.push(i);
    if (state.phase === 'FIRST_CONTACT' && firstContactFrame === -1) firstContactFrame = i;

    if (i % CHECKPOINT_INTERVAL === 0) {
      checkpoints[String(i)] = state;
      checkpointFrames.push(i);
    }
    // The delta stream is computed for every frame, checkpoints included, so
    // that it is independently lossless: replaying deltas alone from frame 0
    // reproduces the campaign, and seeking from the nearest checkpoint
    // reproduces it too. The two paths are cross-checked by validate-data.
    if (previous) {
      const delta = diffState(previous, state);
      if (Object.keys(delta).length > 0) {
        deltas[String(i)] = delta;
        deltaFrames.push(i);
      }
    }

    previous = state;
  }

  if (firstContactFrame === -1) {
    throw new Error('No FIRST_CONTACT frame found in the Timeline sheet.');
  }

  const timelineIndex: TimelineIndex = {
    frameCount: FRAME_COUNT,
    date: encodeColumn(dates),
    campaignDay: campaignDays,
    battleDay: battleDays,
    phase: encodeColumn(phases),
    stage: encodeColumn(stages),
    approachPct: approach,
    confidence: encodeColumn(confidences),
    eventFrames,
    stateChangeFrames,
  };

  const stateStream: StateStream = {
    interval: CHECKPOINT_INTERVAL,
    frameCount: FRAME_COUNT,
    checkpointFrames,
    checkpoints: {},
    deltaFrames,
    deltas,
  };

  /* -------------------------------------------------- battles ----- */

  const battles: Battle[] = [...battleIdByName.entries()].map(([name, id]) => {
    const own = events.filter((e) => e.battleId === id);
    const theatreId = own[0]?.theatreId ?? '';
    const placeId = own.find((e) => e.placeId)?.placeId ?? null;
    const factions = new Map<string, Set<string>>();
    for (const e of own) {
      for (const f of [e.actorFaction, e.opponentFaction]) {
        if (!f || f === UNKNOWN) continue;
        if (!factions.has(f)) factions.set(f, new Set());
      }
    }
    for (const force of forces) {
      if (!factions.has(force.faction)) continue;
      factions.get(force.faction)!.add(force.id);
    }
    const kias = own.map((e) => e.kia).filter((q): q is number => typeof q === 'number');
    return {
      id,
      name,
      theatreId,
      placeId,
      startFrame: Math.min(...own.map((e) => e.frame)),
      endFrame: Math.max(...own.map((e) => e.frame)),
      eventIds: own.map((e) => e.id),
      phases: Array.from(new Set(own.map((e) => e.phase))),
      participants: [...factions.entries()].map(([faction, set]) => ({
        faction,
        forces: [...set],
      })),
      empireCommitted: UNKNOWN,
      empireLost: kias.length ? kias.reduce((a, b) => a + b, 0) : UNKNOWN,
      tempestLost: UNKNOWN,
      result: own[own.length - 1]?.strategicResult ?? '',
      significance: own.some((e) => e.significance === 'CRITICAL') ? 'CRITICAL' : own[0]?.significance ?? '',
      confidence: own[0]?.confidence ?? UNKNOWN,
    };
  });
  battles.sort((a, b) => a.startFrame - b.startFrame);

  /* -------------------------------------------------- casualties -- */

  const NON_ADDITIVE = new Set(['AGGREGATE_CASUALTY', 'COMPONENT_CASUALTY', 'CAMPAIGN_TOTAL']);
  const casualties: CasualtyRecord[] = casualtyRows
    .filter((row) => /^CAS-\d+$/.test(text(row['Casualty_Event_ID'])))
    .map((row) => {
      const id = text(row['Casualty_Event_ID']);
      const scope = text(row['Casualty_Scope']);
      const forceId = optionalText(row['Force_ID']);
      return {
        id,
        eventId: /^EVT-\d+$/.test(text(row['Event_ID'])) ? text(row['Event_ID']) : null,
        frame: optionalFrameIndex(row['Frame_ID'], `Casualties.${id}.Frame_ID`),
        faction: text(row['Faction']),
        forceId: forceId && forceById.has(forceId) ? forceId : null,
        formation: text(row['Formation']),
        location: text(row['Location']),
        battle: text(row['Battle']),
        cause: text(row['Cause']),
        kia: quantity(row['KIA_Event'], `Casualties.${id}.KIA_Event`),
        wia: quantity(row['WIA_Event'], `Casualties.${id}.WIA_Event`),
        pow: quantity(row['POW_Event'], `Casualties.${id}.POW_Event`),
        mia: quantity(row['MIA_Event'], `Casualties.${id}.MIA_Event`),
        other: quantity(row['Other_Loss'], `Casualties.${id}.Other_Loss`),
        total: quantity(row['Total_Loss'], `Casualties.${id}.Total_Loss`),
        scope,
        aggregateOf: text(row['Aggregate_Of']),
        basis: text(row['Casualty_Basis']),
        derivation: text(row['Derivation_Status']),
        confidence: confidence(row['Confidence']),
        source: [text(row['Source_Volume']), text(row['Source_Chapter'])].filter(Boolean).join(' '),
        evidence: text(row['Evidence']),
        notes: text(row['Notes']),
        countsTowardCampaignTotal: !NON_ADDITIVE.has(scope),
      } satisfies CasualtyRecord;
    });

  const additive = casualties.filter((c) => c.countsTowardCampaignTotal);
  const sumKia = (faction: string): Quantity => {
    const numbers = additive
      .filter((c) => c.faction === faction)
      .map((c) => c.kia)
      .filter((q): q is number => typeof q === 'number');
    return numbers.length ? numbers.reduce((a, b) => a + b, 0) : UNKNOWN;
  };

  const campaignTotals: CampaignTotals = {
    empireKiaCampaign: sumKia('Eastern Empire'),
    empireKiaJuraFront: 770000,
    tempestKiaConfirmed: sumKia('Jura-Tempest Federation'),
    tempestKiaUnstated: 'Shion and others (CAS-013); no figure is given, minimum 1.',
    empirePowSurfacePhase: 0,
    empirePowLaterPhases: UNKNOWN,
    wiaBothSides: UNKNOWN,
    miaBothSides: UNKNOWN,
    empireUnaccountedFor: 170000,
    excludedRows: casualties.filter((c) => !c.countsTowardCampaignTotal).map((c) => c.id),
    note:
      'Only EVENT_CASUALTY rows are summed. AGGREGATE, COMPONENT and CAMPAIGN_TOTAL rows restate ' +
      'other rows and are excluded so that no death is counted twice. WIA and MIA are UNKNOWN ' +
      'everywhere: the corpus never states them, and an unstated wounded count is not zero.',
  };

  /* -------------------------------------------------- commanders -- */

  const frameOfEvent = (id: string | null): number | null =>
    id && eventById.has(id) ? eventById.get(id)!.frame : null;

  const commanders: Commander[] = commanderRows.map((row) => {
    const id = text(row['Commander_ID']);
    const name = text(row['Name']);
    const startEvent = optionalText(row['Start_Event']);
    const endEvent = optionalText(row['End_Event']);
    const commanded = forces.filter((f) => f.commander.includes(name.split(' / ')[0]));
    const own = events.filter((e) => e.actor.includes(name.split(' / ')[0]));
    return {
      id,
      name,
      faction: text(row['Faction']),
      role: text(row['Role']),
      scope: text(row['Command_Scope']),
      startEvent,
      endEvent,
      startFrame: frameOfEvent(startEvent),
      endFrame: frameOfEvent(endEvent),
      status: text(row['Status']),
      subordinates: splitList(row['Subordinates'], /\s*[;,]\s*/),
      forceIds: commanded.map((f) => f.id),
      eventIds: own.map((e) => e.id),
      theatreIds: Array.from(new Set(own.map((e) => e.theatreId).filter(Boolean))),
      source: text(row['Source']),
      confidence: confidence(row['Confidence']),
    };
  });

  const combatants: Combatant[] = combatantRows.map((row) => {
    const firstEvent = optionalText(row['First_Event']);
    const lastEvent = optionalText(row['Last_Event']);
    return {
      id: text(row['Actor_ID']),
      name: text(row['Name']),
      faction: text(row['Faction']),
      firstEvent,
      lastEvent,
      firstFrame: frameOfEvent(firstEvent),
      lastFrame: frameOfEvent(lastEvent),
      finalStatus: text(row['Final_Status']),
      effect: text(row['Effect_On_Battlefield']),
      sourceVolumes: text(row['Source_Volumes']),
    };
  });

  /* -------------------------------------------------- movements --- */

  const movements: Movement[] = movementRows.map((row) => {
    const id = text(row['Movement_ID']);
    const to = text(row['To_Location']);
    const startEvent = optionalText(row['Start_Event']);
    const endEvent = optionalText(row['End_Event']);
    const destinationUnknown = to.toUpperCase().startsWith('UNKNOWN');
    return {
      id,
      forceId: text(row['Force_ID']),
      from: text(row['From_Location']),
      to,
      fromPlaceId: resolveLocation(text(row['From_Location'])).placeId,
      toPlaceId: destinationUnknown ? null : resolveLocation(to).placeId,
      startEvent,
      endEvent,
      startFrame: frameOfEvent(startEvent),
      endFrame: frameOfEvent(endEvent),
      type: text(row['Movement_Type']),
      basis: text(row['Movement_Basis']),
      confidence: confidence(row['Confidence']),
      notes: text(row['Notes']),
      destinationUnknown,
    };
  });

  /* -------------------------------------------------- territory --- */

  const territories: TerritoryChange[] = territoryRows.map((row) => {
    const changeEventId = optionalText(row['Change_Event']);
    return {
      id: text(row['Location_ID']),
      name: text(row['Location_Name']),
      theatreId: text(row['Theater']),
      before: text(row['Control_Before']),
      after: text(row['Control_After']),
      changeEventId,
      changeFrame: frameOfEvent(changeEventId),
      basis: text(row['Basis']),
      source: text(row['Source']),
      confidence: confidence(row['Confidence']),
      notes: text(row['Notes']),
    };
  });

  /* -------------------------------------------------- reference --- */

  const contradictions: Contradiction[] = contradictionRows
    .filter((row) => /^CON-\d+$/.test(text(row['Contradiction_ID'])))
    .map((row) => ({
      id: text(row['Contradiction_ID']),
      description: text(row['Description']),
      claimA: text(row['Claim_A']),
      claimB: text(row['Claim_B']),
      sourceA: text(row['Source_A']),
      sourceB: text(row['Source_B']),
      resolution: text(row['Resolution']),
      treatment: text(row['Final_Treatment']),
      confidence: confidence(row['Confidence']),
    }));

  const ambiguities: Ambiguity[] = ambiguityRows
    .filter((row) => /^AMB-\d+$/.test(text(row['Ambiguity_ID'])))
    .map((row) => ({
      id: text(row['Ambiguity_ID']),
      subject: text(row['Events']),
      events: text(row['Ambiguity']),
      ambiguity: text(row['Possible_Order']),
      possibleOrder: text(row['Possible_Order']),
      chosenPlacement: text(row['Chosen_Simulation_Placement']),
      confidence: confidence(row['Confidence']),
    }));

  const campaignStages: CampaignStage[] = stageRows
    .filter((row) => text(row['Stage']).length > 0)
    .map((row) => ({
      id: text(row['Stage']),
      name: text(row['Stage_Name']),
      startWarDay: text(row['Start_War_Day']),
      endWarDay: text(row['End_War_Day']),
      startDate: text(row['Start_Date']),
      endDate: text(row['End_Date']),
      startFrame: frameIdToIndex(row['Start_Frame'], 'CampaignStages.Start_Frame'),
      endFrame: frameIdToIndex(row['End_Frame'], 'CampaignStages.End_Frame'),
      definition: text(row['Definition']),
      anchorEvents: splitList(row['Anchor_Events'], /\s*[;,]\s*/),
      source: text(row['Source']),
    }));

  /* -------------------------------------------------- geography --- */

  const datasetFactions = new Set<string>();
  for (const f of forces) datasetFactions.add(f.faction);
  for (const e of events) {
    if (e.actorFaction) datasetFactions.add(e.actorFaction);
    if (e.opponentFaction) datasetFactions.add(e.opponentFaction);
  }

  const nationsInDataset = new Set<string>();
  for (const faction of datasetFactions) {
    const nid = factionNationId(faction);
    if (nid) nationsInDataset.add(nid);
  }

  const flagManifest: NationFlagManifest = {};
  const nations: Nation[] = gazetteer.nations.map((n) => {
    const hasFlag = n.hasFlag !== false;
    const asset = hasFlag ? `/assets/nation-flags/${n.category}/Flag - ${n.name}.png` : null;
    if (asset) flagManifest[n.id] = { name: n.name, category: n.category, asset };
    return {
      id: n.id,
      name: n.name,
      category: n.category,
      x: n.x,
      y: n.y,
      placement: n.placement,
      flag: asset,
      inDataset: nationsInDataset.has(n.id),
      role: nationsInDataset.has(n.id) ? 'Belligerent or co-belligerent in the Step 1 dataset' : null,
    };
  });

  const factions: Faction[] = [...datasetFactions]
    .filter((f) => f && f !== UNKNOWN)
    .sort()
    .map((id) => ({
      id,
      name: id,
      colorKey: factionColorKey(id),
      nationId: factionNationId(id),
      forceIds: forces.filter((f) => f.faction === id).map((f) => f.id),
      isMajorCombatant: FACTION_DEFS.find((d) => d.match.test(id))?.major ?? false,
    }));

  const theatres: Theatre[] = THEATRE_DEFS.map((def) => {
    const own = events.filter((e) => e.theatreId === def.id);
    const anchorPlace = def.anchorPlace ? placeById.get(def.anchorPlace) : undefined;
    const hasAnchor = anchorPlace && anchorPlace.x !== undefined && anchorPlace.y !== undefined;
    return {
      id: def.id,
      name: def.name,
      region: def.region,
      anchor: hasAnchor ? { x: anchorPlace.x!, y: anchorPlace.y! } : null,
      placement: anchorPlace ? anchorPlace.placement : 'ABSTRACT',
      zone: gazetteer.theatreZones.zones[def.id] ?? null,
      firstEvent: own[0]?.id ?? null,
      lastEvent: own[own.length - 1]?.id ?? null,
      eventCount: own.length,
      colorKey: def.colorKey,
    };
  });

  const places: Place[] = gazetteer.places.map((p) => ({
    id: p.id,
    name: p.name,
    theatre: p.theatre,
    x: p.x ?? null,
    y: p.y ?? null,
    placement: p.placement,
    altitude: p.altitude ?? (p.placement === 'ABSTRACT' ? null : 'GROUND'),
    basis: p.basis,
  }));

  /* -------------------------------------------------- manifest ---- */

  const manifest: Manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      workbook: 'Tempest_Eastern_Empire_War_Timeline.xlsx',
      workbookSha256: sha256(WORKBOOK),
      markdown: 'Tempest_Eastern_Empire_War_Timeline.md',
      markdownSha256: sha256(MARKDOWN),
      gazetteer: 'gazetteer.source.json',
    },
    clock: {
      frameCount: FRAME_COUNT,
      minutesPerFrame: MINUTES_PER_FRAME,
      framesPerHour: 6,
      framesPerDay: FRAMES_PER_DAY,
      checkpointInterval: CHECKPOINT_INTERVAL,
      calendarNote:
        'Year 9001 is an artificial simulation calendar marker introduced by Step 1. The corpus ' +
        'gives no calendar dates and no clock times; every date and time in this dataset is a ' +
        'reconstructed placement, not canon.',
    },
    campaign: {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      firstContactFrame,
      campaignDayMin: Math.min(...campaignDays),
      campaignDayMax: Math.max(...campaignDays),
      battleDayMin: Math.min(...battleDays),
      battleDayMax: Math.max(...battleDays),
    },
    coordinateSystem: {
      id: 'SIM_NORMALISED',
      description: gazetteer.about.definition,
      atlasPixelWidth: 2641,
      atlasPixelHeight: 2035,
      lngSpanDeg: 260,
      latExtentDeg: 70.26,
      disclaimer: gazetteer.about.warning,
    },
    counts: {
      frames: FRAME_COUNT,
      checkpoints: checkpointFrames.length,
      deltaFrames: deltaFrames.length,
      events: events.length,
      turningPoints: [...turningPoints.keys()].length,
      battles: battles.length,
      forces: forces.length,
      forceSnapshots: forceTracks.reduce((n, t) => n + t.snapshots.length, 0),
      positionKeys: positionTracks.reduce((n, t) => n + t.keys.length, 0),
      casualties: casualties.length,
      commanders: commanders.length,
      combatants: combatants.length,
      movements: movements.length,
      territories: territories.length,
      theatres: theatres.length,
      nations: nations.length,
      factions: factions.length,
      stages: campaignStages.length,
      contradictions: contradictions.length,
      ambiguities: ambiguities.length,
    },
  };

  /* -------------------------------------------------- write ------- */

  const written: Record<string, number> = {};
  const put = (name: string, value: unknown) => {
    written[name] = writeJson(name, value);
  };

  put('manifest.json', manifest);
  put('timeline.index.json', timelineIndex);
  put('state.deltas.json', { interval: CHECKPOINT_INTERVAL, frameCount: FRAME_COUNT, deltaFrames, deltas });
  put('keyframes.index.json', {
    interval: CHECKPOINT_INTERVAL,
    frames: checkpointFrames,
    files: checkpointFrames.map((f) => `keyframes/checkpoint-${String(f).padStart(4, '0')}.json`),
  });
  for (const frame of checkpointFrames) {
    put(`keyframes/checkpoint-${String(frame).padStart(4, '0')}.json`, checkpoints[String(frame)]);
  }
  put('events.json', events);
  put('battles.json', battles);
  put('forces.json', forces);
  put('force-tracks.json', forceTracks);
  put('movement.json', { movements, positions: positionTracks });
  put('casualties.json', { records: casualties, campaignTotals });
  put('commanders.json', commanders);
  put('combatants.json', combatants);
  put('territories.json', territories);
  put('theatres.json', theatres);
  put('places.json', places);
  put('nations.json', nations);
  put('nation-flags.json', flagManifest);
  put('factions.json', factions);
  put('stages.json', campaignStages);
  put('reference.json', { contradictions, ambiguities });

  void stateStream;

  /* -------------------------------------------------- report ------ */

  if (unresolvedLocations.size > 0) {
    console.error('\nLocations with no gazetteer entry (rendered off-map, never guessed):');
    for (const [name, count] of [...unresolvedLocations].sort((a, b) => b[1] - a[1])) {
      console.error(`  ${String(count).padStart(6)}  ${name}`);
    }
    console.error('\nAdd each to data-source/gazetteer.source.json aliases, or accept an off-map render.\n');
  }

  const totalBytes = Object.values(written).reduce((a, b) => a + b, 0);
  const rows = timelineRows.length + armyRows.length + eventRows.length;

  console.log(`  frames            ${FRAME_COUNT}`);
  console.log(`  checkpoints       ${checkpointFrames.length} (every ${CHECKPOINT_INTERVAL} frames)`);
  console.log(`  delta frames      ${deltaFrames.length}  (${((deltaFrames.length / FRAME_COUNT) * 100).toFixed(1)}% of frames carry a change)`);
  console.log(`  events            ${events.length}   battles ${battles.length}   forces ${forces.length}`);
  console.log(
    `  force snapshots   ${manifest.counts.forceSnapshots} collapsed from ${armyRows.length} rows` +
      ` (${(100 - (manifest.counts.forceSnapshots / armyRows.length) * 100).toFixed(1)}% removed as inherited)`,
  );
  console.log(`  position keys     ${manifest.counts.positionKeys}`);
  console.log(`  runtime dataset   ${(totalBytes / 1024).toFixed(0)} KB across ${Object.keys(written).length} files`);
  console.log(`  source rows read  ${rows}`);
  console.log(`\nCompiled in ${((Date.now() - started) / 1000).toFixed(1)}s -> public/data\n`);
}

function snapshotsEqual(a: ForceSnapshot, b: ForceSnapshot): boolean {
  return (
    a.strength === b.strength &&
    a.effective === b.effective &&
    a.kia === b.kia &&
    a.wia === b.wia &&
    a.pow === b.pow &&
    a.mia === b.mia &&
    a.status === b.status &&
    a.movement === b.movement &&
    a.direction === b.direction &&
    a.locationRaw === b.locationRaw &&
    a.info === b.info &&
    a.confidence === b.confidence
  );
}

function round(n: number): number {
  return Math.round(n * 100000) / 100000;
}

main();
