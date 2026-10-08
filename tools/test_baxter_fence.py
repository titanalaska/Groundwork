"""Fence run lengths for Baxter's signed-off revision.

A run is a polyline of vertices in the sheet's displayed points; the scale is the
drawn bar, 0.7765 pt per foot (60 ft = 46.59 pt). Expected values are worked by
hand from the fixtures, not read back from the function.
"""

import unittest

from baxter_fence import FT, round_ft, run_feet


class RunFeet(unittest.TestCase):
    def test_scale_is_the_drawn_bar(self):
        # 60 ft of bar = 46.59 pt  ->  46.59 / 60 = 0.7765
        self.assertAlmostEqual(FT, 46.59 / 60, places=4)

    def test_three_four_five_in_feet(self):
        # 30 ft east, then 40 ft south: two legs, 30 + 40 = 70 ft.
        pts = [(0, 0), (30 * FT, 0), (30 * FT, 40 * FT)]
        self.assertAlmostEqual(run_feet(pts), 70.0, places=2)

    def test_the_diagonal_is_the_hypotenuse(self):
        # One leg straight across: 30 ft by 40 ft is 50 ft (3-4-5 scaled by 10).
        self.assertAlmostEqual(run_feet([(0, 0), (30 * FT, 40 * FT)]), 50.0, places=2)

    def test_a_single_point_is_nothing(self):
        self.assertEqual(run_feet([(5, 5)]), 0.0)
        self.assertEqual(run_feet([]), 0.0)

    def test_direction_does_not_matter(self):
        pts = [(0, 0), (30 * FT, 0), (30 * FT, 40 * FT)]
        self.assertAlmostEqual(run_feet(pts), run_feet(list(reversed(pts))), places=6)


class RoundFt(unittest.TestCase):
    def test_nearest_five(self):
        # 435.1 / 5 = 87.02 -> 87 -> 435;  51.3 / 5 = 10.26 -> 10 -> 50;
        # 98.8 / 5 = 19.76 -> 20 -> 100;   295.9 / 5 = 59.18 -> 59 -> 295.
        self.assertEqual([round_ft(x) for x in (435.1, 51.3, 98.8, 295.9)], [435, 50, 100, 295])

    def test_step_is_a_parameter(self):
        self.assertEqual(round_ft(98.8, step=10), 100)
        self.assertEqual(round_ft(94.0, step=10), 90)


if __name__ == "__main__":
    unittest.main()
