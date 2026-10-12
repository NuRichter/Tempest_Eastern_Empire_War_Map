# Character per event audit

Revision R7 (2026-10-12). Every event's cast was re-read from the light novels (volumes 12 to 16, English text; line numbers match the `locator` fields) and recorded in the event's own source as `cast`: who is there and how.

## Why

The map draws portraits (and, in 3D, standees) at an event's place. Before this audit the cast was an explicit list plus every character whose name appeared in the event's title or actor text. That put the wrong people on the map. The owner's example: when the 970,000 cross the Tempest border, Rimuru and Benimaru appeared, although the scene belongs to the Empire (Emperor Rudra in the capital, Caligulio and his commanders in the field).

## The model

| Presence | Meaning | On the map |
|---|---|---|
| `present` | physically at the event's place when it happens | portrait / standee drawn there |
| `remote` | takes part from elsewhere: gives the order, watches and directs through magic or screens, is the commander being reported to | listed in the event dossier with a *remote* tag, never drawn at the place |

Characters who are only mentioned are left out. A person clearly present but without a registry entry is listed as unregistered (below). The compiler (`scripts/compile-data.ts`) turns `cast` into `characterIds` (everyone) and `presentIds` (present only); the 2D portraits, the 3D standees and the cinematic lead portrait use `presentIds`. The name-matching fallback is used only for an event without a `cast`, and every event now has one.

Each audited event also carries `castAudit`: the audit's confidence, a comment where something is uncertain, and the ids it removed.

## Method

Five parallel audits, one per event file (01 preparation and approach, 02 surface battle, 03 labyrinth, 04 the Long Night, 05 settlement), each reading a generous window (±60 lines) around every source locator and following the scene. Scenario events were given a cast only from what their own fields state, then completed for R7 from the scenario's own logic (the imperial command for the column's departure, crossing, halt and split; Gaster for the 200,000; Farraga for the airships; Testarossa and Ultima for their group; Gazel and Gobta for the eastern push).

## Result

| | |
|---|---:|
| Events | 215 |
| Cast entries | 867 (798 present, 69 remote) |
| Audit confidence | 140 HIGH, 30 MEDIUM, 22 LOW, 23 scenario events cast by R7 |
| Events where the audit removed someone | 33 |
| Most often removed | Ramiris (5), Rudra (4), Yuuki (4), Rimuru (4), Masayuki, Benimaru, Gadra, Veldora (3 each) |

The biggest corrections:

- **EVT-0015, the border crossing**: Caligulio, Minitz, Gaster and Farraga present; Rudra remote (orders from the capital); Rimuru and Benimaru remote (they discuss it in the Control Room).
- **Dwargon front, D+0**: Rimuru and Benimaru are remote throughout (Control Room); present only where the event's place is the Control Room.
- **EVT-0115**: Veldora removed. "Veldora was never there... Farraga had mistaken Gabiru for him" (v13.txt:5398-5404).
- **EVT-0201**: Rimuru and Ramiris removed from the day-one entry, told entirely from Caligulio's camp.
- **EVT-0217**: Benimaru remote; Momiji leads the Fourth Corps in the field.
- **EVT-0328**: the relief force to Gazel is Gabiru, Gobwa, Hakuro and the three Primordials; Benimaru, Shion, Soei and Diablo go with Rimuru.
- **EVT-0361**: the "Rudra" at the Dream Fortress is Velgrynd's decoy; Veldora only on a conjured screen.
- **EVT-0450, the victory festival**: Testarossa and Carillon are not there (she minds the sleepers); Geld, Adalmann, Ramiris, Treyni, Beretta, Charys, Vester and Shuna are.
- **Three-nation summit**: Dorf, Anrietta, Vaughn (Gazel's party), Rigurd, Jiwu, Bernie and Jaine added; Michael removed (only discussed).

## Characters added to the registry

The audit found people present who had no entry. Those who recur, or who have a photocard in `Sources of Truth/Character Photocard`, were added to `data-source/characters.source.json` with the card's source and licence from its manifest: Rigurd, Shuna, Beretta, Treyni, Kumara, Momiji, Charys, Kaijin, Vester, Haruna, Kurobe, Cien, Venom, Moss, Lilina, Jiwu, Bernie, Jaine, Agera, Esprit, Souka, Garasha, Pico, Frey, Milim (with cards); Malcolm, Graneet, Zarario, Cornu (no card). Existing entries gained their cards where the repository has one (Gaster, Gobwa, Vaughn, Albis, Carillon). The registry has 82 characters, 71 with photocards.

Still unregistered (named in the text, too minor or without a card): `docs/research/cast-unregistered.json` lists each name with the events it appears in (Tibbs, Balder and Gordon at Gaster's headquarters; Kansas, Michel, Raymond, Reiha, Bazan and Jiu in the labyrinth; and others).

## Checked by

`scripts/test-scenario.ts`: at the border crossing Caligulio is present, Rimuru and Benimaru are not drawn, Rudra is the remote commander; every present character is in the event's cast. `scripts/validate-data.ts` checks every id against the registry.
