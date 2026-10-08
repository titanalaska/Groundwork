# Baxter Deducts and Fences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Groundwork's Baxter job shows the signed-off revision: West and Northeast beds deducted, the added fences listed, the site map greyed where the deducted beds were — with every species, quantity, saved count and remaining bed card unchanged.

**Architecture:** Room-side scripts measure the fence runs on the original vector sheet and redraw the site map; a small injector removes B01/B02 from the generated data blocks in `index.html` and adds `BAXTER_DEDUCTED` / `BAXTER_FENCES`; two gated render functions and a jump-bar fix put them on the page; Playwright pins the five-bed truth.

**Tech Stack:** Python 3.13 (pymupdf, Pillow), Node + Playwright, `npm test` / `npm run verify-tests`.

**Spec:** `docs/superpowers/specs/2026-10-07-baxter-revision-design.md` (supersedes the first draft in ebf532f; the species swaps are NOT being built).

## Global Constraints

- Room = `C:\Users\skull\OneDrive\claudes room`; repo = `Wolf-Checklist-repo/` inside it. Python tools run from the room. **Never delete anything outside the repo.** Git Bash `/c/...` paths must never reach Node.
- Branch `groundwork-rename`; commits end `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; push only after Matt has seen it: `git push groundwork groundwork-rename:main` (never `groundwork main`).
- **Unchanged, byte for byte where possible:** every species row and quantity in `jobs.js`, every saved count, B03–B07 cards, tape-out, crops (`beds-baxter/B03..B07.jpg`), symbols, palette. Kept bed ids: B03 Area A, B04 Area D, B05 Area B, B06 Area C, B07 Southeast bed. **No bed is renumbered.** Deducted: B01 West bed (McLean Pl), 44 plants, 1 boulder; B02 Northeast bed (Baxter Rd), 50 plants, 2 boulders.
- Fences (vertices on the vector sheet, pt; `FT = 0.7765` pt/ft): green `(146.09,232.14)→(383.09,232.14)→(383.09,332.98)`; yellow `(383.09,332.98)→(612.85,332.98)`; blue `(612.85,256.31)→(612.85,332.98)`; magenta `(573.0,256.31)→(612.85,256.31)` approximate. Rounded to 5 ft: about 435, 295, 100, 50.
- Every `Edit` to `index.html` runs the syntax hook; Python injectors bypass it, so after each injection run `node .claude/hooks/check-html-js.js index.html` from the repo (silent = clean).
- Expected values in tests are worked on paper in comments. A test is not evidence until seen to fail. Never rename `wolf-*` keys or `DOC_PATH`.
- Changed pictures get NEW filenames (`site-map-r.jpg`), so `BED_CACHE` stays `wolf-beds-v2`; `CACHE_VERSION` v38 → v39 in the shipping commit.

## Review Focus

1. A saved Staked/Planted mark on B03 must survive the revision, and "Go to bed" 1 or 2 must say "No bed 1", not crash — Task 4.
2. The deducted note, fences list and species-view flag must be absent from Home2 and WSRCC, and must have Spanish — Task 4.
3. Every picture the app requests must exist and no stray file may stay in `beds-baxter/` (the offline save would carry it) — Task 3.
4. The species view must still list every original row at its original quantity — Task 4.
5. The injector must be re-runnable: running it twice must leave `index.html` identical — Task 2.

---

### Task 1: Docs and a green baseline — DONE

Spec (rewritten to the real scope), this plan, live-state snapshot `BAXTER-live-state-2026-10-07.json` (11 Baxter count keys, no Staked/Planted marks), baseline `npm test` green: 40 Python, 44 node, 204 Playwright. The species-swap code (`baxter_reconcile.py` additions, `baxter_rev.py`) was reverted. Fence lengths: `tools/baxter_fence.py` (`run_feet`, `round_ft`, 7 tests) committed.

---

### Task 2: The data — fences, the deducted note, and B01/B02 out

**Files:**
- Modify (room): `tools/baxter-rev-fences.py` (exists; add `BAXTER-rev-fences.json` consumers only)
- Create (room): `tools/baxter-rev-inject.py`
- Modify: `index.html` (between markers), `jobs.js` (one flag)
- Output (room): `BAXTER-rev-fences.json` (exists), `BAXTER-rev-deducted.json`

**Interfaces:**
- `BAXTER-rev-deducted.json`: `[{"bed": "B01", "where": "West bed (McLean Pl)", "plants": 44, "boulders": 1}, {"bed": "B02", "where": "Northeast bed (Baxter Rd)", "plants": 50, "boulders": 2}]` — computed from `BAXTER-beds.json` units and `BAXTER-boulders.json` row counts, not typed.
- `baxter-rev-inject.py` rewrites, in `index.html`: `BAXTER_BEDS` without B01/B02, `BAXTER_MAP_XY` from `BAXTER-rev-map-xy.json`, `BAXTER_STAKES.beds` and `BAXTER_BOULDERS.beds` without B01/B02, and a new `/* BAXTER-REV:BEGIN (tools/baxter-rev-inject.py) */ … /* BAXTER-REV:END */` pair holding `var BAXTER_DEDUCTED = [...]; var BAXTER_FENCES = {...};` (`{runs: [{id, kind, where, lf, approx?}], deducted: [{id, kind}], note}`). It reads the shipped data FROM `BAXTER-*.json` (the originals stay untouched in the room) so running it twice gives the same file.
- `jobs.js` Baxter `flags` gains a new FIRST entry and `flagsEs` its Spanish twin: "⚠️ Revised plan (Matt, 10/7/26): the West and Northeast perimeter beds are deducted — 94 plants (44 + 50) are not planted at Baxter. The quantities below are what was ordered; they are not reduced." No row, name or quantity changes.

- [ ] **Step 1:** Write `BAXTER-rev-deducted.json` computation into the injector; run `python tools/baxter-rev-inject.py`; `node .claude/hooks/check-html-js.js index.html` silent.
- [ ] **Step 2:** Run it a second time and `git diff --stat` shows no further change (idempotent).
- [ ] **Step 3:** Edit the `jobs.js` flag (EN and ES, same order); run `node ../.claude/skills/job-intake/check-job.js baxter 207` from the repo — it must still exit 0 (names and total untouched).
- [ ] **Step 4:** Do not commit yet: the page does not read the new blocks until Task 4.

---

### Task 3: The site map

**Files:**
- Create (room): `tools/baxter-rev-map.py`
- Output: `beds-baxter/site-map-r.jpg`; `BAXTER-rev-map-xy.json` (room)
- Remove: `beds-baxter/site-map.jpg`, `B01.jpg`, `B02.jpg`

**Interfaces:**
- `BAXTER-rev-map-xy.json`: `{"plan": [W, H], "xy": {"B03": [x, y], …, "B07": [x, y]}}` — the same geometry contract as `BAXTER-map-xy.json` (radius 46, ring 5, font 48, marker 60 px left of the stack); the five xy values equal the shipped ones exactly.

- [ ] **Step 1: Implement `tools/baxter-rev-map.py`**, lifting `font`, `draw_pills` and the site-map block from `tools/baxter-pictures.py` (that file runs `main()` at import, so copy, do not import): same render at `MAP_W = 4013`, same pills for every stack except `W` and `NE`, markers only for B03–B07, a semi-transparent grey wash over the bounding box of the `W` and `NE` stacks' pill boxes and their plants (from `BAXTER-trunks.json`, +6 pt), with the word DEDUCTED on a white plate at its centre.
- [ ] **Step 2:** Run it; open `site-map-r.jpg`: no pill or marker on the two deducted beds, the word DEDUCTED legible, markers 3–7 where they were (compare to the shipped map). Check the five xy values equal `BAXTER-map-xy.json`'s for B03–B07 (assert in the script).
- [ ] **Step 3:** `git rm beds-baxter/site-map.jpg beds-baxter/B01.jpg beds-baxter/B02.jpg`; list `beds-baxter/` and confirm exactly `B03..B07.jpg` and `site-map-r.jpg` remain; `symbols-baxter/` untouched.
- [ ] **Step 4: Commit the pictures alone** → `Baxter revision: site map without the deducted beds` (revertible on its own).

---

### Task 4: The page

**Files:**
- Modify: `index.html` — `BAXTER` config (`deducted: BAXTER_DEDUCTED`, `fences: BAXTER_FENCES`, `offlineMB`), `applyJobData` (`BED_DEDUCTED = d.deducted || null; BED_FENCES = d.fences || null;`), their `var` declarations beside `BED_STAKES`, `deductedHTML()` and `fencesHTML()` appended in `renderBeds` after `mapLegendHTML()`, the "Go to bed" `max`/`placeholder`, the site-map `<img>` name (`site-map-r.jpg`), `ES`
- Test: `tests/baxter-rev.spec.js` (new)

**Interfaces:**
- `deductedHTML() -> string`: `""` unless `BED_DEDUCTED`; else one `.deducted-note` naming each deducted bed, its plant count and boulder count, and "Ask Chris whether the boulders at their ends still go."
- `fencesHTML() -> string`: `""` unless `BED_FENCES`; else a `.fences` block: one `.fence-row` per run (`kind`, "about N ft", `where`, "approx." when flagged), one `.fence-deducted` line, the note.
- Both English and Spanish by `lang`, through `ES`/`L()` as the neighbouring blocks do.

- [ ] **Step 1: Write the failing tests** in `tests/baxter-rev.spec.js` (`loadApp`, `openJob(page,'baxter')`, `view='zones'; renderAll();`):
  - `Baxter shows five beds, B03 to B07, and no B01 or B02`: `BEDS.map(b=>b.bed)` equals `['B03','B04','B05','B06','B07']`; `Object.keys(MAP_XY)` the same.
  - `the cards sum to the original schedule minus the two deducted beds`: per code PG 3, BP 3, MP 7, SV 0, JH 7, IS 12, PF 25, RR 13, SB 26, VT 14, total 110 (204 − 44 − 50), worked in the comment from the shipped beds.
  - `a Staked mark on B03 survives`: set `staked['baxter:B03']=true` before render; `#bed-B03` button reads "Staked".
  - `the deducted note names B01 and B02 with 44 and 50 plants` (`toBeVisible`), and is absent on Home2 and WSRCC (`toHaveCount(0)`).
  - `the fences list shows four runs with their lengths and the north deduct`: rows text contains `435`, `295`, `100`, `50` and "north".
  - `Go to bed 7 jumps to B07; 1 says No bed 1; the box's max is 7`.
  - `the species view still lists every original row with its original quantity` (the ten names and 9/8/8/2/11/36/55/38/26/14 from `jobs.js`) and the first Baxter flag is the new one.
  - `Spanish`: after `lang='es'`, the note, a fence kind and the flag contain no English-only text; every new key is in `ES`.
