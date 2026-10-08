"""Fence run lengths for Baxter's signed-off revision.

A run is a polyline of vertices in the sheet's displayed points. The scale is the
drawn bar, 60 ft = 46.59 pt, so FT = 0.7765 pt per foot (the same scale every other
Baxter tool uses). Pure: no files. tools/baxter-rev-fences.py in the room picks the
vertices off the vector sheet and calls this.
"""

import math

FT = 0.7765


def run_feet(points):
    """Length of the polyline `points` in feet; 0.0 for fewer than two vertices."""
    total = 0.0
    for a, b in zip(points, points[1:]):
        total += math.hypot(b[0] - a[0], b[1] - a[1])
    return total / FT


def round_ft(feet, step=5):
    """`feet` rounded to the nearest `step` feet, as an int, for 'about N ft'."""
    return int(step * round(feet / step))
