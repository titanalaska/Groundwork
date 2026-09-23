# Vendor Catalogs ("who carries it") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Under every Groundwork species, show which vendor lists carry that same plant — vendor's name for it, sizes, prices, and whose list and when — in the Subs panel and on status.html.

**Architecture:** The hand-verified `species-alias-table.json` (in `claudes room`, never committed) gains a structured `offers` field per vendor. `tools/build_vendors.py` turns it into `vendors.js`, **refusing to build** unless every vendor name and every price in `offers` is actually printed in that vendor's catalog file. `vendors-view.js` turns `VENDORS` into display lines; `index.html` and `status.html` both call it.

**Tech Stack:** Python 3.13 + openpyxl (build, `unittest`), plain ES5 in the pages, Node `node:test` + Playwright (existing suite).

**Spec:** `docs/superpowers/specs/2026-09-22-vendor-catalogs-design.md` — read the "Amendment 9/23" section at the end: offers come from the alias table and are *verified against* the catalogs, rather than parsed out of five catalog formats.

## Global Constraints

- **The repo is PUBLIC** (`gh repo view titanalaska/Groundwork` → PUBLIC). Never commit `species-alias-table.json`, any catalog file, or anything from their notes fields. Only the generated `vendors.js` is committed.
- `vendors.js` carries exactly: list `label` and `dated`, and per species `mapped`, per vendor `as` + `forms` as `[size, price|null]`. No other field may pass through (the builder rejects unknown keys).
- `vendors.js` and `vendors-view.js` must be pure ASCII (status.html declares no charset; see the comment on `subsFor` in `live.js`). Builder uses `json.dumps(..., ensure_ascii=True)`; view uses `\u` escapes.
- Record only: nothing touches counts, shortfalls, totals or sort order.
- Never rank, recommend, or total a cost.
- Unmapped species say **"Not mapped yet"** — never a guess, never blank.
- Every rendered vendor line ends with its list's `dated` string.
- Never write anything learned privately about a vendor, anywhere. Only what a vendor printed on its own list goes in.
- CLAUDE.md rules apply: expected test values worked out from the catalog page, never pasted from output; see every new test fail; bump `sw.js` `CACHE_VERSION` in the deploy commit; deploy with `git push groundwork groundwork-rename:main` only.

## File map

| File | Status | Responsibility |
|---|---|---|
| `tools/build_vendors.py` | create | alias table + catalogs → `vendors.js`; all verification |
| `tools/test_build_vendors.py` | create | unit tests on fixtures (no real catalogs needed) |
| `vendors.js` | generated, committed | the data the pages read |
| `vendors-view.js` | create | `vendorLines(slug, planName)` — the one formatter both pages use |
| `tests/vendors-view.test.js` | create | node tests of the formatter |
| `tests/vendors-app.spec.js` | create | Playwright: Subs panel block |
| `tests/vendors-status.spec.js` | create | Playwright: status.html lines |
| `index.html` | modify | script tags; vendor block in `attachSubs` → `buildPanel` |
| `status.html` | modify | script tags; lines in `rowsFor` / `renderJob` |
| `sw.js` | modify | EXTRA precache + `CACHE_VERSION` |
| `package.json` | modify | python tests in `npm test` |
| `tests/mutation-check.js`, `tests/mutation-check-status.js` | modify | new mutations |
| `../species-alias-table.json` | modify (NOT in repo) | `offers` on 23 rows, then 27 new rows |

---

### Task 1: The builder, on fixtures

**Files:**
- Create: `tools/build_vendors.py`
- Test: `tools/test_build_vendors.py`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Produces: `slug(name) -> str`; `groundwork_species(jobs_js_text) -> list[str]`; `catalog_lines(path) -> list[str]`; `build(alias, species_names, lists, catalogs) -> (data: dict, warnings: list[str])`; `render_js(data) -> str`; `BuildError`. CLI: `python tools/build_vendors.py` writes `vendors.js`.
- `data` shape: `{"lists": {vendor: {"label", "dated"}}, "species": {slug: {"mapped": bool, "offers": {vendor: None | [{"as": str, "forms": [[size, price_or_None], ...]}, ...]}}}}` — a vendor is null (read, not on list) or a LIST of products; `offers` omitted when `mapped` is false.

- [ ] **Step 1: Write the failing tests**

`tools/test_build_vendors.py`:

