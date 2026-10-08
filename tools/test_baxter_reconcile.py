"""The guard on the Baxter callouts, which are read BY EYE off the bid set.

The sheet's callouts are exploded vector outlines, not text, so every
quantity in BAXTER-callouts.json was typed by a person. These tests pin the
two checks that stop a misread from reaching a crew:

  - every species sums to the sheet's Planting Schedule, and
  - every area with a "req'd/shown" line on the sheet matches that line,
    trees / shrubs / perennials separately -- unless the file records that
    the sheet disagrees with itself, in which case the disagreement is kept
    as a discrepancy, never fudged.

Expected values here are worked by hand from the fixture, not read back
from the function.
"""

import unittest

from baxter_reconcile import (CATEGORY, RENAME, REVISED_SCHEDULE, SCHEDULE,
                              callout_order, carried_over, discrepancies,
                              reconcile, rename_items)

# Fixture with a GAP in the ids (1, 2, 4), like the real file will have once
# a misread pill has been deleted and the rest left alone.
PILLS = [
    {"id": 1, "stack": "C", "code": "MP", "qty": 1, "box": [0, 0, 1, 1]},
    {"id": 2, "stack": "C", "code": "SB", "qty": 3, "box": [0, 2, 1, 3]},
    {"id": 4, "stack": "C", "code": "PF", "qty": 5, "box": [0, 4, 1, 5]},
]
STACKS = {"C": {"where": "Area C", "zone": "Court", "area": "C"}}
# 1 MP is a tree; SB 3 + PF 5 are 8 shrubs; nothing perennial.
AREAS = {"C": {"trees": 1, "shrubs": 8, "perennials": 0}}
SCHED = {"MP": 1, "SB": 3, "PF": 5}


class Reconcile(unittest.TestCase):
    def test_clean_reading_has_no_problems(self):
        self.assertEqual(reconcile(PILLS, AREAS, STACKS, SCHED), [])

    def test_one_short_species_is_named(self):
        pills = [dict(p) for p in PILLS]
        pills[2]["qty"] = 4                        # PF read as 4, schedule 5
        out = reconcile(pills, AREAS, STACKS, SCHED)
        self.assertEqual(len(out), 2, out)         # PF short AND area C now 7 shrubs
        self.assertIn("PF", out[0])
        self.assertIn("4", out[0])
        self.assertIn("5", out[0])

    def test_area_trees_mismatch_stops(self):
        areas = {"C": {"trees": 2, "shrubs": 8, "perennials": 0}}   # line says 2
        out = reconcile(PILLS, areas, STACKS, SCHED)
        self.assertEqual(len(out), 1, out)
        self.assertIn("area C", out[0])
        self.assertIn("trees", out[0])

    def test_marked_disagreement_passes_and_is_kept(self):
        areas = {"C": {"trees": 2, "shrubs": 8, "perennials": 0,
                       "sheet_disagrees": True, "note": "Matt 10/7"}}
        self.assertEqual(reconcile(PILLS, areas, STACKS, SCHED), [])
        d = discrepancies(PILLS, areas, STACKS)
        self.assertEqual(list(d), ["area C"])
        self.assertIn("1", d["area C"])            # what the callouts say
        self.assertIn("2", d["area C"])            # what the sheet line says
        self.assertIn("Matt 10/7", d["area C"])

    def test_marked_species_disagreement_passes_and_is_kept(self):
        # The sheet can disagree with its OWN schedule (10/7: it calls out 7 PG
        # against a schedule of 9). Marked, that passes and is carried as a
        # discrepancy; unmarked, the same reading stops the build.
        pills = [dict(p) for p in PILLS]
        pills[2]["qty"] = 4                        # PF 4 on the callouts, 5 scheduled
        areas = {"C": {"trees": 1, "shrubs": 7, "perennials": 0}}
        self.assertEqual(len(reconcile(pills, areas, STACKS, SCHED)), 1)
        species = {"PF": {"sheet_disagrees": True, "note": "Matt 10/7"}}
        self.assertEqual(reconcile(pills, areas, STACKS, SCHED, species), [])
        d = discrepancies(pills, areas, STACKS, SCHED, species)
        self.assertEqual(list(d), ["PF"])
        self.assertIn("4", d["PF"])
        self.assertIn("5", d["PF"])
        self.assertIn("Matt 10/7", d["PF"])

    def test_real_schedule_totals_207(self):
        # 9 + 8 + 8 + 2 + 11 + 36 + 55 + 38 + 26 + 14 = 207
        self.assertEqual(sum(SCHEDULE.values()), 207)
        self.assertEqual(len(SCHEDULE), 10)


