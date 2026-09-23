"""Build infected leaf + wood textures from Samples cutouts / logs.

Leaves: grayscale lift 0–2 (foliage tint in-engine). Stage 3 = snow_layer cream, no tint.
Wood: keep bark pattern, lift toward cream 0–2, stage 3 = snow remap. No foliage tint.

  python tools/buildInfectedVegetationTextures.py
  python tools/buildInfectedVegetationTextures.py --foliage
"""
from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "tools" / "_samples"
SNOW_LAYER = ROOT / "RP - Dev" / "textures" / "blocks" / "'snow'_layer.png"
OUT_DIRS = [
    ROOT / "RP" / "textures" / "blocks",
    ROOT / "RP - Dev" / "textures" / "blocks",
]

TINTED_STAGES = (
    {"suffix": "0", "lift": 0.00},
    {"suffix": "1", "lift": 0.34},
    {"suffix": "2", "lift": 0.60},
)

LEAF_SPECIES = (
    {"id": "oak", "file": "leaves_oak", "also": ["infected_oak_leaves.png", "infected_oak_leaves_oak.png"]},
    {"id": "birch", "file": "leaves_birch"},
    {"id": "spruce", "file": "leaves_spruce"},
    {"id": "jungle", "file": "leaves_jungle"},
    {"id": "acacia", "file": "leaves_acacia"},
    {"id": "dark_oak", "file": "leaves_big_oak"},
    {"id": "mangrove", "file": "mangrove_leaves"},
    {"id": "cherry", "file": "cherry_leaves"},
    {"id": "azalea", "file": "azalea_leaves"},
    {"id": "flowering_azalea", "file": "azalea_leaves_flowers"},
    {"id": "pale_oak", "file": "pale_oak_leaves"},
    {"id": "red_poplar", "file": "red_poplar_leaves"},
    {"id": "orange_poplar", "file": "orange_poplar_leaves"},
    {"id": "yellow_poplar", "file": "yellow_poplar_leaves"},
)

WOOD_SPECIES = (
    {"id": "oak", "log_side": "log_oak", "log_top": "log_oak_top",
     "stripped_side": "stripped_oak_log", "stripped_top": "stripped_oak_log_top"},
    {"id": "birch", "log_side": "log_birch", "log_top": "log_birch_top",
     "stripped_side": "stripped_birch_log", "stripped_top": "stripped_birch_log_top"},
    {"id": "spruce", "log_side": "log_spruce", "log_top": "log_spruce_top",
     "stripped_side": "stripped_spruce_log", "stripped_top": "stripped_spruce_log_top"},
    {"id": "jungle", "log_side": "log_jungle", "log_top": "log_jungle_top",
     "stripped_side": "stripped_jungle_log", "stripped_top": "stripped_jungle_log_top"},
    {"id": "acacia", "log_side": "log_acacia", "log_top": "log_acacia_top",
     "stripped_side": "stripped_acacia_log", "stripped_top": "stripped_acacia_log_top"},
    {"id": "dark_oak", "log_side": "log_big_oak", "log_top": "log_big_oak_top",
     "stripped_side": "stripped_dark_oak_log", "stripped_top": "stripped_dark_oak_log_top"},
    {"id": "mangrove", "log_side": "mangrove_log_side", "log_top": "mangrove_log_top",
     "stripped_side": "stripped_mangrove_log_side", "stripped_top": "stripped_mangrove_log_top"},
    {"id": "cherry", "log_side": "cherry_log_side", "log_top": "cherry_log_top",
     "stripped_side": "stripped_cherry_log_side", "stripped_top": "stripped_cherry_log_top"},
    {"id": "pale_oak", "log_side": "pale_oak_log_side", "log_top": "pale_oak_log_top",
     "stripped_side": "stripped_pale_oak_log_side", "stripped_top": "stripped_pale_oak_log_top"},
    {"id": "poplar", "log_side": "poplar_log", "log_top": "poplar_log_top",
     "stripped_side": "stripped_poplar_log", "stripped_top": "stripped_poplar_log_top"},
    {"id": "crimson", "log_side": "crimson_log_side", "log_top": "crimson_log_top",
     "stripped_side": "stripped_crimson_stem_side", "stripped_top": "stripped_crimson_stem_top"},
    {"id": "warped", "log_side": "warped_stem_side", "log_top": "warped_stem_top",
     "stripped_side": "stripped_warped_stem_side", "stripped_top": "stripped_warped_stem_top"},
)

