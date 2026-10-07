# Tensura Character Photocard Research Notes

Archive version 1.0 · research revision 1 · last updated 2026-10-07

## Archive Overview

### Objective
A visual reference archive with one portrait card per character of *That Time I Got Reincarnated as a Slime* (Tensura), each traceable to the exact image it was made from. It supports the Tempest–Eastern Empire War timeline project in `Sources of Truth/Timeline Database`.

### Scope
- **Full Tensura cast**, as the user confirmed on 2026-10-07. Sections 1–14 of the original brief were not supplied, so the roster and fit rules were agreed with the user directly.
- Roster = every article in the Tensura Fandom wiki's `Category:Characters` (435 pages, excluding three spin-off list pages), plus 2 characters that appear in the official portal's character database but are not in that wiki category (Ifrit, Clerics of the Seven Luminaries).
- **437 characters** in total. Every one has a manifest record, including those without a usable image (see `missing_characters.md`).

### Search methodology
1. Read the official portal index at `https://www.ten-sura.com/character` (120 entries). For each entry, record the Japanese name, the romanised name, the voice actor and the character-art URL.
2. List `Category:Characters` with the MediaWiki API (`tensura.fandom.com/api.php`). The HTML pages return 403 to scripts, and the API gives structured data.
3. For each article, read the portable-infobox JSON (`pageprops.infoboxes`): images with their medium captions and form tabs, plus Japanese name, rōmaji, aliases, species, gender, affiliation, occupation and debut chapter or episode in each medium. Also record the wiki categories.
4. Get each infobox image's original URL, size and MIME type from `prop=imageinfo`.
5. Match official entries to wiki articles by English name, then by unique first name, then by a manual table checked against Japanese names and official bios. A Japanese-name cross-check runs on every match; see Naming Decisions.

### Source priority (as applied)
1. Official portal character art (ten-sura.com): tier 1, `official_anime_character_art`.
2. Wiki infobox image, choosing the character's **primary form** first, then by medium: anime (tier 1) > movie (tier 3) > manga (tier 4) > light novel (tier 5) > game / unclassified (tier 6) > kids edition.
3. Official group art or art of an earlier identity, used only as a last resort or as the backup source.

Wiki-hosted anime frames and manga panels keep the tier of their **medium**. Their `source_type` ends in `_via_wiki` so it stays clear that a secondary site hosts them. Confidence is *high* only for official-portal art.

### Image selection methodology
- No AI generation, redrawing or upscaling models. Every card comes from one existing image.
- The wiki's `No Image (L).png` placeholder is always rejected.
- When an infobox has form tabs, form labels such as *true form, dragon, slime, stampede, beast, initial, unnamed* rank below the primary form. For example, Milim's *Concealed form* and Velgrynd's *Human Form* are preferred.
- Raw files are hashed (SHA-256). If two characters resolve to the same source file or final file, both are flagged.

### Processing methodology
- Target: **2200 × 3400 px, 11:17 portrait, JPEG quality 92**, filename `NNN_<Canonical Name>.jpg`.
- **Cut-out art** (more than 5% transparent pixels, which covers all official portal art and most wiki renders) is trimmed to its alpha bounding box, then scaled to fit inside a 5% margin and placed at the bottom centre of a white card. Nothing is cropped away.
- **Opaque images** are cropped to 11:17 to fill the card, as the user chose. The crop is anchored by, in order: (a) a manual centre from visual review, (b) an anime-face detector (nagadomi `lbpcascade_animeface`, MIT; detections need weight ≥ 1.0 and height ≥ 12% of the frame), (c) for wide frames, edge density weighted toward the centre, (d) for tall images, a bias toward the top.
- Every heavily cropped image (more than 25% of the area removed, 111 images) was checked by eye against its crop box.
- Results: {'cutout_fit_on_white': 197, 'crop_to_fill_11x17': 154}; crop anchors {'centre_weighted_edges': 92, 'face': 31, 'upper_bias': 28, 'manual_review': 3}.
- **Quality score (0–100)** = 50·√min(1, native-equivalent height / 3400) + 30·tier factor (1.0, 0.9, 0.85, 0.75, 0.65, 0.5) + 20·fit factor (1.0, or the retained area fraction when less than 80% of the image survives the crop). The available sources are small: official art is 660×920, so **every card is upscaled**. Cards below 500 px native-equivalent height are flagged `low_resolution`.

