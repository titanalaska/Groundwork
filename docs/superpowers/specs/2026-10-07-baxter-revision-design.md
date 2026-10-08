# Baxter Family Housing — the signed-off revision, in Groundwork

Design for review. Matt Walsh, Nursery & Field Operations Manager, 10/7/26.
Nothing here is built yet. Builds on `2026-10-07-baxter-bed-view-design.md`
(the bed view and Tape it out, shipped 69eb4cd, live at sw v38).

## The idea

Groundwork's Baxter job was built from the ORIGINAL L1 (bid set, Apr 2025):
7 beds, 204 plants, tape-out off the vector geometry. The plan has since been
revised and **signed off** (Matt, 10/7/26): the West and Northeast perimeter
beds are deducted, three species are swapped, Areas C and D are reshaped, and
four fence runs are added. The crew should now see the revised beds. This
revises the Baxter job in place so the crew's list matches what Titan is
building, without renumbering a bed or losing a mark.

## Decisions already made (Matt, 10/7)

| Question | Decision |
|---|---|
| Is the revised plan what is being built? | **Yes, signed off.** Revised beds replace the original ones in the crew's view. |
| How much of the revision? | **The full revised plan:** deducts, species swaps, Areas C/D, SE bed, fences. |
| A clean PDF of the revised L1? | **None will be made.** The phone photos are the source for good. |
| How does it enter the app? | **Revise Baxter in place.** One job, key `baxter` unchanged. Not a second job. |
| L1a "enhanced landscape add" (5 spruce, 2 birch, 2 Spring Snow, 4 moose fence) | **Left out.** The redline notes call it a draft for discussion; it is not in the signed-off set. Stated as an assumption — say so if it is in. |

## The sources (found 10/7, nothing assumed)

Three photos of paper sheets, copied byte-identical (sizes checked) off the S25's
`Download` folder into `claudes room/Baxter CO from phone 10-7/`; they reached
Matt's phone by text. They are camera photos run through a scan app, **not
vector**: raster text, mild perspective, no coordinates.

| File | What it is |
|---|---|
| `output-D96F11DF…jpeg` (2573x1679) | Original L1, old schedule (9 PG, 8 MP, 36 IS, 38 RR …) |
| `output-C47C6178…jpeg` (2573x1755) | **Revised L1, Plan Set 11465**, with Chris's red markups |
| `processed-D8E2AE49…jpeg` (1734x2573) | L2 Landscape Details — unchanged, nothing to do |

The redline's written summary is Matt's private "Baxter Rd – Valetskaya Tract B
Redline Notes" doc. Change-order files on the H5 Trello card (`Valetskaya Addition No 1 - Change Order Addition/Deduction.pdf`,
`Baxter Housing CO 1.png`, `Titan, LLC CO01 - BFH PHI - VC.pdf`) were NOT obtained
and are not needed for this design.

**What the revised sheet says** (schedule read from the crop; the rest is Chris's
markup plus the redline notes):

- **Schedule, 201 plants:** PG 7, BP 9, **MS 8** (Spring Snow Crabapple, was MP
  Prairiefire), SV 2, JH 10, **LN 36** (Alaska Nootka Lupine, was IS Flag Iris),
  PF 53, **PO 44** (Center Glow Ninebark, was RR Rugosa), SB 22, VT 10. Shrubs
  are "Potted" with no #1/#2/#3.
- **Deducted:** West bed B01 (44 plants) and Northeast bed B02 (50 plants) =
  94 plants; the north 6' cedar screen fence.
- **Areas:** A 367 SF, 2 trees and 15 shrubs; B 280 SF, 2 trees and 11 shrubs
  (both unchanged); **C 169 SF**, 1 tree, 4 shrubs and 9 perennials (was 218 SF);
  **D 651 SF**, 4 trees and 26 shrubs (was 464 SF).
- **Fences added:** green line, 6' cedar good-neighbor (Tract A side west of the
  parking, then south down the west side of Bldg C to the south property line);
  yellow, south property line, 6' black vinyl-coated chain link with top rail;
  blue, along the SE bed, 4' black vinyl-coated with top rail; magenta, east end
  of the Area B bed by the light pole, 3' black vinyl-coated with top rail.
  Note 12 is now a continuous 6' dog-ear cedar screen, 4' within the 10' setbacks
  at Baxter Rd and McLean Pl, shop drawings required, 4' minimum footing.

**What the first look at the photo found** (by eye, NOT reconciled — these are
reading targets, not facts):

