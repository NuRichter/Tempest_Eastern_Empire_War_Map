/**
 * One-off migration R5-CANON-AUDIT -> R6-SCENARIO-LEDGER (2026-10-11).
 *
 * Applies the owner's scenario force ledger (docs/CAMPAIGN_FORCE_LEDGER.md)
 * and the calibrated geography (docs/GEOGRAPHIC_MODEL.md) to the campaign
 * sources. Kept in the repository as the record of exactly what changed; it is
 * not part of the build and is not meant to be run twice.
 *
 *   npx tsx scripts/migrate/scenario-ledger.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TerrainGrid } from '../lib/routing';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'data-source');
const C = join(SRC, 'campaign');

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;
const load = (p: string): J => JSON.parse(readFileSync(p, 'utf8'));
const save = (p: string, v: unknown, indent = 1) => writeFileSync(p, JSON.stringify(v, null, indent) + '\n');

const SCENARIO_REF = { volume: 'Scenario', chapter: null, locator: 'docs/CAMPAIGN_FORCE_LEDGER.md' };
const AUDIT = (changes: string[]) => ({ status: 'CORRECTED', changes: ['R6 scenario ledger: ' + changes.join(' ')] });

/* ------------------------------------------------------------------ */
/* Gazetteer                                                           */
/* ------------------------------------------------------------------ */

const gz = load(join(SRC, 'gazetteer.source.json'));
const place = (id: string) => {
  const p = gz.places.find((x: J) => x.id === id);
  if (!p) throw new Error(`no place ${id}`);
  return p;
};
const RENAME_PLACE: Record<string, string> = { 'dwargon-gate-front': 'sw-dwargon-front', 'dwargon-gate-airspace': 'sw-dwargon-airspace' };
for (const p of gz.places) if (RENAME_PLACE[p.id]) p.id = RENAME_PLACE[p.id];

const MOVE: Record<string, [number, number, string?, string?]> = {
  'jura-forest-edge': [0.672, 0.52, 'Imperial halt point (forest edge)', 'Where the single 1,005,000-strong main formation halts and splits (scenario). The novels say only that the army halted inside Tempest territory "soon after" the month mark (v13.txt:341-346). Placed by the travel-time constraints the halt must satisfy under the calibrated scale: the infantry must reach a camp about 30 km from Rimuru (v13.txt:386-389) and the magitanks a position about 30 km from Dwargon (v13.txt:513-515) by D+0 morning at the novels\' stated march rates (docs/GEOGRAPHIC_MODEL.md). West of the upper ford of the eastern river, on the forest side.'],
  'imperial-infantry-camp': [0.6423, 0.5573, undefined, 'Soei reports the imperial infantry camped about thirty kilometres from the capital Rimuru with command posts (V13 Ch1, v13.txt:386-389). Placed 30 km from Rimuru under the calibrated scale, on the bearing from the halt point.'],
  'imperial-siege-camp': [0.64, 0.5602],
  'camp-left-flank': [0.6408, 0.5592],
  'camp-right-flank': [0.6394, 0.5614],
  'sw-dwargon-front': [0.6535, 0.4175, 'Southwestern Dwargon front', 'Scenario: Formation B (the Magitank Force) attacks Dwargon through its south-western border. The novels array the 2,000 magitanks about thirty kilometres from the centre of Dwargon, facing the front gate (v13.txt:513-517). Placed 30 km south-south-west of Dwargon under the calibrated scale, at the head of the south-western valley.'],
  'sw-dwargon-airspace': [0.6535, 0.4175, 'Airspace over the southwestern Dwargon front', 'Directly above sw-dwargon-front: the Flying Combat Corps arrives over the magitank battle (v13.txt:3065).'],
  'imperial-chariot-line': [0.6531, 0.418],
  'green-legion-start-line': [0.6524, 0.4189],
  'linked-fortress-position': [0.6533, 0.4176],
  'encircled-position': [0.653, 0.4183],
  'feigned-withdrawal-line': [0.6522, 0.4195],
  'attempted-rally-point': [0.654, 0.4168],
  'magitank-hq': [0.6514, 0.423, undefined, 'Gaster\'s main camp lay far behind the battle line (V13 Ch2, v13.txt:5620); Testarossa kills him there. Placed about 25 km back down the south-western valley from the array.'],
  'magitank-rear': [0.6504, 0.4256, undefined, 'Hakuro takes 12,000 on a detour of more than 40 km to the magitank rear (v13.txt:4084-4088). Placed behind the main camp, down the valley.'],
  'dwargon-outer-gate': [0.6566, 0.416, 'Dwargon southern gate (front door)', 'The gate the magitanks\' muzzles face, which Rimuru had visited several times (v13.txt:516-517); Tempest\'s troops camp there and the Dwarven Knights raise earth walls before it. On the southern road about 18 km from the city.'],
  'dwargon-eastern-metropolis': [0.722, 0.424, 'Dwargon Gate (eastern metropolis, Isthmus)', 'Dwargon\'s gate east of the city, at the Isthmus, facing the Empire (v13.txt:697-699), five hundred kilometres south-west of the imperial capital (v14.txt:10863-10866; 575 km under the calibrated scale). The single Dwargon Gate location of the scenario: the 5,000 detachment blockades it and the Gate force (30,000 + 30,000) masses before it.'],
  'dwargon-defensive-line': [0.7335, 0.4199],
  'dwargon-eastern-front': [0.7363, 0.4176, undefined, 'The battle line outside the Dwargon Gate on the isthmus plain, one step east of the gate.'],
  'ritual-caster-position': [0.74, 0.4149],
  'legion-landing-ground': [0.7447, 0.4137],
};
for (const [id, [x, y, name, basis]] of Object.entries(MOVE)) {
  const p = place(id);
  p.x = x;
  p.y = y;
  if (name) p.name = name;
  if (basis) p.basis = basis;
}
const ADD_PLACES = [
  { id: 'northern-tempest-front', name: 'Northern Tempest front (Tempest-Dwargon road)', theatre: 'TH-DWG', x: 0.6515, y: 0.49, placement: 'RECONSTRUCTED', basis: 'Scenario: Formation B threatens the logistics link between Tempest and Dwargon in northern Tempest, and the 40,000 northern reinforcement joins this front. Placed on the reconstructed Tempest-Dwargon road (v12.txt:3279-3281) at the massif\'s southern foot.' },
  { id: 'dwargon-sw-border', name: 'Dwargon south-western border crossing', theatre: 'TH-DWG', x: 0.632, y: 0.472, placement: 'RECONSTRUCTED', basis: 'Scenario: where Formation B crosses Dwargon\'s south-western border into the south-western valley. On the traced Dwargon-Jura border of the Base Map.' },
  { id: 'dwargon-south-approach', name: 'Southern approach to Dwargon', theatre: 'TH-DWG', x: 0.672, y: 0.484, placement: 'RECONSTRUCTED', basis: 'Scenario: the 35,000-strong southern formation approaches Dwargon from the south, east of the Tempest-Dwargon road and south of the Dwargon Gate. Placed in the massif\'s southern foothills, just outside the Base Map border.' },
  { id: 'isthmus-approach', name: 'Isthmus road (Empire side)', theatre: 'TH-DWE', x: 0.752, y: 0.412, placement: 'RECONSTRUCTED', basis: 'Scenario: the 5,000 detachment\'s holding position on the Empire side of the Dwargon Gate, on the reconstructed isthmus road.' },
];
for (const p of ADD_PLACES) if (!gz.places.some((q: J) => q.id === p.id)) gz.places.push(p);
gz.theatreZones.zones['TH-DWG'] = [[0.624, 0.468], [0.638, 0.415], [0.652, 0.405], [0.668, 0.412], [0.68, 0.47], [0.672, 0.498], [0.65, 0.505], [0.632, 0.49]];
gz.theatreZones.zones['TH-DWE'] = [[0.714, 0.408], [0.735, 0.4], [0.758, 0.404], [0.762, 0.418], [0.745, 0.43], [0.722, 0.434], [0.712, 0.425]];
gz.theatreZones.note = 'Schematic areas of operations, not borders. Hand-authored convex rings around the theatre anchor so that territorial control has something to shade. Marked SCHEMATIC everywhere they are drawn. The supplied maps contain no theatre boundaries. R6: TH-DWG now covers the northern Tempest corridor and the south-western Dwargon approach, TH-DWE the Dwargon Gate on the isthmus.';
save(join(SRC, 'gazetteer.source.json'), gz, 2);

