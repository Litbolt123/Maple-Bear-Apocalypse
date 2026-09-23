"""Rebuild infected oak leaves from Samples oak TGA.

Stages 0–2 stay grayscale so biome default_foliage tints them (VAN dusty,
LIST green). Stage 3 bakes the snow_layer cream and is NOT foliage-tinted,
so the last look reads as powder in every biome.

  python tools/buildInfectedOakLeavesTexture.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VANILLA = ROOT / "tools" / "_tmp_leaves_oak.tga"
BIRCH = ROOT / "tools" / "_tmp_leaves_birch.tga"
SNOW_LAYER = ROOT / "RP - Dev" / "textures" / "blocks" / "'snow'_layer.png"
OUT_DIRS = [
    ROOT / "RP" / "textures" / "blocks",
    ROOT / "RP - Dev" / "textures" / "blocks",
]

# lift 0 = exact oak. Higher = paler under the same biome tint.
TINTED_STAGES = (
    {"suffix": "0", "lift": 0.00},
    {"suffix": "1", "lift": 0.34},
    {"suffix": "2", "lift": 0.60},
)


def load_rgba(path):
    return Image.open(path).convert("RGBA")


def fill_hole_rgb(im):
    px = im.load()
    w, h = im.size
    leaf = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0:
                leaf.append((x, y, r, g, b))
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a != 0 or not leaf:
                continue
            best = leaf[0]
            bd = 10**9
            for lx, ly, lr, lg, lb in leaf:
                d = (lx - x) * (lx - x) + (ly - y) * (ly - y)
                if d < bd:
                    bd = d
                    best = (lx, ly, lr, lg, lb)
            px[x, y] = (best[2], best[3], best[4], 0)


def bake_tinted_stage(leaves, lift):
    w, h = leaves.size
    src = leaves.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a == 0:
                continue
            if lift > 0:
                r = int(r + (255 - r) * lift)
                g = int(g + (255 - g) * lift)
                b = int(b + (255 - b) * lift)
            dst[x, y] = (r, g, b, a)
    fill_hole_rgb(out)
    return out


def snow_palette(im, max_n=48):
    px = im.load()
    w, h = im.size
    found = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 32:
                continue
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            if luma < 40:
                continue
            found.append((r, g, b, luma))
    found.sort(key=lambda t: t[3])
    uniq = []
    seen = set()
    for r, g, b, luma in found:
        key = (r // 6, g // 6, b // 6)
        if key in seen:
            continue
        seen.add(key)
        uniq.append((r, g, b, luma))
        if len(uniq) >= max_n:
            break
    return uniq or [(214, 204, 188, 206), (232, 224, 210, 225), (244, 238, 228, 239)]


def lerp_palette(palette, t):
    t = max(0.0, min(1.0, t))
    if len(palette) == 1:
        r, g, b, _ = palette[0]
        return r, g, b
    pos = t * (len(palette) - 1)
    i = int(pos)
    f = pos - i
    if i >= len(palette) - 1:
        r, g, b, _ = palette[-1]
        return r, g, b
    r1, g1, b1, _ = palette[i]
    r2, g2, b2, _ = palette[i + 1]
    return (
        int(r1 + (r2 - r1) * f),
        int(g1 + (g2 - g1) * f),
        int(b1 + (b2 - b1) * f),
    )


def bake_powder_stage(leaves, snow):
    """Oak cutouts remapped onto the snow_layer cream. No engine tint."""
    pal = snow_palette(snow)
    lumas = [t[3] for t in pal]
    lo, hi = min(lumas), max(lumas)
    w, h = leaves.size
    src = leaves.load()
    leaf_lumas = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a == 0:
                continue
            leaf_lumas.append(0.299 * r + 0.587 * g + 0.114 * b)
    oak_lo = min(leaf_lumas) if leaf_lumas else 0
    oak_hi = max(leaf_lumas) if leaf_lumas else 255
    oak_span = max(1.0, oak_hi - oak_lo)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a == 0:
                continue
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            t = (luma - oak_lo) / oak_span
            # Bias toward the light end of the powder so LIST reads white, not tan dirt.
            t = 0.35 + t * 0.65
            pr, pg, pb = lerp_palette(pal, t)
            dst[x, y] = (pr, pg, pb, a)
    fill_hole_rgb(out)
    print("powder stage snow luma", round(lo), round(hi), "n", len(pal))
    return out


def save_all(im, name):
    for out_dir in OUT_DIRS:
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / name
        im.save(path)
        print("wrote", path, im.size, im.mode)


def main():
    leaves = load_rgba(VANILLA)
    for spec in TINTED_STAGES:
        im = bake_tinted_stage(leaves, spec["lift"])
        save_all(im, f"infected_oak_leaves_{spec['suffix']}.png")
        if spec["suffix"] == "0":
            save_all(im, "infected_oak_leaves_oak.png")
            save_all(im, "infected_oak_leaves.png")
    save_all(bake_powder_stage(leaves, load_rgba(SNOW_LAYER)), "infected_oak_leaves_3.png")
    if BIRCH.is_file():
        save_all(bake_tinted_stage(load_rgba(BIRCH), 0.0), "infected_birch_leaves.png")


if __name__ == "__main__":
    main()