- Areas A and B: same counts as the original, only MP → MS.
- **The SE bed changed**, which the redline notes did not say: original 12 RR
  and 17 PF; revised reads about 8 PO and 21 PF, 50 plants either way.
- C reads about 15 plants and D about 34, and neither matches its own label
  (D's "26 shrubs" vs 18 read).
- The lupine callouts add to about 57 against a schedule of 36; PF and PO also
  run over. If this holds, the revised sheet disagrees with itself the way the
  original did, and the lupine gap is a purchasing question for Chris.

## What it looks like

In Beds view the job shows five cards, not seven:

```
B03  Area A (fire hydrant)    2 MS · 3 SB · 3 PF · 3 VT · 2 JH   [Staked][Planted]
     Tape it out  (carried over, MS where MP was)
B04  Area D (mailboxes)       3 MS · 1 BP · 6 PO · ...           (callout order, no distances)
B05  Area B (light pole)      2 MS · 8 SB · ...                  Tape it out (carried over)
B06  Area C (Erna Court)      1 MS · 3 PF · 9 LN · ...           (callout order, no distances)
B07  Southeast bed (Baxter Rd) 12 LN · 8 PO · 21 PF · ...        (callout order, no distances)

Deducted by the signed-off revision: B01 West bed (44 plants),
B02 Northeast bed (Baxter Rd) (50 plants). Nothing is planted there.

Fences: 4 runs added, north cedar deducted          (a list, under the site map)
```

The numbers above are the reading targets from the first look, not the tool's
output; the number the tool produces is the number.

## Architecture

```
Baxter CO from phone 10-7/output-C47C6178…jpeg   (revised L1, a photo)
        |
        +--> contact sheets at 3 zooms --> BAXTER-rev-callouts.json
        |      READ BY EYE: every pill, which bed it is in, its order along the bed
        |
        v
tools/baxter_reconcile.py   (existing; gets the revised targets)
        gate: each species vs the revised schedule, each area vs its label.
        A disagreement is carried as a flagged discrepancy WITH its species
        or area override (the existing mechanism), never forced to match.

Original vector bid set + existing BAXTER-*.json (unchanged inputs)
        +--> carried-over tape-out for B03 (A) and B05 (B), codes renamed
        +--> fence run lengths measured on the vector property lines

tools/baxter-rev-inject.py  -->  index.html BAXTER block (between the markers),
        jobs.js Baxter rows, beds-baxter/ photo crops, symbols-baxter/ new codes,
        sw.js CACHE_VERSION v38 -> v39
tests/baxter-rev-*.spec.js, tools/test_baxter_rev_*.py, mutation-check guards
```

Tools and JSON live in `claudes room/` beside the others. Only the pictures, the
data block and the tests go into the repo (public). The photos themselves, the
group-text provenance and the discrepancy list stay in the room.

## 1. Beds and ids

- Shown: **B03 Area A, B04 Area D, B05 Area B, B06 Area C, B07 Southeast bed.**
  B01 and B02 leave `BAXTER_BEDS` and `BAXTER_MAP_XY`; their `bedKeyFor` marks
  are NOT deleted from storage, so un-deducting later restores them.
- **No bed is renumbered and no id is reused.** Staked/Planted marks key on the
  bed id; sliding B03 up to B01 would hand its marks to the wrong bed.
- The deducted beds are named in one footnote under the site map, with their
  plant counts (44, 50) — facts off the shipped data. The footnote does not list
  surplus species or counts: what was actually bought is net-need's job, not the
  sheet's.
- `where` strings and Spanish are unchanged for the five kept beds.
- Codes: MP→MS, IS→LN, RR→PO throughout (`BAXTER_SPECIES`, items, tape rows,
  pills, symbols, Spanish). SV has no remaining bed and drops out of the cards;
  the species list keeps it at 0 with a note rather than silently vanishing
  (the sheet still schedules 2).

## 2. Species, quantities and stock notes

- `jobs.js` Baxter rows become the revised schedule's species with
  **quantity = what the remaining cards sum to** (what the crew will find on the
  drawing), exactly the original method. Where the cards disagree with the
  revised schedule, `BAXTER_DISCREPANCY` carries both numbers for Chris, as it does
  now ("callouts 7, schedule 9"); nothing is forced to the schedule.
- **Judgment values ship empty.** The three new species (MS, LN, PO) ship with
  **no stock note**: what was ordered for them is Matt's to say.
- **Saved counts are keyed by plant name** (`baxter:<slug(name)>`), and the live
  shared state read on 10/7 shows real counts in hand against the ORIGINAL names:
  Prairiefire Crabapple 8, Rugosa Rose 38, Alaska Flag Iris 36, White Spruce 9,
  Yellow Potentilla 17, Birchleaf Spirea 26, Creeping Juniper 11, Dwarf American
  Cranberry 14, Hardy Purple Lilac 2, Paper Birch 0. No Staked/Planted marks exist
  for any Baxter bed yet. **No existing Baxter row is deleted or renamed.**
  - Rows that stay on the plan (PG, BP, JH, PF, SB, VT, SV) keep their names and
    take the revised quantity. Where the count already in hand is above the new
    quantity (spruce 9 vs about 3, juniper 11 vs about 6), the app's existing
    purple OVER state shows the surplus honestly.
  - The three swapped species (Prairiefire Crabapple, Alaska Flag Iris, Rugosa
    Rose) move to their own group, "From the original order — not on the revised
    plan", with quantity 0, so their counts stay visible as OVER. Matt decides
    later whether they are installed as substitutes or placed elsewhere; the
    app does not decide it.
  - The three new species are NEW rows with no count.
- The two existing stock notes — "Rugosa covered by Danny's order (38)" and
  "Creeping Juniper bought and on site (11)" — are kept word for word with a lead
  of "Bought for the ORIGINAL plan:". They stay visible until Matt says what they
  became.
- New names go through `check-job.js baxter <total>` (look-alike names block), get
  Spanish in `ES`, and get `species-alias-table.json` entries with
  `status: "unverified"` then `python tools/build_vendors.py`.
- No status.html change (it has no bed view for any job).

## 3. Tape it out

**The rule:** a bed keeps its distances only if its callouts are identical to
the original's after the three renames. By the first look that is **A and B only.**

- B03 and B05 keep every distance, with MS in MP's rows. A test compares each
  bed's counts to the original's and fails if a "carried over" bed differs.
- B04, B06, B07 show their **callouts in order along the bed** (north to south
  for the perimeter bed; top to bottom as the sheet prints them for the areas),
  as `BAXTER_ORDER = {bed: [{qty, code}, ...]}`, plus one line: "Distances need a
  vector sheet. Go by the callout order on the drawing." The renderer shows this
  block only for a Baxter bed with no tape rows.
- **No positions are guessed.** Mapping 50 revised species onto the original's 50
  vector symbol positions would invent distances; the app says plainly it has none.
- The foot note ("Zeros assume the buildings and the Erna Court curbs are in …")
  stays on the tape tables until Matt clears it.
- **Boulders:** the original draws 10 against a schedule of 9, at bed ends. The
  revised schedule still says 9. Which boulders go with the deducted beds is a
  reading target from the photo; if the photo does not settle it, the 10-vs-9 note
  stays and the boulder rows for B01/B02 are held, not deleted.

## 4. Pictures

- **Site map:** regenerated as `site-map-r.jpg`. The original has every ORIGINAL
  pill baked into the picture (the deducted beds, MP/IS/RR), so it cannot stay.
  The new one is the same vector render with pills only on Areas A and B (MS), a
  grey "DEDUCTED" wash over the West and Northeast beds, and a pale "REVISED — see
  the card" wash over the stale printed callouts at C, D and the SE bed. The old C
  and D planting shapes still show under their wash; a caption says so.
- **A and B crops** stay from the vector render, pills redrawn with MS.
- **SE, C and D crops** are cut from the revised photo, plain (no pills: the photo
  has no plan coordinates to place them), with a caption "from a photo of the
  revised sheet". Changed pictures get NEW filenames (`-r` suffix), so
  `BED_CACHE` (`wolf-beds-v2`) does not bump. The superseded B01, B02 crops and the
  old C/D/SE crops are removed from `beds-baxter/` in the same commit so the
  offline save does not carry them; they stay in git history.
- **Symbols:** PG, BP, JH, PF, SB, VT, SV stay. MS, LN, PO are cut from the
  revised photo's schedule block; where a new symbol is the same drawing as the
  old code's (checked by eye and printed by the tool), the vector-cut picture is
  reused. Palette: re-run `baxter-palette.py` on the new co-occurrence graph; the
  worst-pair numbers are recorded in `baxter-palette.json` as before.

## 5. Fences

A Fences list under the site map, one row per run: type, height, length, a one-line
note. The photo says which type goes on which line; the **length is measured on the
original vector sheet's property lines, building outlines and curbs** (scale 0.7765
pt/ft), which the revision did not move. Each run's endpoints are the nearest drawn
vertices to Chris's hand-drawn line ends, printed by the tool so Matt can confirm
them; lengths are labelled "measured off the sheet". The north cedar deduct gets one
line and no length. Note 12's shop-drawing and 4' footing requirement appears once.

