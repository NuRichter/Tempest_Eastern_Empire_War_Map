# UI design — anatomy and flows

`DESIGN.md` is the token and component contract. This page describes how the screen is put together, why, and how a reader moves through it.

## First impression

The atlas opens on the whole campaign in the **Documentary** look: light ground, pale sea, the belligerents in solid colour, imperial-held ground in red with a white front line, army strengths in large white numerals at the front, the battle day in the timeline. In one glance: **map, war, time, forces, territory, movement, evidence** (every claim carries a provenance badge).

## Anatomy

| Region | Contents | Behaviour |
|---|---|---|
| Top bar (44 px) | Title ("Tempest War" on phones) · battle day · phase · latest event + provenance · search · language (30) · dark/light · legend · cinematic · help | Always visible except in cinematic mode; legend and help move into search on phones |
| Tool strip (48 px, left) | Layers · Filters · Events · Story | Opens a 312 px drawer over the map edge; closed by default so the map leads |
| Map | Base Map or Myth Map; territories; held ground and fronts; routes; formations and strengths; battles; event rings; portraits; labels | Fills the viewport; panels float over it |
| Filter chip (top centre) | "N filters active · reset" | Only when something is hidden |
| Right panel (384 px) | Tabs **Situation** and **About**. Situation opens with the **Situation bar**: who vs who (flags, faction colours), killed on each side (rolling), events so far, now, the latest event, and the photocards of the people in it, side A vs side B. The next event follows; then the secondary sections (theatres, fronts, strength, movement, battles, casualties, territory, sources, command), collapsed except Fronts. **About**: the creator's note and message, links, official series links, APA references. **Dossier** for any selection | Bottom sheet below 1024 px with a drag handle |
| Map corners | Style switcher (bottom-left; its menu opens beside it, above the minimap) + minimap (hidden on screens under 560 px tall) + simulation coordinates; zoom, compass, campaign frame, camera presets, flat/globe, fullscreen (bottom-right) | Hidden in cinematic mode |
| Timeline | Transport, speed in simulated time per second, battle day + simulation tag; stage bands, theatre lanes, gaps (hatched), battle spans, event ticks, turning points, volume marks, bookmarks; Now / Next | Overlay that appears on hover in cinematic mode |

## First-run tour

**When it opens.** An 18-step tour opens after the map is ready on a first visit, never for automated browsers or deep links (`src/components/overlays/Tour.tsx`).

**Look and guides.** Each step is a 《Notice》 card in the style of the Great Sage's announcements, spoken by a guide who stands on top of the card:
- **Slime Rimuru:** the welcome, the language and theme, the settings and the farewell.
- **Gobta:** play.
- **Ranga:** speed.
- **Shuna:** the timeline.
- **Hakurou:** stepping through events.
- **Treyni:** held ground and the front.
- **Geld:** the armies.
- **Shion:** battles.
- **Gazel:** capitals and the Labyrinth.
- **Gabiru:** map controls and the two map styles.
- **Benimaru:** the Situation panel.
- **Milim:** About and wallpapers.
- **Souei:** search.
- **Veldora:** cinematic mode.

**What it shows.**
- A spotlight glides to each control.
- For the map steps it moves the clock to a moment that shows the thing (D+4 for the armies, D+10 just after the camp battle for the crossed battle icon). It then spotlights that point on the map, following the map's projection.
- It opens the panel tab it talks about.
- When it ends, the reader's moment and panel state come back.

**Controls.** Next / Back / Skip, → ← Enter Esc, and progress dots. The slimes squash and stretch, the people bob, and reduced motion turns movement off.

**Remembering it.** Finishing or skipping stores `tourDone`. Layers → *Replay the tour* and the link `?tour=1` open it again.

**Language.** All copy is in the catalog, in 30 languages, casual in tone.

## Reading flows

1. **Watch the war.** Press Space. The camera stays still; held ground grows and recedes, fronts move, numbers change, event rings pop and their labels fade after a couple of seconds. At turning points playback slows to 1× for a moment.
2. **Ask "what is this?"** Hover anything for a tooltip with provenance; click it for its dossier. Dossiers link onward: character → command → forces → theatres → battles → appearances; force → order of battle → strength history → movements; event → forces, casualties, gap before it, sources, audit changes.
3. **Find something.** `/` or `Ctrl+K`: characters, forces, battles, events, territories, theatres, places, movements, and commands, with aliases and Japanese names. Enter moves the timeline and the camera.
4. **Narrow it down.** Filters by faction, nation, force (with its subordinates), battle, territory, theatre, event type, canon status and confidence. The chip says what is hidden.
5. **Follow the story.** The Story tab lists the campaign's stages with their anchor events and a play button for each.
6. **Present it.** `C` for cinematic: large date, speed chip, one caption at a time, the leader's photocard, a rolling casualty ledger, an opening disclaimer and a closing card.
7. **Keep your place.** `B` bookmarks the moment; the address bar always holds the current moment and selection.

## Reference mapping

| Reference practice | Where it lives here |
|---|---|
| Ground taken and lost through space; pale band; white front where colours meet | Held-ground layer (`front.json`, `occupation.ts`); `drawFronts` |
| One strength per side per front, rotated with the front | `drawFrontStrength` |
| Still camera while time plays | Camera moves only on request or on a theatre change in cinematic mode |
| Big fixed date readout | Cinematic date block; timeline readout |
| Event ring + short label, then fade | `drawEvents` lifecycle (pop 110 ms, in 140 ms, hold 2.2 s, out 160 ms; max 4 labels) |
| Rolling counters | `RollingNumber` in the ledger and the Situation panel |
| Allies entering the war | Linear territory role crossfade over one simulated hour |
| Leader inset | Photocard leader card in cinematic mode |
| What the films lack | Legend, provenance, sources, unknowns, gaps, filters, search |
