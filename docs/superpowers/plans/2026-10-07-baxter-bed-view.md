# Baxter Bed View and Tape it out — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Baxter Family Housing job in Groundwork the Home2/WSRCC bed view (numbered site map, bed cards, crops, symbols) and Tape it out distances for every tree, shrub and boulder, off the vector bid set.

**Architecture:** Five Python tools in `claudes room/tools/` read the exploded-vector L1 sheet and a hand-read callouts file, and write JSON plus pictures; index.html gains a `BAXTER` job block, a `JOB_DATA` table replacing the per-job ternaries, and the generated stakes/boulders between markers; Playwright, node and Python tests pin every number to the plan on paper.

**Tech Stack:** Python 3.13 with pymupdf, numpy, scipy (`linear_sum_assignment`), Pillow; Node + Playwright for the page; the repo's `npm test` and `npm run verify-tests`.

**Spec:** `docs/superpowers/specs/2026-10-07-baxter-bed-view-design.md`

## Global Constraints

- Working directory for every Python tool is `C:\Users\skull\OneDrive\claudes room` (the room), exactly like `tools/h2s-trunks.py`; relative paths below are from there. The app repo is `Wolf-Checklist-repo/` inside it. **Never delete anything outside the repo.**
- Source: `Trello plans 9-30/Baxter - Landscaping Bid Set.pdf`, page index 0 (sheet L1). Coordinates are the **displayed (upright) frame**: `get_drawings()` points × `page.rotation_matrix`; text and `get_pixmap` already are. +x east, +y south.
- Scale `FT = 0.7765` pt per foot (bar: 60 ft = 46.59 pt).
- Schedule (hard stop in every tool): `PG 9, BP 8, MP 8, SV 2, JH 11, IS 36, PF 55, RR 38, SB 26, VT 14` = 207; boulders drawn 10, schedule 9.
- Species names in the app are jobs.js's exact names: PG White Spruce, BP Paper Birch, MP Prairiefire Crabapple, SV Hardy Purple Common Lilac, JH Creeping Juniper, IS Alaska Flag Iris, PF Yellow Potentilla, RR Rugosa Rose, SB Birchleaf Spirea, VT Dwarf American Cranberry.
- Staked codes (get tape rows): PG BP MP SV JH PF RR SB VT and boulders. IS is a massed perennial: no rows.
- New asset folders `Wolf-Checklist-repo/beds-baxter/` and `symbols-baxter/`; new filenames only, `BED_CACHE` stays `wolf-beds-v2`; `CACHE_VERSION` v37 → v38 in the shipping commit.
- Every edit to `index.html` through the Edit tool runs the syntax hook. The Python injectors bypass it, so after each injection run `node Wolf-Checklist-repo/.claude/hooks/check-html-js.js Wolf-Checklist-repo/index.html` (silent = clean).
- Expected values in tests are worked on paper in comments. Never paste a tool's output into a test as the expectation.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Work on branch `groundwork-rename`; push only in Task 10 with `git push groundwork groundwork-rename:main`.
- One deviation from the spec, decided while planning: the sheet's per-area "req'd/shown" lines are code requirements, not guaranteed drawn counts (summed, they give 26 trees and 148 shrubs against a schedule of 27 and 144). So the **species total is the hard stop**; an area line that disagrees stops the tool unless the callouts file marks that area `"sheet_disagrees": true` with a note, in which case the disagreement is written into `BAXTER_DISCREPANCY` and shown, never fudged.

## Review Focus

1. A bed whose nearest built edge is farther than 40 ft (the McLean Pl and Baxter Rd perimeter beds if their sidewalks are not in `BAXTER-built.json`): the card must render with no "Tape it out" section, and the shipped JSON must list no such bed. Test in Task 6 (`no_edge` empty) and Task 8 (card without the section).
2. Spanish mode: a Baxter `where`, zone name or the foot note with no ES entry shows English silently. Test in Task 7 (every Baxter `where` and zone name is a key in `ES`).
3. "Save all bed maps for offline" requests `symbols-baxter/<code>.png` for all ten codes; one missing file reports a false failure to the crew. Test in Task 7 (every requested picture exists on disk).
4. `codeRow(code, "baxter")` resolving a code to the wrong jobs.js row (a spelling drift like "Prairie Fire") silently feeds the wrong "still owed" line. Test in Task 7 (all ten resolve to the exact names).
5. Staked/Planted ticks on Baxter B01 landing on Home2's bare `B01` key. Test in Task 7.

---

### Task 1: The callouts, read by eye, and the reconciliation that guards them

