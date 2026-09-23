"""Recolor mb:snow item + snow_layer toward dusted-dirt crust + existing layer grain.

Keeps alpha / silhouette. Does not change identifiers.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DUST = ROOT / "RP - Dev" / "textures" / "blocks" / "dusted_dirt.png"
LAYER = ROOT / "RP - Dev" / "textures" / "blocks" / "'snow'_layer.png"
ITEM = ROOT / "RP - Dev" / "textures" / "items" / "mb_snow.png"
OUT_PAIRS = [
    (ITEM, ROOT / "RP" / "textures" / "items" / "mb_snow.png"),
    (LAYER, ROOT / "RP" / "textures" / "blocks" / "'snow'_layer.png"),
]


def load_rgba(path):
    return Image.open(path).convert("RGBA")


def collect_palette(im, min_luma=0, skip_near_black=18, max_n=64):
    px = im.load()
    w, h = im.size
    found = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 32:
                continue
            if r + g + b < skip_near_black * 3:
                continue
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            if luma < min_luma:
                continue
            found.append((r, g, b, luma))
    found.sort(key=lambda t: t[3])
    uniq = []
    seen = set()
    for r, g, b, luma in found:
        key = (r // 5, g // 5, b // 5)
        if key in seen:
            continue
        seen.add(key)
        uniq.append((r, g, b, luma))
        if len(uniq) >= max_n:
            break
    return uniq or [(214, 204, 188, 206), (232, 224, 210, 225)]


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


def remap(im, pal, luma_lo, luma_hi):
    px = im.load()
    w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    span = max(1.0, luma_hi - luma_lo)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            t = (luma - luma_lo) / span
            # Keep a little source grain so it does not go flat.
            pr, pg, pb = lerp_palette(pal, t)
            dst[x, y] = (
                int(pr * 0.90 + r * 0.10),
                int(pg * 0.90 + g * 0.10),
                int(pb * 0.90 + b * 0.10),
                a,
            )
    return out


def save_both(src_path, im):
    im.save(src_path)
    print("wrote", src_path)
    for orig, rel in OUT_PAIRS:
        if orig.resolve() == src_path.resolve():
            rel.parent.mkdir(parents=True, exist_ok=True)
            im.save(rel)
            print("wrote", rel)


def main():
    dust = load_rgba(DUST)
    layer = load_rgba(LAYER)
    item = load_rgba(ITEM)
    pal = collect_palette(dust, min_luma=140) + collect_palette(layer, min_luma=150)
    pal.sort(key=lambda t: t[3])

    item_out = remap(item, pal, luma_lo=140, luma_hi=255)
    layer_out = remap(layer, pal, luma_lo=170, luma_hi=250)
    save_both(ITEM, item_out)
    save_both(LAYER, layer_out)


if __name__ == "__main__":
    main()
