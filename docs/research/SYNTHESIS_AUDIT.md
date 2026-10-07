# Synthesis audit — novel vs current timeline (R6)

The whole of volumes 12–16 (2,101 PDF pages; text layer complete, the pages without text are illustrations) was read in order, one volume per reader, and every war-relevant scene was extracted at event level with line locators. The results are in the research workspace (`novel-audit/vNN-findings.json`, not shipped: they quote locators, not text). This page is the summary and the decisions taken.

## Coverage

| Volume | Lines read | Events extracted | Current events audited | Missing | Movement gaps | Micro-movements | Strength rows | Locations |
|---|---|---|---|---|---|---|---|---|
| 12 (ID fan TL) | 1–13,123 | 43 | 17 | 20 | 9 | 9 | 12 | 13 |
| 13 (ID fan TL) | 1–18,650 | 74 | 67 | 25 | 16 | 19 | 27 | 12 |
| 14 (ID fan TL) | 1–15,899 | 70 | 43 | 18 | 9 | 15 | 12 | 10 |
| 15 (ID fan TL) | 1–18,271 | 76 | 42 | 25 | 12 | 21 | 10 | 9 |
| 16 (Yen Press EN) | 1–11,316 | 42 | 18 | 19 | 8 | 11 | 6 | 12 |
| **Total** | **77,259** | **305** | **187** | **107** | **54** | **75** | **67** | **56** |

## Status of the current timeline (before R6)

| Status | Count |
|---|---|
| CANONICALLY_SUPPORTED | 139 |
| PARTIALLY_SUPPORTED | 38 |
| RECONSTRUCTED | 1 |
| CONTRADICTED | 9 |
| UNSUPPORTED | 0 |

## The day count (the most important correction)

| Anchor | Text | Before | R6 |
|---|---|---|---|
| Imperial council evening | The V12 Epilogue is the evening of the council ("How did the meeting go?" — "The Great March has been decided", v12.txt:12870-12876) | D−33 | **D−40** |
| Army leaves | "the next day" (v12.txt:13120); massed at the border base by D−34 (11829-11831) | D−32 | **D−39** |
| Elite sent under Minitz | Same scene as the 7-day mark (v13.txt:10601, 10712-10822) | D+9 | **D+8** |
| Final battle (camp annihilated) | Krishna, sent with them, back "two days" later (v13.txt:15989); Treyni left "about ten days ago" (14318) | D+11 | **D+10** |
| Resurrection | "the day after" the final battle (reconstructed bracket) | D+12 | **D+11** |
| Rewards ceremony | "the day after the revival" (v14.txt:875) | D+13 | **D+12** |
| Prisoners' conference (Floor 70) | "yesterday's ceremony" (v14.txt:4841, 5533) | D+15 | **D+13** |
| Tempest council; coup; **long night** | "the day after drinking with Elmesia" (v14.txt:12723); "tomorrow we meet Rimuru" (10116); "a very long night began" (14542) | D+18 18:00 → D+19 | **D+15 18:00 → D+16** |
| Victory party / day off / interviews / **summit** | unbroken "next day" chain (v16.txt:4880, 5202, 6053-6056, 6866, 7510) | D+19 / D+20 / — / D+23 | **D+16 / D+17 / D+18 / D+19** |
| Gazel leaves | "the next morning" (v16.txt:9767) | D+24 | **D+20** |
| Repatriation departs | "within a week", then soon after (v16.txt:9773) — RECONSTRUCTED | D+31 | **D+26** |

The clock now runs D−43 → D+27 (10,224 ten-minute frames).

## Other corrections applied

| Item | Correction | Evidence |
|---|---|---|
| EVT-0003 departure | From the imperial capital to the border base (new movements MOV-038…040) | v12.txt:11829-11831, 13120 |
| EVT-0403 / MOV-036 | The prisoners are on Floor 70 of the labyrinth; the march home starts there | v14.txt:5037-5039, 5616; v16.txt:1188-1190 |
| EVT-0126 | The three who seal Testarossa are Imperial Guard knights (F-EMP-015), not Intelligence | v13.txt:5968-5985 |
| EVT-0386 | Velgrynd leaves this world; F-TEM-001/003/010 were not in this battle | v15.txt:17924, 18110-18116 |
| EVT-0376/0377 | The raid on the flagship starts during Rimuru's fight, before the Legion's rout | v15.txt:11250-11260 |
| EVT-0375 / CAS-025 | Gradim's death does not end the Legion; it routs later and some flee | v15.txt:10888-10930 |
| Final-battle strengths | 170,000 → ≈40,000 after Gravity Collapse (DERIVED) → >20,000 → <2,000 → 0 | v13.txt:17110-17112, 17165-17166, 17542-17543 |
| Shion's unit (R5) | Pro-Guard 10,000 and Yomigaeri "hundreds" | v12.txt:3889; v13.txt:13976-13978 |

## Events added (R6)

| Id | Event | Evidence | Class |
|---|---|---|---|
| EVT-0457 | Dwargon's army concentrated at the Isthmus | v12.txt:3408-3412 | canon, position reconstructed |
| EVT-0458 | Hakuro's 12,000 detour of > 40 km to the magitank rear (MOV-041) | v13.txt:4084-4088 | canon, route reconstructed |
| EVT-0459 | Shion breaks the imperial left; Albis strikes the right | v13.txt:17193-17421 | canon, flank positions reconstructed |
| EVT-0460 | Momiji's Red Flame clears the field; < 2,000 at the HQ | v13.txt:17426-17543 | canon |
| EVT-0461 | The Legion's fused berserkers storm the allied line | v15.txt:9198-9273 | canon, positions reconstructed |
| EVT-0462 | The Black Numbers drop onto the disorganised Legion | v15.txt:10249-10260 | canon |
| EVT-0463 | The Legion wavers, some flee; Gabil orders the attack | v15.txt:10888-10930 | canon |
| EVT-0464…0469 | The second front of the long night: the Mystic raid on the labyrinth, Cornu on Floor 70 (the prisoners fight beside Tempest), the capital back on the surface, Pico and Garasha vs Geld and Kumara, Velgrynd kills Cornu, the raiders withdraw | v16.txt:939-4423 | canon, times inferred |
| F-EMP-052 | Undead of Kagali's ritual hold the ritual ground until the ritual lapses | v14.txt:13914-13931; v15.txt:16796 | canon, size unknown |

## Recorded, not applied

- EVT-0004/0022 (Tempest order of battle) may sit ~15 days before the imperial council rather than on D−43 (inference from story order, medium confidence).
- The Composite Division may total ~100,000 (60 % = 60,000, v14.txt:640-641) against 200,000 in the force register; both kept, conflict noted for review.
- Further missing scenes without map consequences (Arios killed, the Colossus destroyed and Gadora reborn, the Eight Gates duels, Samuel's death) remain in the audit files as candidates.
- "113 thousand" (V12) is a translation slip for 1,130,000; the force register keeps the stated campaign figures.

## Missing movement and territory (Phases 3A–3C)

Movement gaps closed in R6: capital → border base (D−39 → D−34), Hakuro's detour, the flank attacks on the camp, the Legion's landing, assault and rout, the march home from Floor 70. Territorial consequences the text supports and that now appear on the map are listed in `TERRITORIAL_RECONSTRUCTION.md`. Where the text states no change of ground (V12, the labyrinth days, V16), the map holds still on purpose.