## Character Census

- Total characters researched: **437**
- Cards produced: **351**
- No usable image: **86**

### By faction (primary affiliation)
| Faction | Characters |
|---|---|
| Jura Tempest Federation | 85 |
| unknown | 50 |
| Eastern Empire | 42 |
| Holy Empire of Lubelius | 25 |
| Angels | 23 |
| Falmuth Kingdom | 15 |
| Demon Lords (Octagram / Ten Great) | 15 |
| Free Guild | 13 |
| Dungeon | 13 |
| Rosso Family | 10 |
| Mirror World | 10 |
| Twelve Insect Generals | 8 |
| Kingdom of Blumund | 8 |
| Armed Nation of Dwargon | 7 |
| Visions of Coleus (movie) | 7 |
| Primordials | 7 |
| Guy Crimson | 6 |
| Beast Kingdom Eurazania | 6 |
| El Dorado | 6 |
| Kaien (movie) | 6 |
| True Dragons | 6 |
| Jura-Tempest Federation | 5 |
| Sorcerous Dynasty of Sarion | 5 |
| Pupils of the Ancestor | 4 |
| Moderate Harlequin Alliance | 4 |
| Kataki | 3 |
| Cliché | 3 |
| Kingdom of Raja | 3 |
| Binding Chain Titans | 2 |
| Three Generals | 2 |
| Twin Wings | 2 |
| Orthrus | 2 |
| Farmenas Kingdom | 2 |
| Tempest | 1 |
| Kaien | 1 |
| Kurayami | 1 |
| Five Great Warrior Generals | 1 |
| Blanc | 1 |
| Mutual-Aid Association | 1 |
| Freedom Academy | 1 |
| Direwolf Clan | 1 |
| Dwelling of the Spirits | 1 |
| Three Wise Drunks | 1 |
| Dagruel | 1 |
| Milim Nava | 1 |
| Dragon Faithful | 1 |
| Tempest Merchant's Office | 1 |
| Lake Tribe | 1 |
| Chikuan | 1 |
| Council of the West | 1 |
| Trinity Wisemen | 1 |
| Feldway | 1 |
| Milim's Big Four | 1 |
| Five Elders | 1 |
| Red Coloured Daemons | 1 |
| Five Fingers | 1 |
| Spectre Village | 1 |
| Jax | 1 |
| Gadra | 1 |
| Dungeon Dominators | 1 |
| Dragon Fist School | 1 |
| Veldanava | 1 |
| Clayman | 1 |
| Jistav | 1 |
| Seven Divine Treasures | 1 |

Faction comes from the first matching wiki category in a fixed priority list (Primordials > True Dragons > Demon Lords > Eastern Empire > Holy Empire > Tempest > …). If no category matches, it is the first infobox affiliation; if there is none, it is `unknown`.

### By race group
| Race group | Characters |
|---|---|
| Humans | 140 |
| Angels | 37 |
| Oni | 32 |
| Beastmen | 27 |
| unknown | 25 |
| Daemons | 21 |
| Insectoids | 15 |
| Majin | 15 |
| Dwarves | 13 |
| Elementals | 12 |
| Dragons | 12 |
| Spiritual life-forms | 12 |
| Elves | 11 |
| Giants | 9 |
| Monsters | 8 |
| True Dragons | 7 |
| Undead | 7 |
| Primordials | 7 |
| Vampires | 7 |
| Golems | 6 |
| Harpies | 6 |
| Dryads | 4 |
| Slimes | 2 |
| Lycanthropes | 1 |
| Goblins | 1 |

### By importance
| Importance | Characters |
|---|---|
| supporting | 217 |
| major | 115 |
| minor | 104 |
| main | 1 |

