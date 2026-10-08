# Baxter Family Housing — the signed-off deducts and fences, in Groundwork

Design for review. Matt Walsh, Nursery & Field Operations Manager, 10/7/26.
Builds on `2026-10-07-baxter-bed-view-design.md` (the bed view and Tape it out,
shipped 69eb4cd, live at sw v38). **Supersedes the draft of this file pushed in
ebf532f**, which assumed the revised drawing's species swaps were being built.
They are not (Matt, 10/7/26): see "What changed in scope".

## The idea

The Baxter plan was revised and the revision is **signed off**. What Titan is
building is what Chris wrote in the margin of the revised L1:

1. deduct landscaping — the West perimeter bed (McLean Pl) and the Northeast
   perimeter bed (Baxter Rd);
2. deduct the north fencing — the new 6' cedar screen fence on the north line;
3. add south cedar and vinyl-coated chain link — four runs.

Groundwork's Baxter job should say so. The crew should not stand at McLean Pl
looking for bed 1, and the fence work should be on the phone.

## What changed in scope (and why)

The revised L1 (Plan Set 11465) also swaps three species (Prairiefire → Spring
Snow crabapple, Alaska Flag Iris → Nootka Lupine, Rugosa → Center Glow ninebark)
and reshapes Areas C and D and the SE bed. **None of that is being built.** Matt:
the species list already in Groundwork is correct (the live shared state agrees:
8 Prairiefire, 38 Rugosa and 36 Flag Iris are recorded in hand), and the lupine
was removed. So the species, their quantities, every saved count and every bed
card for Areas A–D and the SE bed stay exactly as shipped. The revised sheet is a
phone photo of paper, read by eye on 10/7; that reading is kept in the room
(`BAXTER-rev-callouts.json`) as a record and is not used by the app.

## Decisions (Matt, 10/7)

| Question | Decision |
|---|---|
| Is the revised plan what is built? | Yes, signed off — the three margin-note items above. |
| Species and quantities | **Unchanged.** "Groundwork's list is right as it is." The species list is not reduced for the deducted beds; the order is already bought. |
| Areas A, B, C, D, SE | **Unchanged**, cards, tape-out and pictures. |
| Revise in place or a second job | In place. One Baxter job; key `baxter` unchanged. |

## What it looks like

In Beds view the job shows five cards, B03–B07. **Bed ids are never renumbered**
(Staked/Planted marks key on the id). B01 and B02 are not shown; one note says so:

```
Deducted by the signed-off revision: B01 West bed (McLean Pl), 44 plants, and
B02 Northeast bed (Baxter Rd), 50 plants. Nothing is planted there. The 3
boulders drawn at their ends: make sure the landscaping has room for them.
```

Under the site map, a Fences list:

```
Fences — added by the revision                         (measured off the sheet)
6' cedar good-neighbor fence              about 435 ft  Tract A line from McLean Pl,
                                                        then south along Bldg C's west side
6' vinyl-coated (black) chain link        about 295 ft  South property line
4' vinyl-coated (black) chain link        about 100 ft  West edge of the Southeast bed
3' vinyl-coated (black) chain link        about  50 ft  Erna Court walk by the light pole (approx.)
Deducted: the 6' cedar screen fence on the north property line.
Note 12: continuous 6' dog-ear cedar, 4' within the 10' setbacks at Baxter Rd and
McLean Pl. Shop drawings, 4' minimum footing, finished side outward.
```

The site map picture is redone: the West and Northeast beds greyed out and
labelled DEDUCTED, markers 3–7 only. The Species view gets one more note at the
top saying the two beds are deducted, that the quantities below are what was
ordered, not reduced, and that the extra plants go back to the yard for winter
storage and use on other jobs.

## Architecture