```python
# Tests for build_vendors.py. Fixtures only -- the real catalogs live outside
# this public repo. Expected values are read off the fixture lines, which are
# copied in shape from the real books (McKay xlsx rows, Martin's prose list).
import unittest
from build_vendors import BuildError, build, render_js, slug, groundwork_species

LISTS = {
    "seedntree": {"label": "Seed 'n' Tree", "dated": "2026 list, rec'd 7/1/26"},
    "mckay": {"label": "McKay", "dated": "list of 7/20/26"},
    "bron": {"label": "Bron & Sons", "dated": "2027 booking form"},
}
CATALOGS = {
    # Martin prints the name on one line and the prices on the next.
    "seedntree": ["Alaska paper birch\u2026 Clumps add 10%",
                  "1.5\u201d   $175             1.75\u201d   $198",
                  "2\u201d  $238           2.25\u201d     $278"],
    # McKay files paper birch as CANOE birch.
    "mckay": ["Birch Canoe Single\t2\" B&B\t189.00"],
    # Bron's tab-separated rows carry three decimals.
    "bron": ["POTFPBEA\tPotentilla frut. 'P.B.'\tPink Beauty Potentilla\t#5\t23.786000000000001"],
}

def row(**kw):
    base = {"plan_name": "Paper Birch", "status": "verified", "offers": {}}
    base.update(kw)
    return base

class BuildTests(unittest.TestCase):
    def test_slug_matches_the_app(self):
        # index.html slug(): decode, lower, non-alnum runs to "-", trim.
        self.assertEqual(slug("Bishop&#39;s Weed (Goutweed)"), "bishop-s-weed-goutweed")
        self.assertEqual(slug("Hardy Purple Common Lilac (#2 sub)"), "hardy-purple-common-lilac-2-sub")

    def test_groundwork_species_reads_jobs_js(self):
        js = 'items: [\n ["Paper Birch", 24],\n ["Bishop&#39;s Weed (Goutweed)", 305],\n ["Late Lilac", 44, true]]'
        self.assertEqual(groundwork_species(js),
                         ["Bishop's Weed (Goutweed)", "Late Lilac", "Paper Birch"])

    def test_same_plant_under_the_vendors_own_name(self):
        alias = [row(offers={"mckay": {"as": "Birch Canoe Single",
                                       "forms": [{"size": "2\" B&B", "price": 189.00}]}})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["paper-birch"]["offers"]["mckay"],
                         {"as": "Birch Canoe Single", "forms": [["2\" B&B", 189.0]]})

    def test_plan_name_search_is_the_trap(self):
        # Searching McKay for "Paper Birch" finds nothing -- that is why "as" exists.
        alias = [row(offers={"mckay": {"as": "Paper Birch", "forms": [{"size": "2\"", "price": 189}]}})]
        with self.assertRaisesRegex(BuildError, "not found"):
            build(alias, ["Paper Birch"], LISTS, CATALOGS)

    def test_a_price_not_printed_near_the_name_is_refused(self):
        alias = [row(offers={"seedntree": {"as": "Alaska paper birch",
                                           "forms": [{"size": "2\"", "price": 283}]}})]
        with self.assertRaisesRegex(BuildError, "283"):
            build(alias, ["Paper Birch"], LISTS, CATALOGS)

    def test_prices_on_the_line_after_the_name_are_found(self):
        alias = [row(offers={"seedntree": {"as": "Alaska paper birch",
                                           "forms": [{"size": "2\"", "price": 238}]}})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["paper-birch"]["offers"]["seedntree"]["forms"], [["2\"", 238]])

    def test_three_decimal_catalog_price_matches_cents(self):
        alias = [row(plan_name="Pink Beauty Potentilla", offers={"bron": {
            "as": "Pink Beauty Potentilla", "forms": [{"size": "#5", "price": 23.79}]}})]
        data, _ = build(alias, ["Pink Beauty Potentilla"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["pink-beauty-potentilla"]["offers"]["bron"]["forms"], [["#5", 23.79]])

    def test_not_on_list_is_kept_as_null(self):
        alias = [row(offers={"bron": None})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertIsNone(data["species"]["paper-birch"]["offers"]["bron"])

    def test_a_note_cannot_ride_along(self):
        alias = [row(offers={"mckay": {"as": "Birch Canoe Single",
                                       "forms": [{"size": "2\" B&B", "price": 189, "note": "Chris's figure"}]}})]
        with self.assertRaisesRegex(BuildError, "note"):
            build(alias, ["Paper Birch"], LISTS, CATALOGS)

    def test_unknown_offer_key_refused(self):
        alias = [row(offers={"mckay": {"as": "Birch Canoe Single", "forms": [], "why": "x"}})]
        with self.assertRaisesRegex(BuildError, "why"):
            build(alias, ["Paper Birch"], LISTS, CATALOGS)

    def test_species_missing_from_the_table_is_unmapped(self):
        data, _ = build([], ["Early Forsythia"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["early-forsythia"], {"mapped": False})

    def test_unresolved_row_is_unmapped(self):
        alias = [row(status="unresolved", offers={"bron": None})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["paper-birch"], {"mapped": False})

    def test_also_plan_names_share_a_row(self):
        alias = [row(plan_name="Hardy Purple Common Lilac",
                     also_plan_names=["Hardy Purple Common Lilac (#2 sub)"], offers={"bron": None})]
        data, _ = build(alias, ["Hardy Purple Common Lilac", "Hardy Purple Common Lilac (#2 sub)"], LISTS, CATALOGS)
        self.assertTrue(data["species"]["hardy-purple-common-lilac-2-sub"]["mapped"])

    def test_vendor_not_in_lists_is_skipped_out_loud(self):
        alias = [row(offers={"kalco": {"as": "Paper Birch", "forms": []}, "bron": None})]
        data, warnings = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertNotIn("kalco", data["species"]["paper-birch"]["offers"])
        self.assertTrue(any("kalco" in w for w in warnings))

    def test_only_groundwork_species_are_output(self):
        alias = [row(plan_name="Sienna Glen Maple", offers={"bron": None})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertEqual(list(data["species"]), ["paper-birch"])

    def test_output_is_ascii(self):
        alias = [row(offers={"seedntree": {"as": "Alaska paper birch\u2019s", "forms": []}})]
        cat = dict(CATALOGS, seedntree=["Alaska paper birch\u2019s"])
        data, _ = build(alias, ["Paper Birch"], LISTS, cat)
        self.assertTrue(render_js(data).isascii())

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to see them fail**

Run (from `Wolf-Checklist-repo`): `python -m unittest discover -s tools -p "test_*.py" -v`
Expected: `ModuleNotFoundError: No module named 'build_vendors'`.

- [ ] **Step 3: Write the builder**

`tools/build_vendors.py`:

```python
"""Build vendors.js -- who carries each Groundwork species -- from the species
alias table, checked against the vendor catalogs.

The alias table (claudes room/species-alias-table.json) and the catalogs are
NOT in this repo and must never be: the repo is public, the table carries
working notes, and a catalog can say things about a vendor's business that do
not belong on a public page. Only the generated vendors.js is committed, and
it can only ever hold what build() lets through: list label and date, and per
vendor the name as printed, sizes and prices.

Every name and price in the table is refused unless it is actually printed in
that vendor's catalog, near that name. That is a typo guard, not proof the
size is right -- the size is taken from the table, which was read by hand.

Run from Wolf-Checklist-repo:  python tools/build_vendors.py
"""
import argparse
import html
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ROOM = REPO.parent

