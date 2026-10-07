# Contributing

Contributions are welcome under one rule: **facts are respected, uncertainty is admitted, invention is not accepted.**

## Changing campaign data

1. Edit the source, never `public/data`: `data-source/campaign/*`, the gazetteer, the territory control file, characters or terminology.
2. Every new or changed fact needs a source pointer — volume, chapter and, where possible, a line locator in the local text. Paraphrase; do not paste novel text (quotes of more than a few words are not accepted).
3. Give every event a provenance class. A reconstruction needs a `reconstructionNote` explaining what is known and what was filled in.
4. Unknown numbers stay `"UNKNOWN"`. Do not round, average or redistribute a total.
5. Run `npm run compile-data && npm run validate-data && npm run test`. All must pass.
6. Add the change to `docs/research/RESEARCH_REGISTER.md` if it alters a claim.

## Changing geometry

Edit `scripts/cartography/regions.config.json` (seed points and names) or the theatre zones in the gazetteer, then run `python scripts/cartography/extract_territories.py`. Never hand-edit `territories.geo.source.json`.

## Changing the interface

Follow `DESIGN.md`. Run `npm run verify` and `npm run qa`, and look at the screenshots in `qa-artifacts/` before opening a pull request. Do not claim a visual change works without looking at a render.

## Code

TypeScript strict, no `any`. Keep components focused; keep animation outside React; no new dependency without a stated reason, a size check and a maintenance check.
