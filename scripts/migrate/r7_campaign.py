"""
One-off migration R6-SCENARIO-LEDGER -> R7-CAMPAIGN-RECONSTRUCTION (2026-10-12).

Applies the owner's campaign scenario (Sources of Truth/Alur Timeline secara
kasarannya.docx, phases A-N; docs/CAMPAIGN_TIMELINE.md) to the campaign
sources, merges the per-event character audit (docs/CHARACTER_EVENT_AUDIT.md)
and moves the Dwargon places onto the compact Kanaat massif
(docs/GEOGRAPHIC_MODEL.md). Kept in the repository as the record of exactly
what changed; it is not part of the build and is not meant to be run twice.

    python scripts/migrate/r7_campaign.py <cast-audit-dir>
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SRC = ROOT / 'data-source'
C = SRC / 'campaign'
CAST_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else None
KX, KY = 5282.0, 4070.0
TAG = 'R7 campaign reconstruction'


def load(p: Path):
    return json.loads(p.read_text(encoding='utf8'))


def save(p: Path, v, indent=1) -> None:
    p.write_text(json.dumps(v, indent=indent, ensure_ascii=False) + '\n', encoding='utf8', newline='\n')


SCEN_REF = {'volume': 'Scenario', 'chapter': None, 'locator': 'docs/CAMPAIGN_TIMELINE.md'}
DOC_REF = {'volume': 'Scenario', 'chapter': None, 'locator': 'Sources of Truth/Alur Timeline secara kasarannya.docx'}


def audit(e: dict, *changes: str) -> None:
    a = e.get('audit') or {'status': 'CORRECTED', 'changes': []}
    a['changes'] = [c for c in a.get('changes', []) if not c.startswith(TAG)] + [f'{TAG}: {c}' for c in changes]
    if a.get('status') != 'ADDED':
        a['status'] = 'CORRECTED'
    e['audit'] = a


# --------------------------------------------------------------------------- gazetteer

gz = load(SRC / 'gazetteer.source.json')
places = {p['id']: p for p in gz['places']}
RENAME = {'dwargon-outer-gate': 'dwargon-main-gate', 'dwargon-eastern-metropolis': 'dwargon-eastern-gate'}
CITY = (0.6649, 0.40564)  # settlements.source.json city-dwargon (MEASURED)


def at(dx_km: float, dy_km: float, base=CITY):
    return round(base[0] + dx_km / KX, 5), round(base[1] + dy_km / KY, 5)


GATE = at(-22.8, 25.6)
ARRAY = at(-5.7, 5.7, GATE)
old_array = (places['sw-dwargon-front']['x'], places['sw-dwargon-front']['y'])
shift = (ARRAY[0] - old_array[0], ARRAY[1] - old_array[1])
for pid in ['sw-dwargon-front', 'sw-dwargon-airspace', 'green-legion-start-line', 'imperial-chariot-line', 'linked-fortress-position',
            'encircled-position', 'feigned-withdrawal-line', 'attempted-rally-point', 'magitank-hq', 'magitank-rear']:
    p = places[pid]
    p['x'], p['y'] = round(p['x'] + shift[0], 5), round(p['y'] + shift[1], 5)
p = places['sw-dwargon-front']
p['name'] = 'Main Gate front (magitank array)'
p['basis'] = 'Where the 2,000 magitanks array, facing the main gate about thirty kilometres from the centre of Dwargon (v13.txt:513-517). Placed about 8 km south-west of the main gate, at the foot of the range, under the calibrated scale.'
places['sw-dwargon-airspace']['name'] = 'Airspace over the Main Gate front'
places['magitank-hq']['basis'] = "Gaster's main camp lay far behind the battle line (V13 Ch2, v13.txt:5620); Testarossa kills him there. Placed down the south-western approach behind the array."
p = places['dwargon-outer-gate']
p['id'] = 'dwargon-main-gate'
p['x'], p['y'] = GATE
p['name'] = 'Dwargon Main Gate (foot of the range)'
p['basis'] = "Dwargon's front gate, which the magitanks' muzzles face (v13.txt:516-517) and where Tempest's troops camp and the Dwarven Knights raise earth walls. At the south-western foot of the compact Kanaat range, about 34 km from the city centre (docs/GEOGRAPHIC_MODEL.md). The 200,000 reach it through the south-western border; the 40,000 airships reinforce it."
p = places['dwargon-eastern-metropolis']
p['id'] = 'dwargon-eastern-gate'
p['name'] = 'Dwargon Eastern Gate (Isthmus)'
p['basis'] = "Dwargon's gate east of the city, at the Isthmus, facing the Empire (v13.txt:697-699), five hundred kilometres south-west of the imperial capital (v14.txt:10863-10866; 575 km under the calibrated scale). The eastern front of the scenario: 30,000 arrive from the Empire across the Empire-Dwargon border, reinforced to 60,000."
places['dwargon-eastern-front']['basis'] = 'The imperial camp and battle line outside the Eastern Gate on the isthmus plain, between the gate and the Empire-Dwargon border.'
p = places['dwargon-sw-border']
p['x'], p['y'] = 0.641, 0.4785
p['name'] = 'Dwargon south-western border crossing'
p['basis'] = 'Scenario: where the 200,000 cross from the Jura forest into Dwargon on their way to the main gate from the south-west. On the traced Dwargon-Jura border of the Base Map.'
gz['places'] = [q for q in gz['places'] if q['id'] not in ('northern-tempest-front', 'dwargon-south-approach')]
# Where the eastern road crosses the Empire-Dwargon border: the T-DWG outline on the isthmus segment.
terr = load(SRC / 'territories.geo.source.json')


def rings_of(geom):
    out = []

    def walk(o):
        if isinstance(o, list) and o and isinstance(o[0], list) and o[0] and isinstance(o[0][0], (int, float)):
            out.append(o)
        elif isinstance(o, list):
            for k in o:
                walk(k)
    walk(geom.get('coordinates'))
    return out


def inside(x, y, rings):
    hit = False
    for r in rings:
        for i in range(len(r)):
            (x1, y1), (x2, y2) = r[i], r[i - 1]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                hit = not hit
    return hit


dwg = rings_of(next(t for t in terr['territories'] if t['id'] == 'T-DWG')['geometry'])
a, b = (places['isthmus-approach']['x'], places['isthmus-approach']['y']), (places['dwargon-eastern-front']['x'], places['dwargon-eastern-front']['y'])
cross = None
for k in range(1, 401):
    t = k / 400
    x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
    if inside(x, y, dwg):
        cross = (round(x, 5), round(y, 5))
        break
assert cross, 'no Empire-Dwargon border crossing found'
NEW_PLACES = [
    {'id': 'empire-dwargon-border', 'name': 'Empire-Dwargon border (isthmus road)', 'theatre': 'TH-DWE', 'x': cross[0], 'y': cross[1], 'placement': 'RECONSTRUCTED',
     'basis': 'Where the isthmus road crosses from the Empire into Dwargon: the traced Base Map border on the road from the imperial capital to the Eastern Gate. The scenario opens the eastern front here: Dwargon is at war from the moment the 30,000 cross.'},
    {'id': 'third-strike-landing', 'name': 'Third Strike landing ground (Jura)', 'theatre': 'TH-LAB', 'x': 0.656, 'y': 0.54, 'placement': 'RECONSTRUCTED',
     'basis': "Scenario: where the Third Strike's Tempest group lands in the Great Jura Forest, under the airspace where the Emperor's flagship appears (v15). About 75 km from the capital Rimuru."},
    {'id': 'tempest-eastern-outskirts', 'name': 'Eastern outskirts of the capital Rimuru', 'theatre': 'TH-LAB', 'x': 0.6445, 'y': 0.55, 'placement': 'RECONSTRUCTED',
     'basis': "Scenario: the furthest point of the Third Strike's advance on the capital, about 35 km east of the city, where Tempest's capital garrison destroys it."},
    {'id': 'council-of-the-west', 'name': 'Council of the West (Ingracia)', 'theatre': 'TH-DIP', 'x': 0.4712, 'y': 0.5046, 'placement': 'RECONSTRUCTED',
     'basis': "The Council of the West sits in the Kingdom of Ingracia (Englassia on the atlas). Testarossa is Tempest's representative there (v16.txt:7195-7197)."},
    {'id': 'walpurgis-council', 'name': 'Walpurgis Council (Octagram)', 'theatre': 'TH-DIP', 'x': None, 'y': None, 'placement': 'UNKNOWN',
     'basis': "Guy Crimson's emergency Walpurgis Council, reached through a spatial rift (v16.txt:9928-9939). No map position."},
]
for np_ in NEW_PLACES:
    if not any(q['id'] == np_['id'] for q in gz['places']):
        gz['places'].append(np_)
for n in gz['nations']:
    if n['id'] == 'dwargon':
        n['x'], n['y'] = CITY
for k, v in list(gz.get('aliases', {}).items()):
    if v in RENAME:
        gz['aliases'][k] = RENAME[v]
gz['theatreZones']['zones']['TH-DWG'] = [[0.628, 0.49], [0.64, 0.43], [0.652, 0.398], [0.672, 0.392], [0.684, 0.41], [0.686, 0.47], [0.672, 0.505], [0.645, 0.512]]
gz['theatreZones']['zones']['TH-DWE'] = [[0.712, 0.405], [0.735, 0.398], [0.76, 0.403], [0.764, 0.418], [0.746, 0.432], [0.722, 0.436], [0.71, 0.425]]
save(SRC / 'gazetteer.source.json', gz, 2)

# Text references to the renamed places everywhere in the campaign sources.
for f in list(C.glob('*.json')) + list((C / 'events').glob('0*.json')) + [SRC / 'settlements.source.json', SRC / 'terminology.source.json', SRC / 'world.source.json']:
    s = f.read_text(encoding='utf8')
    t = s
    for old, new in RENAME.items():
        t = t.replace(f'"{old}"', f'"{new}"')
    if t != s:
        f.write_text(t, encoding='utf8', newline='\n')

# --------------------------------------------------------------------------- characters

chars = load(SRC / 'characters.source.json')
manifest = load(ROOT.parent / 'Sources of Truth' / 'Character Photocard' / 'metadata' / 'character_manifest.json')
by_file = {m['filename']: m for m in manifest['characters']}
ADD_CHARS = {
    # id: (card file or None, display name, faction, role)
    'rigurd': ('345_Rigurd.jpg', 'Rigurd', 'Jura-Tempest Federation', 'Prime Minister of Tempest'),
    'shuna': ('370_Shuna.jpg', 'Shuna', 'Jura-Tempest Federation', 'Oni princess; capital and banquets'),
    'beretta': ('040_Beretta.jpg', 'Beretta', 'Jura-Tempest Federation', "Ramiris's guardian (labyrinth)"),
    'treyni': ('395_Treyni.jpg', 'Treyni', 'Jura-Tempest Federation', "Dryad; Ramiris's attendant"),
    'kumara': ('236_Kumara.jpg', 'Kumara', 'Jura-Tempest Federation', 'Labyrinth guardian (Nine-Headed Fox)'),
    'momiji': ('288_Momiji.jpg', 'Momiji', 'Jura-Tempest Federation', 'Tengu; leads the Fourth Corps in the field (D+10)'),
    'charys': ('058_Charys.jpg', 'Charys', 'Jura-Tempest Federation', 'Labyrinth attendant'),
    'kaijin': ('214_Kaijin.jpg', 'Kaijin', 'Jura-Tempest Federation', 'Dwarf craftsman in Tempest'),
    'vester': ('414_Vesta.jpg', 'Vester', 'Jura-Tempest Federation', 'Former Dwargon minister, researcher in Tempest'),
    'haruna': ('183_Haruna.jpg', 'Haruna', 'Jura-Tempest Federation', 'Capital staff'),
    'kurobe': ('238_Kurobe.jpg', 'Kurobe', 'Jura-Tempest Federation', 'Smith'),
    'cien': ('064_Cien.jpg', 'Cien', 'Jura-Tempest Federation', "Testarossa's subordinate; relations with the Western Nations"),
    'venom': ('410_Venom.jpg', 'Venom', 'Jura-Tempest Federation', "Diablo's subordinate; Masayuki's bodyguard after the war"),
    'moss': ('289_Moss.jpg', 'Moss', 'Jura-Tempest Federation', "Testarossa's subordinate"),
    'lilina': ('247_Lilina.jpg', 'Lilina', 'Jura-Tempest Federation', 'Agriculture officer'),
    'jiwu': ('206_Jiwu.jpg', 'Jiwu', 'Eastern Empire', "Masayuki's companion and bodyguard"),
    'bernie': ('041_Bernie.jpg', 'Bernie', 'Eastern Empire', "Masayuki's companion and bodyguard"),
    'jaine': ('201_Jaine.jpg', 'Jaine', 'Armed Nation of Dwargon', 'Arch-wizard of Dwargon'),
    'agera': ('006_Agera.jpg', 'Agera', 'Jura-Tempest Federation', 'Swordsman at the Dwargon front (Long Night)'),
    'esprit': ('113_Esprit.jpg', 'Esprit', 'Jura-Tempest Federation', 'Healer at the Dwargon front (Long Night)'),
    'souka': ('373_Souka.jpg', 'Souka', 'Jura-Tempest Federation', "Soei's subordinate"),
    'garasha': ('133_Garasha.jpg', 'Garasha', 'Moderate Harlequin Alliance', 'Raider of the capital (Long Night)'),
    'pico': ('320_Pico.jpg', 'Pico', 'Moderate Harlequin Alliance', 'Raider of the capital (Long Night)'),
    'frey': ('124_Frey.jpg', 'Frey', 'Jura-Tempest Federation', 'Former demon lord; asleep in evolution after the war'),
    'milim': ('277_Milim Nava.jpg', 'Milim Nava', 'Milim Nava (Demon Lord)', 'Demon lord; sends Albis'),
    'malcolm': (None, 'Malcolm', 'Eastern Empire', 'Imperial Guardian at the ritual ground'),
    'graneet': (None, 'Graneet', 'Eastern Empire', 'Imperial Guardian aboard the flagship'),
    'zarario': (None, 'Zarario', 'Feldway (Insectar)', 'Leads the raid on the labyrinth (Long Night)'),
    'cornu': (None, 'Cornu', 'Feldway (Insectar)', 'Raider on Floor 70 (Long Night)'),
}
NAME_TO_ID = {
    'Rigurd': 'rigurd', 'Shuna': 'shuna', 'Beretta': 'beretta', 'Treyni': 'treyni', 'Kumara': 'kumara', 'Momiji': 'momiji', 'Charys': 'charys',
    'Kaijin': 'kaijin', 'Vesta': 'vester', 'Vester': 'vester', 'Haruna': 'haruna', 'Kurobee': 'kurobe', 'Kurobe': 'kurobe', 'Cien': 'cien', 'Venom': 'venom',
    'Moss': 'moss', 'Lilina': 'lilina', 'Jiwu': 'jiwu', 'Bernie': 'bernie', 'Jaine': 'jaine', 'Jane': 'jaine', 'Agera': 'agera', 'Esprit': 'esprit',
    'Souka': 'souka', 'Garasha': 'garasha', 'Pico': 'pico', 'Frey': 'frey', 'Milim': 'milim', 'Malcolm': 'malcolm', 'Graneet': 'graneet',
    'Zarario': 'zarario', 'Cornu': 'cornu',
}
have = {c['id'] for c in chars['characters']}


def card_of(m: dict) -> dict:
    vr, im = m.get('visual_reference') or {}, m.get('image') or {}
    st = vr.get('source_type') or 'official'
    return {
        'file': m['filename'], 'sourceType': 'official' if 'official' in st else st, 'sourceUrl': vr.get('source_url'),
        'attribution': vr.get('source_name') or 'Character photocard repository', 'manifestId': m['id'],
        'originalSize': [im.get('original_width'), im.get('original_height')], 'upscaleFactor': im.get('upscale_factor'), 'licence': 'Open',
    }


by_name = {m['identity']['canonical_name'].lower(): m for m in manifest['characters']}
for c in chars['characters']:
    if c.get('photocard') is None:
        m = by_name.get(c['name'].lower()) or next((by_name[a.lower()] for a in c.get('aliases', []) if a.lower() in by_name), None)
        if m and m.get('filename'):
            c['photocard'] = card_of(m)
            print('photocard attached', c['id'], m['filename'])
for cid, (card, name, faction, role) in ADD_CHARS.items():
    if cid in have:
        continue
    m = by_file.get(card) if card else None
    entry = {
        'id': cid, 'name': name,
        'aliases': sorted(set((m['identity'].get('aliases') or []) + (m['identity'].get('alternative_spellings') or []))) if m else [],
        'japanese': (m['identity'].get('japanese_name') if m else None),
        'faction': faction, 'role': role, 'nameConflicts': None,
        'photocard': None,
    }
    if m:
        entry['photocard'] = card_of(m)
    chars['characters'].append(entry)
save(SRC / 'characters.source.json', chars, 1)
CHAR_IDS = {c['id'] for c in chars['characters']}

# --------------------------------------------------------------------------- forces

forces = load(C / 'forces.json')
F = {f['id']: f for f in forces}


def upd(fid: str, **kw):
    F[fid].update(kw)


upd('F-EMP-001', notes='R7: the scenario\'s initial forward deployment is exactly this ceiling: 900,000 main formation + 70,000 reinforcement cohort + 30,000 eastern cohort = 1,000,000. The Third Strike (10,100) comes later from the capital reserve.')
upd('F-EMP-010', formation='Main invasion formation (single column until the halt point)', displayName='Main invasion formation', parentId='F-EMP-001',
    role='Crosses the Tempest border with the 70,000 reinforcement cohort (970,000 in one column), halts at the forest edge and splits into 700,000 (Tempest capital and Labyrinth) and 200,000 (Dwargon Main Gate by the south-west).',
    initialStrengthRaw='900,000 (scenario)', initialMin=900000, initialMax=900000, initialBest=900000, sizeStatus='SCENARIO',
    sizeEvidence='Scenario (docs/CAMPAIGN_FORCE_LEDGER.md). In the novels the Jura invasion army is 940,000 = 700,000 + 200,000 + 40,000 (v13.txt:16208); the scenario moves the 40,000 airships into the reinforcement cohort.',
    finalStrength=0, finalStatus='Split at the halt point into 700,000 and 200,000', ledgerRole='MAIN', aggregateFromEvent='EVT-0503',
    notes='R7: 900,000 (was 1,005,000 in R6).')
upd('F-EMP-011', role='Tempest capital and Labyrinth: 350,000 enter the labyrinth on day one, 200,000 on day two, 150,000 wait outside')
upd('F-EMP-011A', displayName='Labyrinth Raider force', formation='Labyrinth Raider force (350,000 + 200,000)', initialStrengthRaw='350,000 (day one) + 200,000 (day two) = 550,000 (scenario)',
    initialMin=550000, initialMax=550000, initialBest=550000, sizeStatus='SCENARIO',
    sizeEvidence='Scenario: 350,000 on day one, 200,000 on day two. The novels: 350,000 + 150,000 + 30,000 = 530,000 inside, 170,000 outside (v13.txt:9180-9493). See DISC-R7-04.',
    finalStrength=0, kia=550000)
upd('F-EMP-011B', displayName='Imperial camp outside the labyrinth', initialStrengthRaw='150,000 (scenario)', initialMin=150000, initialMax=150000, initialBest=150000, sizeStatus='SCENARIO',
    sizeEvidence='Scenario: 700,000 - 350,000 - 200,000 = 150,000 outside. The novels: 170,000 (v13.txt). See DISC-R7-04.', finalStrength=0, kia=150000)
upd('F-EMP-012', role='Dwargon Main Gate by the south-western border; 240,000 at the gate once the 40,000 airships arrive')
upd('F-EMP-013', parentId='F-EMP-017', origin={'kind': 'SPLIT', 'fromForceId': 'F-EMP-017', 'eventId': 'EVT-0531'}, ledgerRole='ALLOCATION',
    role='Flies from the halt point to the Dwargon Main Gate after the ultimatum is rejected: 200,000 + 40,000 = 240,000 at the gate',
    notes='R7: part of the 70,000 reinforcement cohort (scenario). Canon size and arm (Farraga\'s 100 airships, v13.txt:2772, 7531-7533).')
upd('F-EMP-017', formation='Reinforcement cohort (travels with the main formation)', displayName='Reinforcement cohort', parentId='F-EMP-001',
    role='Leaves the imperial capital with the main formation and travels in the same column (shown together as 970,000), stays staged at the halt point, and after the ultimatum is rejected splits into 40,000 for the Main Gate and 30,000 for the Eastern Gate.',
    unitType='combined arms (airships and infantry)', initialStrengthRaw='70,000 (scenario)', initialMin=70000, initialMax=70000, initialBest=70000, sizeStatus='SCENARIO',
    sizeEvidence='Scenario (docs/CAMPAIGN_FORCE_LEDGER.md).', finalStrength=0, finalStatus='Split into 40,000 and 30,000 at the halt point', ledgerRole='DETACHMENT',
    hierarchyProvenance='SCENARIO', aggregateFromEvent='EVT-0531', convoy={'hostId': 'F-EMP-010', 'untilEvent': 'EVT-0503'},
    commander='Not stated (scenario)', commanderIds=[], origin=None, mergedInto=None, notes='R7: the 70,000 cohort. The id is reused from R6 (Gate reinforcement, Phase 1).')
upd('F-EMP-018', formation='Eastern reinforcement (from the cohort)', displayName='Eastern reinforcement', parentId='F-EMP-017',
    role='Marches from the halt point to the Dwargon Eastern Gate after the ultimatum is rejected, joining the 30,000 already there: 60,000.',
    unitType='infantry', initialStrengthRaw='30,000 (scenario)', initialMin=30000, initialMax=30000, initialBest=30000, sizeStatus='SCENARIO', sizeEvidence='Scenario. The Word document names its destination "Pintu Utama" by mistake (DISC-R7-02).',
    finalStrength=0, finalStatus='Merged into the Eastern Gate force', ledgerRole='ALLOCATION', origin={'kind': 'SPLIT', 'fromForceId': 'F-EMP-017', 'eventId': 'EVT-0531'},
    mergedInto={'forceId': 'F-EMP-031', 'eventId': 'EVT-0525'}, hierarchyProvenance='SCENARIO', commander='Not stated (scenario)', commanderIds=[],
    notes='R7: the id is reused from R6 (southern formation).')
upd('F-EMP-019', formation='Eastern cohort (imperial capital to the Eastern Gate)', displayName='Eastern cohort', parentId='F-EMP-001',
    role='Leaves the imperial capital by the isthmus road, crosses the Empire-Dwargon border and reaches the Eastern Gate as the 970,000 reach the halt point.',
    unitType='infantry', initialStrengthRaw='30,000 (scenario)', initialMin=30000, initialMax=30000, initialBest=30000, sizeStatus='SCENARIO', sizeEvidence='Scenario (docs/CAMPAIGN_FORCE_LEDGER.md).',
    finalStrength=0, finalStatus='Forms the Eastern Gate force', ledgerRole='DETACHMENT', origin=None, mergedInto={'forceId': 'F-EMP-031', 'eventId': 'EVT-0533'},
    hierarchyProvenance='SCENARIO', commander='Not stated (scenario)', commanderIds=[], notes='R7: the id is reused from R6 (5,000 detachment).')
upd('F-EMP-031', formation='Eastern Gate force (eastern cohort + eastern reinforcement)', displayName='Eastern Gate force',
    role='The imperial force before Dwargon\'s Eastern Gate: the 30,000 eastern cohort, joined by the 30,000 eastern reinforcement (60,000). Killed by Velgrynd on the Long Night.',
    initialStrengthRaw='30,000, then 60,000 (scenario composition)', initialBest=30000, sizeStatus='SCENARIO',
    sizeEvidence='The novels place 60,000 before the Isthmus (v13.txt:7710-7714; v14.txt:640-641), the Composite Division under Yuuki. The scenario composes them from two cohorts (DISC-R7-05).',
    ledgerRole='GATE_FORCE', parentId=None)
upd('F-EMP-080', formation='Imperial capital emergency reserve', displayName='Capital reserve', initialStrengthRaw='110,100 (scenario)', initialMin=110100, initialMax=110100, initialBest=110100,
    sizeStatus='SCENARIO', sizeEvidence='Scenario: 110,100 stay at the capital as the emergency reserve; 10,100 leave as the Third Strike, 100,000 remain.', finalStrength=100000,
    role='Emergency reserve at the imperial capital, outside the operation until the Third Strike (10,100) leaves it.', ledgerRole='RESERVE')
upd('F-EMP-081', formation='Third Strike (from the capital reserve)', displayName='Third Strike', parentId=None,
    role='10,100 from the capital reserve after the coup: most fly across the eastern border to the Eastern Gate, the rest to the Tempest capital.',
    unitType='combined arms (airships)', initialStrengthRaw='10,100 (scenario)', initialMin=10100, initialMax=10100, initialBest=10100, sizeStatus='SCENARIO',
    sizeEvidence='Scenario. The split between the two groups is a parameter (data-source/campaign/scenario-params.json).', finalStrength=0, finalStatus='Destroyed on both fronts',
    ledgerRole='TRANSFER', origin={'kind': 'TRANSFER', 'fromForceId': 'F-EMP-080', 'eventId': 'EVT-0540'}, mergedInto=None, aggregateFromEvent='EVT-0541',
    hierarchyProvenance='SCENARIO', notes='R7: the id is reused from R6 (Gate reinforcement, Phase 2).')
tpl = {k: F['F-EMP-018'][k] for k in F['F-EMP-018'] if k not in ('id',)}
for fid, name, n, role in [('F-EMP-081E', 'Third Strike, eastern group', 8000, 'Flies across the Empire-Dwargon border to the Eastern Gate front'),
                           ('F-EMP-081T', 'Third Strike, Tempest group', 2100, 'Flies to the Great Jura Forest and advances on the Tempest capital')]:
    if fid in F:
        continue
    f = dict(tpl)
    f.update(id=fid, formation=name, displayName=name, parentId='F-EMP-081', role=role, unitType='combined arms (airborne infantry)',
             initialStrengthRaw=f'{n:,} (scenario parameter)', initialMin=n, initialMax=n, initialBest=n, sizeStatus='SCENARIO',
             sizeEvidence='Scenario parameter (data-source/campaign/scenario-params.json); the two groups sum to 10,100.', finalStrength=0, finalStatus='Destroyed',
             kia=n, ledgerRole='ALLOCATION', origin={'kind': 'SPLIT', 'fromForceId': 'F-EMP-081', 'eventId': 'EVT-0541'}, mergedInto=None, notes='R7.')
    f.pop('aggregateFromEvent', None)
    f.pop('convoy', None)
    forces.insert(forces.index(F['F-EMP-081']) + (1 if fid.endswith('E') else 2), f)
    F[fid] = f
for f in forces:
    if f.get('origin') is None:
        f.pop('origin', None)
    if f.get('mergedInto') is None:
        f.pop('mergedInto', None)
save(C / 'forces.json', forces)

# --------------------------------------------------------------------------- events

EV_FILES = ['01-preparation-and-approach', '02-surface-battle', '03-labyrinth', '04-long-night', '05-settlement']
files = {f: load(C / 'events' / f'{f}.json') for f in EV_FILES}


def ev(eid: str) -> dict:
    for lst in files.values():
        for e in lst:
            if e['id'] == eid:
                return e
    raise KeyError(eid)


def drop(*ids: str) -> None:
    for f in files:
        files[f] = [e for e in files[f] if e['id'] not in ids]


def base(**o) -> dict:
    e = {
        'timePrecision': 'RECONSTRUCTED', 'canonicalTime': '-', 'battle': None, 'battleType': None,
        'actor': 'Imperial Army', 'actorFaction': 'Eastern Empire', 'opponent': 'Jura-Tempest Federation', 'opponentFaction': 'Jura-Tempest Federation',
        'characters': [], 'immediateResult': '', 'operationalResult': '', 'strategicResult': '', 'strength': {'tempest': 'UNKNOWN', 'empire': 'UNKNOWN'},
        'intensity': 'LOW', 'significance': 'MEDIUM', 'turningPoint': None, 'provenance': 'SCENARIO',
        'confidence': {'time': 'LOW', 'numbers': 'HIGH', 'overall': 'MEDIUM'}, 'sources': [DOC_REF, SCEN_REF], 'notes': '',
        'audit': {'status': 'ADDED', 'changes': [f'{TAG} (2026-10-12).']}, 'effects': {'forces': {}, 'theatres': {}, 'campaign': {}},
    }
    e.update(o)
    return e


def put(file: str, e: dict) -> None:
    drop(e['id'])
    files[file].append(e)


def mv_eff(status, movement, loc=None, text=None, **kw):
    d = {'status': status, 'movement': movement}
    if loc is not None or status in ('MERGED', 'SPLIT'):
        d['location'] = loc
    if text is not None:
        d['locationText'] = text
    d.update(kw)
    return d


P1, P2, P3, P4, P5 = EV_FILES
drop('EVT-0505', 'EVT-0507', 'EVT-0510', 'EVT-0511', 'EVT-0512', 'EVT-0516', 'EVT-0517', 'EVT-0518', 'EVT-0519', 'EVT-0520', 'EVT-0523', 'EVT-0524', 'EVT-0526', 'EVT-0527')

# A. Preparation and the opening deployment.
e = ev('EVT-0501')
e.update(title='The 110,100-strong emergency reserve stays at the imperial capital', immediateResult='110,100 are held back at the capital, outside the invasion operation.',
         strength={'tempest': 'UNKNOWN', 'empire': 110100, 'note': 'Capital reserve (scenario); not part of the forward deployment.'},
         evidence='Scenario (Word document, Persiapan): 110,100 standby at the imperial capital as the emergency reserve.')
e['effects']['forces'] = {'F-EMP-080': mv_eff('RESERVE', 'STATIONARY', 'imperial-capital', 'Imperial Capital (emergency reserve)', strength=110100, sizeStatus='SCENARIO')}
audit(e, 'Reserve 110,100 (was 100,000).')
ev('EVT-0023')['effects']['forces']['F-EMP-080']['strength'] = 110100
e = ev('EVT-0003')
e.update(title='The 900,000-strong main formation leaves the Empire, the 70,000 reinforcement cohort in the same column',
         strength={'tempest': 'UNKNOWN', 'empire': 970000, 'note': 'Scenario: 900,000 main formation + 70,000 reinforcement cohort travelling with it (shown together as 970,000, two formations in the ledger). The novels give 940,000 for the invasion army (v13.txt:16208).'})
e['effects']['forces'] = {'F-EMP-010': mv_eff('ADVANCING', 'ADVANCE', 'imperial-capital', 'Imperial Capital', strength=900000, sizeStatus='SCENARIO')}
e['effects']['campaign'] = {**e['effects'].get('campaign', {}), 'empireTotal': 970000, 'empireEffective': 970000}
e['forces'] = ['F-EMP-010', 'F-EMP-017']
audit(e, 'Main formation 900,000; the 70,000 cohort leaves with it (EVT-0530).')
put(P1, base(id='EVT-0530', day=-39, time='08:00', theatreId='TH-CAP', location='imperial-capital', locationText='Imperial Capital', type='FORMATION_DEPARTED',
             title='The 70,000 reinforcement cohort leaves the capital in the main column',
             immediateResult='The cohort marches with the main formation on the same road: 900,000 + 70,000 = 970,000 in one column.',
             operationalResult='Two formations, one column: the map draws them together as 970,000 until the halt point; the ledger keeps them apart.',
             strength={'tempest': 'UNKNOWN', 'empire': 70000, 'note': 'Reinforcement cohort (scenario).'}, significance='HIGH',
             evidence='Word document, A (Persiapan): "Gelombang pertama dianimasikan 900rb + 70rb = 970rb melewati perbatasan Tempest-Kekaisaran".',
             forces=['F-EMP-017'],
             effects={'forces': {'F-EMP-017': mv_eff('ADVANCING', 'ADVANCE', 'imperial-capital', 'Imperial Capital (in the main column)', strength=70000, sizeStatus='SCENARIO', direction='With the main formation')}, 'theatres': {}, 'campaign': {}}))
e = ev('EVT-0502')
e.update(day=-11, time='06:00', theatreId='TH-DWE', title='The 30,000 eastern cohort leaves the capital by the isthmus road',
         immediateResult='A separate column of 30,000 sets out for Dwargon\'s Eastern Gate across the Empire-Dwargon border.',
         strength={'tempest': 'UNKNOWN', 'empire': 30000, 'note': '900,000 + 70,000 + 30,000 = 1,000,000 forward-deployed (scenario).'},
         evidence='Word document, A: "30rb menyerbu Pintu Timur Dwargon lewat perbatasan Timur".',
         reconstructionNote='Timed backwards from the arrival at the Eastern Gate together with the halt (D-3 14:00): about 580 km by the isthmus road at under 80 km a day.')
e['effects']['forces'] = {'F-EMP-019': mv_eff('ADVANCING', 'ADVANCE', 'imperial-capital', 'Imperial Capital', strength=30000, sizeStatus='SCENARIO', direction='South-west, by the isthmus road')}
e['effects']['campaign'] = {'empireTotal': 1000000, 'empireEffective': 1000000}
e['forces'] = ['F-EMP-019']
audit(e, 'The 30,000 eastern cohort (was the 5,000 detachment).')
e = ev('EVT-0521')
e.update(day=-5, time='12:00', location='empire-dwargon-border', locationText='Empire-Dwargon border (isthmus road)', type='BORDER_CROSSING',
         title='The eastern cohort crosses the Empire-Dwargon border: Dwargon is at war',
         immediateResult='30,000 imperial soldiers enter Dwargon on the isthmus road.', operationalResult='The eastern front opens: Dwargon is a belligerent from this moment, and imperial-held ground in Dwargon starts here.',
         strength={'tempest': 'UNKNOWN', 'empire': 30000}, significance='CRITICAL', opponent='Armed Nation of Dwargon', opponentFaction='Armed Nation of Dwargon',
         evidence='Word document, catatan: "animasi teritorial Dwargon sejak lewat perbatasan (Dwargon join war dari awal)".')
e['effects']['forces'] = {'F-EMP-019': mv_eff('ADVANCING', 'ADVANCE', 'empire-dwargon-border', 'Empire-Dwargon border', direction='West, to the Eastern Gate')}
e['effects']['theatres'] = {'TH-DWE': {'status': 'ACTIVE', 'frontline': 'Imperial column inside Dwargon on the isthmus road', 'control': 'CONTESTED'}}
audit(e, 'Repurposed: the eastern cohort crosses into Dwargon.')
e = ev('EVT-0522')
e.update(day=-3, time='14:00', location='dwargon-eastern-front', locationText='Before the Eastern Gate', type='SIEGE', title='The eastern cohort reaches the Eastern Gate as the 970,000 reach the halt point',
         immediateResult='30,000 stand before Dwargon\'s Eastern Gate and close the isthmus road.', significance='HIGH', opponent='Armed Nation of Dwargon', opponentFaction='Armed Nation of Dwargon',
         strength={'tempest': 'UNKNOWN', 'empire': 30000}, evidence='Word document, C: "30rb sampai pintu timur bersamaan 970rb sampai halt".')
e['effects']['forces'] = {'F-EMP-019': mv_eff('BLOCKADING', 'STATIONARY', 'dwargon-eastern-front', 'Before the Eastern Gate')}
e['effects']['theatres'] = {'TH-DWE': {'status': 'ACTIVE', 'frontline': 'Imperial 30,000 before the Eastern Gate', 'battleStatus': 'NOT_STARTED', 'control': 'CONTESTED'}}
audit(e, 'Repurposed: arrival at the Eastern Gate, simultaneous with the halt.')
put(P1, base(id='EVT-0533', day=-3, time='14:10', theatreId='TH-DWE', location='dwargon-eastern-front', locationText='Before the Eastern Gate', type='FORMATION_MERGED',
             title='The eastern cohort forms the Eastern Gate force: 30,000', immediateResult='The Eastern Gate force stands at 30,000.', strength={'tempest': 'UNKNOWN', 'empire': 30000},
             evidence='Scenario ledger: the Gate force is counted as the formations merged into it.', forces=['F-EMP-019', 'F-EMP-031'],
             effects={'forces': {'F-EMP-019': mv_eff('MERGED', 'STATIONARY', None, 'Merged into the Eastern Gate force', strength=0),
                                 'F-EMP-031': mv_eff('BLOCKADING', 'STATIONARY', 'dwargon-eastern-front', 'Before the Eastern Gate', strength=30000, sizeStatus='SCENARIO')},
                      'theatres': {'TH-DWE': {'frontline': 'Eastern Gate force (30,000) before the gate'}}, 'campaign': {}}))
e = ev('EVT-0015')
e['title'] = 'The 970,000 cross the Tempest border (900,000 main formation and 70,000 cohort)'
e['strength'] = {'tempest': 'UNKNOWN', 'empire': 970000, 'note': 'Shown together; two formations in the ledger (scenario).'}
e['effects']['forces']['F-EMP-017'] = {'status': 'ADVANCING', 'movement': 'ADVANCE'}
e['forces'] = sorted(set((e.get('forces') or []) + ['F-EMP-010', 'F-EMP-017']))
audit(e, 'The cohort crosses with the main formation.')
e = ev('EVT-0019')
e['title'] = 'The 970,000 halt at the forest edge'
e['strength'] = {'tempest': 'UNKNOWN', 'empire': 970000, 'note': 'Main formation 900,000 and the cohort 70,000 (scenario).'}
e['effects']['forces']['F-EMP-017'] = mv_eff('HALTED', 'HALT', 'jura-forest-edge', 'Imperial halt point (forest edge)')
e['forces'] = sorted(set(e['forces'] + ['F-EMP-017']))
audit(e, 'The cohort halts with the main formation.')
e = ev('EVT-0503')
e.update(title='At the halt point the main formation splits: 700,000 and 200,000; the 70,000 cohort stays staged',
         immediateResult='700,000 for the Tempest capital and the Labyrinth, 200,000 for Dwargon\'s Main Gate by the south-west. The 70,000 cohort waits at the halt point.',
         operationalResult='700,000 + 200,000 = 900,000. The cohort is not split yet.', strength={'tempest': 'UNKNOWN', 'empire': 900000, 'note': 'Parent strength preserved by the split (scenario).'},
         evidence='Word document, C (Pembagian 900rb di halt).')
e['effects']['forces'] = {
    'F-EMP-010': mv_eff('SPLIT', 'STATIONARY', None, 'Split at the halt point'),
    'F-EMP-011': mv_eff('DEPLOYED', 'STATIONARY', 'jura-forest-edge', 'Imperial halt point', strength=700000, sizeStatus='EXPLICIT'),
    'F-EMP-012': mv_eff('DEPLOYED', 'STATIONARY', 'jura-forest-edge', 'Imperial halt point', strength=200000, sizeStatus='EXPLICIT'),
    'F-EMP-017': mv_eff('STAGED', 'STATIONARY', 'jura-forest-edge', 'Imperial halt point (staged)'),
}
e['effects']['theatres'] = {'TH-DWG': {'frontline': 'Main formation split at the halt point; the cohort staged'}}
e['forces'] = ['F-EMP-010', 'F-EMP-011', 'F-EMP-012', 'F-EMP-017']
audit(e, 'Two allocations (700,000 + 200,000); the cohort stays staged.')
e = ev('EVT-0504')
e.update(title='The 200,000 set out for Dwargon\'s Main Gate by the south-west')
e['effects']['forces'] = {'F-EMP-012': mv_eff('ADVANCING', 'ADVANCE', direction='North-west, to Dwargon\'s south-western border')}
audit(e, 'Straight to the south-western border (the R6 northern Tempest leg is gone).')
e = ev('EVT-0513')
e.update(day=-2, time='20:00', title='The 200,000 cross Dwargon\'s south-western border', opponent='Armed Nation of Dwargon', opponentFaction='Armed Nation of Dwargon')
audit(e, 'Re-timed for the direct route.')
e = ev('EVT-0514')
e.update(day=-2, time='20:10', title='The 200,000 push north to the Main Gate')
audit(e, 'Re-timed for the direct route.')
e = ev('EVT-0029')
e.update(time='08:00', reconstructionNote='Soei reports the camp on D+0. Placed at 08:00, the moment the 200,000 array before Dwargon\'s Main Gate (Word document, E: "200rb sampai bersamaan 700rb di Capital Tempest").')
audit(e, 'Moved to D+0 08:00, simultaneous with the 200,000 at the Main Gate.')
e = ev('EVT-0030')
e['title'] = 'The 200,000 (2,000 magitanks) array before Dwargon\'s Main Gate, about 30 km from the city centre'
audit(e, 'At the Main Gate on the south-western foot of the range.')
e = ev('EVT-0016')
e['effects']['forces'] = {'F-EMP-031': {'status': 'BLOCKADING', 'movement': 'STATIONARY'}}
e['forces'] = ['F-EMP-031']
e['strength'] = {'tempest': 'UNKNOWN', 'empire': 30000, 'note': 'Scenario: the 30,000 eastern cohort, before the gate since D-3 14:00. The novels state no strength here; 60,000 is first stated later (V13 Ch3).'}
audit(e, 'The blockade Gazel reports is the 30,000 Eastern Gate force.')
# E. Testarossa's group reaches the Main Gate before the 200,000.
put(P1, base(id='EVT-0534', day=-1, time='06:00', theatreId='TH-DWG', location='jura-tempest-federation', locationText='Capital Rimuru', type='FORMATION_DEPARTED',
             actor='Jura-Tempest Federation', actorFaction='Jura-Tempest Federation', opponent='Eastern Empire', opponentFaction='Eastern Empire',
             title="Testarossa's group leaves the capital Rimuru for Dwargon's Main Gate", immediateResult='Testarossa and Ultima go ahead to the gate where the First Corps is camping.',
             evidence='Word document, E (First Strike): "Group Testarossa dari Capital Tempest sampai sebelum 200rb". The novels have Testarossa at the gate camp on D+0 (v13.txt:2180-2200).',
             provenance='CANONICAL_WITH_VISUAL_RECONSTRUCTION', confidence={'time': 'LOW', 'numbers': 'MEDIUM', 'overall': 'MEDIUM'},
             forces=['F-DEM-001', 'F-DEM-002'], cast=[{'id': 'testarossa', 'presence': 'present'}, {'id': 'ultima', 'presence': 'present'}],
             effects={'forces': {'F-DEM-001': mv_eff('ACTIVE', 'ADVANCE', direction='North, to the Main Gate'), 'F-DEM-002': mv_eff('ACTIVE', 'ADVANCE', direction='North, to the Main Gate')}, 'theatres': {}, 'campaign': {}}))
put(P1, base(id='EVT-0535', day=-1, time='09:00', theatreId='TH-DWG', location='dwargon-main-gate', locationText='Dwargon Main Gate', type='REINFORCEMENT_ARRIVED',
             actor='Jura-Tempest Federation', actorFaction='Jura-Tempest Federation', opponent='Eastern Empire', opponentFaction='Eastern Empire',
             title="Testarossa's group reaches the Main Gate ahead of the 200,000", immediateResult='The envoy and her escort are at the gate a day before the magitanks array.',
             evidence='Word document, E.', provenance='CANONICAL_WITH_VISUAL_RECONSTRUCTION', confidence={'time': 'LOW', 'numbers': 'MEDIUM', 'overall': 'MEDIUM'},
             forces=['F-DEM-001', 'F-DEM-002'], cast=[{'id': 'testarossa', 'presence': 'present'}, {'id': 'ultima', 'presence': 'present'}],
             effects={'forces': {'F-DEM-001': mv_eff('ACTIVE', 'STATIONARY', 'dwargon-main-gate', 'Dwargon Main Gate'), 'F-DEM-002': mv_eff('ACTIVE', 'STATIONARY', 'dwargon-main-gate', 'Dwargon Main Gate')}, 'theatres': {}, 'campaign': {}}))
for fid in ('F-DEM-001', 'F-DEM-002'):
    ev('EVT-0006')['effects']['forces'].get(fid, {}).pop('location', None)
# F. Second Strike: the cohort splits after the rejection.
put(P2, base(id='EVT-0531', day=0, time='11:20', theatreId='TH-DWG', location='jura-forest-edge', locationText='Imperial halt point', type='FORMATION_SPLIT',
             title='The ultimatum is rejected: the 70,000 cohort splits, 40,000 for the Main Gate and 30,000 for the Eastern Gate',
             immediateResult='40,000 airships for the Main Gate, 30,000 infantry for the Eastern Gate.', operationalResult='40,000 + 30,000 = 70,000.',
             strength={'tempest': 'UNKNOWN', 'empire': 70000, 'note': 'Parent strength preserved by the split (scenario).'}, significance='HIGH',
             evidence='Word document, F (Second Strike). The document names the 30,000\'s destination "Pintu Utama"; its own totals (30,000 + 30,000 = 60,000 at the Eastern Gate) show it means the Eastern Gate (DISC-R7-02).',
             forces=['F-EMP-017', 'F-EMP-013', 'F-EMP-018'],
             effects={'forces': {'F-EMP-017': mv_eff('SPLIT', 'STATIONARY', None, 'Split at the halt point'),
                                 'F-EMP-013': mv_eff('DEPLOYED', 'STATIONARY', 'jura-forest-edge', 'Imperial halt point', strength=40000, sizeStatus='EXPLICIT'),
                                 'F-EMP-018': mv_eff('DEPLOYED', 'STATIONARY', 'jura-forest-edge', 'Imperial halt point', strength=30000, sizeStatus='SCENARIO')},
                      'theatres': {}, 'campaign': {}}))
e = ev('EVT-0506')
e.update(day=0, time='11:30', title='The 40,000 airships take off for the Main Gate', type='REINFORCEMENT_DISPATCHED', evidence='Word document, F. About 470 km at the airships\' 400 km an hour (v14.txt:1138).')
e['effects']['forces'] = {'F-EMP-013': mv_eff('REINFORCING', 'ADVANCE', direction='North-west, to the Main Gate (airships)')}
e['cast'] = [{'id': 'farraga', 'presence': 'present'}]
audit(e, 'Departs after the rejection, from the cohort.')
e = ev('EVT-0508')
e.update(day=0, time='11:40', title='The 30,000 set out from the halt point for the Eastern Gate', evidence='Word document, F. About 560 km through the eastern forest, a week at the infantry rate.')
e['effects']['forces'] = {'F-EMP-018': mv_eff('REINFORCING', 'ADVANCE', direction='North-east, to the Eastern Gate')}
audit(e, 'Departs after the rejection, from the cohort.')
e = ev('EVT-0106')
e.update(time='12:30')
e['strength']['note'] = (e['strength'].get('note') or '') + ' Scenario: with the 200,000 already there, 240,000 at the Main Gate.'
audit(e, 'Arrival 12:30 after the flight from the halt point; 240,000 at the gate.')
e = ev('EVT-0509')
e.update(day=7, time='12:00', title='The 30,000 reach the Eastern Gate', location='dwargon-eastern-front', locationText='Before the Eastern Gate')
e['effects']['forces'] = {'F-EMP-018': mv_eff('ARRIVED', 'STATIONARY', 'dwargon-eastern-front', 'Before the Eastern Gate')}
audit(e, 'The eastern reinforcement from the cohort.')
e = ev('EVT-0525')
e.update(day=7, time='12:10', title='The Eastern Gate force stands at 60,000', location='dwargon-eastern-front', locationText='Before the Eastern Gate',
         immediateResult='30,000 + 30,000 = 60,000 before the Eastern Gate.', strength={'tempest': 'UNKNOWN', 'empire': 60000},
         sources=[{'volume': 'V13', 'chapter': 'Ch3', 'locator': 'v13.txt:7710-7714'}, DOC_REF, SCEN_REF],
         evidence='The novels give 60,000 before the Isthmus from V13 Ch3 on (v13.txt:7710-7714). The scenario composes them from the two cohorts.')
e['effects']['forces'] = {'F-EMP-018': mv_eff('MERGED', 'STATIONARY', None, 'Merged into the Eastern Gate force', strength=0),
                          'F-EMP-031': {'strength': 60000, 'status': 'BLOCKADING', 'movement': 'STATIONARY'}}
e['effects']['theatres'] = {'TH-DWE': {'frontline': 'Eastern Gate force (60,000) before the gate'}}
e['forces'] = ['F-EMP-018', 'F-EMP-031']
audit(e, 'Second Strike: 60,000 at the Eastern Gate.')
# G. The Labyrinth: 350,000, then 200,000; 150,000 outside.
e = ev('EVT-0210')
e.update(title='Day two: 200,000 more enter the labyrinth', strength={'tempest': 'UNKNOWN', 'empire': 200000, 'note': 'Scenario: 350,000 + 200,000 = 550,000 inside; 150,000 outside. The novels: 150,000 on day two (DISC-R7-04).'})
e['effects']['forces'] = {'F-EMP-011A': {'strength': 550000, 'effective': 550000, 'sizeStatus': 'SCENARIO'}, 'F-EMP-011B': {'strength': 150000, 'effective': 150000, 'sizeStatus': 'SCENARIO'}}
audit(e, '200,000 on day two (scenario).')
e = ev('EVT-0211')
e.update(title='Day three: no more enter; 150,000 hold the camp outside', strength={'tempest': 'UNKNOWN', 'empire': 150000, 'note': 'Scenario: 700,000 = 350,000 + 200,000 + 150,000. The novels: last 30,000 enter, 170,000 outside (DISC-R7-04).'})
e['effects']['forces'] = {'F-EMP-011A': {'movement': 'STATIONARY', 'locationText': 'Ramiris Labyrinth (spread across many floors)'}, 'F-EMP-011B': {'strength': 150000, 'effective': 150000, 'sizeStatus': 'SCENARIO'}}
audit(e, 'No third-day entry in the scenario.')
e = ev('EVT-0207')
e.update(title='Labyrinth battle over: 550,000 defeated inside (350,000 and 200,000), no Tempest losses', strength={'tempest': 'UNKNOWN', 'empire': 550000})
e['effects']['forces']['F-EMP-011A'].update(kia=550000)
e['effects']['forces']['F-EMP-011'].update(strength=150000, effective=150000, kia=550000)
e['effects']['campaign']['empireEffective'] = 210000
e['effects']['theatres']['TH-LAB']['frontline'] = 'Labyrinth cleared of invaders; 150,000 imperial troops remain in the camp at the gate'
audit(e, '550,000 inside (scenario).')
e = ev('EVT-0219')
e['strength'] = {'tempest': 'UNKNOWN', 'empire': 150000, 'note': 'The camp outside (scenario); Jura total 700,000 = 350,000 + 200,000 + 150,000.'}
e['effects']['forces']['F-EMP-011B'].update(kia=150000)
e['effects']['campaign']['empireEffective'] = 60000
audit(e, '150,000 outside (scenario).')
ev('EVT-0115')['effects']['campaign']['empireEffective'] = 960000
ev('EVT-0119')['effects']['campaign']['empireEffective'] = 760000
e = ev('EVT-0119')
e['title'] = 'Main Gate battle over: the 200,000 and the 40,000 annihilated by Testarossa\'s group'
e['strength']['note'] = 'Empire: 200,000 + 40,000 = 240,000 at the Main Gate (v13.txt:7531-7542). Scenario attribution: Testarossa\'s group; the novels credit Ultima (air), Gobta, Ranga, Hakuro and Gabiru (ground) and Testarossa (Gaster\'s headquarters). See DISC-R7-03.'
audit(e, 'Scenario framing of the Main Gate counter-attack.')
e = ev('EVT-0515')
e.update(title='The Main Gate offensive has failed: imperial ground in south-western Dwargon is given up',
         immediateResult='No soldier of the 240,000 remains on the field; the south-western front returns to the pre-war line.',
         operationalResult='Territorial withdrawal in the south-west. The Eastern Gate front is untouched.')
e['effects']['theatres'] = {'TH-DWG': {'frontline': 'Offensive failed; south-western Dwargon back to the pre-war line'}}
e.pop('logistics', None)
audit(e, 'South-western withdrawal (scenario H).')
# J-L. Eastern counter-offensive, coup, Third Strike.
put(P4, base(id='EVT-0536', day=11, time='08:00', theatreId='TH-DWE', location='dwargon-main-gate', locationText='Dwargon Main Gate', type='FORMATION_DEPARTED',
             actor='Jura-Tempest Federation', actorFaction='Jura-Tempest Federation', opponent='Eastern Empire', opponentFaction='Eastern Empire',
             title="Tempest's First Corps leaves the Main Gate for the Eastern Gate", immediateResult='With the Jura front closed, the First Corps marches east along the range to join Gazel.',
             evidence='Word document, J (Counter Timur): "Dwargon-Tempest menuju timur vs 60rb". The novels do not move the First Corps east; Tempest\'s relief force arrives by spatial transfer on the Long Night (EVT-0336).',
             forces=['F-TEM-001'], effects={'forces': {'F-TEM-001': mv_eff('ACTIVE', 'ADVANCE', direction='East, along the range to the Eastern Gate')}, 'theatres': {}, 'campaign': {}}))
put(P4, base(id='EVT-0537', day=15, time='08:00', theatreId='TH-DWE', location='dwargon-eastern-gate', locationText='Dwargon Eastern Gate', type='REINFORCEMENT_ARRIVED',
             actor='Jura-Tempest Federation', actorFaction='Jura-Tempest Federation', opponent='Eastern Empire', opponentFaction='Eastern Empire',
             title='The First Corps joins Dwargon\'s army at the Eastern Gate', evidence='Word document, J. About 330 km in four days.',
             forces=['F-TEM-001'], effects={'forces': {'F-TEM-001': mv_eff('DEPLOYED', 'STATIONARY', 'dwargon-eastern-gate', 'Dwargon Eastern Gate')}, 'theatres': {}, 'campaign': {}}))
put(P4, base(id='EVT-0538', day=15, time='18:00', theatreId='TH-DWE', location='dwargon-defensive-line', locationText='East of the Eastern Gate', type='OFFENSIVE',
             actor='Armed Nation of Dwargon', actorFaction='Armed Nation of Dwargon', opponent='Eastern Empire', opponentFaction='Eastern Empire',
             title='Allied counter-offensive: Dwargon and Tempest push east against the 60,000', battle=None,
             immediateResult='The allies advance from the gate on the imperial camp.', operationalResult='The eastern front moves back and forth; the coup in the imperial capital breaks out while the battle is on.',
             significance='HIGH', intensity='HIGH', evidence='Word document, J and K.',
             forces=['F-DWA-001', 'F-TEM-001', 'F-EMP-031'],
             effects={'forces': {'F-DWA-001': mv_eff('ENGAGED', 'ADVANCE', 'dwargon-defensive-line', 'East of the Eastern Gate', direction='East'),
                                 'F-TEM-001': mv_eff('ENGAGED', 'ADVANCE', 'dwargon-defensive-line', 'East of the Eastern Gate', direction='East'),
                                 'F-EMP-031': {'status': 'ENGAGED', 'movement': 'STATIONARY'}},
                      'theatres': {'TH-DWE': {'status': 'ACTIVE', 'battleStatus': 'ACTIVE', 'frontline': 'Allied counter-offensive against the 60,000'}}, 'campaign': {}}))
put(P4, base(id='EVT-0540', day=15, time='22:00', theatreId='TH-CAP', location='imperial-capital', locationText='Imperial Capital', type='FORMATION_TRANSFERRED',
             title='Third Strike: 10,100 leave the capital reserve', immediateResult='The capital reserve falls from 110,100 to 100,000; the 10,100 board airships.',
             operationalResult='The only addition to the operation after the initial deployment: 1,000,000 + 10,100 = 1,010,100 committed.',
             strength={'tempest': 'UNKNOWN', 'empire': 10100}, significance='HIGH', evidence='Word document, L (Third Strike, after the coup: "All Out Strike").',
             reconstructionNote='Two hours after the coup (EVT-0323).', forces=['F-EMP-080', 'F-EMP-081'],
             effects={'forces': {'F-EMP-080': {'strength': 100000, 'status': 'RESERVE', 'movement': 'STATIONARY'},
                                 'F-EMP-081': mv_eff('ADVANCING', 'STATIONARY', 'imperial-capital', 'Imperial Capital', strength=10100, sizeStatus='SCENARIO')},
                      'theatres': {}, 'campaign': {}}))
put(P4, base(id='EVT-0541', day=15, time='22:10', theatreId='TH-CAP', location='imperial-capital', locationText='Imperial Capital', type='FORMATION_SPLIT',
             title='The Third Strike divides: most for the Eastern Gate, the rest for the Tempest capital',
             immediateResult='The eastern group flies for the Eastern Gate across the Empire-Dwargon border; the Tempest group for the Great Jura Forest.',
             operationalResult='The two groups sum to 10,100 (data-source/campaign/scenario-params.json).', strength={'tempest': 'UNKNOWN', 'empire': 10100},
             evidence='Word document, L: "sebagian besar ke Pintu Timur lewat perbatasan timur, sisanya ke Capital Tempest".', forces=['F-EMP-081', 'F-EMP-081E', 'F-EMP-081T'],
             effects={'forces': {'F-EMP-081': mv_eff('SPLIT', 'STATIONARY', None, 'Divided into its two groups'),
                                 'F-EMP-081E': mv_eff('ADVANCING', 'ADVANCE', 'imperial-capital', 'Imperial Capital', strength=8000, sizeStatus='SCENARIO', direction='South-west, to the Eastern Gate (airships)'),
                                 'F-EMP-081T': mv_eff('ADVANCING', 'ADVANCE', 'imperial-capital', 'Imperial Capital', strength=2100, sizeStatus='SCENARIO', direction='South-west, to the Great Jura Forest (airships)')},
                      'theatres': {}, 'campaign': {}}))
put(P4, base(id='EVT-0542', day=15, time='23:10', theatreId='TH-DWE', location='empire-dwargon-border', locationText='Empire-Dwargon border', type='BORDER_CROSSING',
             title="The Third Strike's eastern group crosses the eastern border", opponent='Armed Nation of Dwargon', opponentFaction='Armed Nation of Dwargon', evidence='Word document, L.',
             forces=['F-EMP-081E'], effects={'forces': {'F-EMP-081E': mv_eff('ADVANCING', 'ADVANCE', 'empire-dwargon-border', 'Over the Empire-Dwargon border')}, 'theatres': {}, 'campaign': {}}))
put(P4, base(id='EVT-0543', day=15, time='23:40', theatreId='TH-DWE', location='dwargon-eastern-front', locationText='Before the Eastern Gate', type='REINFORCEMENT_ARRIVED',
             title="The Third Strike's eastern group lands before the Eastern Gate", opponent='Armed Nation of Dwargon', opponentFaction='Armed Nation of Dwargon',
             immediateResult='The imperial line before the gate is re-formed as the Magic Beast Division emerges on the same front.', evidence='Word document, L.',
             forces=['F-EMP-081E'], effects={'forces': {'F-EMP-081E': mv_eff('ENGAGED', 'STATIONARY', 'dwargon-eastern-front', 'Before the Eastern Gate')}, 'theatres': {}, 'campaign': {}}))
put(P4, base(id='EVT-0544', day=16, time='00:50', theatreId='TH-LAB', location='third-strike-landing', locationText='Great Jura Forest', type='AIRBORNE',
             title="The Third Strike's Tempest group lands in the Great Jura Forest", evidence='Word document, L: "sisanya ke Capital Tempest dengan advancement teritorial".',
             forces=['F-EMP-081T'], effects={'forces': {'F-EMP-081T': mv_eff('ADVANCING', 'STATIONARY', 'third-strike-landing', 'Great Jura Forest')}, 'theatres': {}, 'campaign': {}}))
put(P4, base(id='EVT-0545', day=16, time='01:00', theatreId='TH-LAB', location='third-strike-landing', locationText='Great Jura Forest', type='OFFENSIVE',
             title='The Tempest group advances on the capital Rimuru', immediateResult='Imperial-held ground spreads west from the landing ground.', evidence='Word document, L.',
             forces=['F-EMP-081T'], effects={'forces': {'F-EMP-081T': mv_eff('ADVANCING', 'ADVANCE', direction='West, on the capital')}, 'theatres': {'TH-LAB': {'status': 'ACTIVE', 'frontline': 'Third Strike advancing on the capital'}}, 'campaign': {}}))
put(P4, base(id='EVT-0546', day=16, time='01:40', theatreId='TH-DWE', location='dwargon-eastern-front', locationText='Before the Eastern Gate', type='UNIT_DESTRUCTION',
             actor='Armed Nation of Dwargon', actorFaction='Armed Nation of Dwargon', opponent='Eastern Empire', opponentFaction='Eastern Empire',
             title="The Third Strike's eastern group is destroyed in the allied general attack", significance='HIGH', intensity='HIGH',
             immediateResult='The imperial line before the Eastern Gate breaks with the Magic Beast Division (EVT-0463).', evidence='Word document, M (counter akhir berhasil).',
             forces=['F-EMP-081E'], effects={'forces': {'F-EMP-081E': mv_eff('DESTROYED', 'STATIONARY', strength=0, effective=0, kia=8000)}, 'theatres': {'TH-DWE': {'frontline': 'Imperial forces before the Eastern Gate destroyed'}}, 'campaign': {}},
             cast=[{'id': 'gabiru', 'presence': 'present'}, {'id': 'gazel', 'presence': 'present'}]))
put(P4, base(id='EVT-0547', day=16, time='02:20', theatreId='TH-LAB', location='tempest-eastern-outskirts', locationText='Eastern outskirts of the capital', type='UNIT_DESTRUCTION',
             actor='Jura-Tempest Federation', actorFaction='Jura-Tempest Federation', opponent='Eastern Empire', opponentFaction='Eastern Empire',
             title="The Third Strike's Tempest group is destroyed before the capital", significance='HIGH', intensity='HIGH',
             immediateResult="Geld's Second Corps, holding the capital's surface, destroys it.", evidence='Word document, M. Geld\'s men shield the city that night (EVT-0467).',
             forces=['F-EMP-081T', 'F-TEM-002'], effects={'forces': {'F-EMP-081T': mv_eff('DESTROYED', 'STATIONARY', 'tempest-eastern-outskirts', 'Eastern outskirts of the capital', strength=0, effective=0, kia=2100)}, 'theatres': {}, 'campaign': {}},
             cast=[{'id': 'geld', 'presence': 'present'}]))
put(P4, base(id='EVT-0548', day=16, time='03:00', theatreId='TH-DIP', location=None, locationText='Both fronts', type='OUTCOME',
             actor='Jura-Tempest Federation', actorFaction='Jura-Tempest Federation', opponent='Eastern Empire', opponentFaction='Eastern Empire',
             title='Both fronts back on the pre-war line', immediateResult='No imperial soldier holds ground in Tempest or Dwargon: status quo.', significance='HIGH',
             evidence='Word document, M: "counter akhir berhasil di dua front, status quo".'))
# The coup and the 60,000 (canon), seen against the allied push.
e = ev('EVT-0325')
e['effects']['campaign']['empireEffective'] = 0
audit(e, 'The 60,000 die while the allied counter-offensive is engaged (DISC-R7-06).')
# N. Ending.
put(P5, base(id='EVT-0560', day=16, time='17:30', theatreId='TH-DIP', location='jura-tempest-federation', locationText='Capital Rimuru', type='POLITICAL',
             actor='Jura-Tempest Federation', actorFaction='Jura-Tempest Federation', opponent='Western Nations', opponentFaction='Western Nations',
             title='Rimuru tells Elmesia: "Hey, we won"', provenance='CANONICAL', timePrecision='RECONSTRUCTED', confidence={'time': 'LOW', 'numbers': 'HIGH', 'overall': 'HIGH'},
             sources=[{'volume': 'V16', 'chapter': 'Ch1', 'locator': 'v16.txt:9656-9658'}], evidence='Before the party Rimuru tells the Heavenly Emperor of Thalion over a secure magitool that the war is won (v16.txt:9656-9658).',
             cast=[{'id': 'rimuru', 'presence': 'present'}]))
put(P5, base(id='EVT-0561', day=16, time='20:00', theatreId='TH-DIP', location='jura-tempest-federation', locationText='Capital Rimuru (victory party)', type='POLITICAL',
             actor='Armed Nation of Dwargon', actorFaction='Armed Nation of Dwargon', opponent='Western Nations', opponentFaction='Western Nations',
             title='Gazel presses for an explanation to the Western Nations', provenance='CANONICAL', timePrecision='RECONSTRUCTED', confidence={'time': 'LOW', 'numbers': 'HIGH', 'overall': 'HIGH'},
             immediateResult='Rimuru will give the West a curated account that leaves out his officers\' evolution.',
             sources=[{'volume': 'V16', 'chapter': 'Ch3', 'locator': 'v16.txt:9613-9628'}], evidence='At the party Gazel warns that the Western Nations, the Church and Thalion will want an explanation; Rimuru plans a cover story (v16.txt:9613-9628).',
             cast=[{'id': 'gazel', 'presence': 'present'}, {'id': 'rimuru', 'presence': 'present'}]))
put(P5, base(id='EVT-0562', day=19, time='16:00', theatreId='TH-DIP', location='jura-tempest-federation', locationText='Capital Rimuru (summit)', type='POLITICAL',
             actor='Jura-Tempest Federation', actorFaction='Jura-Tempest Federation', opponent='Eastern Empire', opponentFaction='Eastern Empire',
             title='Scenario reading: the Empire as a temporary Tempest-aligned state', provenance='SCENARIO',
             immediateResult='A Tempest-backed emperor (Masayuki), a Tempest embassy under Testarossa and a Tempest bodyguard (Venom) at his side, inside a three-nation alliance.',
             operationalResult='The Word document calls this a temporary puppet state. In the novels Rimuru rules out making the Empire a vassal (v16.txt:7192-7193); no occupation or puppet government is described.',
             sources=[DOC_REF, {'volume': 'V16', 'chapter': 'Ch3', 'locator': 'v16.txt:7192-7197'}, {'volume': 'V16', 'chapter': 'Ch3', 'locator': 'v16.txt:9262-9296'}],
             evidence='Word document, N: "Kekaisaran diambil alih Tempest sebagai Puppet State sementara (sesuaikan canon)". Adjusted to canon as alignment, not control (DISC-R7-08).',
             cast=[{'id': 'rimuru', 'presence': 'present'}, {'id': 'masayuki', 'presence': 'present'}, {'id': 'velgrynd', 'presence': 'present'}, {'id': 'testarossa', 'presence': 'present'}]))
put(P5, base(id='EVT-0563', day=23, time='10:00', theatreId='TH-DIP', location='council-of-the-west', locationText='Council of the West (Ingracia)', type='POLITICAL',
             actor='Jura-Tempest Federation', actorFaction='Jura-Tempest Federation', opponent='Western Nations', opponentFaction='Western Nations',
             title='Scenario: Tempest gives the Western Nations its account of the war', provenance='SCENARIO',
             immediateResult='The West hears a curated account; Testarossa (Tempest\'s representative) and Cien handle the Council.',
             sources=[DOC_REF, {'volume': 'V16', 'chapter': 'Ch3', 'locator': 'v16.txt:9813-9823'}],
             evidence='Word document, N: "rapat besar dengan Wilayah Barat". The novels show no such meeting: Cien and Zonda cover Blumund and the Western Nations after the summit (v16.txt:9813-9823). Placed after Gazel leaves Tempest (DISC-R7-09).',
             cast=[{'id': 'testarossa', 'presence': 'present'}, {'id': 'cien', 'presence': 'present'}]))
put(P5, base(id='EVT-0564', day=27, time='10:00', theatreId='TH-DIP', location='walpurgis-council', locationText='Walpurgis Council', type='POLITICAL',
             actor='Guy Crimson', actorFaction='Octagram', opponent='-', opponentFaction='-',
             title='Guy Crimson summons an emergency Walpurgis Council of the Octagram', provenance='CANONICAL', timePrecision='RECONSTRUCTED',
             confidence={'time': 'LOW', 'numbers': 'HIGH', 'overall': 'HIGH'},
             immediateResult='Rimuru goes with Shion and Diablo; Ramiris joins with Beretta and Treyni.',
             sources=[{'volume': 'V16', 'chapter': 'Ch3', 'locator': 'v16.txt:9876-9939'}],
             evidence='"Days later" Rimuru\'s Demon\'s Ring glows and Guy summons all members (v16.txt:9878-9886). Placed the day after the prisoners leave (EVT-0455).',
             cast=[{'id': 'rimuru', 'presence': 'present'}, {'id': 'shion', 'presence': 'present'}, {'id': 'diablo', 'presence': 'present'}, {'id': 'ramiris', 'presence': 'present'}, {'id': 'beretta', 'presence': 'present'}, {'id': 'treyni', 'presence': 'present'}]))
e = ev('EVT-0450')
e['title'] = 'Return home: the victory festival in the capital'
audit(e, 'The ending festival of the scenario (N).')

# --------------------------------------------------------------------------- cast audit

audit_rows = {}
if CAST_DIR:
    for n in ['01', '02', '03', '04', '05']:
        d = load(CAST_DIR / f'cast-{n}.json')
        audit_rows.update({k: v for k, v in d.items() if k.startswith('EVT-')})
SCENARIO_CAST = {
    'EVT-0003': [('calgurio', 'present'), ('minitz', 'present'), ('gaster', 'present'), ('farraga', 'present'), ('rudra', 'remote')],
    'EVT-0530': [('farraga', 'present')],
    'EVT-0015': [('calgurio', 'present'), ('minitz', 'present'), ('gaster', 'present'), ('farraga', 'present'), ('rudra', 'remote'), ('rimuru', 'remote'), ('benimaru', 'remote')],
    'EVT-0019': [('calgurio', 'present'), ('minitz', 'present'), ('gaster', 'present'), ('farraga', 'present')],
    'EVT-0503': [('calgurio', 'present'), ('minitz', 'present'), ('gaster', 'present')],
    'EVT-0504': [('gaster', 'present')],
    'EVT-0513': [('gaster', 'present')],
    'EVT-0514': [('gaster', 'present')],
    'EVT-0531': [('farraga', 'present')],
    'EVT-0538': [('gazel', 'present'), ('gobta', 'present')],
    'EVT-0540': [('rudra', 'remote')],
}
missing_log = {}
for lst in files.values():
    for e in lst:
        row = audit_rows.get(e['id'])
        cast = None
        if e['id'] in SCENARIO_CAST:
            cast = [{'id': i, 'presence': p} for i, p in SCENARIO_CAST[e['id']]]
        elif 'cast' in e:
            cast = e['cast']
        elif row is not None:
            cast = [{'id': c['id'], 'presence': c['presence']} for c in row.get('cast', []) if c['id'] in CHAR_IDS]
            for m in row.get('missingCharacters', []):
                cid = NAME_TO_ID.get(m['name'])
                if cid and cid in CHAR_IDS and not any(c['id'] == cid for c in cast):
                    cast.append({'id': cid, 'presence': m.get('presence', 'present')})
                elif not cid:
                    missing_log.setdefault(m['name'], []).append(e['id'])
        if cast is None:
            cast = [{'id': c, 'presence': 'present'} for c in e.get('characters', [])]
        e['cast'] = cast
        e['characters'] = [c['id'] for c in cast]
        if row is not None:
            e['castAudit'] = {'confidence': row.get('confidence', 'LOW'), **({'comment': row['comment']} if row.get('comment') else {}), 'removed': row.get('removed', [])}
for f, lst in files.items():
    lst.sort(key=lambda e: (e['day'], e['time'], e['id']))
    save(C / 'events' / f'{f}.json', lst)
(ROOT / 'docs' / 'research').mkdir(parents=True, exist_ok=True)
save(ROOT / 'docs' / 'research' / 'cast-unregistered.json', {'about': 'Characters the per-event audit found present but who have no entry in data-source/characters.source.json (R7). Event ids where they appear.', 'names': dict(sorted(missing_log.items()))}, 1)

# --------------------------------------------------------------------------- movements

movements = load(C / 'movements.json')
movements = [m for m in movements if m['id'] not in ('MOV-042', 'MOV-045', 'MOV-047', 'MOV-051', 'MOV-052', 'MOV-053')]
M = {m['id']: m for m in movements}


def newmove(**o):
    m = {'type': 'ADVANCE', 'route': 'RECONSTRUCTED', 'basis': 'SIMULATION_RECONSTRUCTED', 'confidence': 'MEDIUM', 'notes': f'{TAG}.', 'destinationUnknown': False}
    m.update(o)
    return m


M['MOV-001'].update(to="Dwargon's south-western border", toPlace='dwargon-sw-border', startEvent='EVT-0504', endEvent='EVT-0513', notes=f'{TAG}: the 200,000 go straight to the south-western border.')
M['MOV-043'].update(to='Main Gate front', notes=f'{TAG}.')
M['MOV-044'].update(to='Airspace over the Main Gate front', toPlace='sw-dwargon-airspace', startEvent='EVT-0506', endEvent='EVT-0106', notes=f'{TAG}: the 40,000 airships from the cohort.')
M['MOV-046'].update(forceId='F-EMP-018', to='Before the Eastern Gate', toPlace='dwargon-eastern-front', startEvent='EVT-0508', endEvent='EVT-0509', notes=f'{TAG}: the 30,000 from the cohort.')
M['MOV-048'].update(to='Empire-Dwargon border', toPlace='empire-dwargon-border', startEvent='EVT-0502', endEvent='EVT-0521', notes=f'{TAG}: the 30,000 eastern cohort.')
M['MOV-049'].update(**{'from': 'Empire-Dwargon border', 'fromPlace': 'empire-dwargon-border', 'to': 'Before the Eastern Gate', 'toPlace': 'dwargon-eastern-front', 'startEvent': 'EVT-0521', 'endEvent': 'EVT-0522', 'notes': f'{TAG}.'})
M['MOV-050'].update(forceId='F-EMP-081E', to='Empire-Dwargon border', toPlace='empire-dwargon-border', startEvent='EVT-0541', endEvent='EVT-0542', type='REINFORCEMENT', speedClass='air', notes=f'{TAG}: Third Strike, eastern group.')
movements += [
    newmove(id='MOV-054', forceId='F-EMP-017', **{'from': 'Imperial Capital', 'to': 'Tempest border'}, fromPlace='imperial-capital', toPlace='tempest-border', startEvent='EVT-0530', endEvent='EVT-0015', notes=f'{TAG}: in the main column.'),
    newmove(id='MOV-055', forceId='F-EMP-017', **{'from': 'Tempest border', 'to': 'Imperial halt point'}, fromPlace='tempest-border', toPlace='jura-forest-edge', startEvent='EVT-0015', endEvent='EVT-0019', notes=f'{TAG}: in the main column.'),
    newmove(id='MOV-056', forceId='F-EMP-081E', **{'from': 'Empire-Dwargon border', 'to': 'Before the Eastern Gate'}, fromPlace='empire-dwargon-border', toPlace='dwargon-eastern-front', startEvent='EVT-0542', endEvent='EVT-0543', type='REINFORCEMENT', speedClass='air'),
    newmove(id='MOV-057', forceId='F-EMP-081T', **{'from': 'Imperial Capital', 'to': 'Great Jura Forest'}, fromPlace='imperial-capital', toPlace='third-strike-landing', startEvent='EVT-0541', endEvent='EVT-0544', type='REINFORCEMENT', speedClass='air'),
    newmove(id='MOV-058', forceId='F-EMP-081T', **{'from': 'Great Jura Forest', 'to': 'Eastern outskirts of the capital'}, fromPlace='third-strike-landing', toPlace='tempest-eastern-outskirts', startEvent='EVT-0545', endEvent='EVT-0547'),
    newmove(id='MOV-059', forceId='F-DEM-001', **{'from': 'Capital Rimuru', 'to': 'Dwargon Main Gate'}, fromPlace='jura-tempest-federation', toPlace='dwargon-main-gate', startEvent='EVT-0534', endEvent='EVT-0535', type='REPOSITION'),
    newmove(id='MOV-060', forceId='F-DEM-002', **{'from': 'Capital Rimuru', 'to': 'Dwargon Main Gate'}, fromPlace='jura-tempest-federation', toPlace='dwargon-main-gate', startEvent='EVT-0534', endEvent='EVT-0535', type='REPOSITION'),
    newmove(id='MOV-061', forceId='F-TEM-001', **{'from': 'Dwargon Main Gate', 'to': 'Dwargon Eastern Gate'}, fromPlace='dwargon-main-gate', toPlace='dwargon-eastern-gate', startEvent='EVT-0536', endEvent='EVT-0537', type='REPOSITION'),
    newmove(id='MOV-062', forceId='F-TEM-001', **{'from': 'Dwargon Eastern Gate', 'to': 'East of the Eastern Gate'}, fromPlace='dwargon-eastern-gate', toPlace='dwargon-defensive-line', startEvent='EVT-0538', endEvent='EVT-0538'),
]
save(C / 'movements.json', movements)

# --------------------------------------------------------------------------- transit (the cohort rides with the main column)

transit = [t for t in load(C / 'transit.json') if t['forceId'] == 'F-EMP-010']
save(C / 'transit.json', transit + [{**t, 'forceId': 'F-EMP-017'} for t in transit])

# --------------------------------------------------------------------------- casualties

cas = [c for c in load(C / 'casualties.json') if c['id'] != 'CAS-S01']
R = {c['id']: c for c in cas}
R['CAS-004'].update(kia=550000, formation='Labyrinth Raider force (350,000 + 200,000)', notes=(R['CAS-004'].get('notes') or '') + ' R7 scenario: 550,000 (novels: 530,000; DISC-R7-04).')
R['CAS-017'].update(kia=150000, notes=(R['CAS-017'].get('notes') or '') + ' R7 scenario: 150,000 (novels: 170,000; DISC-R7-04).')
R['CAS-006'].update(kia=790000, notes=(R['CAS-006'].get('notes') or '') + ' R7: 240,000 + 550,000.')
R['CAS-012'].update(formation='Eastern Gate force (60,000)', notes=(R['CAS-012'].get('notes') or '') + ' R7: the Eastern Gate force (30,000 eastern cohort + 30,000 from the reinforcement cohort).')
for cid, eid, fid, n, form in [('CAS-T01', 'EVT-0546', 'F-EMP-081E', 8000, 'Third Strike, eastern group'), ('CAS-T02', 'EVT-0547', 'F-EMP-081T', 2100, 'Third Strike, Tempest group')]:
    cas.append({'id': cid, 'eventId': eid, 'faction': 'Eastern Empire', 'forceId': fid, 'formation': form, 'cause': 'Allied counter-attack', 'kia': n, 'wia': 'UNKNOWN', 'pow': 'UNKNOWN', 'mia': 'UNKNOWN',
                'revived': 0, 'scope': 'EVENT_CASUALTY', 'aggregateOf': '-', 'basis': 'SCENARIO', 'confidence': 'MEDIUM', 'sourceRefs': [DOC_REF, SCEN_REF],
                'evidence': 'Word document, M: the final counter-attacks succeed on both fronts. The group strength is the scenario parameter.', 'notes': 'R7.'})
save(C / 'casualties.json', cas)

# --------------------------------------------------------------------------- scenario parameters

save(C / 'scenario-params.json', {
    'about': 'Owner-adjustable scenario parameters, applied by scripts/compile-data.ts. thirdStrike.groups splits the 10,100 Third Strike between its eastern and Tempest groups; the compiler writes these strengths into the split event and the casualty records and refuses to build unless they sum to thirdStrike.total.',
    'thirdStrike': {'total': 10100, 'transferEvent': 'EVT-0540', 'splitEvent': 'EVT-0541', 'groups': {'F-EMP-081E': 8000, 'F-EMP-081T': 2100}},
}, 2)

# --------------------------------------------------------------------------- territory control and front rules

tc = load(SRC / 'territory-control.source.json')
dwg = tc['territories']['T-DWG']
dwg[1].update(fromEvent='EVT-0521', provenance='INFERRED', basis='R7 scenario: Dwargon is at war from the moment the 30,000 eastern cohort crosses the Empire-Dwargon border (EVT-0521). The novels have the Empire blockade the eastern gate (EVT-0016) and the allied division of tasks (EVT-0018).')
save(SRC / 'territory-control.source.json', tc, 1)
fr = load(C / 'front-rules.json')
for g in fr['gates']:
    if g['territoryId'] == 'T-DWG':
        g['fromEvent'] = 'EVT-0521'
        g['basis'] = 'R7 scenario: imperial ground in Dwargon from the eastern crossing (EVT-0521): the 30,000 on the isthmus up to the Eastern Gate and the coast, and the 200,000 on their way from the south-western border to the Main Gate. Both are given back when the formations holding them are destroyed (status quo).'
fr['reopen'] = [{'side': 'empire', 'fromEvent': 'EVT-0541', 'basis': 'R7 scenario: the Third Strike advances over ground the Empire lost earlier in the war (Word document, L: advancement teritorial). Until then, ground a side lost stays lost.'}]
fr['about'] = fr['about'].rstrip('.') + '. Reopen: from that event a side may take again ground it lost earlier.'
save(C / 'front-rules.json', fr, 2)

# --------------------------------------------------------------------------- revision

rev = load(C / 'revision.json')
rev['revision'] = 'R7-CAMPAIGN-RECONSTRUCTION (2026-10-12)'
rev['note'] = "R7: the owner's campaign scenario (Word document 'Alur Timeline secara kasarannya', phases A-N; docs/CAMPAIGN_TIMELINE.md) on the R5 canon-audit skeleton, with the compact Kanaat massif and the continental basemap (docs/GEOGRAPHIC_MODEL.md). Battle day 0 is first contact (the day of Testarossa's ultimatum and the Main Gate battle). Day placements are canonical only where AUDIT-PLAN.md marks them CANONICAL_RELATIVE; every clock time is a simulation placement on a 10-minute grid. calendarStart 01/01/9001 is the artificial date of D-43."
save(C / 'revision.json', rev, 1)
print('migrated; unregistered names:', len(missing_log))