# Display order is the order here. `dated` ends every line the pages show.
# A vendor whose catalog file is not saved yet stays out of LISTS; its offers
# are then skipped with a warning, never silently.
LISTS = {
    "seedntree": {"label": "Seed 'n' Tree", "dated": "2026 list, rec'd 7/1/26",
                  "file": "Seed-n-Tree-2026-pricelist.txt"},
    "bron": {"label": "Bron & Sons", "dated": "2027 booking form",
             "file": "Bron-2027-Spring-Booking-Order-Form.txt"},
    "mckay": {"label": "McKay", "dated": "list of 7/20/26",
              "file": "McKay Nursery Company Wholesale Availability & Sale Items 7.20.26.xlsx"},
    "bailey": {"label": "Bailey", "dated": "quote of 8/4/26",
               "file": "TITAN AVAILABILITY QUOTE 8-4-26.xlsx"},
    "stewart": {"label": "Stewart Bros", "dated": "2025-26 availability, no prices",
                "file": "Stewart-Brothers-Availability.txt"},
}

MAPPED_STATUSES = ("verified", "not_carried_anywhere")
WINDOW = 3  # lines either side of a name hit where its prices may sit


class BuildError(Exception):
    pass


def slug(name):
    """Same key the app uses -- index.html slug() / live.js slugOf()."""
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", html.unescape(name).lower()))


def groundwork_species(jobs_js_text):
    """Every row name in jobs.js, decoded, de-duplicated, sorted."""
    return sorted({html.unescape(n) for n in re.findall(r'\["([^"]+)",\s*\d+', jobs_js_text)})


def _norm(s):
    s = str(s).replace("\u2019", "'").replace("\u2018", "'")
    s = s.replace("\u201c", '"').replace("\u201d", '"').replace("\u2026", " ")
    return re.sub(r"\s+", " ", s).strip().lower()


def catalog_lines(path):
    path = Path(path)
    if path.suffix.lower() == ".xlsx":
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        out = []
        for ws in wb.worksheets:
            for r in ws.iter_rows(values_only=True):
                cells = [str(c) for c in r if c is not None]
                if cells:
                    out.append("\t".join(cells))
        return out
    return path.read_text(encoding="utf-8", errors="replace").splitlines()


def _numbers(text):
    return [float(n.replace(",", "")) for n in re.findall(r"\d[\d,]*(?:\.\d+)?", text)]


def _verify(vendor, as_name, forms, lines):
    want = _norm(as_name)
    hits = [i for i, ln in enumerate(lines) if want in _norm(ln)]
    if not hits:
        raise BuildError(f'{vendor}: "{as_name}" not found in its catalog')
    for size, price in forms:
        if price is None:
            continue
        ok = False
        for i in hits:
            window = " ".join(lines[max(0, i - WINDOW): i + WINDOW + 1])
            if any(abs(round(n, 2) - price) < 0.005 for n in _numbers(window)):
                ok = True
                break
        if not ok:
            raise BuildError(f'{vendor}: price {price} for "{as_name}" {size} is not printed near that name')


def _offer(vendor, raw):
    if raw is None:
        return None
    if not isinstance(raw, dict) or set(raw) - {"as", "forms"}:
        raise BuildError(f"{vendor}: offer keys must be as/forms, got {sorted(raw) if isinstance(raw, dict) else raw}")
    if not isinstance(raw.get("as"), str) or not raw["as"].strip():
        raise BuildError(f"{vendor}: offer needs the vendor's own name in 'as'")
    forms = []
    for f in raw.get("forms", []):
        if not isinstance(f, dict) or set(f) - {"size", "price"}:
            raise BuildError(f"{vendor}: form keys must be size/price, got {sorted(f) if isinstance(f, dict) else f}")
        size, price = f.get("size"), f.get("price")
        if not isinstance(size, str) or not size.strip():
            raise BuildError(f"{vendor}: form needs a size")
        if price is not None and not isinstance(price, (int, float)):
            raise BuildError(f"{vendor}: price must be a number or null, got {price!r}")
        forms.append([size, price])
    return {"as": raw["as"], "forms": forms}


def build(alias, species_names, lists, catalogs):
    warnings = []
    by_slug = {}
    for r in alias:
        for n in [r["plan_name"]] + list(r.get("also_plan_names", [])):
            by_slug[slug(n)] = r
    species = {}
    for name in species_names:
        s = slug(name)
        r = by_slug.get(s)
        if r is None or r.get("status") not in MAPPED_STATUSES or "offers" not in r:
            species[s] = {"mapped": False}
            continue
        offers = {}
        for vendor, raw in (r.get("offers") or {}).items():
            if vendor not in lists:
                warnings.append(f"{name}: {vendor} is not in LISTS (no catalog saved) -- skipped")
                continue
            o = _offer(vendor, raw)
            if o is not None:
                _verify(vendor, o["as"], o["forms"], catalogs[vendor])
            offers[vendor] = o
        species[s] = {"mapped": True, "offers": offers}
    out_lists = {v: {"label": m["label"], "dated": m["dated"]} for v, m in lists.items()}
    return {"lists": out_lists, "species": species}, warnings


