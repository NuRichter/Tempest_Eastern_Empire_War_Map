/* eslint-disable @typescript-eslint/no-unused-vars -- destructuring is used to drop derived runtime fields */
/**
 * ONE-TIME MIGRATION (historical record, not part of the build).
 *
 * Converted the Step 1 workbook, as normalised by the previous compiler into
 * public/data, into the declarative campaign source under data-source/campaign/.
 * Each event carries the state changes that took effect at its frame ("effects"),
 * extracted by diffing the resolved state immediately before and at that frame.
 *
 * It was run once against the pre-audit runtime dataset (Step 1 revision
 * "final", workbook sha256 recorded in data-source/campaign/revision.json).
 * After the canon audit the campaign source is edited directly; re-running this
 * script would overwrite the audited revision with the pre-audit one.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DATA = join(ROOT, 'public', 'data');
const OUT = join(ROOT, 'data-source', 'campaign');
const read = (f) => JSON.parse(readFileSync(join(DATA, f), 'utf8'));

const manifest = read('manifest.json');
const events = read('events.json');
const forces = read('forces.json');
const tracks = read('force-tracks.json');
const { movements } = read('movement.json');
const casualties = read('casualties.json');
const commanders = read('commanders.json');
const combatants = read('combatants.json');
const territories = read('territories.json');
const stages = read('stages.json');
const reference = read('reference.json');
const places = read('places.json');
const deltas = read('state.deltas.json');
const kfi = read('keyframes.index.json');
const checkpoints = kfi.files.map((f) => read(f));

const FPD = 144;
const FIRST_DAY = manifest.campaign.battleDayMin;

/* ---------------- state replay ---------------- */
const stateAt = [];
let st = checkpoints[0];
for (let f = 0; f < manifest.clock.frameCount; f += 1) {
  if (f > 0 && deltas.deltas[f]) st = { ...st, ...deltas.deltas[f] };
  stateAt.push(st);
}