Importance is an editorial grouping, not a canon fact: `main` = Rimuru; `major` = has an entry in the official portal's character database; `supporting` = has an anime or manga debut on the wiki; `minor` = everything else (light-novel, web-novel or game-only characters).

### By gender
| Gender | Characters |
|---|---|
| Male | 268 |
| Female | 127 |
| unknown | 16 |
| Unknown | 12 |
| Genderless | 9 |
| Genderfluid | 2 |
| Genderfluid  
Genderless | 2 |
| Hermaphrodite
Female | 1 |

## Source Hierarchy

| Tier | Source | What was used | Cards |
|---|---|---|---|
| 1 | Official anime | Official portal art + anime frames on wiki | 218 |
| 2 | Official promotional | not separately sourced in this revision | 0 |
| 3 | Movie / OVA / special | wiki images of movie-only characters | 14 |
| 4 | Manga | main series + spin-off manga panels and art | 41 |
| 5 | Light novel | Mitz Vah illustrations and renders | 37 |
| 6 | Secondary / other | game art, unclassified wiki images | 41 |

Cards by medium: anime: 218, manga: 41, light_novel: 37, game: 23, unknown: 17, movie: 14, kids: 1

Where the wiki does not caption an image's medium, it is inferred **only** from a 16:9 broadcast frame size (marked `medium_inferred: true`, confidence *low*) or from the movie-only category. Otherwise the medium stays `unknown` and the card is flagged `source_unverified`.

## Character Selection Decisions

### Rimuru Tempest
Selected source: official portal character art (anime design, human form, with the slime form beside him).
Reason: tier-1 official art; it shows both canonical forms. Alternatives: wiki LN, manga, anime and game images of both the slime and human/Demon Lord tabs (recorded in `alternative_images_considered`).

### Velgrynd
Selected source: light-novel render `Velgrynd LN.png` (wiki).
Reason: the only anime image (`Episode 65 - Velgrynd.png`, a cameo) shows her from behind, which does not work as a portrait card. Velgrynd is a critical Eastern Empire war figure, so a clean full-figure design takes priority over the medium order. The anime frame is kept as the backup source.

### Manual crop centres
- **Gobzo**: crop centred at 72% of the frame width (auto-crop missed the face).
- **Nikolaus Spertus**: crop centred at 78% of the frame width (auto-crop missed the face).
- **Queen of Blumund**: crop centred at 70% of the frame width (auto-crop missed the face).

### Multi-form characters (form chosen automatically)