/* ------------------------------------------------------------------ */
/* Forces                                                              */
/* ------------------------------------------------------------------ */

const forces: J[] = load(join(C, 'forces.json'));
const force = (id: string) => {
  const f = forces.find((x) => x.id === id);
  if (!f) throw new Error(`no force ${id}`);
  return f;
};
const scen = (f: J, fields: J) => Object.assign(f, fields);

scen(force('F-EMP-001'), {
  notes: force('F-EMP-001').notes + ' R6: the scenario\'s single main formation (1,005,000) exceeds this stated ceiling of "at most one million at once" by 5,000; see reference DISC-R6-03. F-EMP-010 now reports to F-EMP-040 directly.',
});
scen(force('F-EMP-010'), {
  army: 'Imperial Army',
  formation: 'Main invasion formation (single column until the halt point)',
  displayName: 'Main invasion formation',
  parentId: 'F-EMP-040',
  role: 'Advances as one formation across the Tempest border to the halt point, then splits into five allocations (700,000 + 200,000 + 40,000 + 30,000 + 35,000).',
  unitType: 'combined arms (armour, modified infantry, air)',
  initialStrengthRaw: '1,005,000 (scenario)',
  initialBest: 1005000,
  sizeStatus: 'SCENARIO',
  sizeEvidence: 'Scenario figure (owner brief, docs/CAMPAIGN_FORCE_LEDGER.md). The novels give 940,000 for Caligulio\'s invasion army (v13.txt:16208), made of 700,000 + 200,000 + 40,000; the scenario adds a 30,000 Dwargon Gate allocation and a 35,000 southern allocation inside the same main formation. See reference DISC-R6-01.',
  finalStrength: 0,
  finalStatus: 'Dissolved into its five allocations at the halt point (D-3); its strength after the split is the sum of the allocations still under its command.',
  strengthBasis: 'SCENARIO',
  hierarchyProvenance: 'SCENARIO',
  ledgerRole: 'MAIN',
  aggregateFromEvent: 'EVT-0503',
  notes: 'R6 scenario ledger. Before R6 this row was the 940,000-strong Jura invasion army (canon). The id is kept so that every event about the invasion army still resolves.',
});
for (const [id, extra] of Object.entries({
  'F-EMP-011': { displayName: 'Formation A (Restructured Armor Corps)', role: 'Formation A: the Great Jura Labyrinth and the Tempest capital objectives' },
  'F-EMP-012': { displayName: 'Formation B (Magitank Force)', role: 'Formation B: northern Tempest, interdiction of the Tempest-Dwargon link, then the south-western offensive on Dwargon, which fails', finalLocation: 'Southwestern Dwargon front' },
  'F-EMP-013': { displayName: 'Northern reinforcement (Flying Combat Corps)', role: 'Northern reinforcement allocation: reinforces the northern Tempest front, then flies to the south-western Dwargon battle' },
}) as [string, J][]) {
  const f = force(id);
  scen(f, { ...extra, ledgerRole: 'ALLOCATION', origin: { kind: 'SPLIT', fromForceId: 'F-EMP-010', eventId: 'EVT-0503' } });
  f.notes = `${f.notes ? f.notes + ' ' : ''}R6: one of the five allocations of the main formation, issued at the halt point (EVT-0503); never drawn as an independent formation before it.`;
}
force('F-EMP-012').finalStatus = 'Annihilated at the south-western Dwargon front on D+0; the offensive into Dwargon failed';
const newForce = (o: J): J => ({
  faction: 'Eastern Empire', army: 'Imperial Army', commander: 'Not stated', commanderIds: [], unitType: 'infantry',
  sizeStatus: 'SCENARIO', finalStrength: 'UNKNOWN', source: 'Scenario (docs/CAMPAIGN_FORCE_LEDGER.md)', sourceRefs: [SCENARIO_REF],
  confidence: 'MEDIUM', hierarchyProvenance: 'SCENARIO', strengthBasis: 'SCENARIO', kia: 'UNKNOWN', wia: 'UNKNOWN', pow: 'UNKNOWN', mia: 'UNKNOWN',
  initialMin: o.initialBest, initialMax: o.initialBest, finalMovementStatus: 'STATIONARY', notes: '', ...o,
});
const ADD_FORCES = [
  newForce({
    id: 'F-EMP-017', formation: 'Dwargon Gate reinforcement, Phase 1', displayName: 'Gate reinforcement, Phase 1', parentId: 'F-EMP-010',
    role: 'Advances from the halt point to the Dwargon Gate (Isthmus) and joins the Gate force', initialStrengthRaw: '30,000 (scenario)', initialBest: 30000,
    sizeEvidence: 'Scenario allocation of the main formation. Not in the novels: there the 60,000 before the Isthmus are all Composite Division (v14.txt:640-641). See DISC-R6-02.',
    finalStatus: 'Merged into the Dwargon Gate force on arrival (D+5)', finalLocation: 'Dwargon Gate', ledgerRole: 'ALLOCATION',
    origin: { kind: 'SPLIT', fromForceId: 'F-EMP-010', eventId: 'EVT-0503' }, mergedInto: { forceId: 'F-EMP-031', eventId: 'EVT-0509' },
  }),
  newForce({
    id: 'F-EMP-018', formation: 'Southern Dwargon formation', displayName: 'Southern formation', parentId: 'F-EMP-010',
    role: 'Approaches Dwargon from the south along its own route, south of the Dwargon Gate', initialStrengthRaw: '35,000 (scenario)', initialBest: 35000,
    sizeEvidence: 'Scenario allocation of the main formation. Not in the novels.', finalStatus: 'Survivors withdraw towards the Empire after the war (D+17); its share of the 10,000 unattributed deaths is not established',
    finalLocation: 'Withdrawing towards the Empire', ledgerRole: 'ALLOCATION', origin: { kind: 'SPLIT', fromForceId: 'F-EMP-010', eventId: 'EVT-0503' },
  }),
  newForce({
    id: 'F-EMP-019', formation: 'Initial Dwargon detachment', displayName: 'Dwargon detachment', parentId: 'F-EMP-040',
    role: 'Advances separately from the main formation towards Dwargon and blockades the Dwargon Gate until the Gate force arrives', initialStrengthRaw: '5,000 (scenario)', initialBest: 5000,
    sizeEvidence: 'Scenario. Part of the initial forward deployment (1,005,000 + 5,000) but never of the main formation.', finalStatus: 'Survivors withdraw to the Empire after the war; its share of the 10,000 unattributed deaths is not established',
    finalLocation: 'Withdrawing to the Empire', ledgerRole: 'DETACHMENT',
  }),
  newForce({
    id: 'F-EMP-080', formation: 'Imperial capital emergency reserve', displayName: 'Capital reserve', parentId: 'F-EMP-030',
    role: 'Emergency reserve held at the imperial capital, outside the invasion operation; 30,000 of it are transferred to the Dwargon Gate in Phase 2', initialStrengthRaw: '100,000 (scenario)', initialBest: 100000,
    unitType: 'infantry (reserve)', sizeEvidence: 'Scenario. Corresponds to the Composite Division\'s about 100,000 fighting troops, the half that is not intelligence or general service (v12.txt:10184-10187), which also guards the capital.',
    finalStrength: 70000, finalStatus: '70,000 remain at the capital after the Phase 2 transfer', finalLocation: 'Imperial Capital', ledgerRole: 'RESERVE',
  }),
  newForce({
    id: 'F-EMP-081', formation: 'Dwargon Gate reinforcement, Phase 2', displayName: 'Gate reinforcement, Phase 2', parentId: null,
    role: 'Transferred from the capital reserve to the Dwargon Gate; the only movement that adds personnel to the operation after the initial deployment', initialStrengthRaw: '30,000 (scenario)', initialBest: 30000,
    sizeEvidence: 'Scenario. The same personnel as 30,000 of the capital reserve, which falls from 100,000 to 70,000 at departure.',
    finalStatus: 'Merged into the Dwargon Gate force on arrival (D+8)', finalLocation: 'Dwargon Gate', ledgerRole: 'TRANSFER',
    origin: { kind: 'TRANSFER', fromForceId: 'F-EMP-080', eventId: 'EVT-0516' }, mergedInto: { forceId: 'F-EMP-031', eventId: 'EVT-0517' },
  }),
  newForce({
    id: 'F-EMP-090', formation: 'Revived imperial soldiers (held in Tempest)', displayName: 'Revived soldiers', parentId: null,
    role: 'The 700,000 dead of the Jura fighting brought back by Rimuru; prisoners in Tempest, later marched home', initialStrengthRaw: 'about 700,000', initialBest: 700000,
    unitType: 'infantry (prisoners, revived)', sizeStatus: 'EXPLICIT', sizeEvidence: 'Rimuru resurrects about 700,000 (v14.txt). A state change of personnel already counted, not a new deployment: they are a subset of the recorded dead.',
    finalStrength: 700000, finalStatus: 'Marched home by Caligulio after the summit', finalLocation: 'Returning to the Empire', ledgerRole: 'REVIVED_COHORT', hierarchyProvenance: 'CANONICAL',
    sourceRefs: [{ volume: '14', chapter: null, locator: 'v14.txt:1124' }], source: 'V14; scenario ledger',
  }),
];
for (const f of ADD_FORCES) if (!forces.some((x) => x.id === f.id)) forces.splice(forces.findIndex((x) => x.id === 'F-EMP-020'), 0, f);
scen(force('F-EMP-031'), {
  formation: 'Dwargon Gate force (Phase 1 + Phase 2 reinforcements)', displayName: 'Dwargon Gate force', parentId: null,
  role: 'The force massed before the Dwargon Gate: 30,000 from the main formation (Phase 1) and 30,000 from the capital reserve (Phase 2)',
  initialStrengthRaw: '0, then 30,000 (Phase 1 arrival), then 60,000 (Phase 2 arrival)', initialBest: 30000, sizeStatus: 'SCENARIO',
  sizeEvidence: 'Scenario composition of the 60,000 the novels place before the Isthmus (v13.txt:7710-7714; v14.txt:640-641). In the novels all 60,000 are Composite Division under Yuuki; see DISC-R6-02.',
  hierarchyProvenance: 'SCENARIO', ledgerRole: 'GATE_FORCE',
  notes: 'R6: before R6 this row was the Composite Division\'s Isthmus blockade force. The id is kept because every V13-V15 event about the 60,000 before the Isthmus refers to it.',
});
scen(force('F-EMP-020'), { ledgerRole: 'OUTSIDE_OPERATION', notes: `${force('F-EMP-020').notes} R6: a separate airborne operation (the strike on the West, v12.txt:10863-10871), diverted to Dwargon on D+15; not part of the invasion operation's 1,040,000 and not counted in its ledger. See DISC-R6-05.` });
scen(force('F-EMP-016'), { notes: `${force('F-EMP-016').notes} R6: part of the main formation's 1,005,000; it rejoins at the halt point.` });
save(join(C, 'forces.json'), forces);

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const EV_FILES = ['01-preparation-and-approach', '02-surface-battle', '03-labyrinth', '04-long-night', '05-settlement'];
const files: Record<string, J[]> = Object.fromEntries(EV_FILES.map((f) => [f, load(join(C, 'events', `${f}.json`))]));
const ev = (id: string): J => {
  for (const list of Object.values(files)) {
    const e = list.find((x) => x.id === id);
    if (e) return e;
  }
  throw new Error(`no event ${id}`);
};
const renameInEvent = (e: J) => {
  if (RENAME_PLACE[e.location]) e.location = RENAME_PLACE[e.location];
  for (const eff of Object.values(e.effects.forces) as J[]) if (eff.location && RENAME_PLACE[eff.location]) eff.location = RENAME_PLACE[eff.location];
};
for (const list of Object.values(files)) for (const e of list) renameInEvent(e);
const dropForceEffects = (id: string, forceIds: string[], why: string) => {
  const e = ev(id);
  for (const f of forceIds) delete e.effects.forces[f];
  if (e.forces) e.forces = e.forces.filter((f: string) => !forceIds.includes(f) || f === 'F-EMP-010');
  e.audit = { status: e.audit.status === 'ADDED' ? 'ADDED' : 'CORRECTED', changes: [...e.audit.changes, `R6 scenario ledger: ${why}`] };
};