const dayTime = (frame) => {
  const day = Math.floor(frame / FPD) + FIRST_DAY;
  const m = (frame % FPD) * 10;
  return { day, time: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` };
};

/* ---------------- force effects ---------------- */
const SNAP_FIELDS = ['strength', 'effective', 'kia', 'wia', 'pow', 'mia', 'status', 'movement', 'direction', 'confidence'];
const eventFrames = new Set(events.map((e) => e.frame));
const forceEffectsAt = new Map(); // frame -> {forceId: changes}
const orphanChanges = [];
const transitKeys = [];

for (const track of tracks) {
  let prev = null;
  for (const s of track.snapshots) {
    const change = {};
    for (const k of SNAP_FIELDS) if (!prev || prev[k] !== s[k]) change[k] = s[k];
    const loc = s.transitPct !== null ? null : s.placeId;
    const prevLoc = prev ? (prev.transitPct !== null ? null : prev.placeId) : undefined;
    if (s.transitPct !== null) {
      if (!prev || prev.transitPct !== s.transitPct) {
        transitKeys.push({ forceId: track.forceId, ...dayTime(s.f), pct: s.transitPct });
      }
    } else if (!prev || loc !== prevLoc || s.locationRaw !== prev.locationRaw) {
      change.location = s.placeId ?? null;
      if (s.locationRaw) change.locationText = s.locationRaw;
    }
    prev = s;
    if (Object.keys(change).length === 0) continue;
    if (!eventFrames.has(s.f)) {
      orphanChanges.push({ forceId: track.forceId, frame: s.f, change });
      continue;
    }
    const at = forceEffectsAt.get(s.f) ?? {};
    at[track.forceId] = change;
    forceEffectsAt.set(s.f, at);
  }
}

/* ---------------- theatre & campaign effects ---------------- */
const CAMPAIGN_FIELDS = ['phase', 'stage', 'tempestTotal', 'tempestEffective', 'empireTotal', 'empireEffective', 'activeCommanders', 'majorCombatants'];
function stateEffects(frame) {
  const before = frame > 0 ? stateAt[frame - 1] : null;
  const now = stateAt[frame];
  const theatres = {};
  for (const [id, th] of Object.entries(now.theatres)) {
    const b = before?.theatres[id];
    const diff = {};
    for (const k of ['status', 'frontline', 'battleStatus', 'control']) if (!b || b[k] !== th[k]) diff[k] = th[k];
    if (Object.keys(diff).length) theatres[id] = diff;
  }
  const campaign = {};
  for (const k of CAMPAIGN_FIELDS) if (!before || JSON.stringify(before[k]) !== JSON.stringify(now[k])) campaign[k] = now[k];
  return { theatres, campaign };
}

/* ---------------- events ---------------- */
const byFrame = new Map();
for (const e of events) byFrame.set(e.frame, [...(byFrame.get(e.frame) ?? []), e]);

const outEvents = events.map((e) => {
  const group = byFrame.get(e.frame);
  const owner = group[group.length - 1].id === e.id; // effects attach to the last event at a frame
  const effects = owner ? { forces: forceEffectsAt.get(e.frame) ?? {}, ...stateEffects(e.frame) } : { forces: {}, theatres: {}, campaign: {} };
  return {
    id: e.id,
    ...dayTime(e.frame),
    timeBasis: e.timeBasis,
    canonicalTime: e.canonicalTime,
    theatreId: e.theatreId,
    front: e.front,
    battle: e.battle,
    location: e.placeId,
    locationText: e.location,
    actor: e.actor,
    actorFaction: e.actorFaction,
    opponent: e.opponent,
    opponentFaction: e.opponentFaction,
    type: e.type,
    title: e.action,
    immediateResult: e.immediateResult,
    operationalResult: e.operationalResult,
    strategicResult: e.strategicResult,
    strength: { tempest: e.tempestStrength, empire: e.empireStrength },
    commandStatus: e.commandStatus,
    intensity: e.intensity,
    significance: e.significance,
    turningPoint: e.turningPoint ? { rank: e.turningPointRank, summary: e.turningPointSummary } : null,
    provenance: null,
    confidence: { time: e.timeConfidence, numbers: e.numericalConfidence, overall: e.confidence },
    sources: [{ volume: e.sourceVolume, chapter: e.sourceChapter, locator: null }],
    evidence: e.evidence,
    notes: e.notes,
    audit: { status: 'PRE_AUDIT', changes: [] },
    effects,
  };
});

mkdirSync(OUT, { recursive: true });
const put = (name, value) => writeFileSync(join(OUT, name), JSON.stringify(value, null, 1) + '\n');

put('revision.json', {
  revision: 'STEP1-FINAL (pre-audit migration)',
  migratedFrom: manifest.source,
  clock: { minutesPerFrame: 10, framesPerDay: FPD, firstDay: FIRST_DAY, lastDay: manifest.campaign.battleDayMax, calendarStart: manifest.campaign.startDate },
  note: 'Pre-audit baseline. See docs/audit/timeline-canon-audit.md for the corrections applied afterwards.',
});
put('events.json', outEvents);
put('forces.json', forces.map(({ childIds, depth, countedInParent, firstFrame, lastFrame, ...f }) => f));
put('transit.json', transitKeys);
put('movements.json', movements.map(({ fromPlaceId, toPlaceId, startFrame, endFrame, ...m }) => ({ ...m, fromPlace: fromPlaceId, toPlace: toPlaceId })));
put('casualties.json', casualties.records.map(({ frame, ...c }) => c));
put('commanders.json', commanders.map(({ startFrame, endFrame, forceIds, eventIds, theatreIds, ...c }) => c));
put('combatants.json', combatants.map(({ firstFrame, lastFrame, ...c }) => c));
put('territory-changes.json', territories.map(({ changeFrame, ...t }) => t));
put('stages.json', stages.map(({ startFrame, endFrame, ...s }) => s));
put('reference.json', reference);

console.log(`events ${outEvents.length}, transit keys ${transitKeys.length}, orphan force changes ${orphanChanges.length}`);
for (const o of orphanChanges.slice(0, 40)) console.log('  orphan', o.forceId, o.frame, JSON.stringify(o.change));
void places;