| ID | Character | Form used | Medium | Forms available on wiki |
|---|---|---|---|---|
| 001 | Rimuru Tempest | (official art) | anime | Human, Slime |
| 004 | Abiru | Human Form | manga | Dragonewt Form, Human Form |
| 006 | Agera | (official art) | anime | Agera, Byakuya Araki |
| 010 | Albis | (official art) | anime | Beast Form, Half-Beast Form, Human Form |
| 015 | Angelus | Concealed Form | game | Concealed Form, True Form |
| 019 | Apito | Queen wasp | manga | Divine wasp, Insect, Queen wasp, Star wasp |
| 053 | Carrera | (official art) | anime | Anime, Light Novel, Manga |
| 054 | Carrion | (official art) | anime | Beast Form, Human Form |
| 058 | Charys | (official art) | anime | Female Form, Male Form |
| 061 | Chloe Aubert | (official art) | anime | Adult Form, Child Form |
| 068 | Clayman | (official art) | anime | Battle Form, Regular Form |
| 091 | Dino | (official art) | anime | Concealed Form, True Form |
| 107 | Elyun Grimwald | (official art) | anime | Elf, Human disguise |
| 112 | Erald Grimwald | (official art) | anime | Elf, Human disguise |
| 115 | Eva | (official art) | anime | Anime, Light Novel, Manga |
| 117 | Feldway | Concealed Form | light_novel | Concealed Form, True Form |
| 130 | Gadra | Previous Form | light_novel | Current Form, Previous Form |
| 171 | Granbell Rosso | (official art) | anime | Granbell, Youth |
| 176 | Grucius | (official art) | anime | Half-Beast Form, Human Form |
| 197 | Izis | Original Form | game | Evolved Form, Original Form |
| 200 | Jahil | High human | manga | Footman, High human |
| 211 | Kagali | (official art) | anime | Kagali, Kazalim |
| 220 | Kataki | Astral Goblin | game | Astral Goblin, Evil Goblin |
| 236 | Kumara | (official art) | anime | Adult Form, Child Form, Fox Form |
| 255 | Luvelgé | Luvelgé | light_novel | As Lucia Nasca, Initial Human form, Luvelgé |
| 277 | Milim Nava | (official art) | anime | Concealed form, Stampede state, True form |
| 285 | Mjur Farmenas | (official art) | anime | Concealed Form, True Form |
| 289 | Moss | (official art) | anime | Concealed Form, True Form |
| 328 | Quo | Alive | manga | Alive, Ninehead of Darkness |
| 334 | Ramiris | (official art) | anime | Pixie Form, True Form |
| 338 | Razen | Shogo's Body | anime | Previous Form, Shogo's Body |
| 366 | Shinsha | Human | game | Human, Slime |
| 368 | Shizu | (official art) | anime | Adult, Child |
| 380 | Suphia | (official art) | anime | Beast Form, Half-Beast Form, Human Form |
| 385 | Tear | (official art) | anime | Mask, Maskless |
| 387 | Testarossa | (official art) | anime | Anime, Light Novel, Manga |
| 401 | Ultima | (official art) | anime | Anime, Light Novel, Manga |
| 403 | Vega | Human Form | light_novel | Armored Form, Human Form, Majin Form |
| 404 | Veldanava | Human form | unknown | Dragon form, Human form |
| 406 | Veldora Tempest | (official art) | anime | Dragon Form, Human Form |
| 407 | Velgaia | (official art) | anime | Chaos Dragon, Elemental Dragon |
| 408 | Velgrynd | Human Form | light_novel | Dragon Form, Human Form |
| 409 | Velzard | (official art) | anime | Dragon Form, Immature Form, True Form |
| 411 | Venti | Human form | light_novel | Dragon form, Human form |
| 430 | Zegion | Insectar | light_novel | Insect, Insectar |

## Naming Decisions

- **Canonical English name** = the wiki article title. The wiki follows the Yen Press translation with community romanisation, e.g. *Souei, Hakurou, Souka*, where the official portal uses *Soei, Hakuro, Soka*. The portal's spelling is kept in `alternative_spellings`.
- **Japanese name** = the official portal's katakana when there is a portal entry; otherwise the wiki's kanji with the reading in full-width parentheses. The wiki form is always kept in `japanese_name_wiki`.
- **Aliases** = wiki *Alias / Epithet / Nickname*; **alternative spellings** = wiki *Alternate Translation(s)*; former names and titles are kept separately.
- **Filenames** remove only the characters Windows forbids (`<>:"/\|?*`), so apostrophes and diacritics stay (e.g. `Gob'emon`, `Gard Mjöllmile`).

### Official portal ↔ wiki matches that needed a decision