No tape-out for posts, no map overlay lines: that is a later pass if the crew
wants it. The fence work ships as **its own commit** so it can be reverted alone.

## 6. App wiring

- `BAXTER` block regenerated between its markers; `JOB_DATA` untouched
  (`baxter` key stays); `hasBedView` unchanged.
- New: render of `BAXTER_ORDER` and the "deducted" footnote and the Fences list
  and the "distances need a vector sheet" line, all under the existing card
  renderer, each gated on the data being present so Home2 and WSRCC cannot change.
- sw.js: `CACHE_VERSION` v38 → v39 in the same commit; the folder regexes already
  match both asset folders.
- Spanish for the three new plant names, the footnote, the callout-order line,
  the "no distances" line, the fence names. Matt reads the Spanish before ship.
  Never a bare compass word as a key (the 10/7 rule).
- The "Go to bed" box takes its max and placeholder from the highest bed number
  (7), not `BEDS.length` (5); typing 1 or 2 answers "No bed 1" as it does now.
- The existing Baxter specs (`baxter-beds`, `baxter-tape`, `baxter-review`) encode
  the original 7 beds and 207 plants and are rewritten to the revised truth, worked
  on paper, not pasted from output. The `baxter` mutation guards that name original
  strings are updated, never left SKIPPED.
