# Baxter Family Housing in Groundwork — the bed view and Tape it out

Design for review. Matt Walsh, Nursery & Field Operations Manager, 10/7/26.
Nothing here is built yet.

## The idea

Baxter is a species-only job today: a count per species, two notes, and the
boulder plan picture tucked under Boulders. The crew has no way to stand on
Erna Court and know which bed they are at or what goes in it. This gives
Baxter the same bed view Home2Suites and WSRCC have — a numbered site map,
a card per bed with Staked/Planted and the sheet's callouts, crops, symbols —
and Tape it out distances for every tree, shrub and boulder, off the vector
bid set.

## Decisions already made (Matt, 10/7)

| Question | Decision |
|---|---|
| What "the map" is | **The full bed view, like Home2.** Not a plan picture on the job. |
| Tape it out | **In this pass**, not a second one. Nothing ships until both are built and checked. |
| What is built on site to zero from | **Not sure yet.** Build the zeros off the buildings and the Erna Court curbs, and say so on every Baxter card until he clears it. |

## What the sheet is (found 10/7, nothing assumed)

Source: `Trello plans 9-30/Baxter - Landscaping Bid Set.pdf`, sheet L1 of 18,
"Baxter Family Housing Phase I — Vertical Construction", The Boutet Company,
AWWU plan set. Two pages; L1 is the planting plan, L2 the details.

- **Vector, but exploded.** 105,415 drawing paths on L1, no CAD layers
  (no OCGs, every path's layer is blank), and the symbols and callouts are
  broken into hairline fragments: a shrub circle is hundreds of 0.1 pt lines.
  Nothing like WSRCC's one-layer-per-species.
- **The text layer holds only the Landscaping Notes.** Its font has a broken
  ToUnicode (every glyph is shifted by 29 code points: `/$1'6` is `LAND`).
  The callouts ("3 PF"), the schedule and the area labels are NOT text; they
  are drawn glyph outlines. So no quantity on this sheet can be read off a
  text layer. OCR at 600 dpi reads about a third of the pills — not enough.
- **The fragments chain back into symbols.** Joining segments at shared
  endpoints around Area B recovers each shrub as one component ~2.4 pt
  across with a clean centre, and the crabapple canopy as one 18 pt
  component. That is what makes Tape it out possible.
- **Scale is the drawn bar, 0.7765 pt per foot.** The bar's 60 ft segment
  measures 46.59 pt; its 30 ft and 15 ft segments agree (23.29, 11.65). The
  printed "1 inch = 30 ft" is for the full-size sheet, not this 11x8.5 print.
  1 pt is 1.29 ft, so a 2.4 pt shrub is about 3 ft across — a #5 at 3 ft OC.
- **The frame.** The page is /Rotate 90. `get_drawings()` is unrotated;
  multiply by `page.rotation_matrix` to reach the displayed (upright)
  sheet, which is what `get_pixmap` renders. On the upright sheet, +x is
  east and +y is south, and the sheet is north-up (true-north arrow checked).
- **The schedule**, 10 species, 207 plants — identical to the Baxter rows
  already in jobs.js:

  | Code | Plant | Qty |
  |---|---|---|
  | PG | White Spruce | 9 |
  | BP | Paper Birch | 8 |
  | MP | Prairiefire Crabapple | 8 |
  | SV | Hardy Purple Common Lilac — *alternate under the overhead line* | 2 |
  | JH | Creeping Juniper | 11 |
  | IS | Alaska Flag Iris | 36 |
  | PF | Yellow Potentilla | 55 |
  | RR | Rugosa Rose | 38 |
  | SB | Birchleaf Spirea | 26 |
  | VT | Dwarf American Cranberry | 14 |

- **The sheet checks itself.** Each interior area carries its own line —
  "Area A: 464 SF, 3 trees & 19 shrubs", "Area B: 280 SF, 2 trees & 11
  shrubs", "Area C: 218 SF, 1 tree & 8 shrubs", "Area D: 464 SF, 3 trees &
  19 shrubs" — and each perimeter bed too ("100 LF west perimeter, 1 tree,
  6 shrubs per 20 ft, req'd/shown 5 trees, 27 shrubs, 12 perennials"; the
  116 LF northeast and southeast beds each 6 trees, 32 shrubs, 12
  perennials). Those are reconciliation targets, not decoration.
- **Boulders:** 9 in the schedule, 10 drawn, already in the app as a note.
  Unchanged here, except that each drawn boulder gets a tape row.

## What it looks like

The Baxter tab gains the Species / Beds toggle the other two jobs have. In
Beds:

