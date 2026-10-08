"""Composing the revised Baxter beds from the revised reading and the shipped data.

The revised sheet is a photo, so its counts are read by eye (BAXTER-rev-callouts.json)
and the tape-out distances can only come from the ORIGINAL vector sheet. The rule
these tests pin: a bed keeps its distances only if its counts are the original's
after the three species renames; nothing is ever invented for a bed that moved.

Fixtures carry a GAP in the bed ids (B01, B03, B04, B07), like the real data, so
"next id = row count" and "ids as given" cannot be mistaken for each other.
Expected values are worked by hand from the fixtures.
"""

import unittest

from baxter_rev import build_beds, carried_ids, carry_stakes, deducted, own_boulders

ORIG_BEDS = [
    {"bed": "B01", "seq": 1, "where": "West bed", "zone": "McLean Pl", "units": 3, "items": {"RR": 3}},
    {"bed": "B03", "seq": 3, "where": "Area A", "zone": "Erna Court", "units": 4, "items": {"MP": 1, "SB": 3}},
    {"bed": "B04", "seq": 4, "where": "Area D", "zone": "Erna Court", "units": 3, "items": {"MP": 1, "PF": 2}},
    {"bed": "B07", "seq": 7, "where": "SE bed", "zone": "Baxter Rd", "units": 5, "items": {"IS": 5}},
]

PX = [0, 0]
CALLOUTS = {
    "pills": [
        {"id": 1, "stack": "W", "code": "PO", "qty": 3, "px": PX},          # deducted bed, 3 plants
        {"id": 2, "stack": "A", "code": "MS", "qty": 1, "px": PX},          # A: 1 MS + 3 SB
        {"id": 4, "stack": "A", "code": "SB", "qty": 3, "px": PX},
        {"id": 5, "stack": "D", "code": "MS", "qty": 1, "px": PX},          # D: 1 MS + 3 PF (was 2 PF)
        {"id": 6, "stack": "D", "code": "PF", "qty": 3, "px": PX},
    ],
    "stacks": {
        "W": {"bed": None, "deducted": "B01", "where": "West bed", "zone": "McLean Pl"},
        "A": {"bed": "B03", "where": "Area A", "zone": "Erna Court"},
        "D": {"bed": "B04", "where": "Area D", "zone": "Erna Court"},
    },
}

ROW = lambda code: {"code": code, "along": 1.0, "dir": "north", "off": 2.0, "sideText": "east of the curb"}
STAKES = {
    "beds": {"B03": {"ref": "R3", "edge": "curb", "rows": [ROW("MP"), ROW("SB")]},
             "B04": {"ref": "R4", "edge": "curb", "rows": [ROW("MP"), ROW("PF")]}},
    "extra": {"B04": [ROW("MP")]},
    "held": {},
    "no_edge": [],
    "foot": {"en": "E", "es": "S"},
}
# B01 has 1 boulder, B03 2, B04 2 (rows are opaque to the module).
BOULDERS = {"beds": {"B01": [{"n": 1}], "B03": [{"n": 2}, {"n": 3}], "B04": [{"n": 4}, {"n": 5}]}, "own": {}}


class Compose(unittest.TestCase):
    def test_beds_keep_their_original_ids_and_order(self):
        beds = build_beds(CALLOUTS, ORIG_BEDS)
        # The deducted stack W has no bed; the rest keep B03, B04 -- never B01, B02.
        self.assertEqual([b["bed"] for b in beds], ["B03", "B04"])
        self.assertEqual([b["seq"] for b in beds], [3, 4])

    def test_items_come_from_the_revised_reading(self):
        by = {b["bed"]: b for b in build_beds(CALLOUTS, ORIG_BEDS)}
        self.assertEqual(by["B03"]["items"], {"MS": 1, "SB": 3})
        self.assertEqual(by["B03"]["units"], 4)             # 1 + 3
        self.assertEqual(by["B04"]["items"], {"MS": 1, "PF": 3})
        self.assertEqual(by["B04"]["units"], 4)             # 1 + 3
        self.assertEqual(by["B04"]["where"], "Area D")
        self.assertEqual(by["B04"]["zone"], "Erna Court")

    def test_only_the_bed_whose_counts_did_not_move_carries_over(self):
        beds = build_beds(CALLOUTS, ORIG_BEDS)
        # A: {MP 1, SB 3} -> {MS 1, SB 3} same after the rename. D: PF 2 -> 3 moved.
        self.assertEqual(carried_ids(beds, ORIG_BEDS), ["B03"])


class Stakes(unittest.TestCase):
    def test_carry_keeps_only_the_named_beds_and_renames_codes(self):
        out = carry_stakes(STAKES, ["B03"])
        self.assertEqual(list(out["beds"]), ["B03"])
        self.assertEqual([r["code"] for r in out["beds"]["B03"]["rows"]], ["MS", "SB"])
        self.assertEqual(out["beds"]["B03"]["ref"], "R3")          # the zero is untouched
        self.assertEqual(out["foot"], {"en": "E", "es": "S"})     # the zeros note stays
        self.assertEqual(out["extra"], {})                         # B04's extra row went with B04

    def test_carry_does_not_mutate_the_original(self):
        carry_stakes(STAKES, ["B03"])
        self.assertEqual(STAKES["beds"]["B03"]["rows"][0]["code"], "MP")


class Boulders(unittest.TestCase):
    def test_a_bed_that_lost_its_plant_table_keeps_its_boulders_with_its_own_zero(self):
        kept = carry_stakes(STAKES, ["B03"])
        out = own_boulders(BOULDERS, kept, STAKES, ["B03", "B04"])
        self.assertEqual(list(out["beds"]), ["B03"])                # still off the plant zero
        self.assertEqual(out["beds"]["B03"], [{"n": 2}, {"n": 3}])
        self.assertEqual(list(out["own"]), ["B04"])                 # B04: own zero, old ref/edge
        self.assertEqual(out["own"]["B04"]["ref"], "R4")
        self.assertEqual(out["own"]["B04"]["edge"], "curb")
        self.assertEqual(out["own"]["B04"]["rows"], [{"n": 4}, {"n": 5}])

    def test_boulders_of_a_deducted_bed_are_not_shown(self):
        kept = carry_stakes(STAKES, ["B03"])
        out = own_boulders(BOULDERS, kept, STAKES, ["B03", "B04"])
        self.assertNotIn("B01", out["beds"])
        self.assertNotIn("B01", out["own"])


class Deducted(unittest.TestCase):
    def test_counts_are_the_shipped_beds(self):
        self.assertEqual(deducted(ORIG_BEDS, BOULDERS, ["B01"]),
                         [{"bed": "B01", "where": "West bed", "plants": 3, "boulders": 1}])


if __name__ == "__main__":
    unittest.main()
