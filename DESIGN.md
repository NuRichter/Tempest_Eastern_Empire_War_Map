# DESIGN.md — Campaign Atlas design contract

The atlas is a **digital war room**, a **cartographic atlas** and a **documentary** at once. The map is the hero; the interface frames it and stays quiet. Every element has a job: if it does not help a reader answer *what happened, where, when, who moved, how many, who held the ground, and how we know*, it does not ship.

This file is the contract. Code that disagrees with it is a bug in one of the two.

---

## 1. Principles

1. **Map first.** The map fills the viewport. Panels float over its edges; they never shrink it.
2. **Evidence is a feature.** Provenance, size status, route confidence and time precision are always visible where a claim is made — as words, not only colour.
3. **Unknown stays unknown.** An absent number reads `unknown` / `?` in a distinct tone. It is never rendered as `0`.
4. **One thing moves at a time.** While time plays, the camera stays still; change is carried by fronts, numbers and markers (all four reference documentaries do this). The camera moves on request, or in cinematic mode when the action changes theatre.
5. **Density is earned.** Zoomed out shows nations and front strengths; zooming in reveals places, formations, commanders. Labels give way to each other rather than overlap.
6. **No decoration.** No gradients on chrome, no glow, no glass stacks, no giant hero type, no decorative charts, no emoji UI.

## 2. Colour

Defined once in `src/lib/palette.ts`, mirrored in `tailwind.config.ts`.

| Token | Hex | Use |
|---|---|---|
| `ink-900` | `#090d10` | App background |
| `ink-850` | `#0c1114` | Bars (top bar, timeline, rail) |
| `ink-800` | `#0f1519` | Panels, controls |
| `ink-700` / `ink-600` | `#151d22` / `#1c262c` | Hover, raised rows |
| `ink-500` / `ink-400` | `#26323a` / `#3a4a54` | Rules and borders |
| `fg` / `fg-2` / `fg-3` | `#e3e7e8` / `#a7b1b5` / `#7d898e` (≥ 4.75:1 on every panel tone) | Primary, secondary, tertiary text |
| `accent` | `#d4ab57` | Selection, playhead, turning points, focus ring |
| `alert` | `#e0614f` | Battles, losses |

**Factions** — each has a base, a deep (marker fill, number outline) and a pale (hover, labels) tone, *and a shape*:

| Faction | Base | Shape |
|---|---|---|
| Eastern Empire | `#c9473d` | square |
| Jura-Tempest Federation | `#2f9e7e` | circle |
| Armed Nation of Dwargon | `#5b8fd8` | diamond |
| Other contributors | `#c29a45` | triangle |
| Unknown | `#878f93` | hexagon + hatch |

**Provenance** — `CANONICAL #cfe5dc ■`, `CANONICAL_WITH_VISUAL_RECONSTRUCTION #8fc9b6 ◧`, `INFERRED #d9b56a ◇`, `RECONSTRUCTED #c79a4e ◌`, `UNRESOLVED #e0614f ?`. Always glyph + label + colour.

**Territory fill** = faction base × role weight × user opacity (default 70% in Documentary, 35% in War room): belligerent 1.0, co-belligerent 0.75, armistice 0.55, contributor 0.45, uninvolved = the theme's neutral land tone. Unknown control is grey with a light hatch. Contested operational areas use the accent hatch.

### Map looks (`MAP_THEME` in `palette.ts`)

The chrome is always dark; the **map** has two looks, switched in Layers → *Look* and persisted.

| Token | Documentary (default) | War room |
|---|---|---|
| `void` (sea / outside) | `#d8e3ea` | `#0b1419` |
| `label` / `labelDim` | `#1c252b` / `#4f5b62` | `#c3c9cc` / `#8b979c` |
| `halo` | warm white 92% | near-black 92% |
| `border` (drawn borders) | `#9b6b74` (rose, as in the references) | `#55626a` |
| uninvolved land | `#c8ccc4` @ 0.32 | `#6b757a` @ 0.12 |
| `seam` / `seamCasing` (front line) | white on 45% dark casing | `#f1efe8` on 55% black |
| `battle` (live battle label) | `#8f1d16` | `#f6d4cd` |
| `occupiedAlpha` (held ground) | 0.86 | 0.62 |

