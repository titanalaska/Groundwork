"""Chain exploded vector fragments back into whole shapes.

Baxter's bid set (The Boutet Company, sheet L1) reached us as 105,415 paths
with no CAD layers: a shrub circle is hundreds of 0.1 pt lines, a glyph is a
filled sliver, and nothing says which pieces belong together. The pieces DO
share endpoints, exactly, so joining segments at equal endpoints rebuilds
each symbol as one component. The component's bounding-box centre is the
plant; its loose ends, if any, say it is an open chain (a leader line) rather
than a closed symbol.

Pure: no pymupdf, no files. The room's tools/baxter-symbols.py and
tools/baxter-beds.py feed it segments in the displayed sheet frame.
"""


def components(segments, tol=0.1):
    """Group segments ((x0, y0), (x1, y1)) that share an endpoint (within tol).

    Returns one dict per component: segs, x0, y0, x1, y1 (bounding box),
    cx, cy (its centre), and ends -- the endpoints touched by exactly one
    segment, [] for a closed shape."""
    par = {}

    def key(p):
        return (round(p[0] / tol), round(p[1] / tol))

    def find(x):
        while par.setdefault(x, x) != x:
            par[x] = par[par[x]]
            x = par[x]
        return x

    for a, b in segments:
        par[find(key(a))] = find(key(b))

    groups = {}
    for a, b in segments:
        groups.setdefault(find(key(a)), []).append((a, b))

    out = []
    for segs in groups.values():
        xs = [p[0] for s in segs for p in s]
        ys = [p[1] for s in segs for p in s]
        degree, first, length = {}, {}, 0.0
        for a, b in segs:
            length += ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5
            for p in (a, b):
                k = key(p)
                degree[k] = degree.get(k, 0) + 1
                first.setdefault(k, p)
        ends = [first[k] for k, n in degree.items() if n == 1]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        out.append({"segs": len(segs), "len": length, "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                    "cx": (x0 + x1) / 2.0, "cy": (y0 + y1) / 2.0, "ends": ends})
    return out


def outermost(comps, limit=30.0):
    """Drop every component whose centre lies inside a bigger, symbol-sized
    component's box: the interior marks of a symbol (a cross, a dot) are not
    a second plant. Only a component with both sides <= limit can be a
    container -- the site outline covers the whole plan and swallows nothing."""
    boxes = [o for o in comps if o["x1"] - o["x0"] <= limit and o["y1"] - o["y0"] <= limit]

    def area(o):
        return (o["x1"] - o["x0"]) * (o["y1"] - o["y0"])

    keep = []
    for c in comps:
        inside = any(o is not c and area(o) > area(c)
                     and o["x0"] <= c["cx"] <= o["x1"] and o["y0"] <= c["cy"] <= o["y1"]
                     for o in boxes)
        if not inside:
            keep.append(c)
    return keep
