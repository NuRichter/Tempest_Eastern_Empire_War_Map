# UI redesign specification (final pass)

Written before implementation, from the baseline in `docs/audit/PROJECT_BASELINE.md`. The map stays the hero; what changes is the order in which a reader meets information.

## 1. Information hierarchy

| Level | Content | Where |
|---|---|---|
| Primary | **Who vs who** (flags, faction colours, names), **losses**, **events so far**, **now** (date, phase, latest event), **hot characters** (photocards of the people in the active event) | Situation bar at the top of the right panel (bottom sheet on phones), always visible |
| Secondary | Active theatres, fronts and held ground, forces and strength, movement, battles | Collapsible sections, closed by default except Fronts |
| Tertiary | Command, sources, research notes, provenance detail | Collapsed sections and dossiers |

### Situation bar

```
 [flag] JURA-TEMPEST FEDERATION + allies   VS   EASTERN EMPIRE [flag]
        Tempest killed 0                          Empire killed 1,010,002 (revived 700,000)
 ───────────────────────────────────────────────────────────────────
 D+11 11:20 · Jura annihilation              Events 92 / 166
 Latest: Caligulio defeated; the Jura invasion army annihilated  [CANON]
 [photocard] Diablo   vs   [photocard] Caligulio
```

- Sides are the campaign's two coalitions (Tempest + Dwargon and contributors / Eastern Empire), each with its flag, colour bar and shape glyph (never colour alone).
- Losses roll to new values; unknown stays "unknown".
- Hot characters: photocards of the characters linked to the latest event within the last simulated hour, split by side when possible (`A vs B`); nothing shown when there is no linked character — never random art.

## 2. Readability

- Panel surfaces opaque (≥ 0.94); overlays on the map ≥ 0.9 with a 1 px border; no panel below 0.85 opacity.
- Body text ≥ 4.5:1 in both themes; controls show hover, pressed and focus states.

## 3. Map control geometry

| Region | Desktop | Phone portrait | Phone landscape |
|---|---|---|---|
| Map style switcher | Bottom-left | Bottom-left | Bottom-left |
| Minimap | Above the style switcher | Hidden | Hidden (map too short) |
| Navigation stack | Bottom-right | Bottom-right, compact | Right edge, compact; collapses into a single "map tools" button below 420 px height |
| Panel toggle | Right panel header | Floating, top-right | Floating, top-right |

No two controls may overlap at any viewport (checked by `qa`).

## 4. Zoom

Wheel zoom rate reduced (≈ 1/600 per pixel instead of MapLibre's 1/450), trackpad pinch kept native, double-click zoom +1 with easing, keyboard +/− and arrow pan, min/max zoom bounded to the atlas, no zoom jumps on style or projection change. Globe: same rates.

## 5. Themes

Two first-class themes for the whole interface (not just the map):

| Token | Dark | Light |
|---|---|---|
| surface / raised / sunken | `#0f1519` / `#151d22` / `#090d10` | `#ffffff` / `#f3f5f6` / `#e8ecee` |
| border | `#26323a` | `#cdd5d9` |
| text / secondary / tertiary | `#e3e7e8` / `#a7b1b5` / `#7d898e` | `#14191c` / `#3f4a50` / `#5b676d` |
| accent | `#d4ab57` | `#8a6420` |

Implemented as CSS variables consumed by Tailwind (`ink-*`, `fg-*`, `accent`), so every component follows. The map look follows the theme (Documentary with Light, War room with Dark) unless the reader picks a map look explicitly.

## 6. Mobile

Map first; the Situation bar is a collapsed bottom sheet showing only the primary row (sides, date, losses); the timeline compacts to transport + scrubber; drawers open over the map; title shortens to "Tempest × Empire".

## 7. Internationalisation

- 30 locales: en, id, ja, ko, zh-Hans, zh-Hant, es, pt, fr, de, it, nl, ru, uk, pl, tr, ar, hi, bn, ur, vi, th, ms, fil, sw, he, fa, ro, cs, el. RTL: ar, he, fa, ur.
- English catalog in code (`src/i18n/en.ts`), other locales as static JSON (`public/locales/<code>.json`) loaded on demand; English fallback per key.
- Never translated: character names, place names, faction and unit proper names, canon terms in the glossary (`src/i18n/glossary.ts`). Campaign records (event titles, evidence) stay in English with a one-line note.
- Language selector in the top bar and in About; first visit follows the browser language when supported.

## 8. About and references

- Right-side navigation gains **Story** and **About** tabs next to Situation. About: a short, warm fan note (with the creator's message "Semoga tim produksi Tensura bisa melihat proyekku ini suatu hari nanti."), verified external links, and a **References** list in APA 7 (only sources actually used, real access dates).

## 9. Cursor

An original pixel-art cursor (a small slime outline drawn for this project), off by default, with the system cursor as fallback; never on text inputs.

## 10. Copy

Plain words: "Current situation", "Who is fighting", "What happened", "Latest event", "More details". No marketing phrasing.
