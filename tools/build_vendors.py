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
              "file": "McKay Nursery Company Wholesale Availability & Sale Items 7.20.26.xlsx",
              "sheet": "McKay Availability"},
    # Aaron Rivera's quote of 8/4/26 (Titan Outlook), saved 9/23. Cat Price is
    # Bailey's 2026 catalog price; one row per site and ship date.
    "bailey": {"label": "Bailey", "dated": "quote of 8/4/26",
               "file": "TITAN AVAILABILITY QUOTE 8-4-26 for baileys.xlsx"},
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
    s = str(s).replace("’", "'").replace("‘", "'")
    s = s.replace("“", '"').replace("”", '"').replace("…", " ")
    s = re.sub(r"#\s+(\d)", r"#\1", s)  # McKay prints "# 3 Container"
    return re.sub(r"\s+", " ", s).strip().lower()


def catalog_lines(path, sheet=None):
    """One string per catalog line. An xlsx row becomes its cells joined by tabs.

    `sheet` names the one worksheet to read. McKay's workbook carries a
    product master -- everything they grow, no prices, not availability --
    beside the availability sheet, and only the availability may vouch for
    an offer.
    """
    path = Path(path)
    if path.suffix.lower() == ".xlsx":
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        sheets = [wb[sheet]] if sheet else wb.worksheets
        out = []
        for ws in sheets:
            for r in ws.iter_rows(values_only=True):
                cells = [str(c) for c in r if c is not None]
                if cells:
                    out.append("\t".join(cells))
        return out
    return path.read_text(encoding="utf-8", errors="replace").splitlines()


def _numbers(text):
    return [float(n.replace(",", "")) for n in re.findall(r"\d[\d,]*(?:\.\d+)?", text)]


def _names(line, want):
    """Does this line print the name? In a tab-separated row a whole cell must
    equal it -- Bron's "Prairie Dream Paper Birch" is not Paper Birch. Prose
    lines (Martin's list, Stewart's) are matched as a substring."""
    if "\t" in line:
        return any(_norm(c) == want for c in line.split("\t"))
    return want in _norm(line)


def _verify(vendor, as_name, forms, lines):
    want = _norm(as_name)
    hits = [i for i, ln in enumerate(lines) if _names(ln, want)]
    if not hits:
        raise BuildError(f'{vendor}: "{as_name}" not found in its catalog')
    for size, price in forms:
        # The size and the price must be printed on the SAME line, within a
        # few lines of the name: a #10 price must not vouch for a #5 typo.
        # With no price (Stewart) the size alone must be printed nearby.
        s = _norm(size)
        ok = False
        for i in hits:
            for ln in lines[max(0, i - WINDOW): i + WINDOW + 1]:
                if s not in _norm(ln):
                    continue
                if price is None or any(abs(round(n, 2) - price) < 0.005 for n in _numbers(ln)):
                    ok = True
                    break
            if ok:
                break
        if not ok:
            at = f" at {price}" if price is not None else ""
            raise BuildError(f'{vendor}: "{as_name}" {size}{at} is not printed near that name')


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
            if raw is None:
                offers[vendor] = None
                continue
            # One vendor can sell the same plant as separate products -- Martin's
            # Alaska-grown Colorado spruce and his Idaho specimen trees, McKay's
            # single and clump aspen. Each keeps its own printed name.
            products = []
            for one in (raw if isinstance(raw, list) else [raw]):
                o = _offer(vendor, one)
                _verify(vendor, o["as"], o["forms"], catalogs[vendor])
                products.append(o)
            offers[vendor] = products
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
        catalogs[v] = catalog_lines(p, m.get("sheet"))
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