def render_js(data):
    return ("// GENERATED by tools/build_vendors.py from the species alias table,\n"
            "// checked against each vendor's catalog. Do not edit by hand -- edit\n"
            "// the table and re-run. ASCII only: status.html declares no charset.\n"
            "var VENDORS = " + json.dumps(data, ensure_ascii=True, indent=1) + ";\n")


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--alias", default=str(ROOM / "species-alias-table.json"))
    ap.add_argument("--jobs", default=str(REPO / "jobs.js"))
    ap.add_argument("--out", default=str(REPO / "vendors.js"))
    a = ap.parse_args(argv)
    alias = json.loads(Path(a.alias).read_text(encoding="utf-8"))["species"]
    names = groundwork_species(Path(a.jobs).read_text(encoding="utf-8"))
    catalogs = {}
    for v, m in LISTS.items():
        p = ROOM / m["file"]
        if not p.exists():
            raise BuildError(f"{v}: catalog file not found: {p} -- save it, or take {v} out of LISTS")
        catalogs[v] = catalog_lines(p)
    data, warnings = build(alias, names, LISTS, catalogs)
    for w in warnings:
        print("warning:", w)
    Path(a.out).write_text(render_js(data), encoding="ascii", newline="\n")
    mapped = sum(1 for s in data["species"].values() if s["mapped"])
    print(f"wrote {a.out}: {mapped} of {len(data['species'])} species mapped")


if __name__ == "__main__":
    try:
        main()
    except BuildError as e:
        sys.exit(f"build refused: {e}")
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `python -m unittest discover -s tools -p "test_*.py" -v`
Expected: 16 tests, all `ok`.

- [ ] **Step 5: See the price guard fail**

Temporarily change `if not ok:` to `if False:` in `_verify`, rerun. Expected: `test_a_price_not_printed_near_the_name_is_refused` FAILS. Restore. Do the same with `set(f) - {"size", "price"}` → `set()` and expect `test_a_note_cannot_ride_along` to FAIL. Restore.

- [ ] **Step 6: Wire into `npm test`**

In `package.json` change the `test` script to:

```json
"test": "python -m unittest discover -s tools -p \"test_*.py\" && node --test \"tests/*.test.js\" && playwright test",
```

Run `npm test`. Expected: 16 python + 28 node + all Playwright pass.

- [ ] **Step 7: Commit**

```bash
git add tools/build_vendors.py tools/test_build_vendors.py package.json
git commit -m "Add the vendor list builder, refusing any name or price its catalog does not print"
```

---

### Task 2: Offers for the 23 existing alias rows, and the first real build

**Files:**
- Modify: `C:\Users\skull\OneDrive\claudes room\species-alias-table.json` (NOT in repo)
- Generate + commit: `vendors.js`

**Interfaces:**
- Consumes: `python tools/build_vendors.py` from Task 1.
- Produces: `vendors.js` with `VENDORS.species[slug]` for all 50 Groundwork species.

- [ ] **Step 1: Bailey's file**

If `claudes room/TITAN AVAILABILITY QUOTE 8-4-26.xlsx` is not saved yet, comment the `"bailey"` entry out of `LISTS` in `build_vendors.py` and note it in the commit. Bailey offers are then skipped with a printed warning.

- [ ] **Step 2: Back up the table**

```bash
cp "../species-alias-table.json" "../species-alias-table.backup-2026-09-23.json"
```

- [ ] **Step 3: Add `offers` to each of the 23 rows**

For each row and each vendor in `vendor_names`, open that vendor's catalog, find the line(s) under the name in `vendor_names`, and write:

```json
"offers": {
  "bron": {"as": "Pink Beauty Potentilla", "forms": [{"size": "#1", "price": 8.17}, {"size": "#2", "price": 14.24}, {"size": "#5", "price": 23.79}]},
  "mckay": null
}
```

Rules:
- `as` is the vendor's name **as printed** — for Bron use the common-name column; for McKay the item text (e.g. `"Birch Canoe Single"`).
- `forms` only from the catalog, never from the old `forms` notes (which include freight guesses). Keep the old `forms` field untouched as history.
- `null` only when the whole list was searched under every name in `vendor_names` and `do_not_confuse`.
- Stewart: `price: null` on every form (the sheet has none).
- Add `"seedntree"` to every row from `Seed-n-Tree-2026-pricelist.txt`. Known from the list: Paper Birch as `"Alaska paper birch"` 1.5" 175, 1.75" 198, 2" 238, 2.25" 278, 2.5" 325, 2.75" 395, 3" 495; Helena Maple as `"Helena maple"` 1.75" 595, 2" 635, 2.75" 950; Karl Foerster as `"Carl forester reed grass"` #1 14; Hedge Cotoneaster as `"Cotoneaster..Hedge"` #3 32; Pink Beauty as `"Potentilla… Pink beauty"` #5 52.
- Kalco stays out (no catalog).

- [ ] **Step 4: Build until it stops refusing**

