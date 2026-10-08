"""The two checks that guard Baxter's hand-read callouts.

Baxter's bid set (The Boutet Company, sheet L1) is vector but exploded: the
callouts are drawn glyph outlines, not text, so BAXTER-callouts.json was
typed by a person off 600 dpi tiles. Nothing typed by a person reaches a crew
until it reconciles:

  1. every species sums to the sheet's Planting Schedule (SCHEDULE below),
  2. every area that carries a "req'd/shown" line on the sheet matches it,
     trees / shrubs / perennials separately.

An area line can disagree with the drawing on the sheet itself (the lines are
code requirements as much as counts). That is Matt's call, not this module's:
the file marks the area `"sheet_disagrees": true` with a dated note, and the
disagreement is carried into the app as a discrepancy -- shown, never fudged.

Pure: no files, no pymupdf. tools/baxter-beds.py in the room imports it.
"""

# Sheet L1 Planting Schedule, 207 plants. Identical to the Baxter rows in
# jobs.js -- a change on one side without the other is a bug.
SCHEDULE = {
    "PG": 9,    # White Spruce
    "BP": 8,    # Paper Birch
    "MP": 8,    # Prairiefire Crabapple
    "SV": 2,    # Hardy Purple Common Lilac -- the tree alternate under the line
    "JH": 11,   # Creeping Juniper
    "IS": 36,   # Alaska Flag Iris
    "PF": 55,   # Yellow Potentilla
    "RR": 38,   # Rugosa Rose
    "SB": 26,   # Birchleaf Spirea
    "VT": 14,   # Dwarf American Cranberry
}

# The signed-off revision (Plan Set 11465, read off a PHOTO of the revised L1,
# 10/7/26): 201 plants, INCLUDING the two perimeter beds the same sheet's
# redline deducts. Three species are swapped (RENAME below).
REVISED_SCHEDULE = {
    "PG": 7,    # White Spruce
    "BP": 9,    # Paper Birch
    "MS": 8,    # Spring Snow Crabapple (was MP, Prairiefire)
    "SV": 2,    # Hardy Purple Common Lilac -- the tree alternate under the line
    "JH": 10,   # Creeping Juniper
    "LN": 36,   # Alaska Nootka Lupine (was IS, Alaska Flag Iris)
    "PF": 53,   # Yellow Potentilla
    "PO": 44,   # Center Glow Ninebark (was RR, Rugosa Rose)
    "SB": 22,   # Birchleaf Spirea
    "VT": 10,   # Dwarf American Cranberry
}

# Original code -> revised code. Nothing else changed name.
RENAME = {"MP": "MS", "IS": "LN", "RR": "PO"}

# How the sheet's own area lines count things: SV is listed under "deciduous
# tree alternative", so it counts as a tree there; IS/LN is the only perennial.
CATEGORY = {
    "PG": "trees", "BP": "trees", "MP": "trees", "MS": "trees", "SV": "trees",
    "JH": "shrubs", "PF": "shrubs", "RR": "shrubs", "PO": "shrubs",
    "SB": "shrubs", "VT": "shrubs",
    "IS": "perennials", "LN": "perennials",
}
GROUPS = ("trees", "shrubs", "perennials")


def _by_code(pills):
    tot = {}
    for p in pills:
        tot[p["code"]] = tot.get(p["code"], 0) + int(p["qty"])
    return tot


def _by_area(pills, stacks):
    """{area: {trees: n, shrubs: n, perennials: n}} from the callouts."""
    out = {}
    for p in pills:
        area = stacks[p["stack"]].get("area")
        if not area:
            continue
        g = out.setdefault(area, {k: 0 for k in GROUPS})
        g[CATEGORY[p["code"]]] += int(p["qty"])
    return out


def _area_mismatches(pills, areas, stacks):
    """[(area, group, callouts, sheet)] for every area line the callouts miss."""
    got = _by_area(pills, stacks)
    out = []
    for area in sorted(areas):
        line = areas[area]
        have = got.get(area, {k: 0 for k in GROUPS})
        for g in GROUPS:
            if g in line and have[g] != int(line[g]):
                out.append((area, g, have[g], int(line[g])))
    return out


def _species_mismatches(pills, schedule):
    """[(code, callouts, schedule)] for every scheduled species the callouts miss."""
    tot = _by_code(pills)
    return [(code, tot.get(code, 0), schedule[code]) for code in schedule
            if tot.get(code, 0) != schedule[code]]


def _marked(table, key):
    return bool((table or {}).get(key, {}).get("sheet_disagrees"))


def reconcile(pills, areas, stacks, schedule, species=None):
    """Problem lines; [] means the reading is clean enough to build from.

    `species` is the callouts file's per-species table: a code marked
    `sheet_disagrees` (the sheet calls out fewer than its own schedule) is
    carried as a discrepancy instead of stopping the build."""
    problems = []
    tot = _by_code(pills)
    for code, have, want in _species_mismatches(pills, schedule):
        if _marked(species, code):
            continue
        problems.append("%s: callouts %d, schedule %d" % (code, have, want))
    for code in sorted(set(tot) - set(schedule)):
        problems.append("%s: %d on the callouts, not in the schedule" % (code, tot[code]))
    for area, g, have, want in _area_mismatches(pills, areas, stacks):
        if _marked(areas, area):
            continue
        problems.append("area %s: %s %d on the callouts, %d on the sheet line" % (area, g, have, want))
    return problems


def discrepancies(pills, areas, stacks, schedule=None, species=None):
    """The marked disagreements, worded for the app's DISCREPANCY table."""
    out = {}
    for code, have, want in _species_mismatches(pills, schedule or {}):
        if not _marked(species, code):
            continue
        line = "callouts %d, schedule %d" % (have, want)
        if species[code].get("note"):
            line += " -- " + species[code]["note"]
        out[code] = line
    for area, g, have, want in _area_mismatches(pills, areas, stacks):
        if not _marked(areas, area):
            continue
        key = "area " + area
        line = "callouts %d %s, sheet line says %d" % (have, g, want)
        if areas[area].get("note"):
            line += " -- " + areas[area]["note"]
        out[key] = (out[key] + "; " + line) if key in out else line
    return out


def rename_items(items):
    """A bed's {code: qty} with the three swapped species under their new codes."""
    return {RENAME.get(code, code): qty for code, qty in items.items()}


def carried_over(original, revised):
    """True when the revised bed is the original bed after the renames, count for
    count. Only then may the original's vector-derived tape-out distances be
    shown on it: a bed whose counts moved has plants whose positions the photo
    cannot give, and the app must not invent them."""
    return rename_items(original) == revised


def callout_order(pills, stack):
    """The stack's callouts as [{qty, code}], top to bottom as the sheet prints
    them (photo y, then x). Used where there is no tape table: the crew goes by
    the order on the drawing."""
    mine = [p for p in pills if p["stack"] == stack]
    mine.sort(key=lambda p: (p["px"][1], p["px"][0]))
    return [{"qty": int(p["qty"]), "code": p["code"]} for p in mine]