WART_BLOCKS = (
    {"id": "nether_wart", "file": "nether_wart_block"},
    {"id": "warped_wart", "file": "warped_wart_block"},
)


SAMPLE_ALTS = {
    "poplar_log": ("poplar_log_side",),
    "stripped_poplar_log": ("stripped_poplar_log_side",),
    "short_grass": ("tallgrass", "grass"),
    "double_plant_grass_bottom": ("tallgrass", "short_grass"),
    "double_plant_grass_top": ("double_plant_grass_bottom", "tallgrass"),
    "double_plant_fern_bottom": ("fern",),
    "double_plant_fern_top": ("double_plant_fern_bottom", "fern"),
    "vine": ("vine_carried",),
    "mushroom_block_skin_brown": ("mushroom_block_inside",),
    "mushroom_block_skin_red": ("mushroom_block_inside",),
    "mushroom_block_skin_stem": ("mushroom_block_inside",),
    "red_shrub": ("deadbush",),
    "firefly_bush": ("sweet_berry_bush", "tallgrass"),
    "nether_sprouts": ("warped_roots",),
    "twisting_vines": ("twisting_vines_base", "twisting_vines_plant"),
    "weeping_vines": ("weeping_vines_base", "weeping_vines_plant"),
}


def load_sample(stem):
    alts = [stem, *SAMPLE_ALTS.get(stem, ())]
    for candidate in alts:
        for ext in (".tga", ".png"):
            path = SAMPLES / f"{candidate}{ext}"
            if path.is_file():
                return Image.open(path).convert("RGBA")
    raise FileNotFoundError(stem)


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


# Vanilla grass/fern TGAs fill the bottom rows (green hides on grass_block).
# Powder cream does not — punch extra cutout holes toward the base.
# alpha_test cannot do partial alpha.
FADE_BASE_IDS = {
    "short_grass",
    "tall_grass",
    "fern",
    "large_fern",
}


def fade_plant_base(im):
    """Keep vanilla blade holes; thin only the filled clump at the base.

    Bayer dither on a solid row becomes a checkerboard and sparkles under
    alpha_test. Keep columns that already had blades above; drop the fill.
    """
    w, h = im.size
    px = im.load()
    bottom_fill = sum(1 for x in range(w) if px[x, h - 1][3] > 0) / float(w)
    if bottom_fill < 0.55:
        return im
    stem_until = max(1, int(h * 0.50))
    stems = [False] * w
    for y in range(stem_until):
        for x in range(w):
            if px[x, y][3] > 0:
                stems[x] = True
    if sum(stems) >= w * 0.70:
        stems = [False] * w
        for y in range(max(1, int(h * 0.32))):
            for x in range(w):
                if px[x, y][3] > 0:
                    stems[x] = True
    fade_from = int(h * 0.72)
    for y in range(fade_from, h):
        t = (y - fade_from) / max(1.0, (h - 1 - fade_from))
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if stems[x]:
                continue
            if t >= 0.15:
                px[x, y] = (r, g, b, 0)
    fill_hole_rgb(im)
    return im


def bake_white_tinted_cutout(src, mix=0.58):
    """Vanilla plant cutout with a white powder tint — keep the pattern."""
    w, h = src.size
    src_px = src.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src_px[x, y]
            if a == 0:
                continue
            dst[x, y] = (
                int(r + (255 - r) * mix),
                int(g + (255 - g) * mix),
                int(b + (255 - b) * mix),
                a
            )
    return out


def bake_powder_stage(leaves, snow, holes=True):
    pal = snow_palette(snow)
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
            t = 0.35 + t * 0.65
            pr, pg, pb = lerp_palette(pal, t)
            dst[x, y] = (pr, pg, pb, a)
    if holes:
        fill_hole_rgb(out)
    return out