Run: `python tools/build_vendors.py`
Every `build refused:` names the vendor, name and price that is not printed in the catalog. Fix the table entry against the catalog page (not the other way round). Expected finally: `wrote ...vendors.js: 22 of 50 species mapped` (23 rows minus Sienna Glen, which is not a Groundwork species).

- [ ] **Step 5: Check three lines by hand against the paper**

Open `vendors.js` and confirm: `paper-birch` → seedntree 2" 238, mckay `as` Canoe; `pink-beauty-potentilla` → bron #5 23.79; `helena-maple` → seedntree 2" 635. `grep -c . vendors.js` and `python -c "print(open('vendors.js','rb').read().isascii())"` → `True`.

- [ ] **Step 6: Commit (vendors.js only)**

```bash
git status --short   # must NOT list any .json from claudes room or any catalog
git add vendors.js tools/build_vendors.py
git commit -m "Generate vendors.js for the 22 Groundwork species the alias table already covered"
```

---

### Task 3: The formatter both pages share

> **As built (9/23):** a vendor's entry is a LIST of products (see Task 1), so the formatter emits one line per product, each with its own `as`. The committed `vendors-view.js` and `tests/vendors-view.test.js` are authoritative over the code blocks below. The test helper returns plain copies because arrays built inside `vm` fail `deepStrictEqual` on prototype alone.

**Files:**
- Create: `vendors-view.js`
- Test: `tests/vendors-view.test.js`

**Interfaces:**
- Consumes: global `VENDORS` (Task 2 shape).
- Produces: `vendorLines(slug, planName) -> string[] | null` (`null` = vendors.js not loaded); `vendorPrice(p) -> string`.

- [ ] **Step 1: Write the failing test**

`tests/vendors-view.test.js`:

```js
// vendorLines() -- the text under a species in the Subs panel and on status.html.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', process.env.VIEW_JS || 'vendors-view.js'), 'utf8');

function load(VENDORS) {
  const ctx = { VENDORS };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return ctx;
}

const FIX = {
  lists: {
    seedntree: { label: "Seed 'n' Tree", dated: "2026 list, rec'd 7/1/26" },
    mckay: { label: 'McKay', dated: 'list of 7/20/26' },
    bron: { label: 'Bron & Sons', dated: '2027 booking form' },
    stewart: { label: 'Stewart Bros', dated: '2025-26 availability, no prices' },
  },
  species: {
    'paper-birch': { mapped: true, offers: {
      mckay: { as: 'Birch Canoe Single', forms: [['2" B&B', 189]] },
      seedntree: { as: 'Alaska paper birch', forms: [['1.5"', 175], ['2"', 238]] },
      bron: null,
      stewart: { as: 'Paper Birch', forms: [['#15', null]] },
    } },
    'helena-maple': { mapped: true, offers: { seedntree: { as: 'Helena maple', forms: [['2.75"', 1050]] } } },
    'early-forsythia': { mapped: false },
    'late-lilac': { mapped: true, offers: {} },
  },
};

test('lines follow the lists order, each ending with its date', () => {
  const lines = load(FIX).vendorLines('paper-birch', 'Paper Birch');
  assert.deepStrictEqual(lines, [
    'Seed \'n\' Tree as "Alaska paper birch": 1.5" $175 \u00b7 2" $238 (2026 list, rec\'d 7/1/26)',
    'McKay as "Birch Canoe Single": 2" B&B $189 (list of 7/20/26)',
    'Bron & Sons: not on list (2027 booking form)',
    'Stewart Bros: #15 (2025-26 availability, no prices)',
  ]);
});

test('the vendor name is not repeated when it matches the plan name', () => {
  const lines = load(FIX).vendorLines('paper-birch', 'Paper Birch');
  assert.ok(lines[3].indexOf(' as ') === -1);
});

test('thousands get a comma, cents only when there are cents', () => {
  const ctx = load(FIX);
  assert.strictEqual(ctx.vendorPrice(1050), ' $1,050');
  assert.strictEqual(ctx.vendorPrice(23.79), ' $23.79');
  assert.strictEqual(ctx.vendorPrice(null), '');
});

test('an unmapped species says so', () => {
  assert.deepStrictEqual(load(FIX).vendorLines('early-forsythia', 'Early Forsythia'),
    ['Not mapped yet \u2014 no vendor list has been matched to this species.']);
  assert.deepStrictEqual(load(FIX).vendorLines('no-such-plant', 'X'),
    ['Not mapped yet \u2014 no vendor list has been matched to this species.']);
});

test('mapped with no list read says that, not "not on list"', () => {
  assert.deepStrictEqual(load(FIX).vendorLines('late-lilac', 'Late Lilac'),
    ['No vendor list has been read for this species yet.']);
});

test('null when vendors.js did not load', () => {
  assert.strictEqual(load(undefined).vendorLines('paper-birch', 'Paper Birch'), null);
});

test('the source is ASCII', () => {
  assert.ok(/^[\x00-\x7F]*$/.test(SRC));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/vendors-view.test.js`
Expected: FAIL, `ENOENT ... vendors-view.js`.

- [ ] **Step 3: Write `vendors-view.js`**

