# Research provenance

This atlas is a fan research project. Transparency is a feature: every claim on screen can be traced to a source, and every reconstruction says that it is one.

## Source hierarchy

1. **Primary — the light novels, volumes 12–16.** Read from the local copies in `Sources of Truth/Sources/` (volumes 12–15 in an Indonesian fan translation, volume 16 in the Yen Press English edition). References are kept as volume, chapter and a line locator in the extracted text (`v13.txt:7475`). The novel text itself is never reproduced; evidence fields are short paraphrases.
2. **Official material** — the official Tensura portal (ten-sura.com: character list, glossary, world map), Yen Press product pages and the official anime material. Used to fix names and identities.
3. **Secondary — the Tensura fandom wiki.** Used only to locate passages, cross-check spellings and record conflicts. Never the sole basis of a claim.
4. **Project research** — the Step 1 dataset (`Sources of Truth/Timeline Database/`), kept unchanged as the archived pre-audit revision.

When sources conflict, the conflict is recorded (contradiction register, terminology `conflicts`) and the choice is stated; it is never resolved silently.

## Translation caution

Volumes 12–15 are read in an Indonesian fan translation that is garbled in places (some numbers and ranks are mistranslated, e.g. "ninety-four thousand" for 940,000, "Marshal" for Caligulio). Where the wording was ambiguous the confidence was lowered rather than a reading guessed; where the official name differs from the translation (Geist → **Gaster**, Minute → **Minitz**, Ben → **Vaughn**) the official name is used and the translation's form is kept as a search alias.

## Provenance classes

`CANONICAL`, `CANONICAL_WITH_VISUAL_RECONSTRUCTION`, `INFERRED`, `RECONSTRUCTED`, `UNRESOLVED` — defined in `docs/DATA-MODEL.md`, shown on every event, battle and territory state, and filterable.

## What may be reconstructed, and what may not

Allowed, always labelled:

- a movement path between two canonically stated positions;
- a simulation time on the 10-minute grid for an event the novel places only by day or by order;
- a day for an event the novel places only by order, between canonical anchors;
- a map position for a place the supplied maps do not mark, positioned relative to measured anchors with its reasoning in `basis`.

Not allowed:

- an event, battle, casualty count, troop number or commander decision that the source does not support;
- a precise time, coordinate, distance or percentage presented as canonical;
- turning an unknown into zero, or redistributing a stated total across parts.

## Records

| Record | Where |
|---|---|
| Per-event audit trail | `audit.status` and `audit.changes` on every event (shown in the event dossier) |
| Contradictions and temporal ambiguities | `data-source/campaign/reference.json` |
| Audit plan and clock skeleton | `data-source/campaign/AUDIT-PLAN.md` |
| Audit report | `docs/audit/timeline-canon-audit.md` |
| Human-readable claim register | `docs/research/RESEARCH_REGISTER.md` |
| Names | `data-source/terminology.source.json` |
| Photocards | `Sources of Truth/Character Photocard/metadata/` (source URL and tier per image; no licence is recorded there, so images stay the property of their rights holders) |