- [ ] **Step 2:** Run `npx playwright test tests/baxter-rev.spec.js` → fails (no such blocks).
- [ ] **Step 3:** Implement with the Edit tool, one function at a time, each gated on its data; hook silent after each edit. Point the site-map image at `site-map-r.jpg`.
- [ ] **Step 4:** New spec passes. Expect the three existing Baxter specs to fail on 7-bed expectations: list them.
- [ ] **Step 5: Commit** `Baxter revision: deducted beds hidden, fences listed`.

---

### Task 5: The old specs, the guards, the worker, and the full run

**Files:**
- Modify: `tests/baxter-beds.spec.js`, `tests/baxter-tape.spec.js`, `tests/baxter-review.spec.js`, `tests/boulders.spec.js` only where it asserts a deducted bed; `tests/mutation-check.js`; `sw.js`; `tests/sw-folders.test.js`; `CLAUDE.md`

- [ ] **Step 1:** Run the three Baxter specs; for each failure rewrite the expectation from the five-bed truth worked on paper (bed count 5; per-species sums from Task 4; boulder rows on cards B03 2, B05 2, B06 2, B07 1 = 7; `no tape row for B01/B02`), never from the code's output.
- [ ] **Step 2:** Update the three `baxter` mutation guards whose `find` strings name deducted data, and add three tagged `baxter-rev`: show B01 again (the five-bed test goes red), renumber the kept beds (id test red), drop `fences: BAXTER_FENCES` (fences test red). `MUTATE_ONLY=baxter npm run verify-tests` and `MUTATE_ONLY=baxter-rev …` → all caught, **zero SKIPPED**.
- [ ] **Step 3:** `sw.js` `CACHE_VERSION = 'v39'`; the Baxter picture-count comment corrected to the real file count; add a `sw-folders` case for `/Groundwork/beds-baxter/site-map-r.jpg`.
- [ ] **Step 4:** `npm test` → all green; record the three totals. `npm run verify-tests` → no SKIPPED. Update the CLAUDE.md Groundwork test row with the recorded totals (the baseline was 40 Python, 44 node, 204 Playwright).
- [ ] **Step 5: Commit** `Baxter revision: specs on the five-bed truth, guards, sw v39`.
- [ ] **Step 6: Look at it.** Serve the repo (`python -m http.server 8123`, launch.json entry) and open it in the in-app browser: Baxter → Beds. Screenshot the site map, B03, B07, the deducted note, the fences list, the species view top, Spanish mode. Fix anything wrong and re-run `npm test`.
- [ ] **Step 7:** Show Matt the screenshots and the open items; **push only on his go**: `git push groundwork groundwork-rename:main`; then with `gh` wait for Pages and fetch `sw.js` (contains `v39`), `beds-baxter/site-map-r.jpg` → 200. Update the memory note.