**Files:**
- Create: `BAXTER-callouts.json` (room)
- Create: `Wolf-Checklist-repo/tools/baxter_reconcile.py`
- Test: `Wolf-Checklist-repo/tools/test_baxter_reconcile.py`
- Reference: `L102-readings.txt` (the Home2 by-eye file), the six tiles already rendered at 600 dpi from the plan clip `(65.45, 62.18)-(719.9, 366.5)` pt; re-render with `page.get_pixmap(dpi=600, clip=pymupdf.Rect(100*792/1210, 95*792/1210, 1100*792/1210, 560*792/1210))` and cut 3x2 tiles with an 80 px overlap.

**Interfaces:**
- Produces `BAXTER-callouts.json`:
  ```json
  {"source": "Trello plans 9-30/Baxter - Landscaping Bid Set.pdf L1", "pt_per_ft": 0.7765,
   "plan": [95, 95, 715, 345],
   "pills": [{"id": 1, "stack": "D", "code": "VT", "qty": 9, "box": [x0, y0, x1, y1]}],
   "stacks": {"D": {"where": "Area D (mailboxes)", "zone": "Court", "area": "D"}},
   "areas": {"D": {"trees": 3, "shrubs": 19, "perennials": 0, "line": "AREA D: 464SF ... 3 TREES & 19 SHRUBS"},
             "W": {"trees": 5, "shrubs": 27, "perennials": 12, "line": "100 LF WEST PERIMETER ..."}},
   "buildings": {"A": [x, y], "B": [x, y], "C": [x, y]}}
  ```
  `box` is the pill's bounding box in displayed points: 600 dpi tile pixel → `pt = 65.45 + px * 72 / 600` (x), `62.18 + py * 72 / 600` (y), adding the tile's origin first. `stack` is one letter or two per leader group; `zone` is one of `West`, `Court`, `East`; `where` is one of the eight spec strings. `buildings` are the three "BLDG" label centres.
- Produces `baxter_reconcile.reconcile(pills, areas, stacks, schedule) -> list[str]` — a list of problem lines, empty when clean. `schedule` is the dict in Global Constraints.

- [ ] **Step 1: Write the failing tests** in `Wolf-Checklist-repo/tools/test_baxter_reconcile.py`

```python
import unittest
from baxter_reconcile import reconcile, SCHEDULE

# Fixture with a GAP in the ids (1, 2, 4), like the real file will have after edits.
PILLS = [{"id": 1, "stack": "C", "code": "MP", "qty": 1, "box": [0, 0, 1, 1]},
         {"id": 2, "stack": "C", "code": "SB", "qty": 3, "box": [0, 2, 1, 3]},
         {"id": 4, "stack": "C", "code": "PF", "qty": 5, "box": [0, 4, 1, 5]}]
STACKS = {"C": {"where": "Area C", "zone": "Court", "area": "C"}}
AREAS = {"C": {"trees": 1, "shrubs": 8, "perennials": 0}}
SCHED = {"MP": 1, "SB": 3, "PF": 5}

class Reconcile(unittest.TestCase):
    def test_clean_reading_has_no_problems(self):
        self.assertEqual(reconcile(PILLS, AREAS, STACKS, SCHED), [])

    def test_one_short_species_is_named(self):
        pills = [dict(p) for p in PILLS]; pills[2]["qty"] = 4          # PF 4 of 5
        out = reconcile(pills, AREAS, STACKS, SCHED)
        self.assertEqual(len(out), 1)
        self.assertIn("PF", out[0]); self.assertIn("4", out[0]); self.assertIn("5", out[0])

    def test_area_trees_mismatch_stops(self):
        areas = {"C": {"trees": 2, "shrubs": 8, "perennials": 0}}      # sheet line says 2
        out = reconcile(PILLS, areas, STACKS, SCHED)
        self.assertEqual(len(out), 1); self.assertIn("area C", out[0]); self.assertIn("trees", out[0])

    def test_marked_disagreement_passes_with_a_discrepancy(self):
        areas = {"C": {"trees": 2, "shrubs": 8, "perennials": 0, "sheet_disagrees": True, "note": "Matt 10/7"}}
        self.assertEqual(reconcile(PILLS, areas, STACKS, SCHED), [])

    def test_real_schedule_totals_207(self):
        self.assertEqual(sum(SCHEDULE.values()), 207)
```

- [ ] **Step 2: Run them to see them fail**

Run (from `Wolf-Checklist-repo`): `python -m unittest tools.test_baxter_reconcile -v`
Expected: FAIL / ImportError on `baxter_reconcile`.

- [ ] **Step 3: Implement `Wolf-Checklist-repo/tools/baxter_reconcile.py`**