Documentary follows the reference films: light ground, solid nation colour, a white front where two colours meet. War room is the earlier dark analytic look. Every map label colour comes from these tokens, so both looks keep ≥ 4.5:1 label contrast against their halo.

## 3. Typography

Self-hosted via `next/font` (no runtime requests).

| Role | Face | Size / weight |
|---|---|---|
| UI, labels, map numbers | IBM Plex Sans Condensed | 10.5–14px, 400–700 |
| Figures, dates, IDs | IBM Plex Mono (tabular) | 10.5–24px, 400–500 |
| Titles, dossier names | Source Serif 4 | 15–24px, 600 |
| Section labels (`.eyebrow`) | Plex Sans Condensed | 10.5px, 600, uppercase, +0.08em |

Map labels always carry a dark halo (3px) so they read on either base map. Army-size numbers: bold, white, outline in the faction's deep tone, size `clamp(11, 10·(n/1000)^0.18, 28)px` × label scale, prefixed `≈` (derived) or `~` (reconstructed).

## 4. Space, borders, radius

4px base grid. Panel padding 12px. Borders 1px `ink-500`. Radius 3px on controls, 4–5px on floating surfaces — nothing pill-shaped except the filter chip. One shadow (`shadow-panel`) for floating surfaces only.

## 5. Composition

```
┌ Top bar 44px: identity · campaign state (D±, phase, latest event + provenance) · search · legend · cinematic · help ┐
│ Tool strip 48px │                MAP (full bleed)                 │ Situation / Dossier 384px │
│ + drawer 312px  │   filter chip (top centre, only when filtering) │  (bottom sheet < 1024px)  │
│                 │   minimap + map style (bottom left, clear of the│                           │
│                 │   tool strip) · navigation + presets (b-right)  │                           │
└ Timeline: transport · speed · D± HH:MM SIMULATION · stage bands · theatre lanes · battles · events · Now / Next ┘
```

- **Left drawer** tabs: Layers, Filters, Events (feed), Story. Closed by default.
- **Right panel**: *Situation* (campaign intelligence at this moment) or a *Dossier* for the selection.
- **Below 1024px** the right panel becomes a bottom sheet (max 58% height) and drawers overlay the map.
- **Panel density** (Layers → *Panel density*: compact / comfort) sets `data-density` on the shell; compact tightens row heights and section padding, never type below 10.5px.
- **Minimap** (md and up, optional): the whole world with the current view outlined; click to move there.
- **Camera presets** (bottom-right): whole campaign, central continent, Jura & Dwargon front, Dwargon eastern front, imperial capital, Eastern Empire.
- **Bookmarks**: `B` or the dossier's bookmark button saves the moment; listed in Events, flagged on the timeline.

## 6. Components

- **Controls (`.ctl`)**: 32px square minimum hit area, flat, 1px border; pressed state = accent border + 10% accent fill.
- **Sections**: collapsible, eyebrow label, no card chrome. Progressive disclosure: the default open sections answer *what / where / when / how many*; consequences, raw evidence and audit changes are one click away.
- **Fields**: two-column key/value table, hairline rows.
- **Badges**: provenance, size status, route confidence — 1px border, uppercase 10.5px.
- **Portraits**: local photocards only, 11:17, faction-coloured border, provenance on hover.
- **Tooltips**: map hover shows title, detail and provenance; never the only route to information.

## 7. Map symbology