# Vanilla leaf_litter is a grayscale cutout, tinted dry_foliage (#A37546) in-engine.
DRY_FOLIAGE = (163, 117, 70)


def bake_dusted_leaf_litter(src, snow):
    """Keep leaf-shaped holes and brown dry-foliage color; dust with powder cream."""
    pal = snow_palette(snow)
    w, h = src.size
    px = src.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            if a < 16 or luma < 18:
                continue
            t = luma / 255.0
            br = int(DRY_FOLIAGE[0] * t)
            bg = int(DRY_FOLIAGE[1] * t)
            bb = int(DRY_FOLIAGE[2] * t)
            sr, sg, sb = lerp_palette(pal, 0.40 + 0.50 * t)
            mix = 0.34 + 0.40 * t
            dst[x, y] = (
                int(br * (1.0 - mix) + sr * mix),
                int(bg * (1.0 - mix) + sg * mix),
                int(bb * (1.0 - mix) + sb * mix),
                255,
            )
    fill_hole_rgb(out)
    return out


def bake_wood_stage(src, lift, snow, powder):
    if powder:
        return bake_powder_stage(src, snow, holes=False)
    w, h = src.size
    px = src.load()
    pal = snow_palette(snow)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            cr, cg, cb = lerp_palette(pal, 0.55 + 0.35 * ((0.299 * r + 0.587 * g + 0.114 * b) / 255.0))
            nr = int(r + (cr - r) * lift)
            ng = int(g + (cg - g) * lift)
            nb = int(b + (cb - b) * lift)
            dst[x, y] = (nr, ng, nb, a)
    return out


def save_all(im, name):
    for out_dir in OUT_DIRS:
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / name
        im.save(path)


def build_leaves(snow):
    for spec in LEAF_SPECIES:
        leaves = load_sample(spec["file"])
        for stage in TINTED_STAGES:
            im = bake_tinted_stage(leaves, stage["lift"])
            save_all(im, f"infected_{spec['id']}_leaves_{stage['suffix']}.png")
            if spec["id"] == "oak" and stage["suffix"] == "0":
                for extra in spec.get("also", []):
                    save_all(im, extra)
            if spec["id"] == "birch" and stage["suffix"] == "0":
                save_all(im, "infected_birch_leaves.png")
        save_all(bake_powder_stage(leaves, snow), f"infected_{spec['id']}_leaves_3.png")
        print("leaves", spec["id"])


def build_wood(snow):
    for spec in WOOD_SPECIES:
        pairs = (
            ("log_side", spec["log_side"]),
            ("log_top", spec["log_top"]),
            ("stripped_side", spec["stripped_side"]),
            ("stripped_top", spec["stripped_top"]),
        )
        for kind, stem in pairs:
            src = load_sample(stem)
            for stage in TINTED_STAGES:
                im = bake_wood_stage(src, stage["lift"], snow, False)
                save_all(im, f"infected_{spec['id']}_{kind}_{stage['suffix']}.png")
            save_all(bake_wood_stage(src, 1.0, snow, True), f"infected_{spec['id']}_{kind}_3.png")
        print("wood", spec["id"])


FOLIAGE = (
    {"id": "short_grass", "file": "short_grass"},
    {"id": "tall_grass", "file": "double_plant_grass_bottom", "top_file": "double_plant_grass_top"},
    {"id": "fern", "file": "fern"},
    {"id": "large_fern", "file": "double_plant_fern_bottom", "top_file": "double_plant_fern_top"},
    {"id": "firefly_bush", "file": "firefly_bush"},
    {"id": "brown_mushroom", "file": "mushroom_brown"},
    {"id": "red_mushroom", "file": "mushroom_red"},
    {"id": "red_shrub", "file": "red_shrub"},
    {"id": "leaf_litter", "file": "leaf_litter"},
    {"id": "vine", "file": "vine"},
    {"id": "brown_mushroom_block", "file": "mushroom_block_skin_brown"},
    {"id": "red_mushroom_block", "file": "mushroom_block_skin_red"},
    {"id": "mushroom_stem", "file": "mushroom_block_skin_stem"},
    {"id": "warped_roots", "file": "warped_roots"},
    {"id": "crimson_roots", "file": "crimson_roots"},
    {"id": "nether_sprouts", "file": "nether_sprouts"},
    {"id": "warped_fungus", "file": "warped_fungus"},
    {"id": "crimson_fungus", "file": "crimson_fungus"},
    {"id": "twisting_vines", "file": "twisting_vines"},
    {"id": "weeping_vines", "file": "weeping_vines"},
)