`SCHEDULE` (the ten codes), `CATEGORY = {"PG": "trees", "BP": "trees", "MP": "trees", "SV": "trees", "IS": "perennials", others "shrubs"}` (SV counts as a tree on the sheet's area lines — it is the tree alternate), `reconcile(pills, areas, stacks, schedule)`: sum qty per code, one line per code whose sum differs from `schedule` ("PF: callouts 4, schedule 5"); then per area, sum trees/shrubs/perennials over pills whose stack's `area` is that key, one line per mismatch ("area C: trees 1 on the callouts, 2 on the sheet line") unless `sheet_disagrees` is true. `discrepancies(pills, areas, stacks) -> dict[str, str]` returns the marked disagreements as `{"area C": "callouts 1 tree, sheet line says 2 — Matt 10/7"}` for `BAXTER_DISCREPANCY`.

- [ ] **Step 4: Run the tests; all five pass**

- [ ] **Step 5: Read the sheet.** Re-render the tiles, read every pill into `BAXTER-callouts.json` with its box, stack, zone and where; type the eight area lines into `areas` exactly as printed; record the three BLDG label centres. Then run from the room:

```bash
python -c "import sys; sys.path.insert(0,'Wolf-Checklist-repo/tools'); import json, baxter_reconcile as r; d=json.load(open('BAXTER-callouts.json')); print('\n'.join(r.reconcile(d['pills'], d['areas'], d['stacks'], r.SCHEDULE)) or 'CLEAN')"
```

Expected: `CLEAN`. If a species is off, re-read that species' pills (use the OCR positions from the 600 dpi run as a checklist of where pills are, never as values). If an area line disagrees after a second read, stop and show Matt the tile and the numbers; record his call as `sheet_disagrees` with a dated note.

- [ ] **Step 6: Commit** the test and module in the repo (`git add tools/baxter_reconcile.py tools/test_baxter_reconcile.py`, message `Baxter: the callout reconciliation and its tests`). The JSON lives in the room, not the repo.

---

### Task 2: Symbol centres off the exploded vector

**Files:**
- Create: `tools/baxter-symbols.py` (room)
- Create: `Wolf-Checklist-repo/tools/baxter_chain.py` (the pure chaining, so it is testable under `npm test`)
- Test: `Wolf-Checklist-repo/tools/test_baxter_chain.py`
- Output: `BAXTER-symbols.json`, `plan-pages/baxter-symbol-check.png`

**Interfaces:**
- `baxter_chain.components(segments, tol=0.1) -> list[dict]` where `segments` is a list of `((x0, y0), (x1, y1))` and each component is `{"segs": n, "x0", "y0", "x1", "y1", "cx", "cy"}` (bbox and its centre), endpoints joined when equal after rounding to `tol`.
- `baxter_chain.outermost(components) -> list[dict]`: drops any component whose centre lies inside another component's bbox (interior marks of a symbol).
- Produces `BAXTER-symbols.json`: `{"pt_per_ft": 0.7765, "plants": {"PF": [[x, y], ...], ...}, "boulders": [[x, y], ...], "signatures": {"PF": {"w": 2.4, "h": 2.5, "segs": [400, 600]}, ...}}` with every list length equal to the schedule (boulders 10).

- [ ] **Step 1: Write the failing tests** in `test_baxter_chain.py`: build an exploded circle of 200 chords at radius 1.2 around (10, 10) plus a separate 4-segment cross centred at (10, 10) with half-length 0.5, plus a lone 20 pt line far away. Assert: `components()` returns 3 components; the circle's has `segs == 200`, bbox width within 0.05 of 2.4 and centre within 0.02 of (10, 10); `outermost()` returns 2 (the cross is dropped as interior, the lone line stays).

- [ ] **Step 2: Run** `python -m unittest tools.test_baxter_chain -v` → ImportError.

- [ ] **Step 3: Implement `baxter_chain.py`** — union-find over endpoint keys `(round(x/tol)*tol, round(y/tol)*tol)`, as in the 10/7 probe.

- [ ] **Step 4: Run the tests; pass.**

- [ ] **Step 5: Implement `tools/baxter-symbols.py`** (room). Reads the PDF, takes every `l` item and the end points of every `c` item inside the `plan` rect of `BAXTER-callouts.json`, transforms by `rotation_matrix`, chains with `components()`, keeps `outermost()` components with bbox 0.8–30 pt on both sides. Classification: for each code, a signature `(w, h, segs range)` measured by the tool from the **schedule block's own symbol** (the Planting Schedule table, displayed pts about `(353–713, 376–543)`; the tool prints the components found in each schedule row's symbol cell so the implementer records each code's signature in a `SIG` table at the top of the file, with the row it came from). A plan component matches a code when `|w - sig.w| <= 0.3`, same for `h`, and `segs` within the recorded range. Boulders: the 10 irregular components the Baxter boulder note already locates (bed ends; 1 west, 2 mailbox island, 2 Area A, 2 Area B, 3 Baxter Rd beds), signature likewise from the schedule's boulder cell. The legend symbols are excluded by lying inside the schedule rect, never by subtracting one. Prints `code drawn N schedule M` per code and **exits 1 unless every N equals M** (boulders 10). On a mismatch it also prints every unclassified component within 25 pt of any pill of that code (`--near x,y` lists components near a point for diagnosis). Writes the JSON and a check picture: the plan clip at 300 dpi with each classified centre dotted in a colour per code and each unclassified outer component ringed grey.

- [ ] **Step 6: Run it** from the room: `python tools/baxter-symbols.py` → every line `drawn == schedule`, exit 0. View `plan-pages/baxter-symbol-check.png` and confirm by eye that dots sit on symbols, not on text or hatch.

- [ ] **Step 7: Commit** the repo files (`tools/baxter_chain.py`, its test): `Baxter: chain exploded vector fragments into symbols`.

---

### Task 3: Beds — stacks, numbering, leaders, and which plant is in which bed

**Files:**
- Create: `tools/baxter-beds.py` (room)
- Output: `BAXTER-beds.json`, `BAXTER-trunks.json`

**Interfaces:**
- Consumes `BAXTER-callouts.json` (Task 1), `BAXTER-symbols.json` (Task 2), `baxter_reconcile` (Task 1).
- Produces `BAXTER-beds.json`: `{"source", "pt_per_ft", "plan": [x0, y0, x1, y1], "species": {code: app name}, "beds": [{"bed": "B01", "seq": 1, "zone": "Court", "where": "Area D (mailboxes)", "items": {"VT": 9, ...}, "units": 13, "box": [x0, y0, x1, y1], "cx", "cy", "tips": [[x, y], ...]}], "discrepancy": {...}}` — the WSRCC shape plus `tips`.
- Produces `BAXTER-trunks.json`: `{"pt_per_ft": 0.7765, "beds": {"B01": [{"code": "VT", "x", "y", "ft_to_leader"}]}, "no_callout": {}}` — the Home2 `H2S-trunks.json` shape, consumed by Task 6.

- [ ] **Step 1: Implement `tools/baxter-beds.py`.** One stack = one bed (stacks are hand-grouped, so no merge radius; say so in the docstring). Bed box = union of the stack's pill boxes. Numbering: sort by `(round(cy / 15), cx)` — 15 pt is about 19 ft, a judgement, in the docstring. Leader tips: components from `baxter_chain` with 1–3 segments, total length 8–150 pt, one end inside the bed box grown by 6 pt and the other end outside — the far end is a tip; a bed with no leader found uses its box centre and the tool prints that. Assignment: per staked code, `scipy.optimize.linear_sum_assignment` of plant centres to bed slots (each bed repeated `items[code]` times) by distance to the bed's nearest tip, the Home2 method; `MAX_FT = 60` from tip to plant stops the tool. Runs `reconcile()` first and exits 1 on any problem. Writes `discrepancy` from `discrepancies()`.

- [ ] **Step 2: Run** `python tools/baxter-beds.py` → prints `N beds, 207 plants`, per-code `drawn/called/farthest ft`, no PROBLEMS, exit 0.

- [ ] **Step 3: Check two beds by eye** against the tiles: the printed items of the bed at Area B must be `MP 2, SB 3, PF 3, JH 1` plus whatever else that stack carries, and the bed count per zone must match the hand file. If not, fix the reading, not the tool.

(No repo commit: the tool and JSON live in the room.)

---

### Task 4: The palette, computed

**Files:**
- Create: `tools/baxter-palette.py` (room)
- Create: `Wolf-Checklist-repo/tools/baxter_palette_rules.py` (pure scoring)
- Test: `Wolf-Checklist-repo/tools/test_baxter_palette_rules.py`
- Output: `baxter-palette.json` (room), same shape as `wsrcc-palette.json`: `{code: {"hex", "hue", "style"}}`.

**Interfaces:**
- `baxter_palette_rules.HUES = {"magenta": "#e87ba4", "green": "#008300", "orange": "#eb6834", "aqua": "#1baf7a", "blue": "#2a78d6", "yellow": "#eda100", "violet": "#4a3aa7", "red": "#e34948"}` (the eight validated slots from `wsrcc-palette.json`, unchanged).
- `baxter_palette_rules.worst_pair(assign, pairs) -> (dE_normal, dE_cvd, pair)`: `assign` is `{code: (hue, style)}`, `pairs` the co-occurring code pairs; dE is CIE76 in Lab from sRGB; CVD is the minimum over protan/deutan/tritan using the Machado 2009 severity-1.0 matrices on linear RGB; pairs that differ in style score `(100, 100)`.
- `baxter_palette_rules.cooccurrence(beds) -> set[frozenset]` from `BAXTER-beds.json` beds.

- [ ] **Step 1: Write the failing tests**: two codes in one bed with the same hue and style score below 100 and are returned as the worst pair; the same two with different styles score `(100, 100)`; `cooccurrence` of two beds `{PF, SB}` and `{SB, JH}` is exactly two pairs; `len(HUES) == 8` and every value is a 7-char hex.

- [ ] **Step 2: Run** → ImportError. **Step 3: Implement** the rules module. **Step 4: Run; pass.**

- [ ] **Step 5: Implement `tools/baxter-palette.py`**: random-restart hill climbing (1000 restarts, swaps and reassignments) over the 16 slots for the 10 codes, maximising `worst_pair` lexicographically (CVD first, then normal), prints the worst same-style pair and its two dE values, refuses to write if normal dE < 15 (the hard floor) and warns under CVD dE 8 (the target), writes `baxter-palette.json` with the method and the two numbers in a `"_method"` key.

- [ ] **Step 6: Run it**; record the printed worst-pair numbers in the tool's docstring (they are the method's evidence, like WSRCC's 16.2 / 19.6).

- [ ] **Step 7: Commit** the repo files: `Baxter: palette scoring rules and tests`.

---

### Task 5: Pictures — site map, crops, symbols

**Files:**
- Create: `tools/baxter-pictures.py` (room)
- Output: `Wolf-Checklist-repo/beds-baxter/site-map.jpg`, `beds-baxter/B01.jpg …`, `Wolf-Checklist-repo/symbols-baxter/<code>.png`, `BAXTER-map-xy.json` (room), `plan-pages/baxter-symbol-sheet.png`.

**Interfaces:**
- Consumes `BAXTER-beds.json`, `BAXTER-callouts.json` (pill boxes), `baxter-palette.json`.
- Produces `BAXTER-map-xy.json`: `{"plan": [W, H], "xy": {"B01": [cx, cy], ...}}` in site-map pixels — the geometry contract (`R = 46`, `RING = 5`, `FS = 48`, marker `LEFT = 60` px left of the stack, as in `wsrcc-pills.py`).

- [ ] **Step 1: Implement `tools/baxter-pictures.py`**, lifting `draw_pills`, `font`, the site-map and crop blocks from `tools/wsrcc-pills.py` and the tint/size block from `tools/wsrcc-symbols.py`:
  - Site map: `MAP_W = 4013` over the `plan` rect; pills drawn over every pill box from the callouts file (text `"3 PF"` — no parentheses, this sheet has none), colour and style from the palette; numbered markers; no fence, no zone bands.
  - Crops: `WIN_W = 100 * 0.7765 = 77.65`, `WIN_H = WIN_W * 1100 / 1500`, `CROP_W = 1500`, window kept inside the plan rect, pills drawn, quality 84.
  - Symbols: the ten schedule-block symbol cells (the same cells Task 2 measured; record their rects in the tool), `ZOOM 12`, ink-extent size, `EXP 0.45`, `FLOOR 50`, `CAP 88`, tinted per species, outline ring when the palette style is `outline`, contact sheet written. Perennial IS crops the hatch patch like Home2's.
  - Prints the folder size in MB (for `offlineMB`) and the two zoom hints: crops `12 / (1500 / 77.65 * 0.7765)` → `0.8`; site map `12 / (4013 / plan_width_pt * 0.7765)`, rounded to one decimal.

- [ ] **Step 2: Run it**; open the site map and three crops (one per zone) and the contact sheet; confirm every marker sits left of its stack and covers nothing, every pill is legible, the crops show the bed and its surroundings, and no notes/schedule/title block is inside the plan crop. Adjust `plan` in the callouts file if the title block shows, and re-run Tasks 3 and 5.

- [ ] **Step 3: Commit the pictures alone** in the repo: `git add beds-baxter symbols-baxter` → `Baxter pictures: site map, N bed crops, 10 symbols` (this commit must be revertible on its own).

---

### Task 6: Tape it out — built edges, stakes, boulders, injection

**Files:**
- Create: `BAXTER-built.json` (room, by hand with the tool's help)
- Create: `tools/baxter-stakes.py` (room)
- Modify: `Wolf-Checklist-repo/index.html` — add the two marker pairs next to the H2S markers (after line 4103):
  `/* BAXTER-STAKES:BEGIN (tools/baxter-stakes.py) */ … /* BAXTER-STAKES:END */` and `/* BAXTER-BOULDERS:BEGIN (tools/baxter-stakes.py) */ … /* BAXTER-BOULDERS:END */`
- Output: `BAXTER-stakes.json`, `BAXTER-boulders.json`

**Interfaces:**
- `BAXTER-built.json`: `{"edges": [{"kind": "building wall" | "curb" | "sidewalk edge", "name": "Building B, west wall", "a": [x, y], "b": [x, y]}]}` — exact endpoints copied from what the tool prints with `--near x,y` (long straight components ≥ 12 ft near a point), never typed from a ruler.
- Produces `BAXTER_STAKES` = `{"beds": {bed: {"ref", "edge", "rows": [{"code", "along", "dir", "off", "sideText"}]}}, "extra": {}, "held": {}, "no_edge": [], "foot": {"en": "...", "es": "..."}}` and `BAXTER_BOULDERS` = `{"beds": {bed: [rows with code "BLDR"]}, "own": {bed: {"ref", "edge", "rows"}}}` — the Home2 shapes plus `no_edge` and `foot`.

- [ ] **Step 1: Add the four marker lines** to index.html with the Edit tool, each pair holding `var BAXTER_STAKES = null;` / `var BAXTER_BOULDERS = null;` as placeholders. Hook stays silent.

- [ ] **Step 2: Implement `tools/baxter-stakes.py`** from `tools/h2s-stakes.py` (`compass`, `side_of`, `fit`, the zero-corner choice, `ref` wording) and the boulder block of `tools/h2s-boulders.py` (`NEAR_FT = 15`, bed zero when near a staked plant, own edge otherwise), with: `FT = 0.7765`, `MIN_EDGE_FT = 12`, `MAX_OFF_FT = 40`, `OVERHANG_FT = 20`, `PREFER = {"building wall": 0, "sidewalk edge": 1, "curb": 2}`; edges from `BAXTER-built.json`; plants from `BAXTER-trunks.json`; boulders from `BAXTER-symbols.json`; boulder rows carry `"code": "BLDR"`. A bed with no fitting edge goes into `no_edge` and the tool prints it and **exits 1**. `foot.en` = `Zeros assume the buildings and the Erna Court curbs are in. Check on site before taping.`; `foot.es` = `Los ceros suponen que los edificios y los bordillos de Erna Court ya están. Revisa en el sitio antes de medir con la cinta.` Injects both blobs between their markers exactly as `h2s-stakes.py` does (`newline="\n"`).

- [ ] **Step 3: Build `BAXTER-built.json`**: run `python tools/baxter-stakes.py --near <x,y>` at each building label centre and along Erna Court to list candidate edges; record the three buildings' walls (every straight run ≥ 12 ft of each outline) and the Erna Court and mailbox-island curbs. If a perimeter bed ends up in `no_edge`, add the street sidewalk edge beside it (McLean Pl, Baxter Rd) — those are built roads — and say so in the file's `"note"`.

- [ ] **Step 4: Run** `python tools/baxter-stakes.py` → one line per bed with plant count, max along, max off; `no_edge: []`; boulders `placed 10`; exit 0. Then `node Wolf-Checklist-repo/.claude/hooks/check-html-js.js Wolf-Checklist-repo/index.html` → silent.

- [ ] **Step 5: Work one row on paper** and keep it for Task 8: pick the Area B bed; from `BAXTER-trunks.json` take one MP's `(x, y)`, from `BAXTER-built.json` the edge it zeroes on; compute along = projection / 0.7765, off = perpendicular / 0.7765, to the inch, and the side word from the edge-to-plant vector (`+y` is south). Write the arithmetic down.

- [ ] **Step 6: Commit** index.html (markers + injected data): `Baxter: tape-out distances and boulder rows, generated`.

---

### Task 7: The job block, the JOB_DATA table, and the bed view on the page

**Files:**
- Modify: `Wolf-Checklist-repo/index.html`
  - after the WSRCC data block (line ~1345): `BAXTER_BEDS`, `BAXTER_SPECIES`, `BAXTER_SPACING = {}`, `BAXTER_ZONES`, `BAXTER_MAP_PLAN`, `BAXTER_MAP_XY`, `BAXTER_DISCREPANCY` — pasted from `BAXTER-beds.json` / `BAXTER-map-xy.json` by a small `tools/baxter-inject-beds.py` between `/* BAXTER-BEDS:BEGIN */ … END */` markers, same injector pattern
  - `CATEGORY` (line 2462): add `PG: "trees", MP: "trees", PF: "shrubs", RR: "shrubs", VT: "shrubs"`
  - `stakeTableHTML` (2562–2615): `ROCK` gains `"BLDR": "Boulder"`; after the `held` line, `var foot = BED_STAKES && BED_STAKES.foot ? '<div class="tape-foot tape-zeros">' + (lang === "es" ? BED_STAKES.foot.es : BED_STAKES.foot.en) + "</div>" : "";` appended before the closing foot
  - `var BAXTER = {...}` beside `WSRCC` (line ~4129), then `var JOB_DATA = {h2s: H2S, wsrcc: WSRCC, baxter: BAXTER};` and `var JOB_ALIAS = {h2s: H2S_SPECIES_ALIAS, wsrcc: WSRCC_SPECIES_ALIAS, baxter: BAXTER_SPECIES_ALIAS};` below both
  - `applyJobData` (4145): `var d = JOB_DATA[currentJob];` and `SPECIES_ALIAS = JOB_ALIAS[currentJob];`
  - `codeRow` (3141, 3143): `JOB_DATA[forJob]`, `JOB_ALIAS[forJob]`
  - `hasBedView` (4163): `return !!JOB_DATA[job];`
  - `inchesPerPixel` (2933): each config carries `zoom: {map, crop}` — H2S `{map: "1.6", crop: "1.6"}`, WSRCC `{map: "1.7", crop: "0.8"}`, BAXTER `{map: <Task 5's number>, crop: "0.8"}` with the arithmetic in a comment; the function reads `JOB_DATA[currentJob].zoom`
  - `BAXTER_SPECIES_ALIAS = {}` beside the other two, with the comment from the spec
  - `ES` table (3736–3765): the eight `where` strings, the three zone names and short keys, and the zone note already present
- Test: `Wolf-Checklist-repo/tests/baxter-beds.spec.js`

**Interfaces:**
- `BAXTER` config: `{beds: BAXTER_BEDS, species: BAXTER_SPECIES, spacing: {}, zones: BAXTER_ZONES, disc: BAXTER_DISCREPANCY, mapPlan: BAXTER_MAP_PLAN, mapXY: BAXTER_MAP_XY, bedImg: "./beds-baxter/", symImg: "./symbols-baxter/", offlineMB: <Task 5's MB, rounded up>, links: {}, noSym: [], runs: [], stakes: BAXTER_STAKES, boulders: BAXTER_BOULDERS, zoom: {...}}`.
- `BAXTER_ZONES = {West: {name: "West - McLean Pl frontage", crew: "", order: 1, note: <the WSRCC note>}, Court: {name: "Court - Erna Court and Areas A-D", crew: "", order: 2, note}, East: {name: "East - Baxter Rd frontage", crew: "", order: 3, note}}`.

- [ ] **Step 1: Write the failing tests** in `tests/baxter-beds.spec.js` (`loadApp`, `openJob(page, 'baxter')`, then `view = 'zones'; renderAll();`):
  - `Baxter cards sum to the schedule`: sum `BEDS[].items` per code equals `{PG: 9, BP: 8, MP: 8, SV: 2, JH: 11, IS: 36, PF: 55, RR: 38, SB: 26, VT: 14}` and `BEDS.length === Object.keys(MAP_XY).length`.
  - `every Baxter picture the app asks for is on disk`: `BED_IMG === './beds-baxter/'` and `SYM_IMG === './symbols-baxter/'`; then the `run-pictures.spec.js` list plus `SYM_IMG + code + '.png'` for every `SPECIES` key, all exist under the repo.
  - `all ten codes resolve to their checklist rows`: `codeRow(code, 'baxter')[0]` equals the exact name per code (the Global Constraints list).
  - `switching jobs renders each job's own beds`: baxter → h2s → wsrcc → baxter; after each, `BEDS.length` is `[N, 44, 47, N]` and `BEDS[0].where` is `['<Baxter B01 where>', 'North side', 'North side', '<Baxter B01 where>']` (N and the where from the shipped JSON, written into the test by hand).
  - `Staked on Baxter B01 writes the prefixed key`: click `#bed-B01` Staked; `staked['baxter:B01'] === true` and `staked['B01'] === undefined`.
  - `the zeros note is on a Baxter card and not on a WSRCC card`: `#bed-B01 .tape-zeros` `toBeVisible()` with the English text; after `openJob(page, 'wsrcc')` + render, `.tape-zeros` `toHaveCount(0)`.
  - `every Baxter place and zone name has Spanish`: for each `BEDS[].where` and each `ZONES[].name`, `ES[key]` is a non-empty string.

- [ ] **Step 2: Run** `npx playwright test tests/baxter-beds.spec.js` → fails (no Baxter bed view).

- [ ] **Step 3: Make the edits** listed under Files, in that order, with the Edit tool; run the bed injector; hook silent after each.

- [ ] **Step 4: Run** the new spec → all pass. Then `npx playwright test` → 181 + 7 pass; `npm run test:logic` 42 pass.

- [ ] **Step 5: Commit** `Baxter bed view: JOB_DATA table, the job block, Spanish, tests`.

---

### Task 8: Tape tests and the mutation guards

**Files:**
- Test: `Wolf-Checklist-repo/tests/baxter-tape.spec.js`
- Modify: `Wolf-Checklist-repo/tests/mutation-check.js` (three entries, `tag: 'baxter'`)

- [ ] **Step 1: Write the failing tests** (`openJob(page, 'baxter')`):
  - `every tree, shrub and boulder on a Baxter card has exactly one tape row`: the `stakes.spec.js` pattern over `STAKED = ['PG','BP','MP','SV','JH','PF','RR','SB','VT']` against `BED_STAKES.beds`, and boulders: rows with code `BLDR` across `BED_BOULDERS.beds` and `.own` total 10.
  - `no tape row names a code its card lacks`.
  - `the Area B crabapple is where the plan puts it`: the Task 6 Step 5 row — `feetIn(along)` text, `dir`, and `sideText` on `#bed-<that bed> .tape-row` — with the paper arithmetic in the comment.
  - `a bed with no built edge shows no tape section`: `BED_STAKES.no_edge` is `[]`, and for a bed id absent from `BED_STAKES.beds` (set one up by deleting it in `page.evaluate` before render) the card has no `.sub-head` reading "Tape it out".
  - `the tape table is on the card`: `#bed-B01 .tape-row` count equals the JSON's row count for B01.

- [ ] **Step 2: Run** → fail where the feature is absent; pass otherwise is expected for some — **confirm each test fails under the matching mutation in Step 4, not just passes now**.

- [ ] **Step 3: Add three mutations** to `MUTATIONS`:
  - `never hand the Baxter job its tape table`: find `stakes: BAXTER_STAKES,` → `stakes: null,`, caughtBy `exactly one tape row`.
  - `swap two Baxter counts in one bed`: find the shipped `"PF":3,"SB":3` substring of B-Area-B in `BAXTER_BEDS` → swap to `"PF":2,"SB":4`, caughtBy `sum to the schedule`.
  - `point Baxter at WSRCC's data`: find `baxter: BAXTER}` → `baxter: WSRCC}`, caughtBy `each job's own beds`.

- [ ] **Step 4: Run** `MUTATE_ONLY=baxter npm run verify-tests` → 3 caught, 0 SKIPPED. Then `MUTATE_ONLY=stakes` and `MUTATE_ONLY=zoom` → all caught (the `inchesPerPixel` rewrite in Task 7 may have moved the zoom mutation's `find` string; update it rather than leaving it SKIPPED).

- [ ] **Step 5: Commit** `Baxter tape tests and mutation guards`.

---

### Task 9: The service worker

**Files:**
- Modify: `Wolf-Checklist-repo/sw.js` — inside the PURE sentinels add `const JOB_ASSET_RE = /\/(beds|symbols)(-[a-z0-9]+)?\//;` and use it at line 274; `CACHE_VERSION = 'v38'`; cache count comment gains `// Baxter: N pictures + site map + 10 symbols = M.` and the total.
- Test: `Wolf-Checklist-repo/tests/sw-folders.test.js`

- [ ] **Step 1: Write the failing test** (node:test, `loadPure()` copied from `cache-ownership.test.js` with `exports.JOB_ASSET_RE = JOB_ASSET_RE;`): matches `/Groundwork/beds-baxter/B01.jpg`, `/Groundwork/symbols-baxter/PF.png`, `/Groundwork/beds/B01.jpg`, `/Groundwork/beds-wsrcc/v3/site-map.jpg`; does not match `/Groundwork/jobs.js` or `/Groundwork/beds-boulders.txt`.
- [ ] **Step 2: Run** `node --test tests/sw-folders.test.js` → fails (no export). **Step 3: Edit sw.js.** **Step 4: Run** → pass; `node --test "tests/*.test.js"` → 42 + the new count.
- [ ] **Step 5: Commit** `sw: Baxter asset folders, shell v38`.

---

### Task 10: Full run, ship, and the records

- [ ] **Step 1:** `npm test` in the repo → Python 22 + new, node 42 + new, Playwright 181 + 12, all green. `npm run verify-tests` → no SKIPPED. Record the three totals.
- [ ] **Step 2:** `git log --oneline groundwork/main..groundwork-rename` lists the Baxter commits and nothing unexpected; `git push groundwork groundwork-rename:main`.
- [ ] **Step 3:** With `gh`, wait for the Pages build, then fetch `https://titanalaska.github.io/Groundwork/sw.js` (contains `v38`), `beds-baxter/site-map.jpg`, `beds-baxter/B01.jpg`, `symbols-baxter/PF.png` → all 200.
- [ ] **Step 4:** Update the CLAUDE.md test table for Groundwork with the recorded totals and the Baxter line; update memory (`project_h2s_tape_out_and_trello_plans.md` or a new `project_baxter_bed_view.md`): shipped commit, cache v38, the zeros note, what Matt still has to confirm on site.
- [ ] **Step 5:** Tell Matt: live URL, the bed count, that the zeros note is up until he clears it, and where the check pictures are.