// Departure: one formation, plus the detachment's own event below.
{
  const e = ev('EVT-0003');
  e.title = 'The 1,005,000-strong main formation leaves the Empire as one column';
  e.strength = { tempest: 'UNKNOWN', empire: 1005000, note: 'Scenario main formation. The novels give 940,000 for the invasion army (v13.txt:16208). The separate 5,000 detachment and the 100,000 capital reserve are not in this figure.' };
  e.effects.forces = {
    'F-EMP-010': { ...e.effects.forces['F-EMP-010'], strength: 1005000, sizeStatus: 'SCENARIO', status: 'ADVANCING', movement: 'ADVANCE', location: 'imperial-capital' },
  };
  e.forces = ['F-EMP-010'];
  e.audit = AUDIT(['The main formation departs as one column of 1,005,000; the 700,000, 200,000 and 40,000 elements no longer move separately before the halt.']);
}
dropForceEffects('EVT-0024', ['F-EMP-011', 'F-EMP-012', 'F-EMP-013'], 'only the single main formation is at the border base; its strength is not re-read from the Argos image.');
delete ev('EVT-0024').effects.forces['F-EMP-010'].strength;
dropForceEffects('EVT-0013', ['F-EMP-012'], 'the magitanks are still inside the single main column before the halt; the effect moves to F-EMP-010.');
ev('EVT-0013').effects.forces['F-EMP-010'] = { status: 'ADVANCING', movement: 'ADVANCE', direction: 'South-west, slowly by design' };
dropForceEffects('EVT-0023', ['F-EMP-031'], 'the force before the Isthmus is formed later, from the Phase 1 and Phase 2 reinforcements.');
ev('EVT-0023').effects.forces['F-EMP-080'] = { strength: 100000, sizeStatus: 'SCENARIO', status: 'RESERVE', movement: 'STATIONARY', location: 'imperial-capital', locationText: 'Imperial Capital (emergency reserve)' };