| Portal slug | Japanese name | Wiki article | Method |
|---|---|---|---|
| alice | アリス | Alice Rondo | first-name |
| arnaud | アルノー | Arnaud Bauman | first-name |
| bovix_equix | ゴズール・メズール | Gozul, Mezul | backup-only |
| chloe | クロエ | Chloe Aubert | first-name |
| daggra_liura_chonkra | ダグラ・リューラ・デブラ | Dagura, Liura, Debura | backup-only |
| daggrull | ダグリュール | Dagruel | manual |
| deeno | ディーノ | Dino | manual |
| elmesia | エルメシア | Elmesia El Ru Sarion | first-name |
| erald | エラルド | Erald Grimwald | first-name |
| eren | エレン | Elyun Grimwald | manual |
| gaia | ガイア | Velgaia | manual |
| gail | ゲイル | Gale Gibson | manual |
| gazel | ガゼル・ドワルゴ | Gazel Dwargo | manual |
| geld | ゲルド | Geld Junior | manual |
| glenda | グレンダ | Glenda Attley | first-name |
| gobuemon | ゴブエモン | Gob'emon | manual |
| granville | グラン/グランベル | Granbell Rosso | manual |
| greatsage | 大賢者 | Ciel | backup-only |
| gunther | ギュンター | Gunther Strauss | first-name |
| guy | ギィ | Guy Crimson | first-name |
| hakuro | ハクロウ | Hakurou | manual |
| hinata | ヒナタ | Hinata Sakaguchi | first-name |
| ifrit | イフリート | Ifrit | manual |
| kenya | ケンヤ | Kenya Misaki | first-name |
| kirara | キララ | Kirara Mizutani | first-name |
| kyoya | キョウヤ | Kyoya Tachibana | first-name |
| leon | レオン | Leon Cromwell | first-name |
| louis | ルイ | Louis Valentin | first-name |
| luminus | ルミナス | Luminous Twilight Valentine | manual |
| maria | マリア | Maria Rosso | manual |
| maribel | マリアベル | Mariabell Rosso | manual |
| masayuki | マサユキ | Masayuki Rudra Nam Ul Nasca | first-name |
| milim | ミリム・ナーヴァ | Milim Nava | first-name |
| mizeri | ミザリー | Misery | manual |
| mjollmile | ミョルマイル | Gard Mjöllmile | manual |
| mjurran | ミュウラン | Mjur Farmenas | manual |
| raine | レイン | Rain | manual |
| raphael | 智慧之王(ラファエル) | Ciel | backup-only |
| renard | レナード | Leonard Jester | manual |
| ritus | リティス | Litus | manual |
| roy | ロイ・ヴァレンタイン | Roy Valentin | first-name |
| ryota | リョウタ | Ryota Sekiguchi | first-name |
| seven_days_clergy | 七曜の老師 | Clerics of the Seven Luminaries | manual |
| shogo | ショウゴ | Shogo Taguchi | first-name |
| soei | ソウエイ | Souei | manual |
| soka | ソーカ | Souka | manual |
| veldora | ヴェルドラ | Veldora Tempest | manual |
| veryon | ヴェイロン | Veyron | manual |
| youm | ヨウム | Youm Farmenas | first-name |
| yuuki | ユウキ | Yuuki Kagurazaka | first-name |

