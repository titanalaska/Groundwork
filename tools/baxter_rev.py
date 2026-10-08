"""Compose Baxter's signed-off revision from the revised reading and the shipped data.

The revised L1 (Plan Set 11465) exists only as a phone photo, so:

  - its COUNTS are read by eye (BAXTER-rev-callouts.json) and gated by
    baxter_reconcile.py;
  - its tape-out DISTANCES can only come from the original vector sheet. A bed keeps
    them only when its counts are the original's after the three species swaps
    (baxter_reconcile.carried_over). A bed that moved gets its callouts in order and
    an honest "no distances" line, never an invented position.

Bed ids are the original ids. The deducted beds (B01, B02) simply are not built; no
id is reused and nothing is renumbered, because Staked/Planted marks key on the id.

Pure: no files, no pymupdf. tools/baxter-rev-build.py in the room does the I/O.
"""

import copy

from baxter_reconcile import RENAME, carried_over


def _items(pills, stack):
    out = {}
    for p in pills:
        if p["stack"] == stack:
            out[p["code"]] = out.get(p["code"], 0) + int(p["qty"])
    return dict(sorted(out.items()))


def build_beds(callouts, original_beds):
    """The kept beds as app records, ids and order from the original beds.

    A stack with `bed: null` (a deducted bed) produces no record."""
    seq = {b["bed"]: b["seq"] for b in original_beds}
    beds = []
    for stack, meta in callouts["stacks"].items():
        if not meta.get("bed"):
            continue
        items = _items(callouts["pills"], stack)
        beds.append({
            "bed": meta["bed"], "seq": seq[meta["bed"]], "zone": meta["zone"],
            "where": meta["where"], "units": sum(items.values()), "items": items,
        })
    beds.sort(key=lambda b: b["seq"])
    return beds


def carried_ids(beds, original_beds):
    """Ids of the revised beds whose counts equal the original's after the renames."""
    orig = {b["bed"]: b["items"] for b in original_beds}
    return [b["bed"] for b in beds
            if b["bed"] in orig and carried_over(orig[b["bed"]], b["items"])]


def _renamed_rows(rows):
    return [dict(r, code=RENAME.get(r["code"], r["code"])) for r in rows]


def carry_stakes(stakes, keep):
    """The original BAXTER_STAKES restricted to `keep`, with swapped codes renamed.

    The zeros note (`foot`) and the zeros themselves are untouched; a deep copy, so
    the shipped data is never mutated."""
    stakes = copy.deepcopy(stakes)
    beds = {}
    for bed in keep:
        if bed in stakes["beds"]:
            t = stakes["beds"][bed]
            t["rows"] = _renamed_rows(t["rows"])
            beds[bed] = t
    extra = {b: _renamed_rows(rows) for b, rows in stakes.get("extra", {}).items() if b in keep}
    return {"beds": beds, "extra": extra, "held": stakes.get("held", {}),
            "no_edge": [b for b in stakes.get("no_edge", []) if b in keep],
            "foot": stakes.get("foot")}


def own_boulders(boulders, stakes_kept, original_stakes, shown):
    """Boulder rows for the shown beds only.

    A shown bed that still has a plant table keeps its rows "off the same zero". A
    shown bed that LOST its plant table keeps its rows too (a boulder sits where it
    sat, whatever is planted around it) but they move to `own`, carrying the old
    zero's ref and edge so each prints the zero it was measured from. Rows of a bed
    that is not shown are dropped here and counted by `deducted`."""
    boulders = copy.deepcopy(boulders)
    beds, own = {}, {}
    for bed, rows in boulders.get("beds", {}).items():
        if bed not in shown:
            continue
        if bed in stakes_kept["beds"]:
            beds[bed] = rows
        else:
            src = original_stakes["beds"][bed]
            own[bed] = {"ref": src["ref"], "edge": src["edge"], "rows": rows}
    for bed, o in boulders.get("own", {}).items():
        if bed in shown:
            own[bed] = o
    return {"beds": beds, "own": own}


def deducted(original_beds, boulders, ids):
    """[{bed, where, plants, boulders}] for the deducted beds, off the shipped data."""
    by = {b["bed"]: b for b in original_beds}
    out = []
    for i in ids:
        rows = list(boulders.get("beds", {}).get(i) or [])
        rows += list((boulders.get("own", {}).get(i) or {}).get("rows") or [])
        out.append({"bed": i, "where": by[i]["where"], "plants": by[i]["units"],
                    "boulders": len(rows)})
    return out
