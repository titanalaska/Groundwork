"""Chaining exploded vector fragments back into whole symbols.

Baxter's bid set draws every plant symbol as hundreds of hairline pieces that
share endpoints. Joining pieces at shared endpoints gives one component per
symbol, whose bounding-box centre is the plant. These tests build the shapes
by hand so every expected number is known before the code runs:

  - a circle of 200 chords, radius 1.2, centred (10, 10): one component of
    200 segments, 2.4 wide, centre (10, 10)
  - a cross of 4 segments, half-length 0.5, at the same centre: one component
    INSIDE the circle's box -- an interior mark, dropped by outermost()
  - one lone 20 pt line far away: its own component, kept
"""

import math
import unittest

from baxter_chain import components, outermost


def circle(cx, cy, r, n):
    pts = [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
    return [(pts[i], pts[(i + 1) % n]) for i in range(n)]


CIRCLE = circle(10.0, 10.0, 1.2, 200)
CROSS = [((9.5, 10.0), (10.0, 10.0)), ((10.0, 10.0), (10.5, 10.0)),
         ((10.0, 9.5), (10.0, 10.0)), ((10.0, 10.0), (10.0, 10.5))]
LONE = [((50.0, 50.0), (70.0, 50.0))]


class Chain(unittest.TestCase):
    def test_three_shapes_make_three_components(self):
        out = components(CIRCLE + CROSS + LONE)
        self.assertEqual(len(out), 3)

    def test_the_circle_is_one_component_with_its_centre(self):
        out = components(CIRCLE + CROSS + LONE)
        c = max(out, key=lambda k: k["segs"])
        self.assertEqual(c["segs"], 200)
        self.assertAlmostEqual(c["x1"] - c["x0"], 2.4, delta=0.05)
        self.assertAlmostEqual(c["y1"] - c["y0"], 2.4, delta=0.05)
        self.assertAlmostEqual(c["cx"], 10.0, delta=0.02)
        self.assertAlmostEqual(c["cy"], 10.0, delta=0.02)
        self.assertEqual(c["ends"], [])            # closed: no loose ends

    def test_a_component_carries_its_drawn_length(self):
        # 200 chords of a radius-1.2 circle: 200 * 2 * 1.2 * sin(pi/200) = 7.539
        out = components(CIRCLE + LONE)
        by = {c["segs"]: c for c in out}
        self.assertAlmostEqual(by[200]["len"], 7.539, delta=0.01)
        self.assertAlmostEqual(by[1]["len"], 20.0, delta=0.001)

    def test_an_open_chain_reports_its_two_ends(self):
        out = components(LONE)
        self.assertEqual(len(out), 1)
        self.assertEqual(sorted(out[0]["ends"]), [(50.0, 50.0), (70.0, 50.0)])

    def test_outermost_drops_the_interior_cross_and_keeps_the_lone_line(self):
        out = outermost(components(CIRCLE + CROSS + LONE))
        self.assertEqual(len(out), 2)
        self.assertEqual(sorted(c["segs"] for c in out), [1, 200])

    def test_outermost_ignores_a_frame_bigger_than_a_symbol(self):
        # The site outline is one closed component whose box covers the whole
        # plan. It must not swallow the symbols inside it: only something
        # symbol-sized (both sides <= limit) can be a container.
        frame = [((0.0, 0.0), (100.0, 0.0)), ((100.0, 0.0), (100.0, 100.0)),
                 ((100.0, 100.0), (0.0, 100.0)), ((0.0, 100.0), (0.0, 0.0))]
        out = outermost(components(CIRCLE + CROSS + LONE + frame), limit=30)
        self.assertEqual(sorted(c["segs"] for c in out), [1, 4, 200])

    def test_endpoints_join_within_tolerance_only(self):
        # Two segments whose ends are 0.04 apart join at tol 0.1; 0.4 apart do not.
        near = [((0.0, 0.0), (1.0, 0.0)), ((1.04, 0.0), (2.0, 0.0))]
        far = [((0.0, 0.0), (1.0, 0.0)), ((1.4, 0.0), (2.0, 0.0))]
        self.assertEqual(len(components(near)), 1)
        self.assertEqual(len(components(far)), 2)


if __name__ == "__main__":
    unittest.main()
