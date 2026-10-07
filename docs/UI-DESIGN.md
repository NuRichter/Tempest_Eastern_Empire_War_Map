# UI design — anatomy and flows

`DESIGN.md` is the token and component contract. This page describes how the screen is put together, why, and how a reader moves through it.

## First impression

The atlas opens on the whole campaign in the **Documentary** look: light ground, pale sea, the belligerents in solid colour, imperial-held ground in red with a white front line, army strengths in large white numerals at the front, the battle day in the timeline. In one glance: **map, war, time, forces, territory, movement, evidence** (every claim carries a provenance badge).

## Anatomy

| Region | Contents | Behaviour |
|---|---|---|
| Top bar (44 px) | Title · battle day · phase · latest event + provenance · search · legend · cinematic · about | Always visible except in cinematic mode |
| Tool strip (48 px, left) | Layers · Filters · Events · Story | Opens a 312 px drawer over the map edge; closed by default so the map leads |
| Map | Base Map or Myth Map; territories; held ground and fronts; routes; formations and strengths; battles; event rings; portraits; labels | Fills the viewport; panels float over it |
| Filter chip (top centre) | "N filters active · reset" | Only when something is hidden |
| Right panel (384 px) | **Situation**: now, active theatres, fronts, strength, movement, battles, casualties, territory, sources, command. **Dossier** for any selection | Bottom sheet below 1024 px |
| Map corners | Style switcher (bottom-left) + minimap + simulation coordinates; zoom, compass, campaign frame, camera presets, flat/globe, fullscreen (bottom-right) | Hidden in cinematic mode |
| Timeline | Transport, speed in simulated time per second, battle day + simulation tag; stage bands, theatre lanes, gaps (hatched), battle spans, event ticks, turning points, volume marks, bookmarks; Now / Next | Overlay that appears on hover in cinematic mode |

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
