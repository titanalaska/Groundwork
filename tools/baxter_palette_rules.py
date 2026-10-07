"""Scoring rules for a species palette on the Baxter pictures.

The Baxter sheet is monochrome, so the callout pills are drawn, and -- as on
WSRCC -- their colour says WHICH plant, not which category. The rules here
are what tools/baxter-palette.py (in the room) optimises against:

  - HUES: the eight validated categorical slots, exactly as wsrcc-palette.json
    uses them. No invented hexes.
  - a second channel, solid fill vs outlined pill, that colour-vision
    deficiency cannot touch: two species that differ in style are always told
    apart, whatever their hues.
  - delta_e: CIE76 in Lab, for normal vision or after a Machado et al. (2009)
    severity-1.0 simulation of protanopia, deuteranopia or tritanopia on
    linear RGB.
  - worst_pair: over the pairs that actually share a bed, the one hardest to
    tell apart -- scored by the weakest CVD simulation first, then normal
    vision. Pairs that never share a bed may share a slot.

Pure; the search and the picture-drawing live in the room.
"""

HUES = {
    "magenta": "#e87ba4", "green": "#008300", "orange": "#eb6834", "aqua": "#1baf7a",
    "blue": "#2a78d6", "yellow": "#eda100", "violet": "#4a3aa7", "red": "#e34948",
}
STYLES = ("solid", "outline")

# Machado, Oliveira & Fernandes 2009, severity 1.0, applied to linear sRGB.
CVD = {
    "protan": ((0.152286, 1.052583, -0.204868), (0.114503, 0.786281, 0.099216), (-0.003882, -0.048116, 1.051998)),
    "deutan": ((0.367322, 0.860646, -0.227968), (0.280085, 0.672501, 0.047413), (-0.011820, 0.042940, 0.968881)),
    "tritan": ((1.255528, -0.076749, -0.178779), (-0.078411, 0.930809, 0.147602), (0.004733, 0.691367, 0.303900)),
}


def _linear(hexcol):
    h = hexcol.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return out


def _simulate(rgb, kind):
    if kind is None:
        return rgb
    m = CVD[kind]
    return [max(0.0, min(1.0, sum(m[r][c] * rgb[c] for c in range(3)))) for r in range(3)]


def _lab(rgb):
    r, g, b = rgb
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 1.0
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t):
        return t ** (1 / 3.0) if t > 0.008856 else 7.787 * t + 16 / 116.0

    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(hex_a, hex_b, kind=None):
    """CIE76 distance between two colours, for normal vision or one CVD."""
    la = _lab(_simulate(_linear(hex_a), kind))
    lb = _lab(_simulate(_linear(hex_b), kind))
    return sum((p - q) ** 2 for p, q in zip(la, lb)) ** 0.5


def pair_score(a, b):
    """(normal dE, worst-CVD dE) for two (hue, style) slots; styles differ -> (100, 100)."""
    if a[1] != b[1]:
        return (100.0, 100.0)
    ha, hb = HUES[a[0]], HUES[b[0]]
    normal = delta_e(ha, hb)
    cvd = min(delta_e(ha, hb, kind=k) for k in CVD)
    return (normal, cvd)


def worst_pair(assign, pairs):
    """The co-occurring pair hardest to tell apart: (dE_normal, dE_cvd, pair),
    lowest CVD distance first, then lowest normal distance."""
    worst = None
    for pair in pairs:
        a, b = sorted(pair)
        normal, cvd = pair_score(assign[a], assign[b])
        key = (cvd, normal)
        if worst is None or key < worst[0]:
            worst = (key, pair)
    if worst is None:
        return (100.0, 100.0, None)
    (cvd, normal), pair = worst
    return (normal, cvd, pair)


def cooccurrence(beds):
    """Every pair of codes that share at least one bed."""
    out = set()
    for b in beds:
        codes = sorted(b["items"])
        for i in range(len(codes)):
            for j in range(i + 1, len(codes)):
                out.add(frozenset((codes[i], codes[j])))
    return out