class Revision(unittest.TestCase):
    """The signed-off revision (10/7/26): three species swapped, and a bed keeps
    its vector-derived tape-out only if its counts are the original's after the
    swaps. The revised sheet is a PHOTO, so nothing here reads geometry."""

    def test_revised_schedule_totals_201(self):
        # 7 + 9 + 8 + 2 + 10 + 36 + 53 + 44 + 22 + 10:
        #   7+9=16, +8=24, +2=26, +10=36, +36=72, +53=125, +44=169, +22=191, +10=201
        self.assertEqual(sum(REVISED_SCHEDULE.values()), 201)
        self.assertEqual(len(REVISED_SCHEDULE), 10)
        self.assertEqual(sum(SCHEDULE.values()), 207)    # the original is untouched

    def test_the_three_swaps_and_nothing_else(self):
        self.assertEqual(RENAME, {"MP": "MS", "IS": "LN", "RR": "PO"})

    def test_rename_items(self):
        got = rename_items({"MP": 2, "RR": 10, "IS": 12, "PF": 3})
        self.assertEqual(got, {"MS": 2, "PO": 10, "LN": 12, "PF": 3})

    def test_area_a_carries_over(self):
        # Original Area A: 2 JH, 2 MP, 3 PF, 7 SB, 3 VT. Only MP is swapped.
        orig = {"JH": 2, "MP": 2, "PF": 3, "SB": 7, "VT": 3}
        rev = {"JH": 2, "MS": 2, "PF": 3, "SB": 7, "VT": 3}
        self.assertTrue(carried_over(orig, rev))

    def test_one_count_differs_does_not_carry_over(self):
        orig = {"JH": 2, "MP": 2, "PF": 3, "SB": 7, "VT": 3}
        rev = {"JH": 2, "MS": 2, "PF": 4, "SB": 7, "VT": 3}      # PF 4, not 3
        self.assertFalse(carried_over(orig, rev))

    def test_an_unrenamed_code_does_not_carry_over(self):
        # The revised bed still saying MP means the reading missed the swap.
        orig = {"MP": 2, "PF": 3}
        self.assertFalse(carried_over(orig, {"MP": 2, "PF": 3}))

    def test_callout_order_is_top_to_bottom(self):
        pills = [
            {"id": 1, "stack": "D", "code": "LN", "qty": 9, "px": [100, 540]},
            {"id": 2, "stack": "D", "code": "PF", "qty": 3, "px": [100, 500]},
            {"id": 4, "stack": "D", "code": "MS", "qty": 1, "px": [100, 520]},
            {"id": 5, "stack": "C", "code": "SB", "qty": 7, "px": [100, 400]},
        ]
        # y = 500, 520, 540 -> PF 3, MS 1, LN 9; the other stack is ignored.
        self.assertEqual(callout_order(pills, "D"),
                         [{"qty": 3, "code": "PF"}, {"qty": 1, "code": "MS"},
                          {"qty": 9, "code": "LN"}])

    def test_callout_order_breaks_a_tie_by_x(self):
        pills = [
            {"id": 1, "stack": "E", "code": "VT", "qty": 2, "px": [10, 600]},
            {"id": 2, "stack": "E", "code": "SB", "qty": 4, "px": [5, 600]},
        ]
        self.assertEqual([p["code"] for p in callout_order(pills, "E")], ["SB", "VT"])

    def test_new_codes_have_categories(self):
        self.assertEqual(CATEGORY["MS"], "trees")
        self.assertEqual(CATEGORY["LN"], "perennials")
        self.assertEqual(CATEGORY["PO"], "shrubs")

    def test_revised_reading_reconciles_against_the_revised_schedule(self):
        # A clean fixture on revised codes: area E has 1 MS tree, 3 PO shrubs,
        # 9 LN perennials, and the schedule below says exactly that.
        pills = [
            {"id": 1, "stack": "E", "code": "MS", "qty": 1, "px": [0, 0]},
            {"id": 2, "stack": "E", "code": "PO", "qty": 3, "px": [0, 1]},
            {"id": 4, "stack": "E", "code": "LN", "qty": 9, "px": [0, 2]},
        ]
        stacks = {"E": {"area": "E"}}
        areas = {"E": {"trees": 1, "shrubs": 3, "perennials": 9}}
        self.assertEqual(reconcile(pills, areas, stacks, {"MS": 1, "PO": 3, "LN": 9}), [])


if __name__ == "__main__":
    unittest.main()