```
Site map — all 14 beds            (numbered markers, species-coloured pills)
Save all bed maps for offline (4 MB)

B05  Area B · Erna Court, by the light pole              [Staked] [Planted]
     2 MP  Prairiefire Crabapple
     3 SB  Birchleaf Spirea
     3 PF  Yellow Potentilla
     1 JH  Creeping Juniper
     ...
     Tape it out
       Zero: southwest corner of Building B
       Prairiefire Crabapple MP   18' 4"  going north   6' 2"  east of the wall
       ...
       Zeros assume the buildings and the Erna Court curbs are in. Check on
       site before taping.
```

The bed count in that mock is an estimate; the number the tool produces is
the number.

## Architecture

```
Trello plans 9-30/Baxter - Landscaping Bid Set.pdf  (L1, vector, exploded)
        |
        +--> 600 dpi tiles --> BAXTER-callouts.json     READ BY EYE: every pill,
        |                      (code, qty, x, y, stack)  its plan coordinates,
        |                                                which stack it is in
        |
        +--> tools/baxter-symbols.py --> BAXTER-symbols.json
        |      chain fragments -> components -> classify -> one centre per plant,
        |      one per boulder.  STOPS unless drawn = schedule, per species.
        |
        v
   tools/baxter-beds.py  (reads callouts + symbols)
        +--> BAXTER-beds.json      beds, items, where, zone, cx/cy, leader tip
        +--> beds-baxter/site-map.jpg + BAXTER-map-xy.json   (geometry contract)
        +--> beds-baxter/B01.jpg ... (1500x1100 crops, pills drawn on)
        +--> symbols-baxter/<code>.png  (cut from the sheet's own schedule block)
        |
   tools/baxter-stakes.py  (reads beds + symbols)
        +--> BAXTER-stakes.json  -> injected into index.html between
             /* BAXTER-STAKES:BEGIN */ ... END markers (plants + boulders)
        |
        v
   index.html: BAXTER job block, JOB_DATA table, hasBedView, inchesPerPixel
   sw.js: CACHE_VERSION v37 -> v38; cache count comment
   tests/baxter-*.spec.js, tools/test_baxter_*.py, mutation-check guards
```

Tools live in `claudes room/tools/` beside the Home2 and WSRCC ones; the
JSON files beside them in `claudes room/`. Only the pictures, the data block
and the tests go into the repo (public).

## 1. The callouts, read by eye

`BAXTER-callouts.json` is typed by hand from the 600 dpi tiles, one entry per
pill: `{"code": "PF", "qty": 3, "x": 552.3, "y": 194.0, "stack": "B"}` with
`x, y` the pill's plan coordinates on the upright sheet (from the OCR run,
which places pills well even where it misreads them; hand-placed where OCR
missed) and `stack` the leader group it belongs to. This is the Home2 method
(`L102-readings.txt`), not the WSRCC one, because there is no text to read.

`tools/baxter-beds.py` refuses to write anything unless:

- every species sums to the schedule (the table above), and
- every area with a "req'd/shown" line on the sheet matches it, trees and
  shrubs separately (perennials = IS).

A mismatch prints the species and the stacks involved and exits non-zero.
"Fix the reading" is the only path through — never the schedule.

## 2. Beds

A bed is one callout stack and its leader(s), merged where two stacks point
into the same planter (the Home2 rule; a merge radius is a judgement, printed
in the tool and in the data-block comment). Numbered **north to south, then
west to east**, `B01` upward, like the other jobs.

Bed record, the same shape WSRCC uses, so nothing in the card renderer
changes: `{"bed": "B05", "seq": 5, "zone": "Court", "where": "Area B",
"units": 13, "items": {"MP": 2, "SB": 3, "PF": 3, "JH": 1, ...}, "cx", "cy"}`.
No `lat`/`lon` — nothing on this job is georeferenced, so "Where am I?"
stays hidden, as it does for WSRCC.

`where` carries the sheet's own names, so a card and the drawing say the
same thing: `West bed (McLean Pl)`, `Area D (mailboxes)`, `Area A`, `Area B`,
`Area C`, `Erna Court island`, `Northeast bed (Baxter Rd)`, `Southeast bed
(Baxter Rd)`. Each gets a Spanish entry in the translation table.

Zones are three geometric bands, crew blank, note saying so — the WSRCC
precedent (`"Geometric band, not a build order. No crew split set for this
job yet."`): `West` (McLean Pl frontage), `Court` (Erna Court and Areas A–D),
`East` (Baxter Rd frontage).