Notes on specific matches:
- `maria` (マリア) is **Maria Rosso**, wife of Granbell, as the portal bio confirms. The wiki article titled *Maria* is a different character (the manas inside Yuuki), so the name-only match was overridden.
- `gail` (ゲイル) is **Gale Gibson**, one of Shizu's five students (the portal bio confirms).
- `geld` (ゲルド) is **Geld Junior**, the named orc general who served under the Orc Disaster Geld (*Geld Senior* on the wiki).
- `eren` (エレン) is **Elyun Grimwald**. This is the only match where the Japanese names differ (エレン vs エリュン). The wiki article covers Elen's true identity as Erald's daughter, so the match is kept with *medium* confidence.
- `gaia` (ガイア) is **Velgaia**. The wiki redirects *Gaia* to *Velgaia* (per the portal, Milim's close friend, a spirit dragon).

## Form / Identity Decisions

- **Merged**: *Great Sage* and *Raphael* (portal entries) are earlier identities of **Ciel**. They have no cards of their own; their portal art is the backup source for Ciel.
- **Group portal entries**: *Gozul & Mezul* (`bovix_equix`) and *Daggra / Liura / Debra* (`daggra_liura_chonkra`) each show several characters on one card. Every individual has their own wiki-sourced card, and the group art is recorded as backup only.
- **Group character**: *Clerics of the Seven Luminaries* gets one card from the portal art. The individual clerics (Ars, Dina, Granbell, Meris, Salun, Vina, …) are separate cards; where the only image is the shared group frame, they are flagged `identity_ambiguous`.
- **Kept separate**, because the wiki keeps separate articles: *Veldora Tempest* / *Veldora Against*; *Ranga* / *Ranga II*; *Geld Senior* / *Geld Junior*; *Maria* / *Maria Rosso* / *Maria Rosso (servant)*; *Cougar* / *Cougar II*.
- **Primary appearance**: for multi-form characters, see the table above. Evolved forms are not split into extra cards.

## Eastern Empire Relevance

Relevance is measured from the project's own LN-derived war dataset (`Timeline Database/Tempest_Eastern_Empire_War_Timeline.md`, volumes 12–16). It counts whole-word mentions of the article title, of the first name (only when no other character shares it) and of each alternate translation. Thresholds: ≥25 critical, ≥8 high, ≥3 medium, ≥1 low. Wiki *Eastern Empire* category members with no mentions are marked `low`. This is a measure of presence in the dataset; it does not rank importance.

| Level | Characters |
|---|---|
| critical | 13 |
| high | 12 |
| medium | 6 |
| low | 38 |
| none | 368 |

### Critical
| ID | Character | Faction | Mentions |
|---|---|---|---|
| 039 | Benimaru | Jura Tempest Federation | 101 |
| 408 | Velgrynd | True Dragons | 82 |
| 334 | Ramiris | Demon Lords (Octagram / Ten Great) | 77 |
| 001 | Rimuru Tempest | Jura Tempest Federation | 72 |
| 049 | Calgurio Heath | Eastern Empire | 64 |
| 129 | Gabiru | Jura Tempest Federation | 62 |
| 424 | Yuuki Kagurazaka | Eastern Empire | 48 |
| 130 | Gadra | Eastern Empire | 44 |
| 096 | Dorf | Armed Nation of Dwargon | 34 |
| 387 | Testarossa | Primordials | 34 |
| 158 | Gobta | Jura Tempest Federation | 31 |
| 116 | Farraga | Eastern Empire | 26 |
| 350 | Rudra Nam Ul Nasca | Eastern Empire | 26 |

### High
| ID | Character | Faction | Mentions |
|---|---|---|---|
| 367 | Shion | Jura Tempest Federation | 21 |
| 401 | Ultima | Primordials | 20 |
| 005 | Adalmann | Jura Tempest Federation | 18 |
| 182 | Hakurou | Jura Tempest Federation | 18 |
| 269 | Masayuki Rudra Nam Ul Nasca | Eastern Empire | 18 |
| 317 | Phobio | Beast Kingdom Eurazania | 18 |
| 170 | Gradim | Eastern Empire | 15 |
| 089 | Diablo | Primordials | 10 |
| 279 | Minitz | Eastern Empire | 10 |
| 141 | Gazel Dwargo | Armed Nation of Dwargon | 9 |
| 384 | Tatsuya Kondou | Eastern Empire | 8 |
| 406 | Veldora Tempest | True Dragons | 8 |

### Medium
| ID | Character | Faction | Mentions |
|---|---|---|---|
| 415 | Veyron | Jura Tempest Federation | 7 |
| 437 | Zonda | Jura Tempest Federation | 7 |
| 211 | Kagali | Demon Lords (Octagram / Ten Great) | 5 |
| 017 | Anrietta | Armed Nation of Dwargon | 3 |
| 117 | Feldway | Eastern Empire | 3 |
| 273 | Michael | Feldway | 3 |

## Research Exceptions

- The Fandom HTML pages return HTTP 403 to non-browser clients. The MediaWiki API works and was used for everything.
- 81 wiki articles have only the `No Image (L).png` placeholder. They are listed in `missing_characters.md` with their debut episode or chapter as a lead.
- Official portal art is 660 × 920 px. It is the most authoritative source but needs about 3.7× upscaling to fill 3400 px.
- Several wiki images are shared between articles: the Seven Luminaries group frame, Apito/Zegion manga panels, and the Ifrit LN art shared with Charys. Those cards are flagged `identity_ambiguous`.
- Multi-person anime frames where the subject cannot be confirmed (Kazhil, Rommel, Rugurd) were flagged during visual review.
- OpenCV 5.x removed `CascadeClassifier`, so the pipeline pins `opencv-python-headless<5`.

## Replacement history
_No cards replaced yet. When a card is replaced, record its previous source URL, image URL and the reason here._