```js
// Who carries a species -- the lines under it in the Subs panel (index.html)
// and on status.html. One formatter so the two pages cannot word it
// differently. Reads VENDORS from vendors.js, which tools/build_vendors.py
// generates from the species alias table.
//
// ASCII only, with \u escapes: status.html declares no charset, so opened from
// a file a literal middle dot or dash in this script reads back as mojibake.
//
// Record only. Never ranks, recommends or totals -- it says what each list
// says, dated, and the buying call stays with Matt.

function vendorPrice(p){
  if (p === null || p === undefined) return "";
  var s = (p % 1 === 0) ? String(p) : p.toFixed(2);
  return " $" + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// null when vendors.js did not load, so each page decides how to say so.
function vendorLines(slug, planName){
  if (typeof VENDORS === "undefined" || !VENDORS || !VENDORS.species) return null;
  var sp = VENDORS.species[slug];
  if (!sp || !sp.mapped) {
    return ["Not mapped yet \u2014 no vendor list has been matched to this species."];
  }
  var out = [];
  Object.keys(VENDORS.lists).forEach(function(v){
    if (!Object.prototype.hasOwnProperty.call(sp.offers, v)) return;
    var list = VENDORS.lists[v], o = sp.offers[v];
    if (o === null) { out.push(list.label + ": not on list (" + list.dated + ")"); return; }
    var named = (o.as && o.as.toLowerCase() !== String(planName).toLowerCase())
      ? ' as "' + o.as + '"' : "";
    out.push(list.label + named + ": " +
      o.forms.map(function(f){ return f[0] + vendorPrice(f[1]); }).join(" \u00b7 ") +
      " (" + list.dated + ")");
  });
  return out.length ? out : ["No vendor list has been read for this species yet."];
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node --test tests/vendors-view.test.js` → 7 pass.

- [ ] **Step 5: Commit**

```bash
git add vendors-view.js tests/vendors-view.test.js
git commit -m "Add the shared who-carries-it formatter"
```

---

### Task 4: The block in the Subs panel

**Files:**
- Modify: `index.html` — script tags after `<script src="jobs.js"></script>` (~line 1138); CSS after `.subs-panel .subs-head{...}`; `buildPanel()` inside `attachSubs()`
- Modify: `sw.js` — `EXTRA`
- Test: `tests/vendors-app.spec.js`

**Interfaces:**
- Consumes: `vendorLines(slug, planName)` (Task 3), `slug()`, `decode()` in index.html.
- Produces: `.vendors` element as the first child after `.subs-head` in every open `.subs-panel`.

- [ ] **Step 1: Write the failing test**

`tests/vendors-app.spec.js`:

```js
// The who-carries-it block in the Subs panel. VENDORS is replaced with a
// fixture so these never depend on what today's catalogs say.
const { test, expect } = require('@playwright/test');
const { loadApp, resetCounts } = require('./helpers');

const FIX = {
  lists: { seedntree: { label: "Seed 'n' Tree", dated: "2026 list, rec'd 7/1/26" },
           bron: { label: 'Bron & Sons', dated: '2027 booking form' },
           // Read for nothing below: a list that was never checked for Paper
           // Birch must not claim it is "not on list".
           stewart: { label: 'Stewart Bros', dated: '2025-26 availability, no prices' } },
  species: { 'paper-birch': { mapped: true, offers: {
    seedntree: { as: 'Alaska paper birch', forms: [['2"', 238]] }, bron: null } } },
};

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await resetCounts(page);
});

async function openSubs(page, job, name, vendors) {
  await page.evaluate(({ job, name, vendors }) => {
    window.VENDORS = vendors;
    currentJob = job; applyJobData(); view = 'species';
    subsOpen[job + ':' + slug(name)] = true;
    renderAll();
  }, { job, name, vendors });
  return page.locator('.item', { has: page.locator(`.item-name:text-is("${name}")`) });
}

test('the panel shows who carries the species, dated', async ({ page }) => {
  const row = await openSubs(page, 'h2s', 'Paper Birch', FIX);
  const block = row.locator('.subs-panel .vendors');
  await expect(block).toContainText('Seed \'n\' Tree as "Alaska paper birch": 2" $238 (2026 list, rec\'d 7/1/26)');
  await expect(block).toContainText('Bron & Sons: not on list (2027 booking form)');
  await expect(block, 'Stewart was never read for this species').not.toContainText('Stewart');
});

test('an unmapped species says not mapped yet', async ({ page }) => {
  const row = await openSubs(page, 'ntmb', 'Early Forsythia', FIX);
  await expect(row.locator('.subs-panel .vendors')).toContainText('Not mapped yet');
});

test('no vendors.js degrades to a message, and the subs still work', async ({ page }) => {
  const row = await openSubs(page, 'h2s', 'Paper Birch', undefined);
  await expect(row.locator('.subs-panel .vendors')).toHaveText('Vendor lists not loaded.');
  await expect(row.locator('.subs-add')).toBeVisible();
});

test('vendor lines never move a count', async ({ page }) => {
  const before = await page.evaluate(() => JSON.stringify(state));
  await openSubs(page, 'h2s', 'Paper Birch', FIX);
  expect(await page.evaluate(() => JSON.stringify(state))).toBe(before);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx playwright test tests/vendors-app.spec.js`
Expected: FAIL — `.vendors` not found.

- [ ] **Step 3: Implement**

Script tags, directly after `<script src="jobs.js"></script>`:

```html
<script src="vendors.js"></script>
<script src="vendors-view.js"></script>
```

CSS, after `.subs-panel .subs-head{...}`:

```css
  /* Who carries it -- read off the vendor lists, dated. Above the options so
     "same plant, other grower" is seen before reaching for a different plant. */
  .subs-panel .vendors{font-size:12px;margin-bottom:8px;padding:6px 8px;border-radius:6px;background:var(--gray-bg);}
  .subs-panel .vendors div{margin:2px 0;}
```

In `buildPanel()`, right after `panel.appendChild(head);`:

