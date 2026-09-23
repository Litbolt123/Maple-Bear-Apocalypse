"""Infected sheep from vanilla sheep.tga, wool painted with snow_layer TOP.

The powder look players see on the ground is geometry.'snow'_layer UP face:
uv (0,0) size 16x16 on the 32x32 `'snow'_layer.png`. That crop is the
reference — not dusted dirt, not a brown wash.

  python tools/buildInfectedSheepTexture.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VANILLA = ROOT / "tools" / "_tmp_sheep.tga"
SNOW = ROOT / "RP - Dev" / "textures" / "blocks" / "'snow'_layer.png"
OUT_ENTITY = [
    ROOT / "RP" / "textures" / "entity" / "infected_sheep.png",
    ROOT / "RP - Dev" / "textures" / "entity" / "infected_sheep.png",
]
OUT_EGG = [
    ROOT / "RP" / "textures" / "items" / "infected_sheep_egg.png",
    ROOT / "RP - Dev" / "textures" / "items" / "infected_sheep_egg.png",
]


def load_rgba(path):
    return Image.open(path).convert("RGBA")


def snow_layer_top(snow):
    """UP face of mb:snow_layer (geo uv 0,0 / 16x16 on a 32x32 sheet)."""
    w, h = snow.size
    tw = 16 if w >= 32 else w
    th = 16 if h >= 32 else h
    return snow.crop((0, 0, tw, th))


def dust_sheep(src, top):
    """Wool = snow_layer top grain. Face stays a sheep. No brown blotches."""
    out = src.copy()
    px = src.load()
    ox = out.load()
    tp = top.load()
    tw, th = top.size
    w, h = src.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                ox[x, y] = (r, g, b, a)
                continue
            luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            is_eye = r < 48 and g < 48 and b < 48 and luma < 0.2
            if is_eye:
                ox[x, y] = (r, g, b, a)
                continue
            sr, sg, sb, _ = tp[x % tw, y % th]
            if luma > 0.45:
                mix = 0.88
            elif luma > 0.28:
                mix = 0.55
            else:
                mix = 0.28
            nr = int(r * (1 - mix) + sr * mix)
            ng = int(g * (1 - mix) + sg * mix)
            nb = int(b * (1 - mix) + sb * mix)
            ox[x, y] = (
                max(0, min(255, nr)),
                max(0, min(255, ng)),
                max(0, min(255, nb)),
                a,
            )
    return out


def make_egg(entity):
    w, h = entity.size
    crop = entity.crop((int(w * 0.42), int(h * 0.55), int(w * 0.78), int(h * 0.92)))
    egg = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    inner = crop.resize((12, 12), Image.Resampling.NEAREST)
    egg.paste(inner, (2, 2))
    px = egg.load()
    for x in range(16):
        for y in range(16):
            dx = abs(x - 7.5) / 8.0
            dy = abs(y - 7.5) / 8.0
            if dx * dx + dy * dy > 0.92:
                px[x, y] = (0, 0, 0, 0)
            elif px[x, y][3] < 8:
                px[x, y] = (226, 214, 204, 255)
    return egg


def main():
    if not VANILLA.exists():
        raise SystemExit(f"Missing {VANILLA}")
    src = load_rgba(VANILLA)
    top = snow_layer_top(load_rgba(SNOW))
    dusty = dust_sheep(src, top)
    egg = make_egg(dusty)
    for p in OUT_ENTITY:
        p.parent.mkdir(parents=True, exist_ok=True)
        dusty.save(p)
        print("wrote", p)
    for p in OUT_EGG:
        p.parent.mkdir(parents=True, exist_ok=True)
        egg.save(p)
        print("wrote", p)
    print("snow top", top.size)


if __name__ == "__main__":
    main()