# August KEEP (2026-09-19): dusty grass blades and leaf litter. Do not rebake.
KEEP_FOLIAGE_IDS = {"short_grass", "tall_grass", "fern", "large_fern", "leaf_litter"}


def build_foliage(snow):
    force_keep = "--force-keep" in sys.argv
    for spec in FOLIAGE:
        if spec["id"] in KEEP_FOLIAGE_IDS and not force_keep:
            print("keep", spec["id"])
            continue
        src = load_sample(spec["file"])
        if spec["id"] == "leaf_litter":
            im = bake_dusted_leaf_litter(src, snow)
        elif spec["id"] == "vine":
            im = bake_white_tinted_cutout(src, 0.58)
        else:
            im = bake_powder_stage(src, snow, holes=True)
            if spec["id"] in FADE_BASE_IDS:
                im = fade_plant_base(im)
        save_all(im, f"infected_{spec['id']}.png")
        top_file = spec.get("top_file")
        if top_file:
            top = bake_powder_stage(load_sample(top_file), snow, holes=True)
            save_all(top, f"infected_{spec['id']}_top.png")
        print("foliage", spec["id"])


def build_wart(snow):
    for spec in WART_BLOCKS:
        src = load_sample(spec["file"])
        for stage in TINTED_STAGES:
            im = bake_wood_stage(src, stage["lift"], snow, False)
            save_all(im, f"infected_{spec['id']}_block_{stage['suffix']}.png")
        save_all(bake_wood_stage(src, 1.0, snow, True), f"infected_{spec['id']}_block_3.png")
        print("wart", spec["id"])


def build_dusted_podzol(snow):
    """Podzol keeps its pine-floor look with powder mixed in — not dusted_dirt."""
    try:
        top = load_sample("dirt_podzol_top")
        side = load_sample("dirt_podzol_side")
    except FileNotFoundError:
        print("skip dusted_podzol (no dirt_podzol_* samples)")
        return
    pal = snow_palette(snow)
    def dust(im, mix):
        w, h = im.size
        src = im.load()
        out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        dst = out.load()
        lumas = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = src[x, y]
                if a:
                    lumas.append(0.299 * r + 0.587 * g + 0.114 * b)
        lo = min(lumas) if lumas else 0
        hi = max(lumas) if lumas else 255
        span = max(1.0, hi - lo)
        for y in range(h):
            for x in range(w):
                r, g, b, a = src[x, y]
                if a == 0:
                    continue
                luma = 0.299 * r + 0.587 * g + 0.114 * b
                t = (luma - lo) / span
                pr, pg, pb = lerp_palette(pal, 0.35 + t * 0.65)
                dst[x, y] = (
                    int(r + (pr - r) * mix),
                    int(g + (pg - g) * mix),
                    int(b + (pb - b) * mix),
                    255
                )
        return out
    top_d = dust(top, 0.48)
    side_d = dust(side, 0.38)
    atlas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    atlas.paste(side_d, (0, 0))
    atlas.paste(side_d, (0, 16))
    atlas.paste(side_d, (16, 0))
    atlas.paste(side_d, (16, 16))
    atlas.paste(top_d, (0, 32))
    atlas.paste(side_d, (32, 16))
    save_all(atlas, "dusted_podzol.png")
    print("dusted_podzol")


def main():
    snow = Image.open(SNOW_LAYER).convert("RGBA")
    foliage_only = "--foliage" in sys.argv
    if not foliage_only:
        build_leaves(snow)
        build_wood(snow)
        build_wart(snow)
    build_foliage(snow)
    build_dusted_podzol(snow)
    print("ok vegetation textures" + (" (foliage only)" if foliage_only else ""))


if __name__ == "__main__":
    main()