- `localStorage` and the `wolf-*` keys are untouched. `DOC_PATH` is untouched.

## 7. Tests

All expected values are worked out on paper in the test comments, never pasted
from output. A passing test is not evidence until it has been seen to fail.

Playwright (`tests/baxter-rev-beds.spec.js`, `tests/baxter-rev-tape.spec.js`):

- Five cards, ids B03–B07 exactly; B01 and B02 absent; a mark set on B03 before
  the revision is still on B03 after (the id-stability case).
- Cards sum per species to the revised data, and the discrepancy list names every
  species where cards and schedule differ.
- B03 and B05: every tree and shrub has one tape row and counts equal the original's
  after the rename; B04, B06, B07 show `BAXTER_ORDER` and no tape table
  (`toBeVisible` plus a `toBeHidden` case).
- The deducted footnote is visible on Baxter, absent on Home2 and WSRCC.
- Job switching Baxter → Home2 → WSRCC → Baxter renders each job's own beds.
- Symbols: MS, LN, PO request `symbols-baxter/`, none from `symbols/`.
- Fences list shows four runs and the north deduct.

Python (`tools/test_baxter_rev_*.py`): the reconcile gate stops on a one-short
species and on an area that does not match; a fixture whose bed ids have a gap.

Mutation check, new guards tagged `baxter-rev`: renumber the kept beds (id test
red); show B01 again (absent test red); carry a tape table onto B07 (rule test
red); swap two codes in one card (species-sum test red). `npm run verify-tests`
must report no `SKIPPED`.

Baseline today: 40 Python, 44 node, 200 Playwright (CLAUDE.md, 10/7).

## Not in this job

- The L1a enhanced add (until Matt says it is signed off).
- Tape-out distances for B04, B06, B07 (needs a vector sheet that will not exist).
- Georeferencing, "Where am I?", status.html for Baxter.
- Surplus accounting for the deducted beds (net-need).
- Any change to the Home2 or WSRCC data.

## Ship

On `groundwork-rename`: one commit for the data and pictures, one for the app
wiring and tests, one for the fences. Push `git push groundwork
groundwork-rename:main` — **never** `git push groundwork main`. Then fetch every
new asset from Pages and check 200, and check the served sw.js reports v39. Update
the CLAUDE.md test table and the memory note.

## Open, not blocking

- What became of Danny's 38 Rugosa and the 11 juniper, and what has been ordered
  for Spring Snow, Lupine and Center Glow (Matt). The three new species ship with
  no stock note until he says.
- The lupine total (about 57 read vs 36 scheduled) and any PF/PO over-run:
  a question for Chris once the reading is reconciled.
- Which boulders go with the deducted beds, if the photo does not show it.
- Which built features are on site, so the "zeros" foot note can come off
  (unchanged from the 10/7 spec).