```
Trello plans 9-30/Baxter - Landscaping Bid Set.pdf (original L1, vector)
        |
        +--> tools/baxter-rev-fences.py  --> BAXTER-rev-fences.json
        |       run vertices = drawn property-line corners on the vector sheet
        |       (Tract A/B line y 232.14; west boundary x 383.09; south property
        |        line y 332.98; SE bed west edge x 612.85; Erna Court walk y 256.31),
        |       lengths by Wolf-Checklist-repo/tools/baxter_fence.py (tested)
        |
        +--> tools/baxter-rev-map.py     --> beds-baxter/v2/site-map.jpg
        |       the shipped map minus the West/NE callouts and markers, with a grey
        |       DEDUCTED wash; BAXTER-rev-map-xy.json for markers 3-7
        v
tools/baxter-rev-inject.py --> index.html: B01/B02 out of BAXTER_BEDS, BAXTER_MAP_XY,
        BAXTER_STAKES, BAXTER_BOULDERS; new BAXTER_DEDUCTED and BAXTER_FENCES between
        /* BAXTER-REV:BEGIN */ ... END markers; jobs.js: one flag (EN + ES)
sw.js: CACHE_VERSION v38 -> v39
tests/baxter-*.spec.js, mutation-check guards
```

Tools and JSON live in `claudes room/`; only the pictures, the data blocks and the
tests go into the repo (public). The fence lengths: the vertices are corners drawn
on the vector sheet, which the revision did not move; only the magenta run (the
3' chain link by the light pole) has no drawn corner at its west end and is
marked approximate.

## App wiring

- `BAXTER` config gains `deducted` and `fences`; `applyJobData` sets
  `BED_DEDUCTED` and `BED_FENCES` (null for Home2 and WSRCC, so their screens are
  byte-for-byte unchanged).
- `deductedHTML()` and `fencesHTML()` render only when their data is present.
- "Go to bed" takes its `max` and placeholder from the highest bed number (7),
  not `BEDS.length` (5); typing 1 or 2 answers "No bed 1" as it does now.
- Spanish for the note, the fence kinds and the one species-view flag; never a
  bare compass word as a key.
- sw.js v39 in the shipping commit. The pictures move to a new folder,
  `beds-baxter/v2/` (the five crops, bytes unchanged, and the new map), so the bed
  cache (`wolf-beds-v2`) does not bump. The map keeps the name `site-map.jpg`
  because the page finds it by that name (zoom hint, live marker overlay) — the same
  answer WSRCC gave with `beds-wsrcc/v3/`. The old top-level files, including
  `B01.jpg` and `B02.jpg`, are removed so the offline save does not carry them. `localStorage`, the `wolf-*` keys and `DOC_PATH` are untouched.

## Tests

Expected values are worked on paper. Playwright: five beds with ids `B03..B07`
and no `B01`/`B02`; the cards sum per species to the original schedule minus the
two beds (PG 3, BP 3, MP 7, SV 0, JH 7, IS 12, PF 25, RR 13, SB 26, VT 14 = 110,
because 204 − 44 − 50 = 110); a mark on B03 survives; the deducted note visible
with 44 and 50 and absent on Home2 and WSRCC; the fences list shows four runs
with their lengths and the north deduct; Spanish; the jump bar; the species view
still lists every original row with its original quantity and the OVER state for
counts above target is untouched. Python: fence lengths (30 + 40 ft legs = 70 ft;
the 3-4-5 diagonal = 50 ft). Mutation guards: show B01 again; renumber the kept
beds; drop the fences. The three existing Baxter specs are rewritten to the five
beds, never left to fail or pasted from output.

## Not in this job

The species swaps, the lupine, Areas C/D/SE changes, the L1a enhanced add,
tape-out for anything new, a reduced species quantity, status.html.

## Ship

On `groundwork-rename`; commits: pictures alone; data and page; fences. Push
`git push groundwork groundwork-rename:main` only after Matt has seen it. Then
fetch the new asset and sw.js from Pages. Update the CLAUDE.md test table and the
memory note.

## Answered (Matt, 10/7/26, after the first push)

- The 94 deducted plants go back to the yard for winter storage and use on other
  jobs (the species note says so).
- The 3 boulders at the deducted beds' ends are not a worry; the only job is to
  make sure the landscaping has room for them (the deducted note says so).

## Open, not blocking

- The magenta run's length is read off the photo (about 50 ft).