// The border is crossed when the measured approach route reaches it (set below with the transit keys).
// The halt.
{
  const e = ev('EVT-0019');
  e.day = -3;
  e.time = '14:00';
  e.title = 'The main formation halts at the forest edge';
  e.location = 'jura-forest-edge';
  e.locationText = 'Imperial halt point (forest edge, west of the upper ford)';
  e.strength = { tempest: 'UNKNOWN', empire: 1005000, note: 'The single main formation (scenario).' };
  e.effects.forces = {
    'F-EMP-010': { status: 'HALTED', movement: 'HALT', direction: '-', location: 'jura-forest-edge', locationText: 'Imperial halt point (forest edge)' },
    'F-EMP-016': e.effects.forces['F-EMP-016'],
  };
  e.forces = ['F-EMP-010', 'F-EMP-016'];
  e.reconstructionNote = '"Soon after" the month mark (D-3 12:00). Placed at D-3 14:00 because the allocations must reach their D+0 positions at the novels\' stated march rates (docs/GEOGRAPHIC_MODEL.md). The halt position is not stated; see the jura-forest-edge basis.';
  e.audit = AUDIT(['Halt moved from D-2 08:00 to D-3 14:00 (travel-time constraints).', 'Only the single main formation halts; the split follows as EVT-0503.']);
}
{
  const e = ev('EVT-0020');
  e.day = -3;
  e.time = '16:00';
  e.title = 'Formation A: 700,000 imperial infantry march into the forest';
  e.audit = AUDIT(['Moved to D-3 16:00, after the split at the halt point.']);
}
{
  const e = ev('EVT-0029');
  e.day = 0;
  e.time = '04:00';
  e.reconstructionNote = 'Soei reports the camp on D+0. Placed before dawn on D+0: the measured route from the halt point is about 280 km, which takes the 700,000 about 2.6 days at the forecast rate.';
  e.audit = AUDIT(['Moved from D-1 18:00 to D+0 04:00 (measured route length).']);
}
// Gate blockade at D+0 is the detachment's.
{
  const e = ev('EVT-0016');
  delete e.effects.forces['F-EMP-031'];
  e.effects.forces['F-EMP-019'] = { status: 'BLOCKADING', movement: 'STATIONARY', location: 'dwargon-eastern-front', locationText: 'Before the Dwargon Gate (Isthmus)' };
  e.forces = ['F-EMP-019'];
  e.strength = { tempest: 'UNKNOWN', empire: 5000, note: 'Scenario: the 5,000 detachment is the blockade Gazel reports. The novels state no strength here; 60,000 is first stated later (V13 Ch3), which in the scenario is the Gate force after both reinforcements.' };
  e.audit = AUDIT(['The blockade reported on D+0 is the 5,000 detachment (scenario); the 60,000 Gate force forms later.']);
}
// Surface battle: the aggregate main formation is no longer written by hand.
for (const id of ['EVT-0115', 'EVT-0119', 'EVT-0207', 'EVT-0219']) dropForceEffects(id, ['F-EMP-010'], 'the main formation\'s strength after the split is the sum of its allocations, computed by the compiler.');
{
  const e = ev('EVT-0030');
  e.title = '2,000 magitanks of Formation B arrayed about 30 km from Dwargon\'s centre, inside its south-western border';
  e.audit = AUDIT(['Location: the south-western Dwargon front (scenario approach through the south-western border).']);
}
// Resurrection: the revived cohort, not the dissolved main formation.
for (const id of ['EVT-0220', 'EVT-0403', 'EVT-0395', 'EVT-0455']) {
  const e = ev(id);
  const eff = e.effects.forces['F-EMP-010'];
  delete e.effects.forces['F-EMP-010'];
  if (eff) e.effects.forces['F-EMP-090'] = eff;
  if (e.forces) e.forces = e.forces.map((f: string) => (f === 'F-EMP-010' ? 'F-EMP-090' : f));
  e.audit = AUDIT(['The revived soldiers are their own cohort (F-EMP-090), not the dissolved main formation.']);
}
Object.assign(ev('EVT-0220').effects.forces['F-EMP-090'], { strength: 700000, sizeStatus: 'EXPLICIT', status: 'REVIVED', movement: 'STATIONARY', location: 'ramiris-labyrinth', locationText: 'Held in Tempest (revived)' });
ev('EVT-0220').type = 'PERSONNEL_REVIVED';

/* -- new scenario events ------------------------------------------- */