| Element | Encoding |
|---|---|
| Territory | Traced border (measured) + role fill; unknown = grey hatch |
| Operational area | Dashed outline, clipped to borders; contested = accent hatch |
| Force | Faction shape, echelon-stepped size; dashed outline when strength unknown; struck through when destroyed |
| Army size | White bold number with faction-deep outline beside the marker; front totals one per side per front, on the side's own side of the seam, rotated along it, fixed size, counting smoothly to each recorded value |
| Held ground | Solid faction colour on ground taken by the other side; stays taken until retaken, cut off or returned; RECONSTRUCTED, labelled in the legend and the Situation panel (`docs/TERRITORIAL-ANIMATION.md`) |
| Changing hands | Pale band (the loser's colour lightened; a white wash over owner land) on ground about to change hands, 30 simulated minutes ahead of the winner |
| Front seam | White line with a thin dark casing on the edge of held ground; moves with it |
| Movement | Bowed route, travelled part solid/dashed/dotted by route confidence (SOLID/RECONSTRUCTED/SCHEMATIC); UNKNOWN not drawn; label = force + strength at departure |
| Battle | Contact ring + type icon (blades, crenels, chevron, shield, burst, pennant); slow breath while live |
| Event | Ring of ticks around a dark centre; pops in when reached, label for ~2 s, ring fades over one simulated day; turning points gold, numbered, persistent; broken ring if reconstructed/inferred; at most four labels at once |
| Contact marks (schematic, off by default) | Dashed warm-white contact mark with ticks |
| Timeline gap | Hatched band on the timeline where nothing is recorded for ≥ 6 simulated hours (gold when the neighbouring placements are low confidence) |
| Character | Round photocard crop at the place of the latest event they appear in |

## 8. Motion

Motion communicates; it never decorates.

| Motion | Duration / easing |
|---|---|
| Camera to a record | `flyTo` speed 1.1, cubic-out; bounds `fitBounds` 1.3s |
| Map style crossfade | 600ms |
| Territory role change | linear crossfade over 6 keyframes (one simulated hour) — the only crossfade, as in the references |
| Battle breath | 0.5 + 0.5·sin(t/520ms), only while the battle is live |
| Caption (cinematic) | 200ms rise-in, one at a time |
| Event ring | pop 110ms (scale 1.4 → 1) · label in 140ms · hold 2200ms · label out 160ms |
| Held ground / front | moving boundary at the isochrone t_flip = T, re-evaluated on animation frames whenever the clock moves (≤ 30 Hz); frozen when paused; reversible when scrubbing |
| Rolling numbers | counters roll to the new value over ≤ 600ms (casualty ledger, Situation) |
| Auto-slow | at a turning point playback drops to 1× for 2.5 seconds, then resumes the chosen speed (Layers → *Auto-slow*) |
| Panels | instant or ≤150ms colour transitions |

`prefers-reduced-motion` (or the in-app *Motion: Reduce* setting) turns camera flights into jumps, stops the battle breath and the event pop, and shows rolling numbers at their final value.

## 9. Accessibility

- Every control is a real `<button>`, `<input>` or `<select>` with an accessible name; icon buttons have `aria-label` and a tooltip.
- Visible 2px accent focus ring on keyboard focus; skip link to the timeline.
- The timeline is an ARIA `slider` with `aria-valuetext` in words; the search is a combobox-style dialog with `aria-activedescendant`.
- Identity never rests on colour alone (shape + label + colour); provenance badges carry glyph + text.
- Text contrast ≥ 4.5:1 for body text on panel backgrounds; map labels use halos.
- Live regions announce the campaign state and cinematic captions politely.

## 10. Responsive rules

| Width | Behaviour |
|---|---|
| ≥ 1280 | Full composition; drawer may stay open |
| 1024–1279 | Drawer overlays; right panel 384px |
| 768–1023 | Right panel as bottom sheet; top bar keeps search icon |
| < 768 | Tool strip + bottom sheet; transport wraps; "Fighting" window hidden; no horizontal scroll at 320px |

## 11. Voice

Plain, specific, sentence case. Say what is known and how: *"Position reconstructed: …"*, *"No number is stated for this formation."* Never claim more precision than the source.
