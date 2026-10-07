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

from baxter_reconcile import SCHEDULE, discrepancies, reconcile

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


if __name__ == "__main__":
    unittest.main()