const base = (o: J): J => ({
  timePrecision: 'RECONSTRUCTED', canonicalTime: '-', battle: null, battleType: null,
  actor: 'Imperial Army', actorFaction: 'Eastern Empire', opponent: 'Jura-Tempest Federation', opponentFaction: 'Jura-Tempest Federation',
  characters: [], immediateResult: '', operationalResult: '', strategicResult: '', strength: { tempest: 'UNKNOWN', empire: 'UNKNOWN' },
  intensity: 'LOW', significance: 'MEDIUM', turningPoint: null, provenance: 'SCENARIO',
  confidence: { time: 'LOW', numbers: 'HIGH', overall: 'MEDIUM' }, sources: [SCENARIO_REF], notes: '',
  audit: { status: 'ADDED', changes: ['R6 scenario ledger (2026-10-11).'] }, effects: { forces: {}, theatres: {}, campaign: {} }, ...o,
});
const add = (file: string, e: J) => {
  if (files[file].some((x) => x.id === e.id)) return;
  files[file].push(e);
};
const P1 = '01-preparation-and-approach';
add(P1, base({
  id: 'EVT-0501', day: -39, time: '07:50', theatreId: 'TH-CAP', location: 'imperial-capital', locationText: 'Imperial Capital', type: 'FORMATION_CREATED',
  title: 'The 100,000-strong emergency reserve stays at the imperial capital',
  immediateResult: 'A 100,000-strong reserve is held back at the capital, outside the invasion operation.',
  strength: { tempest: 'UNKNOWN', empire: 100000, note: 'Capital reserve (scenario); not part of the forward deployment.' },
  evidence: 'Scenario brief: the reserve stays at the capital and only its later 30,000 transfer enters the operation.',
  reconstructionNote: 'Placed just before the main formation departs.',
  effects: { forces: { 'F-EMP-080': { strength: 100000, sizeStatus: 'SCENARIO', status: 'RESERVE', movement: 'STATIONARY', location: 'imperial-capital', locationText: 'Imperial Capital (emergency reserve)' } }, theatres: {}, campaign: {} },
}));
add(P1, base({
  id: 'EVT-0502', day: -39, time: '08:10', theatreId: 'TH-DWE', location: 'imperial-capital', locationText: 'Imperial Capital', type: 'FORMATION_DEPARTED',
  title: 'A separate 5,000-strong detachment sets out towards Dwargon',
  immediateResult: 'The detachment leaves on its own road, towards the isthmus and Dwargon\'s eastern gate.',
  strength: { tempest: 'UNKNOWN', empire: 5000, note: 'With the 1,005,000 main formation: 1,010,000 forward-deployed (scenario).' },
  evidence: 'Scenario brief.',
  effects: { forces: { 'F-EMP-019': { strength: 5000, sizeStatus: 'SCENARIO', status: 'ADVANCING', movement: 'ADVANCE', direction: 'South-west, towards the isthmus', location: 'imperial-capital', locationText: 'Imperial Capital' } }, theatres: {}, campaign: {} },
}));
add(P1, base({
  id: 'EVT-0521', day: -33, time: '12:00', theatreId: 'TH-DWE', location: 'isthmus-approach', locationText: 'Isthmus road (Empire side)', type: 'FORMATION_HALTED',
  title: 'The detachment halts on the isthmus road, short of the Dwargon Gate',
  evidence: 'Scenario. The novels have Gazel keep Dwargon\'s army concentrated at the Isthmus to watch the Empire (EVT-0457).',
  effects: { forces: { 'F-EMP-019': { status: 'HOLDING', movement: 'STATIONARY', location: 'isthmus-approach', locationText: 'Isthmus road (Empire side)' } }, theatres: {}, campaign: {} },
}));
add(P1, base({
  id: 'EVT-0522', day: -1, time: '06:00', theatreId: 'TH-DWE', location: 'isthmus-approach', locationText: 'Isthmus road (Empire side)', type: 'FORMATION_DEPARTED',
  title: 'The detachment closes on the Dwargon Gate',
  evidence: 'Scenario. Precedes the blockade Gazel reports on D+0 (v13.txt:697-699).',
  effects: { forces: { 'F-EMP-019': { status: 'ADVANCING', movement: 'ADVANCE', direction: 'West, to the gate' } }, theatres: {}, campaign: {} },
}));
add(P1, base({
  id: 'EVT-0503', day: -3, time: '15:00', theatreId: 'TH-DWG', location: 'jura-forest-edge', locationText: 'Imperial halt point', type: 'FORMATION_SPLIT',
  title: 'At the halt point the main formation splits into five allocations',
  immediateResult: '700,000 for the Labyrinth and the capital, 200,000 for northern Tempest, 40,000 to reinforce the northern front, 30,000 for the Dwargon Gate and 35,000 for the southern approach to Dwargon.',
  operationalResult: 'The single column becomes five formations; none of them adds a soldier: 700,000 + 200,000 + 40,000 + 30,000 + 35,000 = 1,005,000.',
  strength: { tempest: 'UNKNOWN', empire: 1005000, note: 'Parent strength preserved by the split (scenario).' },
  significance: 'CRITICAL', intensity: 'LOW',
  evidence: 'Scenario brief. The novels say the army halted and issued its formations (v13.txt:341-346); the five-way split and the 30,000 and 35,000 allocations are the scenario\'s.',
  reconstructionNote: 'An hour after the halt.',
  effects: {
    forces: {
      'F-EMP-010': { status: 'SPLIT', movement: 'STATIONARY', location: null, locationText: 'Split into five allocations at the halt point' },
      'F-EMP-011': { strength: 700000, sizeStatus: 'EXPLICIT', status: 'DEPLOYED', movement: 'STATIONARY', location: 'jura-forest-edge', locationText: 'Imperial halt point' },
      'F-EMP-012': { strength: 200000, sizeStatus: 'EXPLICIT', status: 'DEPLOYED', movement: 'STATIONARY', location: 'jura-forest-edge', locationText: 'Imperial halt point' },
      'F-EMP-013': { strength: 40000, sizeStatus: 'EXPLICIT', status: 'DEPLOYED', movement: 'STATIONARY', location: 'jura-forest-edge', locationText: 'Imperial halt point' },
      'F-EMP-017': { strength: 30000, sizeStatus: 'SCENARIO', status: 'DEPLOYED', movement: 'STATIONARY', location: 'jura-forest-edge', locationText: 'Imperial halt point' },
      'F-EMP-018': { strength: 35000, sizeStatus: 'SCENARIO', status: 'DEPLOYED', movement: 'STATIONARY', location: 'jura-forest-edge', locationText: 'Imperial halt point' },
    },
    theatres: { 'TH-DWG': { frontline: 'Main formation split at the halt point into five allocations' } },
    campaign: {},
  },
}));
const dep = (id: string, day: number, time: string, forceId: string, title: string, dir: string, theatre = 'TH-DWG', type = 'FORMATION_DEPARTED', extra: J = {}) =>
  base({ id, day, time, theatreId: theatre, location: 'jura-forest-edge', locationText: 'Imperial halt point', type, title, evidence: 'Scenario brief.', effects: { forces: { [forceId]: { status: 'ADVANCING', movement: 'ADVANCE', direction: dir } }, theatres: {}, campaign: {} }, ...extra });
