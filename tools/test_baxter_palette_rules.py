"""The rules that score a species palette for the Baxter pills.

The pills on the Baxter pictures are drawn (the sheet is monochrome), and
colour identifies the SPECIES, as on WSRCC: the eight validated hues and a
second channel, solid vs outlined, which colour-vision deficiency cannot
touch. These tests pin the scoring so the search in tools/baxter-palette.py
cannot quietly optimise the wrong thing.

Expected values are worked by hand, not read back from the function.
"""

import unittest

from baxter_palette_rules import HUES, cooccurrence, delta_e, worst_pair

PF_SB = frozenset(["PF", "SB"])


class Rules(unittest.TestCase):
    def test_the_eight_validated_hues_unchanged(self):
        self.assertEqual(len(HUES), 8)
        for name, hexcol in HUES.items():
            self.assertRegex(hexcol, r"^#[0-9a-f]{6}$", name)
        self.assertEqual(HUES["green"], "#008300")
        self.assertEqual(HUES["red"], "#e34948")

    def test_two_species_sharing_hue_and_style_score_zero_and_are_the_worst_pair(self):
        assign = {"PF": ("green", "solid"), "SB": ("green", "solid"), "JH": ("red", "outline")}
        pairs = {PF_SB, frozenset(["SB", "JH"])}
        self.assertEqual(worst_pair(assign, pairs), (0.0, 0.0, PF_SB))

    def test_different_styles_score_100(self):
        assign = {"PF": ("green", "solid"), "SB": ("green", "outline")}
        self.assertEqual(worst_pair(assign, {PF_SB}), (100.0, 100.0, PF_SB))

    def test_red_and_green_are_far_apart_for_normal_vision_and_closer_for_cvd(self):
        normal = delta_e(HUES["red"], HUES["green"])
        cvd = min(delta_e(HUES["red"], HUES["green"], kind=k) for k in ("protan", "deutan", "tritan"))
        self.assertGreater(normal, 15.0)          # the hard floor, easily
        self.assertLess(cvd, normal)              # red/green is the classic loss

    def test_cooccurrence_is_the_pairs_that_share_a_bed(self):
        beds = [{"items": {"PF": 1, "SB": 2}}, {"items": {"SB": 1, "JH": 1}}, {"items": {"RR": 5}}]
        self.assertEqual(cooccurrence(beds), {PF_SB, frozenset(["SB", "JH"])})


if __name__ == "__main__":
    unittest.main()