```js
    // Who carries this same plant, from the vendor lists (vendors.js).
    // Missing vendors.js or vendors-view.js says so; it never blocks the subs.
    var vend = document.createElement("div");
    vend.className = "vendors";
    var vl = (typeof vendorLines === "function") ? vendorLines(slug(name), decode(name)) : null;
    (vl || ["Vendor lists not loaded."]).forEach(function(t){
      var d = document.createElement("div");
      d.textContent = t;
      vend.appendChild(d);
    });
    panel.appendChild(vend);
```

`sw.js`: add `'./vendors.js',` and `'./vendors-view.js',` to `EXTRA` (not CRITICAL — the app works without them).

- [ ] **Step 4: Run it to see it pass, then the whole suite**

Run: `npx playwright test tests/vendors-app.spec.js` → 4 pass. Then `npm test` → all pass (the existing `row-fits` phone-width test must still pass).

- [ ] **Step 5: Commit**

```bash
git add index.html sw.js tests/vendors-app.spec.js
git commit -m "Show who carries each species in the Subs panel"
```

---

### Task 5: The lines on status.html

**Files:**
- Modify: `status.html` — script tags after `<script src="jobs.js"></script>` (~line 150); CSS after `.so{...}`; `rowsFor()` and the row HTML in `renderJob()`
- Test: `tests/vendors-status.spec.js`

**Interfaces:**
- Consumes: `vendorLines`, `slugOf`, `decodeEntities`, `escapeHtml` (live.js).
- Produces: `.vl` spans under each species cell.

- [ ] **Step 1: Write the failing test**

`tests/vendors-status.spec.js`:

```js
// Vendor lines on status.html. The endpoint is stubbed and VENDORS replaced
// with a fixture, then the page re-rendered, so nothing depends on live data.
const { test, expect } = require('@playwright/test');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'status.html').replace(/\\/g, '/');

const RECORD = { ok: true, updatedAt: '2026-09-23T18:00:00.000Z',
  data: { counts: { 'h2s:false-spirea': 235 }, planted: {}, staked: {}, notes: {} } };
const FIX = {
  lists: { seedntree: { label: "Seed 'n' Tree", dated: "2026 list, rec'd 7/1/26" } },
  species: { 'paper-birch': { mapped: true, offers: {
    seedntree: { as: '<b>Alaska</b> paper birch', forms: [['2"', 238]] } } } },
};

async function open(page, vendors) {
  await page.route('**/macros/s/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RECORD) }));
  await page.goto(URL);
  await page.waitForFunction(() => document.querySelectorAll('#sections section').length > 0);
  await page.evaluate(({ rec, vendors }) => { window.VENDORS = vendors; render(rec); }, { rec: RECORD, vendors });
}

const figures = (page) => page.evaluate(() => ({
  big: document.getElementById('big').textContent,
  cells: [...document.querySelectorAll('#sections td.n')].map((td) => td.textContent),
}));

test('vendor lines show under the species on every job that has it', async ({ page }) => {
  await open(page, FIX);
  for (const job of ['h2s', 'palmer', 'raspberry']) {
    await expect(page.locator(`#${job} tr`, { has: page.locator('td', { hasText: /^Paper Birch/ }) }).locator('.vl'))
      .toContainText('2" $238 (2026 list, rec\'d 7/1/26)');
  }
});

test('a vendor name is text, not markup', async ({ page }) => {
  await open(page, FIX);
  const vl = page.locator('#h2s .vl').first();
  await expect(vl).toContainText('<b>Alaska</b>');
  expect(await vl.locator('b').count()).toBe(0);
});

test('vendor lines change no figure', async ({ page }) => {
  await open(page, undefined);
  const without = await figures(page);
  await page.unrouteAll();
  await open(page, FIX);
  expect(await figures(page)).toEqual(without);
});