add(P1, dep('EVT-0504', -3, '16:00', 'F-EMP-012', 'Formation B (200,000) sets out for northern Tempest', 'North-west, to the Tempest-Dwargon road'));
add(P1, dep('EVT-0506', -3, '16:30', 'F-EMP-013', 'The 40,000 northern reinforcement takes off for the northern Tempest front', 'North-west (airships)'));
add(P1, dep('EVT-0508', -3, '17:00', 'F-EMP-017', 'Gate reinforcement, Phase 1 (30,000) sets out for the Dwargon Gate', 'North-east, across the upper ford to the isthmus', 'TH-DWE', 'REINFORCEMENT_DISPATCHED'));
add(P1, dep('EVT-0510', -3, '17:30', 'F-EMP-018', 'The 35,000 southern formation sets out for Dwargon\'s southern approach', 'North, to the massif\'s southern foothills'));
add(P1, base({
  id: 'EVT-0507', day: -3, time: '18:30', theatreId: 'TH-DWG', location: 'northern-tempest-front', locationText: 'Northern Tempest front', type: 'REINFORCEMENT_ARRIVED',
  title: 'The northern reinforcement reaches the northern Tempest front',
  evidence: 'Scenario brief. About 170 km by airship.',
  effects: { forces: { 'F-EMP-013': { status: 'REINFORCING', movement: 'STATIONARY', location: 'northern-tempest-front', locationText: 'Over the northern Tempest front' } }, theatres: {}, campaign: {} },
}));
add(P1, base({
  id: 'EVT-0505', day: -2, time: '10:00', theatreId: 'TH-DWG', location: 'northern-tempest-front', locationText: 'Northern Tempest front, on the Tempest-Dwargon road', type: 'SUPPLY_ROUTE_THREATENED',
  title: 'Formation B reaches northern Tempest and threatens the Tempest-Dwargon road',
  immediateResult: 'The 200,000 stand astride the road and rail line that carry Tempest\'s link with Dwargon.',
  operationalResult: 'An attempt to sever the allies\' strategic supply link.',
  strength: { tempest: 'UNKNOWN', empire: 200000 },
  significance: 'HIGH',
  evidence: 'Scenario brief. The road and magic train line are canon (v12.txt:3263-3281); the interdiction is the scenario\'s.',
  effects: { forces: { 'F-EMP-012': { status: 'INTERDICTING', movement: 'STATIONARY', location: 'northern-tempest-front', locationText: 'Astride the Tempest-Dwargon road' } }, theatres: { 'TH-DWG': { status: 'ACTIVE', frontline: 'Formation B astride the Tempest-Dwargon road in northern Tempest' } }, campaign: {} },
  logistics: { 'tempest-dwargon-road': 'THREATENED' },
}));
add(P1, dep('EVT-0512', -2, '12:00', 'F-EMP-012', 'Formation B turns for Dwargon\'s south-western border', 'North-west, to the south-western border', 'TH-DWG', 'FORMATION_DEPARTED', { location: 'northern-tempest-front', locationText: 'Northern Tempest front' }));
add(P1, base({
  id: 'EVT-0511', day: -1, time: '12:00', theatreId: 'TH-DWG', location: 'dwargon-south-approach', locationText: 'Southern approach to Dwargon', type: 'FORMATION_HALTED',
  title: 'The southern formation halts in the foothills south of Dwargon',
  evidence: 'Scenario brief.',
  effects: { forces: { 'F-EMP-018': { status: 'HOLDING', movement: 'STATIONARY', location: 'dwargon-south-approach', locationText: 'Southern approach to Dwargon' } }, theatres: {}, campaign: {} },
}));
add(P1, base({
  id: 'EVT-0513', day: -1, time: '02:00', theatreId: 'TH-DWG', location: 'dwargon-sw-border', locationText: 'Dwargon\'s south-western border', type: 'BORDER_CROSSING',
  title: 'Formation B crosses Dwargon\'s south-western border',
  immediateResult: 'The magitanks enter the south-western valley towards the city.',
  strength: { tempest: 'UNKNOWN', empire: 200000 }, significance: 'HIGH',
  evidence: 'Scenario brief.',
  effects: { forces: { 'F-EMP-012': { status: 'ADVANCING', movement: 'ADVANCE', direction: 'North-east, up the south-western valley', location: 'dwargon-sw-border', locationText: 'Dwargon\'s south-western border' } }, theatres: {}, campaign: {} },
}));
add(P1, base({
  id: 'EVT-0514', day: -1, time: '04:00', theatreId: 'TH-DWG', location: 'dwargon-sw-border', locationText: 'Dwargon\'s south-western border', type: 'FORMATION_DEPARTED',
  title: 'Formation B pushes up the south-western valley',
  evidence: 'Scenario brief.',
  effects: { forces: { 'F-EMP-012': { status: 'ADVANCING', movement: 'ADVANCE' } }, theatres: {}, campaign: {} },
}));
const P2 = '02-surface-battle';
add(P2, base({
  id: 'EVT-0515', day: 0, time: '13:30', theatreId: 'TH-DWG', location: 'sw-dwargon-front', locationText: 'Southwestern Dwargon front', type: 'OFFENSIVE_FAILED',
  title: 'Formation B\'s offensive into Dwargon has failed; the Tempest-Dwargon road is secure',
  immediateResult: 'No imperial soldier of Formation B or the northern reinforcement remains on the field. Dwargon is not taken.',
  operationalResult: 'The interdiction of the Tempest-Dwargon link ends with the formation that attempted it.',
  strength: { tempest: 'UNKNOWN', empire: 0 }, significance: 'CRITICAL', provenance: 'CANONICAL_WITH_VISUAL_RECONSTRUCTION',
  sources: [{ volume: 'V13', chapter: 'Ch2', locator: 'v13.txt:6675-6679' }, SCENARIO_REF],
  evidence: 'The surface battle ends with the Magitank Force and the Flying Combat Corps annihilated (v13.txt:6675-6679). The scenario attributes the defence to Ultima\'s group; the novels credit Ultima with the air battle and Testarossa, Gobta, Ranga and Hakuro with the ground battle, so the attribution to Ultima\'s group for the whole defence is UNVERIFIED.',
  characters: ['ultima', 'testarossa'],
  effects: { forces: {}, theatres: { 'TH-DWG': { frontline: 'Offensive failed; Dwargon not taken' } }, campaign: {} },
  logistics: { 'tempest-dwargon-road': 'SECURE' },
}));
const P3 = '03-labyrinth';
add(P3, base({
  id: 'EVT-0516', day: 1, time: '08:00', theatreId: 'TH-CAP', location: 'imperial-capital', locationText: 'Imperial Capital', type: 'FORMATION_TRANSFERRED',
  title: '30,000 leave the capital reserve for the Dwargon Gate (Phase 2)',
  immediateResult: 'The capital reserve falls from 100,000 to 70,000; the same 30,000 march as the Phase 2 reinforcement.',
  operationalResult: 'The only addition to the operation after the initial deployment: 1,010,000 + 30,000 = 1,040,000 committed.',
  strength: { tempest: 'UNKNOWN', empire: 30000 }, significance: 'HIGH',
  evidence: 'Scenario brief. The novels place a Composite Division camp near the Empire-Dwargon border, five hundred kilometres south-west of the capital (v14.txt:10863-10866).',
  effects: {
    forces: {
      'F-EMP-080': { strength: 70000, status: 'RESERVE', movement: 'STATIONARY' },
      'F-EMP-081': { strength: 30000, sizeStatus: 'SCENARIO', status: 'ADVANCING', movement: 'ADVANCE', direction: 'South-west, by the isthmus road', location: 'imperial-capital', locationText: 'Imperial Capital' },
    },
    theatres: {}, campaign: {},
  },
}));
add(P3, base({
  id: 'EVT-0509', day: 5, time: '08:00', theatreId: 'TH-DWE', location: 'dwargon-eastern-metropolis', locationText: 'Dwargon Gate', type: 'REINFORCEMENT_ARRIVED',
  title: 'Phase 1 reaches the Dwargon Gate: the Gate force stands at 30,000',
  immediateResult: 'The 30,000 from the halt point form the Dwargon Gate force.',
  strength: { tempest: 'UNKNOWN', empire: 30000 }, significance: 'HIGH',
  evidence: 'Scenario brief. About 560 km from the halt point by the upper ford, about eight days at the infantry rate.',
  effects: {
    forces: {
      'F-EMP-017': { strength: 0, status: 'MERGED', movement: 'STATIONARY', location: null, locationText: 'Merged into the Dwargon Gate force' },
      'F-EMP-031': { strength: 30000, sizeStatus: 'SCENARIO', status: 'BLOCKADING', movement: 'STATIONARY', location: 'dwargon-eastern-metropolis', locationText: 'Before the Dwargon Gate' },
    },
    theatres: { 'TH-DWE': { status: 'ACTIVE', frontline: 'Imperial Gate force (30,000) before the Dwargon Gate' } }, campaign: {},
  },
}));
add(P3, base({
  id: 'EVT-0517', day: 8, time: '14:00', theatreId: 'TH-DWE', location: 'dwargon-eastern-metropolis', locationText: 'Dwargon Gate', type: 'REINFORCEMENT_ARRIVED',
  title: 'Phase 2 reaches the Dwargon Gate: the Gate force stands at 60,000',
  immediateResult: '30,000 + 30,000 = 60,000 before the Dwargon Gate.',
  strength: { tempest: 'UNKNOWN', empire: 60000 }, significance: 'HIGH',
  sources: [{ volume: 'V13', chapter: 'Ch3', locator: 'v13.txt:7710-7714' }, SCENARIO_REF],
  evidence: 'The novels give 60,000 before the Isthmus from V13 Ch3 on (v13.txt:7710-7714). The scenario composes them from the two reinforcements.',
  effects: {
    forces: {
      'F-EMP-081': { strength: 0, status: 'MERGED', movement: 'STATIONARY', location: null, locationText: 'Merged into the Dwargon Gate force' },
      'F-EMP-031': { strength: 60000, status: 'BLOCKADING', movement: 'STATIONARY' },
    },
    theatres: { 'TH-DWE': { frontline: 'Imperial Gate force (60,000) before the Dwargon Gate' } }, campaign: {},
  },
}));
add(P3, base({
  id: 'EVT-0518', day: 9, time: '14:00', theatreId: 'TH-DWE', location: 'isthmus-approach', locationText: 'Isthmus road (Empire side)', type: 'FORMATION_DEPARTED',
  title: 'The detachment hands the blockade line to the Gate force and falls back to hold the isthmus road',
  evidence: 'Scenario. Keeps the detachment a separate formation from the Gate force, as the brief requires.',
  effects: { forces: { 'F-EMP-019': { status: 'HOLDING', movement: 'WITHDRAWAL', location: 'isthmus-approach', locationText: 'Isthmus road (Empire side)' } }, theatres: {}, campaign: {} },
}));
const P5 = '05-settlement';
add('04-long-night', base({
  id: 'EVT-0519', day: 16, time: '06:00', theatreId: 'TH-DWE', location: null, locationText: 'Not established', type: 'CASUALTIES_RECORDED',
  title: 'Ledger closure: 10,000 dead among the detachment and the southern formation',
  immediateResult: 'The operation\'s cumulative dead reach 1,010,000. Of the 40,000 in the detachment and the southern formation, 30,000 are not recorded as killed.',
  operationalResult: 'Where and when these 10,000 fell is not established; neither formation\'s own share is invented.',
  strength: { tempest: 'UNKNOWN', empire: 'UNKNOWN' }, significance: 'HIGH', timePrecision: 'RECONSTRUCTED', provenance: 'SCENARIO',
  confidence: { time: 'LOW', numbers: 'HIGH', overall: 'MEDIUM' },
  evidence: 'Derived from the scenario totals: 1,010,000 dead - (700,000 + 200,000 + 40,000 + 60,000 attributed by the novels) = 10,000.',
  reconstructionNote: 'Placed at the end of the Long Night as a ledger closure, not as a battle.',
  effects: {
    forces: {
      'F-EMP-018': { strength: 'UNKNOWN', sizeStatus: 'UNKNOWN', status: 'REDUCED', movement: 'STATIONARY' },
      'F-EMP-019': { strength: 'UNKNOWN', sizeStatus: 'UNKNOWN', status: 'REDUCED', movement: 'STATIONARY' },
    },
    theatres: {}, campaign: {},
  },
}));
add(P5, base({
  id: 'EVT-0520', day: 17, time: '08:00', theatreId: 'TH-DIP', location: 'dwargon-south-approach', locationText: 'Southern approach to Dwargon', type: 'FORMATION_RETREATED',
  title: 'Survivors of the southern formation and the detachment withdraw towards the Empire',
  immediateResult: '30,000 in all (split between the two not established).',
  evidence: 'Scenario. The brief does not say what became of these formations; withdrawal after the armistice is the project\'s assumption.',
  effects: { forces: { 'F-EMP-018': { status: 'WITHDRAWING', movement: 'WITHDRAWAL', direction: 'East, towards the Empire' }, 'F-EMP-019': { status: 'WITHDRAWING', movement: 'WITHDRAWAL', direction: 'East, towards the Empire' } }, theatres: {}, campaign: {} },
}));
add(P5, base({
  id: 'EVT-0523', day: 21, time: '18:00', theatreId: 'TH-CAP', location: 'imperial-interior', locationText: 'Imperial border base', type: 'FORMATION_HALTED',
  title: 'The detachment\'s survivors are back at the imperial border base',
  evidence: 'Scenario. About 250 km by the isthmus road.',
  effects: { forces: { 'F-EMP-019': { status: 'RETURNED', movement: 'STATIONARY', location: 'imperial-interior', locationText: 'Imperial border base' } }, theatres: {}, campaign: {} },
}));
add(P5, base({
  id: 'EVT-0524', day: 26, time: '18:00', theatreId: 'TH-CAP', location: 'imperial-interior', locationText: 'Imperial border base', type: 'FORMATION_HALTED',
  title: 'The southern formation\'s survivors are back at the imperial border base',
  evidence: 'Scenario. By the route the main formation came in on.',
  effects: { forces: { 'F-EMP-018': { status: 'RETURNED', movement: 'STATIONARY', location: 'imperial-interior', locationText: 'Imperial border base' } }, theatres: {}, campaign: {} },
}));