The two SV lilacs keep their alternate flag in jobs.js; on the cards they
are ordinary rows (the sheet draws them in beds). `BAXTER_SPECIES` uses the
checklist's exact names, so `codeRow` resolves all ten on the exact-slug
match and `BAXTER_SPECIES_ALIAS` is `{}` with a comment saying why it is
empty and that the fuzzy prefix fallback must never be relied on.

## 3. Pictures

- **Site map** `beds-baxter/site-map.jpg`, 4013 px wide like the others (the
  live-colour SVG overlay is a geometry contract: marker radius 46, ring 5,
  font 48 in a viewBox equal to the plan crop; `BAXTER_MAP_PLAN` and
  `BAXTER_MAP_XY` are written by the tool, never typed). Plan crop is the
  drawing only — no notes, schedule or title block.
- **Crops** `beds-baxter/B01.jpg ...`, 1500x1100, a 100 ft x 73 ft window
  (77.65 x 56.9 pt at 0.7765 pt/ft) centred on the stack and kept inside
  the plan crop. That matches WSRCC's 100 ft window, so the zoom hint's
  0.8 in/px holds for crops; the site map's hint is computed from its own
  px/pt and stated in the `inchesPerPixel` comment with its arithmetic.
- **Pills.** The sheet is monochrome, so the pills are drawn: species colour
  by the WSRCC method — the 8 validated hues, the solid/outline second
  channel, assigned against the REAL co-occurrence graph from
  `BAXTER-beds.json`, worst-pair CVD and normal-vision dE printed by the
  tool and recorded in `baxter-palette.json`. 10 species over 8 hues needs
  the outline channel for two of them. Every pill prints its code; colour is
  an accelerator, never the identity.
- **Symbols** `symbols-baxter/<code>.png`, the ten cut from the sheet's own
  Planting Schedule block, sized by ink extent, compressed (exponent 0.45,
  50 px floor), coloured per species from the palette. Own folder, because
  BP, SB, IS and JH collide with the other jobs' codes and are different
  drawings.
- **Filenames are new**, so `BED_CACHE` (`wolf-beds-v2`) does not bump. The
  cache count comment in sw.js gains a Baxter line; MAX_BEDS 220 has room
  (135 + about 30).
- `offlineMB` is measured from the folder, not guessed.

## 4. Tape it out

**Symbols.** `tools/baxter-symbols.py` takes every `l` and `c` item on L1
inside the plan crop, joins them at shared endpoints (rounded to 0.1 pt),
and keeps components whose bounding box is symbol-sized. Classification is
by size and shape against the ten symbols in the schedule block (and the
boulder symbol), with these checks before anything is written:

- drawn count per species equals the schedule, or the script stops and
  prints what it found, with a check picture;
- the legend symbol in the schedule block is excluded by position, not by
  subtracting one;
- boulders: 10 drawn, as the note already says; all 10 get a row and the
  10-vs-9 note stays.

**Bed membership** is the Home2 method: per species, a min-cost assignment
of plant centres to leader tips, each stack taking exactly its callout
count; a plant farther than a printed MAX_FT from its bed's nearest tip
stops the script.