test('no vendors.js shows no vendor lines, and no error', async ({ page }) => {
  await open(page, undefined);
  await expect(page.locator('.vl')).toHaveCount(0);
  await expect(page.locator('#sections section').first()).toBeVisible();
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx playwright test tests/vendors-status.spec.js`
Expected: first two FAIL (no `.vl`).

- [ ] **Step 3: Implement**

Script tags after `<script src="jobs.js"></script>` in status.html:

```html
<script src="vendors.js"></script>
<script src="vendors-view.js"></script>
```

CSS after `.so{...}`:

```css
/* Who carries it, from the vendor lists -- dated, never ranked. */
.vl{display:block;font-size:.76rem;color:var(--mut);margin-top:2px;max-width:70ch}
```

In `rowsFor`, next to `subs: subsFor(notes, key),`:

```js
        // Vendor lines are omitted entirely when vendors.js did not load --
        // 50 rows of "not loaded" would bury the counts this page is for.
        vendors: (typeof vendorLines === "function" && vendorLines(slugOf(name), decodeEntities(name))) || [],
```

In `renderJob`, after the `r.subs.map(...)` span line:

```js
      r.vendors.map(function(t){ return '<span class="vl">' + escapeHtml(t) + '</span>'; }).join('') +
```

- [ ] **Step 4: Run to see it pass, then the suite**

`npx playwright test tests/vendors-status.spec.js` → 4 pass; `npm test` → all pass (existing `status-subs` and `status-live` included).

- [ ] **Step 5: Commit**

```bash
git add status.html tests/vendors-status.spec.js
git commit -m "Show who carries each species on the status page"
```

---

### Task 6: Mutation checks

**Files:**
- Modify: `tests/mutation-check.js` (index.html mutations)
- Modify: `tests/mutation-check-status.js` (status.html + vendors-view.js; add both new spec files to its Playwright file list, and add `tests/vendors-view.test.js` handling — see Step 2)

- [ ] **Step 1: index.html mutations** — append to `MUTATIONS`, each with `tag: 'vendors'`:

```js
  {
    name: 'leave the vendor block out of the Subs panel',
    find: '    panel.appendChild(vend);',
    replace: '',
    tag: 'vendors',
    caughtBy: 'shows who carries the species',
  },
  {
    name: 'let a missing vendors.js break the panel instead of saying so',
    find: '    (vl || ["Vendor lists not loaded."]).forEach(function(t){',
    replace: '    vl.forEach(function(t){',
    tag: 'vendors',
    caughtBy: 'degrades to a message',
  },
```

Run: `MUTATE_ONLY=vendors node tests/mutation-check.js` → both CAUGHT.

- [ ] **Step 2: status.html + vendors-view.js mutations** — `mutation-check-status.js` patches any named file and runs Playwright, so it covers `vendors-view.js` through the app and status specs. Add `'tests/vendors-status.spec.js', 'tests/vendors-app.spec.js'` to its Playwright file list, then append:

```js
  {
    file: 'status.html',
    name: 'build HTML out of a vendor name',
    find: "return '<span class=\"vl\">' + escapeHtml(t) + '</span>';",
    replace: "return '<span class=\"vl\">' + t + '</span>';",
    caughtBy: 'text, not markup',
  },
  {
    file: 'vendors-view.js',
    name: 'drop the list date from a vendor line',
    find: '      " (" + list.dated + ")");',
    replace: '      "");',
    caughtBy: 'on every job that has it',
  },
  {
    file: 'vendors-view.js',
    name: 'say "not on list" for a vendor that was never read',
    find: '    if (!Object.prototype.hasOwnProperty.call(sp.offers, v)) return;',
    replace: '    if (!Object.prototype.hasOwnProperty.call(sp.offers, v)) { out.push(VENDORS.lists[v].label + ": not on list"); return; }',
    caughtBy: 'shows who carries the species',
  },
```

Also verify the formatter guards by hand, as with the builder: in `vendors-view.js` change `" \u00b7 "` to `", "` → `node --test tests/vendors-view.test.js` FAILS; restore. Change the unmapped message → FAILS; restore.

Run: `node tests/mutation-check-status.js` → all CAUGHT.

- [ ] **Step 3: Commit**

```bash
git add tests/mutation-check.js tests/mutation-check-status.js
git commit -m "Mutation checks for the vendor lines"
```

---

### Task 7: The other 27 species, then deploy

**Files:**
- Modify: `../species-alias-table.json` (NOT in repo)
- Regenerate + commit: `vendors.js`; modify `sw.js`

- [ ] **Step 1: Add rows for the 28 unmapped Groundwork species**

`Abbottswood Potentilla, Alaska Flag Iris, Amur Maple, Bishop's Weed (Goutweed), Creeping Juniper, Dwarf American Cranberry, Early Forsythia, False Spirea, Feather Reed Grass, Goatsbeard, Gold Crinkled Hair Grass (sub), Goldfinger Potentilla, Goldflame Spirea, Goldmound Spirea, Hardy Purple Common Lilac, Hardy Purple Common Lilac (#2 sub), Hosta Patriot, Ivory Halo Dogwood, Late Lilac, Parkland Pillar Birch, Prairiefire Crabapple, Red-Twig Dogwood, Savin Juniper, Scotch Pine, Siberian Crabapple, Sweet Woodruff, White Spruce, Yellow Potentilla`

- `Hardy Purple Common Lilac (#2 sub)` is the same plant: add it to the Hardy Purple row's `also_plan_names`, not a new row. (27 new rows.)
- `Gold Crinkled Hair Grass (sub)` is the **Tufted Hair Grass** substitute Chris approved — its own row, not the Gold Crinkled row.
- `Early Forsythia`: Seed 'n' Tree carries only "Meadowlark". Status `unresolved` until the NTMB schedule's botanical name settles it.
- Each row: `plan_name`, `botanical`, `vendor_names`, `offers`, `do_not_confuse`, `status` — off the catalogs, same rules as Task 2 Step 3. Anything the books do not settle → `unresolved`.

- [ ] **Step 2: Build until it stops refusing**

`python tools/build_vendors.py`, fix entries against the catalogs. Record the final `N of 50 species mapped` for the commit.

- [ ] **Step 3: Bump the service worker and run everything**

`sw.js` `CACHE_VERSION` +1. `npm test` all pass. `npm run verify-tests` — every mutation CAUGHT, none SKIPPED.

- [ ] **Step 4: Check the public commit holds nothing private**

```bash
git diff groundwork/main --stat          # only repo files
grep -i -c "freight\|chris's\|do_not_confuse" vendors.js   # must print 0
```

- [ ] **Step 5: Look at it at phone width**

Preview (`wolf-checklist` launch config), 375 px: open Subs on Paper Birch (H2S) and Early Forsythia (NTMB); screenshot both. Then status.html: Paper Birch lines visible, totals unchanged.

- [ ] **Step 6: Commit and deploy**

```bash
git add vendors.js sw.js
git commit -m "Vendor lines for all Groundwork species"
git push groundwork groundwork-rename:main
```

Confirm live: `curl -s "https://titanalaska.github.io/Groundwork/vendors.js?x=$RANDOM" | head -3` shows the generated header.