/* -- the approach route sets the border crossing and transit keys ----- */

const grid = new TerrainGrid(ROOT, SRC);
const pt = (id: string): [number, number] => {
  const p = gz.places.find((x: J) => x.id === id);
  return [p.x, p.y];
};
const approach = grid.route('approach', 'GROUND', [pt('imperial-interior'), pt('tempest-border'), pt('jura-forest-edge')]);
const toBorder = grid.route('approach-a', 'GROUND', [pt('imperial-interior'), pt('tempest-border')]).lengthKm;
const fBorder = toBorder / approach.lengthKm;
const FPD = 144;
const frame = (day: number, time: string) => (day + 43) * FPD + (Number(time.slice(0, 2)) * 60 + Number(time.slice(3))) / 10;
const startF = frame(-32, '08:00');
const endF = frame(-3, '14:00');
const borderF = Math.round((startF + fBorder * (endF - startF)) / 1) ;
const toDayTime = (f: number) => {
  const d = Math.floor(f / FPD) - 43;
  const m = (f % FPD) * 10;
  return { day: d, time: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` };
};
{
  const e = ev('EVT-0015');
  Object.assign(e, toDayTime(Math.round(borderF / 6) * 6));
  e.reconstructionNote = `The crossing is stated as already done at the month mark (v13.txt:313-315). Placed where the measured approach route (${Math.round(approach.lengthKm)} km, border at ${Math.round(toBorder)} km) reaches the Empire-Jura border at the column's average pace between departure from the border base (D-32) and the halt (D-3 14:00).`;
  e.audit = AUDIT(['Re-timed from D-5 to the measured route\'s border crossing.']);
}
const transit: J[] = load(join(C, 'transit.json')).filter((t: J) => t.forceId === 'F-EMP-010');
const nKeys = transit.length;
const keys: J[] = [];
for (let k = 0; k < nKeys; k += 1) {
  const f = Math.round((startF + ((endF - startF) * k) / (nKeys - 1)) / 6) * 6;
  const { day, time } = toDayTime(f);
  keys.push({ forceId: 'F-EMP-010', day, time, pct: Math.round(((100 * k) / (nKeys - 1)) * 10) / 10 });
}
save(join(C, 'transit.json'), keys);

for (const [f, list] of Object.entries(files)) save(join(C, 'events', `${f}.json`), list);

/* ------------------------------------------------------------------ */
/* Movements                                                           */
/* ------------------------------------------------------------------ */

let movements: J[] = load(join(C, 'movements.json'));
for (const m of movements) {
  if (RENAME_PLACE[m.fromPlace]) m.fromPlace = RENAME_PLACE[m.fromPlace];
  if (RENAME_PLACE[m.toPlace]) m.toPlace = RENAME_PLACE[m.toPlace];
}
movements = movements.filter((m) => !['MOV-038', 'MOV-039', 'MOV-040', 'MOV-008'].includes(m.id));
const mv = (id: string) => movements.find((m) => m.id === id)!;
Object.assign(mv('MOV-001'), { from: 'Imperial halt point', to: 'Northern Tempest front', toPlace: 'northern-tempest-front', startEvent: 'EVT-0504', endEvent: 'EVT-0505', route: 'RECONSTRUCTED', notes: 'R6 scenario: first leg of Formation B, to the Tempest-Dwargon road.' });
for (const id of ['MOV-036']) Object.assign(mv(id), { forceId: 'F-EMP-090' });
Object.assign(mv('MOV-020'), { startEvent: 'EVT-0020' });
const newMove = (o: J): J => ({ type: 'ADVANCE', route: 'RECONSTRUCTED', basis: 'SIMULATION_RECONSTRUCTED', confidence: 'MEDIUM', notes: 'R6 scenario ledger.', destinationUnknown: false, ...o });
movements.push(
  newMove({ id: 'MOV-042', forceId: 'F-EMP-012', from: 'Northern Tempest front', to: 'Dwargon\'s south-western border', fromPlace: 'northern-tempest-front', toPlace: 'dwargon-sw-border', startEvent: 'EVT-0512', endEvent: 'EVT-0513' }),
  newMove({ id: 'MOV-043', forceId: 'F-EMP-012', from: 'Dwargon\'s south-western border', to: 'Southwestern Dwargon front', fromPlace: 'dwargon-sw-border', toPlace: 'sw-dwargon-front', startEvent: 'EVT-0514', endEvent: 'EVT-0030' }),
  newMove({ id: 'MOV-044', forceId: 'F-EMP-013', from: 'Imperial halt point', to: 'Northern Tempest front', fromPlace: 'jura-forest-edge', toPlace: 'northern-tempest-front', startEvent: 'EVT-0506', endEvent: 'EVT-0507', type: 'REINFORCEMENT' }),
  newMove({ id: 'MOV-045', forceId: 'F-EMP-013', from: 'Northern Tempest front', to: 'Airspace over the southwestern Dwargon front', fromPlace: 'northern-tempest-front', toPlace: 'sw-dwargon-airspace', startEvent: 'EVT-0121', endEvent: 'EVT-0106', type: 'REINFORCEMENT' }),
  newMove({ id: 'MOV-046', forceId: 'F-EMP-017', from: 'Imperial halt point', to: 'Dwargon Gate', fromPlace: 'jura-forest-edge', toPlace: 'dwargon-eastern-metropolis', startEvent: 'EVT-0508', endEvent: 'EVT-0509', type: 'REINFORCEMENT' }),
  newMove({ id: 'MOV-047', forceId: 'F-EMP-018', from: 'Imperial halt point', to: 'Southern approach to Dwargon', fromPlace: 'jura-forest-edge', toPlace: 'dwargon-south-approach', startEvent: 'EVT-0510', endEvent: 'EVT-0511' }),
  newMove({ id: 'MOV-048', forceId: 'F-EMP-019', from: 'Imperial Capital', to: 'Isthmus road (Empire side)', fromPlace: 'imperial-capital', toPlace: 'isthmus-approach', startEvent: 'EVT-0502', endEvent: 'EVT-0521' }),
  newMove({ id: 'MOV-049', forceId: 'F-EMP-019', from: 'Isthmus road (Empire side)', to: 'Before the Dwargon Gate', fromPlace: 'isthmus-approach', toPlace: 'dwargon-eastern-front', startEvent: 'EVT-0522', endEvent: 'EVT-0016' }),
  newMove({ id: 'MOV-050', forceId: 'F-EMP-081', from: 'Imperial Capital', to: 'Dwargon Gate', fromPlace: 'imperial-capital', toPlace: 'dwargon-eastern-metropolis', startEvent: 'EVT-0516', endEvent: 'EVT-0517', type: 'REINFORCEMENT' }),
  newMove({ id: 'MOV-051', forceId: 'F-EMP-019', from: 'Before the Dwargon Gate', to: 'Isthmus road (Empire side)', fromPlace: 'dwargon-eastern-front', toPlace: 'isthmus-approach', startEvent: 'EVT-0517', endEvent: 'EVT-0518', type: 'WITHDRAWAL' }),
  newMove({ id: 'MOV-052', forceId: 'F-EMP-019', from: 'Isthmus road (Empire side)', to: 'Imperial border base', fromPlace: 'isthmus-approach', toPlace: 'imperial-interior', startEvent: 'EVT-0520', endEvent: 'EVT-0523', type: 'WITHDRAWAL' }),
  newMove({ id: 'MOV-053', forceId: 'F-EMP-018', from: 'Southern approach to Dwargon', to: 'Imperial border base', fromPlace: 'dwargon-south-approach', toPlace: 'imperial-interior', startEvent: 'EVT-0520', endEvent: 'EVT-0524', type: 'WITHDRAWAL' }),
);
save(join(C, 'movements.json'), movements);

/* ------------------------------------------------------------------ */
/* Casualties                                                          */
/* ------------------------------------------------------------------ */

const cas: J[] = load(join(C, 'casualties.json'));
const row = (id: string) => cas.find((c) => c.id === id)!;
row('CAS-012').notes = `${row('CAS-012').notes} R6: in the scenario these 60,000 are the Dwargon Gate force (30,000 from the main formation, 30,000 from the capital reserve).`;
row('CAS-024').notes = `${row('CAS-024').notes} R6: the Magic Beast Division is outside the invasion operation's ledger.`;
if (!cas.some((c) => c.id === 'CAS-S01')) {
  cas.push({
    id: 'CAS-S01', eventId: 'EVT-0519', faction: 'Eastern Empire', forceId: null, formation: 'Dwargon detachment and southern formation (combined, 40,000)',
    cause: 'Not established', kia: 10000, wia: 'UNKNOWN', pow: 'UNKNOWN', mia: 'UNKNOWN', revived: 0, scope: 'EVENT_CASUALTY', aggregateOf: '-',
    basis: 'DERIVED', confidence: 'MEDIUM', sourceRefs: [SCENARIO_REF],
    evidence: 'Scenario totals: 1,010,000 cumulative dead minus the 1,000,000 the novels attribute (700,000 Formation A, 200,000 Formation B, 40,000 northern reinforcement, 60,000 Gate force).',
    notes: 'Counted in the operation ledger through operationForceIds. No share is assigned to either formation.',
    operationForceIds: ['F-EMP-018', 'F-EMP-019'],
  });
}
save(join(C, 'casualties.json'), cas);

/* ------------------------------------------------------------------ */
/* Revision                                                            */
/* ------------------------------------------------------------------ */

const rev = load(join(C, 'revision.json'));
rev.revision = 'R6-SCENARIO-LEDGER (2026-10-11)';
rev.note = 'R6: the owner\'s scenario force ledger on the R5 canon-audit skeleton (docs/CAMPAIGN_FORCE_LEDGER.md), with calibrated geography (docs/GEOGRAPHIC_MODEL.md). ' + rev.note;
for (const m of rev.phaseMarks) if (m.stage === 'HALT_AND_DEPLOYMENT') Object.assign(m, { day: -3, time: '14:00' });
save(join(C, 'revision.json'), rev);

console.log(`approach ${approach.lengthKm} km, border at ${toBorder} km -> EVT-0015 ${JSON.stringify(toDayTime(Math.round(borderF / 6) * 6))}`);