**Zeros and edges** (`tools/baxter-stakes.py`, the Home2 method): the built
features are the three building outlines and the Erna Court / island curbs,
traced off the sheet by the same chaining (they come out as long straight
components). Each bed takes the one straight built edge of at least 12 ft
that runs closest along all its plants, zeroes at the corner nearest the
start of the bed, and gives every plant feet ALONG the edge from the corner,
feet OFF it square, and the side as a compass word taken off the
edge-to-plant vector (`side_of` — the mirrored-sides bug of 9/30 is why a
hand-worked test pins one bed's side). A bed with no built edge within 40 ft
is listed by the tool and gets no rows rather than a guess. Boulders ride
the bed's zero when within 15 ft of a staked plant, else their own nearest
edge, as `BED_BOULDERS` already supports.

**The note.** Because Matt is not sure what is built, `BAXTER_STAKES.foot`
carries one line rendered under every Baxter tape table: *"Zeros assume the
buildings and the Erna Court curbs are in. Check on site before taping."*
Spanish alongside. It is retained until Matt says to drop it; the only
change is deleting the line.

**Output** `BAXTER_STAKES` in the Home2 shape (`ref`, `edge`, `rows[{code,
along, dir, off, sideText, note?}]`, `extra`, `held`) injected between
`/* BAXTER-STAKES:BEGIN (tools/baxter-stakes.py) */` markers, and
`BAXTER_BOULDERS` in the Home2 boulder shape (`beds`, `own`).

## 5. App wiring

- `var BAXTER = {beds, species, spacing: {}, zones, disc: {}, mapPlan,
  mapXY, bedImg: "./beds-baxter/", symImg: "./symbols-baxter/", offlineMB,
  links: {}, noSym: [], runs: [], stakes: BAXTER_STAKES, boulders:
  BAXTER_BOULDERS}` placed BELOW every declaration it reads (the hoisting
  bug of 9/17 has a comment on it; the new block sits under it).
- `var JOB_DATA = {h2s: H2S, wsrcc: WSRCC, baxter: BAXTER}` and
  `var JOB_ALIAS = {h2s: H2S_SPECIES_ALIAS, wsrcc: ..., baxter: ...}` replace
  the four `currentJob === "wsrcc" ? WSRCC : H2S` ternaries in
  `applyJobData`, `codeRow` (both lines) and `inchesPerPixel`.
  `hasBedView(job)` becomes `job in JOB_DATA`. A job absent from the table
  still drops to the species view, as now.
- `inchesPerPixel` becomes per job with the three jobs' numbers and the
  arithmetic in the comment.
- `stakeTableHTML` renders `BED_STAKES.foot` (English or Spanish by `lang`)
  as one more `tape-foot` line when the job's stakes carry it. Home2 and
  WSRCC have no `foot`, so their tables do not change.
- `bedKeyFor` already prefixes every non-h2s job, so Baxter's marks cannot
  collide with Home2's bare keys.
- `generateReport`'s "planted but short" block stays h2s-only; WSRCC does
  not have it either, and widening it is not this job's ask.
- sw.js: `CACHE_VERSION` v37 -> v38 in the same commit; the folder regex
  already matches `/beds-baxter/` and `/symbols-baxter/` (a test proves it).
- Spanish: the `where` strings, the three zone names and the foot note.

## 6. Tests

All expected values are worked on paper in the test comments, never pasted
from output.

Playwright (`tests/baxter-beds.spec.js`, `tests/baxter-tape.spec.js`):

- Baxter's bed view renders; the cards' items sum per species to the
  schedule table above (207), and the number of cards equals
  `BAXTER_MAP_XY`'s key count.
- Every tree, shrub and boulder on a card has exactly one tape row (the
  WSRCC/Home2 pattern), and no row names a code the card lacks.
- One distance worked on paper from the plan coordinates in
  `BAXTER-symbols.json` and the building corner it zeroes on, to the inch,
  and its side word — the mirrored-sides guard.
- The foot note is visible on a Baxter card and absent on a WSRCC card
  (`toBeVisible` + a `toBeHidden` case, per the hidden-banner rule).
- Switching Baxter -> Home2 -> WSRCC -> Baxter renders each job's own beds
  (bed count and B01's `where` per job) — the regression that bit WSRCC.
- Symbols: every Baxter code requests `symbols-baxter/<code>.png`, none
  from `symbols/`.

Node (`tests/sw-folders.test.js`): the sw.js folder regex matches
`/Groundwork/beds-baxter/B01.jpg` and `/Groundwork/symbols-baxter/PF.png`.

Python (`tools/test_baxter_beds.py`): the reconciliation stops on a
one-short species and on an area whose trees do not match; a fixture with a
gap in the numbering, not 1-2-3.

Mutation check, three new guards tagged `baxter`:

- drop one Baxter bed's tape rows -> "exactly one tape row" goes red;
- swap two codes' counts in one Baxter bed -> the schedule sum test goes red;
- point `JOB_DATA.baxter` at `WSRCC` -> the per-job `where` test goes red.

`npm run verify-tests` must report no `SKIPPED`.

Baseline today, verified 10/7: 181 Playwright, 42 node, 22 Python. The
CLAUDE.md table says 170/36/22; it gets the new numbers when this ships.

## Not in this job

- Splitting per-job data out of index.html (worth doing before job five;
  not here).
- Georeferencing Baxter's beds for "Where am I?".
- status.html: it has no bed view for any job.
- Widening the report's "planted but short" block beyond Home2.
- Retiring the Baxter boulder plan picture under Boulders — it stays.

## Ship

On `groundwork-rename`: one commit for the data and pictures, one for the
app wiring and tests (so the picture commit can be reverted alone). Push
`git push groundwork groundwork-rename:main`. Then fetch every new asset
from Pages and check 200, and check the served sw.js reports v38. Update
the CLAUDE.md test table and the memory note.

## Open, not blocking

- Which built features are actually in on site (Matt, on his next visit).
  The note stays up until then.
- Which boulder comes off (Chris) — already open, unchanged.
