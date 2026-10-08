# Baxter Signed-Off Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revise Groundwork's Baxter job in place to the signed-off revised plan: five beds (West and NE deducted), three swapped species, Areas C/D/SE read off a photo, four fence runs, with no saved count lost.

**Architecture:** The revised L1 exists only as a phone photo, so counts are read by eye into `BAXTER-rev-callouts.json` and gated by the existing reconcile module against the revised schedule. Pure logic (rename, carry-over, order, fence length) lives in small tested modules under `Wolf-Checklist-repo/tools/`; room-side scripts do the file work and inject generated data between markers in `index.html` and into `jobs.js`. Areas A and B carry their vector-derived tape-out over; SE, C and D show callouts in order instead.

**Tech Stack:** Python 3.13 (pymupdf, Pillow, numpy), Node + Playwright, the repo's `npm test` / `npm run verify-tests`, `check-job.js` from the job-intake skill.

**Spec:** `docs/superpowers/specs/2026-10-07-baxter-revision-design.md` (read it first; this plan only decides what the spec leaves open).

## Global Constraints

- Room = `C:\Users\skull\OneDrive\claudes room`; app repo = `Wolf-Checklist-repo/` inside it. Python tools run from the room. **Never delete anything outside the repo.** Git Bash `/c/...` paths must never reach Node (they land in `C:\c\`); use Windows paths for Node.
- Branch `groundwork-rename`. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Push only in Task 10, with `git push groundwork groundwork-rename:main`. **Never** `git push groundwork main`; never merge into `origin/main`.
- Sources, all in `Baxter CO from phone 10-7/` (photos, not vector, 2573 px wide): `output-C47C6178-289F-4CF6-A755-8DAC04C55BB5.jpeg` = revised L1; `output-D96F11DF-6D1E-42FD-8153-7EC4DD76092E.jpeg` = original L1. Vector geometry for everything the revision did not move: `Trello plans 9-30/Baxter - Landscaping Bid Set.pdf`, scale `FT = 0.7765` pt/ft.
- Revised schedule (201): `PG 7, BP 9, MS 8, SV 2, JH 10, LN 36, PF 53, PO 44, SB 22, VT 10`. Renames: `MP→MS`, `IS→LN`, `RR→PO`. Deducted beds: B01 West bed (44 plants), B02 Northeast bed (50). Kept ids: **B03 Area A, B04 Area D, B05 Area B, B06 Area C, B07 Southeast bed. No bed is renumbered.**
- Saved counts are keyed `baxter:<slug(name)>`. Live state 10/7: prairiefire-crabapple 8, rugosa-rose 38, alaska-flag-iris 36, white-spruce 9, yellow-potentilla 17, birchleaf-spirea 26, creeping-juniper 11, dwarf-american-cranberry 14, hardy-purple-common-lilac 2, paper-birch 0, class-3-boulder 0; no Baxter Staked/Planted keys. **No existing Baxter row is deleted or renamed.** The three swapped species move to their own group at quantity 0.
- Judgment values ship empty: the three new species get no stock note and no count.
- New plant names: `Spring Snow Crabapple`, `Alaska Nootka Lupine`, `Center Glow Ninebark` — final spelling is whatever `check-job.js` accepts (look-alike names block).
- Expected values in tests are worked out on paper in comments. Never paste a tool's output as the expectation. A test is not evidence until seen to fail.
- Changed pictures get NEW filenames (suffix `-r`) so `BED_CACHE` (`wolf-beds-v2`) does not bump; `CACHE_VERSION` v38 → v39 in the shipping commit. Never rename `wolf-*` keys; never touch `DOC_PATH`.
- Every `Edit` to `index.html` runs the syntax hook; Python injectors bypass it, so after each injection run `node .claude/hooks/check-html-js.js index.html` from the repo (silent = clean).
- Never invent a position: beds without a vector-derived tape table show callout order and say so.

## Review Focus

1. Old Baxter rows hidden or renamed, orphaning saved counts (8 / 38 / 36 and the rest) — Task 7 pins every old key's count unchanged and the rows visible as OVER.
2. A quantity-0 row dividing by zero or printing NaN/Infinity in the card, report, outstanding or status page — Task 7.
3. "Go to bed": typing 7 must jump to B07, typing 1 or 2 must say "No bed 1", and the box's max follows the highest bed number — Task 8.
4. The new blocks (callout order, deducted footnote, fences) in Spanish mode and on Home2/WSRCC, where they must be absent — Task 8.
5. A fourth species group ("original order") being dropped or mis-coloured by `CATEGORY`, chips, the report or `status.html` — Task 7.

---

### Task 1: Land the spec amendment, this plan, and a green baseline

**Files:**
- Modify (already edited, uncommitted): `docs/superpowers/specs/2026-10-07-baxter-revision-design.md`
- Create (this file): `docs/superpowers/plans/2026-10-07-baxter-revision.md`
- Create (room): `BAXTER-live-state-2026-10-07.json`

- [ ] **Step 1:** Copy the 10/7 live-state read into the room as `BAXTER-live-state-2026-10-07.json` (it is in the session scratchpad as `live-state.json`; re-fetch with `GET <SYNC_URL>?action=get` if missing). It stays in the room, never the repo.
- [ ] **Step 2:** Re-fetch the live state now and compare: every `baxter:*` count must equal the Global Constraints list or be higher. If any Baxter Staked/Planted key now exists, stop and tell Matt before touching bed data.
- [ ] **Step 3:** From the repo run `npm test`. Record the three totals (expected 40 Python, 44 node, 200 Playwright) in the task notes. Anything red now is stopped and shown, not worked around.
- [ ] **Step 4: Commit** the spec amendment and this plan: `git add docs/superpowers && git commit` → `Plan and spec amendment: Baxter revision keeps every saved count`.

---

### Task 2: The reconcile module learns the revised schedule

**Files:**
- Modify: `tools/baxter_reconcile.py`
- Test: `tools/test_baxter_reconcile.py`

**Interfaces:**
- Produces `REVISED_SCHEDULE: dict[str, int]` (Global Constraints), `RENAME = {"MP": "MS", "IS": "LN", "RR": "PO"}`, `CATEGORY` gains `MS: "trees"`, `LN: "perennials"`, `PO: "shrubs"`.
- Produces `rename_items(items: dict[str, int]) -> dict[str, int]` (applies `RENAME`, leaves other codes).
- Produces `carried_over(original: dict[str, int], revised: dict[str, int]) -> bool` — true iff `rename_items(original) == revised`.
- Produces `callout_order(pills: list[dict], stack: str) -> list[dict]` — the stack's pills as `[{"qty", "code"}]` sorted by `px[1]` (y) then `px[0]` (x), top to bottom.
- Existing `reconcile(pills, areas, stacks, schedule, species=None)` and `discrepancies(...)` are unchanged.

- [ ] **Step 1: Write the failing tests** (new `unittest.TestCase`s, expected values on paper):
  - `test_revised_schedule_totals_201`: `sum(REVISED_SCHEDULE.values()) == 201` (7+9+8+2+10+36+53+44+22+10).
  - `test_rename_items`: `{"MP": 2, "RR": 10, "IS": 12, "PF": 3}` → `{"MS": 2, "PO": 10, "LN": 12, "PF": 3}`.
  - `test_area_a_carries_over`: original `{"JH": 2, "MP": 2, "PF": 3, "SB": 7, "VT": 3}` vs revised `{"JH": 2, "MS": 2, "PF": 3, "SB": 7, "VT": 3}` is true.
  - `test_one_count_differs_does_not_carry_over`: same revised with `"PF": 4` is false.
  - `test_callout_order_is_top_to_bottom`: pills `(px y=540 "9 LN")`, `(y=500 "3 PF")`, `(y=520 "1 MS")` of one stack return codes `["PF", "MS", "LN"]`; two pills with equal y order by x. Pills of another stack are ignored.
  - `test_ms_ln_po_have_categories`: `CATEGORY["MS"] == "trees"`, `["LN"] == "perennials"`, `["PO"] == "shrubs"`.
- [ ] **Step 2:** Run `python -m unittest tools.test_baxter_reconcile -v` from the repo → the new tests fail (ImportError/KeyError).
- [ ] **Step 3: Implement** the names above in `baxter_reconcile.py`; keep `SCHEDULE` (207) untouched, the original tests must still pass.
- [ ] **Step 4:** Run the module's tests → all pass.
- [ ] **Step 5: Commit** `Baxter: revised schedule, renames, carry-over rule, callout order`.

---

### Task 3: Read the revised sheet by eye

**Files:**
- Create (room): `tools/baxter-rev-crops.py`, `BAXTER-rev-callouts.json`
- Output: contact sheets in `plan-pages/baxter-rev-*.png`

**Interfaces:**
- `tools/baxter-rev-crops.py <photo> <outdir> --region NAME` cuts enlarged (2x) labelled crops of the revised photo for regions `W, NE, SE, AB, CD, SCHED` (the pixel boxes used in the planning session: displayed-frame coordinates times 1.29), so a read can be repeated at two zooms.
- `BAXTER-rev-callouts.json`: `{"source": "...", "photo": "<revised photo path>", "pills": [{"id", "stack", "code", "qty", "px": [x, y]}], "stacks": {"A": {"bed": "B03", "where": "Area A (fire hydrant)", "zone": "Court", "area": "A"}, "B": {"bed": "B05", ...}, "C": {"bed": "B06", ...}, "D": {"bed": "B04", ...}, "SE": {"bed": "B07", "where": "Southeast bed (Baxter Rd)", "zone": "East"}, "W": {"bed": null, "deducted": "B01"}, "NE": {"bed": null, "deducted": "B02"}}, "areas": {"A": {"trees": 2, "shrubs": 15, "perennials": 0}, "B": {"trees": 2, "shrubs": 11, "perennials": 0}, "C": {"trees": 1, "shrubs": 4, "perennials": 9}, "D": {"trees": 4, "shrubs": 26, "perennials": 0}}, "species": {"<code>": {"sheet_disagrees": true, "note": "..."}}, "crops": {"B04": [x0, y0, x1, y1], "B06": [...], "B07": [...]}}` — `px` in photo pixels; `crops` are the photo rectangles used for the SE, C and D pictures.

- [ ] **Step 1:** Implement `baxter-rev-crops.py` (PIL; the two scratchpad scripts `crop-revised.py` / `crop-one.py` from the planning session are the starting point).
- [ ] **Step 2: Read.** For each stack read every pill at two zooms (the printed `LN`/`PO`/`MS` codes, quantities and leader order). Type them into the JSON. The first-look figures in the spec are reading targets, never values.
- [ ] **Step 3: Calibrate the reading.** Verify on paper that the W and NE stacks reproduce the shipped beds after renaming — W = `{BP 2, LN 12, JH 1, PF 16, PG 2, PO 10, SV 1}` (44), NE = `{BP 3, LN 12, JH 3, PF 14, PG 2, PO 15, SV 1}` (50) — and that stacks A and B satisfy `carried_over` against shipped B03 `{JH 2, MP 2, PF 3, SB 7, VT 3}` and B05 `{JH 1, MP 2, PF 1, SB 8, VT 1}`. If either calibration fails, the reading method is wrong: re-read before reading C, D, SE.
- [ ] **Step 4: Reconcile.** From the room:
  `python -c "import sys; sys.path.insert(0,'Wolf-Checklist-repo/tools'); import json, baxter_reconcile as r; d=json.load(open('BAXTER-rev-callouts.json')); print('\n'.join(r.reconcile(d['pills'], d['areas'], d['stacks'], r.REVISED_SCHEDULE, d.get('species'))) or 'CLEAN')"`
  Expected: `CLEAN`. A species or area that still disagrees after a second read at higher zoom is NOT fudged: show Matt the crop and the numbers (one question, tappable), then record it as `sheet_disagrees` with a dated note — it becomes a discrepancy for Chris.
- [ ] **Step 5:** No repo commit (the JSON lives in the room).

---

### Task 4: Compose the revised beds, carried tape-out and boulders

**Files:**
- Create: `tools/baxter_rev.py` (pure, in the repo), `tools/test_baxter_rev.py`
- Create (room): `tools/baxter-rev-build.py`
- Output (room): `BAXTER-rev-beds.json`, `BAXTER-rev-stakes.json`, `BAXTER-rev-boulders.json`, `BAXTER-rev-order.json`

**Interfaces (pure, `baxter_rev.py`):**
- `build_beds(callouts: dict, original_beds: list[dict]) -> list[dict]` — five bed records `{"bed", "seq", "zone", "where", "units", "items"}` for `B03..B07`, items renamed/read from the callouts file (A and B from the originals via `rename_items`; C, D, SE from the pills of their stacks); `seq` = the original `seq` so ordering is stable.
- `carry_stakes(stakes: dict, keep: list[str]) -> dict` — the original `BAXTER_STAKES` filtered to beds in `keep` with row codes renamed; `foot`, `held`, `no_edge`, `extra` for kept beds only.
- `own_boulders(boulders: dict, stakes_kept: dict, original_stakes: dict) -> dict` — for every kept bed that has boulder rows but no stake table, move them to `own[bed] = {"ref", "edge", "rows"}` using the original bed's zero `ref`/`edge`, so each prints its own zero.
- `deducted(original_beds, boulders) -> list[dict]` — `[{"bed": "B01", "where": ..., "plants": 44, "boulders": 1}, {"bed": "B02", ..., "plants": 50, "boulders": 2}]`.

- [ ] **Step 1: Write the failing tests** (`unittest`, hand-built fixtures with an id gap, not 1-2-3):
  - `test_five_beds_keep_original_ids`: result ids `["B03","B04","B05","B06","B07"]`, never `B01`..`B05`.
  - `test_area_a_items_are_original_renamed`: B03 `{JH 2, MS 2, PF 3, SB 7, VT 3}`, units 17.
  - `test_carry_stakes_keeps_only_a_and_b_and_renames_codes`: rows for B03/B05 only; no `MP` code survives, `MS` present; `foot` retained.
  - `test_boulders_of_a_bed_without_plant_table_move_to_own`: fixture bed with 2 boulder rows and no stake table ends in `own` with the old `ref` and `edge`, `beds` no longer lists it.
  - `test_deducted_counts`: B01 44 plants / 1 boulder, B02 50 / 2 (shipped: B01 boulder 1, B02 boulders 2).
- [ ] **Step 2:** Run → fail. **Step 3:** Implement `baxter_rev.py`; run → pass.
- [ ] **Step 4: Write `baxter-rev-build.py`** (room): reads `BAXTER-beds.json`, `BAXTER-stakes.json`, `BAXTER-boulders.json`, `BAXTER-rev-callouts.json`; writes the four output files; `BAXTER-rev-order.json` is `{bed: [{"qty", "code"}]}` from `callout_order` for B04, B06, B07 only (A and B have tape tables); also writes the species map (revised codes only, no SV, no MP/IS/RR), the discrepancy table from `discrepancies(...)`, and prints per-species `cards / schedule` and the plant total.
- [ ] **Step 5:** Run it → exit 0, five beds, the total printed; check by hand that the cards sum per species equals the reading you typed in Task 3.
- [ ] **Step 6: Commit** `tools/baxter_rev.py tools/test_baxter_rev.py` → `Baxter revision: compose beds, carry tape-out, move boulders`.

---

### Task 5: Fences

**Files:**
- Create: `tools/baxter_fence.py`, `tools/test_baxter_fence.py`
- Create (room): `tools/baxter-rev-fences.py` → `BAXTER-rev-fences.json`

**Interfaces:**
- `baxter_fence.run_feet(points: list[tuple[float, float]], ft: float = 0.7765) -> float` — polyline length in feet.
- `BAXTER-rev-fences.json`: `{"runs": [{"id": "green", "kind": "6' cedar good-neighbor", "height_ft": 6, "lf": 0.0, "pts": [[x, y], ...], "note": "..."}, {"id": "yellow", "kind": "6' vinyl-coated (black) chain link, top rail", ...}, {"id": "blue", "kind": "4' vinyl-coated (black) chain link, top rail", ...}, {"id": "magenta", "kind": "3' vinyl-coated (black) chain link, top rail", ...}], "deducted": [{"id": "north", "kind": "6' cedar screen fence, north property line"}], "notes": ["...Note 12: continuous 6' dog-ear cedar, 4' within the 10' setbacks at Baxter Rd and McLean Pl; shop drawings, 4' minimum footing..."]}`.

- [ ] **Step 1: Write the failing test** `test_run_feet_three_four_five`: points `(0,0)`, `(30*0.7765, 0)`, `(30*0.7765, 40*0.7765)` give `70.0` within 0.01 (30 ft + 40 ft); a single point gives 0.0.
- [ ] **Step 2:** Run → fail. **Step 3:** Implement `run_feet`. **Step 4:** Run → pass.
- [ ] **Step 5: Write `baxter-rev-fences.py`.** Run endpoints come from the ORIGINAL vector sheet: `--near x,y` prints the property-line / building-outline / curb vertices near a point (as `baxter-stakes.py --near` does); choose each run's vertices from those prints at the places Chris's lines end in the photo (green: McLean Pl end of the Tract A/B line → east along it to the west side of Bldg C → south to the south property line; yellow: the south property line; blue: the SE bed's west edge; magenta: the short segment at the east end of the Area B bed by the light pole). Print every run's endpoints and `lf`, labelled "measured off the sheet".
- [ ] **Step 6:** Sanity-check the yellow run on paper against the south property line's two corners (printed by the tool); the lengths are for Matt to confirm, so show him the four numbers in the final report.
- [ ] **Step 7: Commit** `tools/baxter_fence.py tools/test_baxter_fence.py` → `Baxter revision: fence run lengths`. (The fences' data and display ship in their own commit in Task 8.)

---

### Task 6: Pictures

**Files:**
- Create (room): `tools/baxter-rev-pictures.py`
- Output: `Wolf-Checklist-repo/beds-baxter/site-map-r.jpg`, `B03-r.jpg`, `B04-r.jpg`, `B05-r.jpg`, `B06-r.jpg`, `B07-r.jpg`; `Wolf-Checklist-repo/symbols-baxter/{MS,LN,PO}.png`; `BAXTER-rev-map-xy.json` (room); `baxter-palette.json` re-run
- Remove (same commit): `beds-baxter/site-map.jpg`, `B01..B07.jpg`; `symbols-baxter/{MP,IS,RR,SV}.png`

**Interfaces:**
- `BAXTER-rev-map-xy.json`: `{"plan": [W, H], "xy": {"B03": [cx, cy], ..., "B07": [cx, cy]}}` — the original geometry contract (`R = 46`, `RING = 5`, `FS = 48`, marker `LEFT = 60` px left of the stack), five keys.

- [ ] **Step 1: Implement `baxter-rev-pictures.py`**, lifting `draw_pills`, `font`, the site-map/crop blocks and the symbol tint block from `tools/baxter-pictures.py`:
  - Site map `site-map-r.jpg`: the vector render at `MAP_W = 4013`; pills only for stacks A and B (text `"2 MS"`); a grey "DEDUCTED" wash over the union of the W and NE stacks' ORIGINAL pill boxes' bed areas; a pale "REVISED — see the card" wash over the original pill boxes of C, D and SE; numbered markers for B03–B07.
  - Crops `B03-r`, `B05-r`: 1500x1100 vector crops as before, pills with MS. Crops `B04-r`, `B06-r`, `B07-r`: the photo rectangles from `crops`, resized to 1500 px wide, no pills, a small caption strip "from a photo of the revised sheet".
  - Symbols: MS, LN, PO cut from the revised photo's schedule block; where the new symbol is the same drawing as the old code's (MS≈MP, LN≈IS), reuse the vector-cut picture and print which; palette re-scored for the nine codes `PG BP MS JH LN PF PO SB VT` on the five beds' co-occurrence (`baxter_palette_rules`), hard floor normal dE ≥ 15.
  - Prints the folder size in MB (for `offlineMB`) and the two zoom hints (same arithmetic as the original comment).
- [ ] **Step 2:** Run it. Open the site map, `B03-r`, `B07-r` and the symbol contact sheet; confirm: no pill on a deducted bed, nothing legible and stale at C/D/SE, markers left of their stacks, MS/LN/PO symbols visible. Fix and re-run.
- [ ] **Step 3: Commit the pictures alone** (`git add -A beds-baxter symbols-baxter`) → `Baxter revision pictures: site map, 5 crops, 3 symbols` — revertible on its own.

---

### Task 7: The job's rows and the data in the page

**Files:**
- Create (room): `tools/baxter-rev-inject.py`
- Modify: `jobs.js` (Baxter block), `index.html` (data between markers; `ES`), `species-alias-table.json` (room), regenerated vendors file
- Test: `tests/baxter-rev.spec.js` (new)

**Interfaces:**
- `baxter-rev-inject.py` rewrites: `BAXTER-BEDS` markers (`BAXTER_BEDS`, `BAXTER_SPECIES`, `BAXTER_DISCREPANCY`, `BAXTER_MAP_PLAN`, `BAXTER_MAP_XY`) and `BAXTER-STAKES`/`BAXTER-BOULDERS` markers from the `BAXTER-rev-*.json` files, and adds a new pair `/* BAXTER-REV:BEGIN (tools/baxter-rev-inject.py) */ … /* BAXTER-REV:END */` holding `BAXTER_ORDER = {bed: [{qty, code}]}`, `BAXTER_DEDUCTED = [{bed, where, plants, boulders}]`, `BAXTER_FENCES = {runs, deducted, notes}` (fences only once Task 8 asks for them). Writes with `newline="\n"`.
- `jobs.js` Baxter groups after this task: `trees` (Paper Birch, Spring Snow Crabapple, White Spruce, Hardy Purple Common Lilac alternate flag kept), `shrubs` (Yellow Potentilla, Birchleaf Spirea, Creeping Juniper, Dwarf American Cranberry, Center Glow Ninebark), `grasses` relabelled for lupine (Alaska Nootka Lupine), and a fourth group `original` labelled "From the original order — not on the revised plan" holding `["Prairiefire Crabapple", 0]`, `["Alaska Flag Iris", 0]`, `["Rugosa Rose", 0]`. Quantities = card sums from `BAXTER-rev-beds.json`, with the total worked out in a comment; existing rows keep their names. Flags: first flag names the source ("Revised L1, Plan Set 11465, signed off 10/7/26; counts read off a photo of the revised sheet"), then the two original stock notes, each led by "Bought for the ORIGINAL plan:"; `flagsEs` same count, same order.

- [ ] **Step 1: Write the failing tests** in `tests/baxter-rev.spec.js` (`loadApp`, `openJob(page, 'baxter')`, `view = 'zones'; renderAll();`):
  - `Baxter shows five beds with their original ids`: `BEDS.map(b => b.bed)` equals `['B03','B04','B05','B06','B07']` and `Object.keys(MAP_XY)` the same.
  - `cards sum per species to the revised reading`: per-code sums equal the table recorded from `BAXTER-rev-beds.json` (work each code out on paper in the comment from Task 3's readings), and every discrepancy species is named in `DISCREPANCY`.
  - `no saved Baxter count is orphaned`: seed `counts` with the eleven live keys (values from Global Constraints), render, assert each key unchanged and the Prairiefire, Flag Iris and Rugosa rows visible with an OVER state (`.item.over`) and text containing their counts (8, 36, 38).
  - `a quantity-0 row never prints NaN or Infinity`: the three rows' text and the job report text (`generateReport()` result) contain neither.
  - `the three new species resolve and start empty`: `codeRow('MS','baxter')`, `('LN',...)`, `('PO',...)` return the exact new names; their counts are 0.
  - `every Baxter row name is a key the Spanish table can translate or is intentionally English`: for each new plant name `ES` phrase-matches (same rule as `check-job.js`).
  - `the fourth group renders and is not coloured as trees`: its heading text is present and `.chip-trees` count unchanged.
- [ ] **Step 2:** Run `npx playwright test tests/baxter-rev.spec.js` → fails.
- [ ] **Step 3:** Draft the rows, run `node ../.claude/skills/job-intake/check-job.js baxter <sum of the new quantities>` against a copy and fix until exit 0 (look-alike names use the app's existing spelling; say which you changed). Add alias-table entries (`status: "unverified"`, no invented vendor names) and run `python tools/build_vendors.py`; add `ES` entries for the three new plants and the group label.
- [ ] **Step 4:** Run `python tools/baxter-rev-inject.py`; `node .claude/hooks/check-html-js.js index.html` silent; edit `jobs.js` and `ES` with the Edit tool.
- [ ] **Step 5:** `npx playwright test tests/baxter-rev.spec.js` passes; then expect the OLD Baxter specs to fail (they encode 7 beds): note which, leave them for Task 9.
- [ ] **Step 6: Commit** `Baxter revision: rows, beds and data for the signed-off plan`.

---

### Task 8: The page shows order, the deducted note, and the fences

**Files:**
- Modify: `index.html` — `applyJobData`, the `BED_*` declarations beside `BED_STAKES` (add `BED_ORDER`, `BED_DEDUCTED`, `BED_FENCES`), the `BAXTER` config (add `order`, `deducted`, `fences`, new `offlineMB`, `zoom`), a new `orderHTML(b)` appended where `renderBeds` appends `stakeTableHTML(b)`, `deductedHTML()` and `fencesHTML()` appended after the site-map legend, the jump-bar `max`/`placeholder` in `renderBeds`, `ES`
- Modify (room): `tools/baxter-rev-inject.py` (writes `BAXTER_FENCES`)
- Test: `tests/baxter-rev.spec.js` (extend)

**Interfaces:**
- `orderHTML(b: bed) -> string` — `""` when `BED_ORDER` is null or has no entry for `b.bed`; else a `.sub-head` "Callouts in order" (Spanish via `ES`), one `.order-row` per `{qty, code}` (`<qty> × <species name> <code>`), and the line "Distances need a vector sheet. Go by the callout order on the drawing." Never renders when the bed also has tape rows.
- `deductedHTML() -> string` — `""` unless `BED_DEDUCTED`; else one `.deducted-note` listing each deducted bed, its plant count and boulder count, plus "Ask Chris whether the boulders at their ends still go."
- `fencesHTML() -> string` — `""` unless `BED_FENCES`; else a `.fences` list: one row per run (kind, `lf` ft, note) and one line for the north deduct.

- [ ] **Step 1: Write the failing tests** (extend `baxter-rev.spec.js`; each pair asserts `toBeVisible` and a `toBeHidden`/`toHaveCount(0)` case on another job):
  - `B04, B06 and B07 show callouts in order and no tape table; B03 and B05 keep their tape table`: `#bed-B07 .order-row` count equals the pill count worked from Task 3; `#bed-B03 .tape-row` count equals its carried rows and `#bed-B03 .order-row` count is 0.
  - `the order block and the deducted note and the fences are absent on Home2 and WSRCC`.
  - `the deducted note names B01 and B02 with 44 and 50`.
  - `Go to bed`: `#jumpBed` max attribute is `'7'`; typing `7` + Go scrolls B07 (class `bed-flash` appears); typing `1` shows `#jumpMsg` "No bed 1".
  - `Spanish mode`: after `lang = 'es'` render, the order heading, the "no distances" line, the deducted note and the fence kinds contain no English-only heading text (every new key exists in `ES`).
  - `the fences list shows four runs with their lengths and the north deduct`.
- [ ] **Step 2:** Run → fail. **Step 3:** Implement with the Edit tool, one function at a time; each new block gated on its data so Home2 and WSRCC cannot change; hook silent after each edit. **Step 4:** Run `python tools/baxter-rev-inject.py` to write `BAXTER_FENCES`; the spec passes.
- [ ] **Step 5: Commit the fences alone first** (`BAXTER_FENCES`, `fencesHTML`, its tests and Spanish) → `Baxter revision: fence runs`; then the rest → `Baxter revision: callout order, deducted note, jump bar`. (Two commits so the fences can be reverted alone.)

---

### Task 9: Move the old Baxter specs to the revised truth, and the mutation guards

**Files:**
- Modify: `tests/baxter-beds.spec.js`, `tests/baxter-tape.spec.js`, `tests/baxter-review.spec.js`, `tests/mutation-check.js` (the three `baxter` entries at the "Baxter's bed view (10/7/26)" block)

- [ ] **Step 1:** Run these three specs; list every failure. Each assertion that encoded the original (7 beds, 207 plants, `B01` `where`, MP/IS/RR codes, the 10 boulder rows on cards) is rewritten from the revised data **worked on paper** — five beds; the species sums from Task 3's readings; boulder rows only on kept beds (B03 2, B05 2, B06 2, B07 1 = 7) with the other 3 counted in the deducted note; the Area B tape row, if kept, recomputed on paper rather than copied.
- [ ] **Step 2:** Update the three guards: `find: 'stakes: BAXTER_STAKES,'` stays; the swap guard's `find` is a substring of the revised Area B bed in `BAXTER_BEDS` (`"PF":1,"SB":8` is still in B05 — confirm it exists once, or re-point it); `baxter: BAXTER}` stays. Add three guards tagged `baxter-rev`: renumber the kept beds (id test red), swap `deducted` so B01 shows again (deducted test red), render `orderHTML` on a bed with tape rows (rule test red). Each `caughtBy` names the real test.
- [ ] **Step 3:** `MUTATE_ONLY=baxter npm run verify-tests` and `MUTATE_ONLY=baxter-rev npm run verify-tests` → every guard caught, **zero SKIPPED**.
- [ ] **Step 4: Commit** `Baxter revision: specs on the revised truth, mutation guards`.

---

### Task 10: Service worker, full run, look, and ship

**Files:**
- Modify: `sw.js` (`CACHE_VERSION = 'v39'`; the Baxter picture-count comment)
- Test: `tests/sw-folders.test.js` (a case for `/Groundwork/beds-baxter/B07-r.jpg` and `/Groundwork/beds-baxter/site-map-r.jpg`)

- [ ] **Step 1:** Add the sw-folders cases (failing only if the regex missed them), bump `CACHE_VERSION`, correct the comment count to the real file count.
- [ ] **Step 2:** `npm test` → all green; record the three totals. `npm run verify-tests` → no `SKIPPED`. Update the CLAUDE.md Groundwork test-table row with the recorded totals and the revision.
- [ ] **Step 3: Look at it.** Serve the repo locally (`python -m http.server 8123` from the repo, via a `.claude/launch.json` entry) and open `http://localhost:8123/` in the in-app browser: Baxter → Beds. Take screenshots of the site map, B03 (tape table), B07 (callout order), the deducted note, the fences list, the species view with the OVER group, and Spanish mode. Fix anything that looks wrong, re-run `npm test`.
- [ ] **Step 4: Show Matt** the screenshots and the open items (lupine total vs schedule and any other discrepancy, the OVER rows, the four fence lengths, the Spanish names). **Wait for his go before pushing the app** — the previous push of docs is already live; this one changes what the crew sees.
- [ ] **Step 5: Ship.** `git log --oneline groundwork/main..groundwork-rename` shows only the Baxter revision commits; `git push groundwork groundwork-rename:main`. With `gh`, wait for the Pages build, then fetch `sw.js` (contains `v39`), `beds-baxter/site-map-r.jpg`, `beds-baxter/B07-r.jpg`, `symbols-baxter/LN.png` → all 200.
- [ ] **Step 6: Records.** Update the memory note `project_baxter_bed_view.md` (shipped commit, cache v39, what Matt still owes), and CLAUDE.md as above.
