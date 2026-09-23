"""Download Mojang Bedrock Samples leaf/log textures into tools/_samples/.

  python tools/downloadInfectedVegetationSamples.py
"""
from __future__ import annotations

import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools" / "_samples"
BASES = (
    "https://raw.githubusercontent.com/Mojang/bedrock-samples/main/resource_pack/textures/blocks",
    "https://raw.githubusercontent.com/Mojang/bedrock-samples/preview/resource_pack/textures/blocks",
)

ALTERNATE_STEMS = {
    "poplar_log": ("poplar_log_side",),
    "stripped_poplar_log": ("stripped_poplar_log_side",),
    "short_grass": ("tallgrass", "grass"),
    "tallgrass": ("double_plant_grass_bottom", "short_grass"),
    "double_plant_grass_bottom": ("tallgrass", "short_grass"),
    "double_plant_grass_top": ("double_plant_grass_bottom", "tallgrass"),
    "double_plant_fern_bottom": ("fern",),
    "double_plant_fern_top": ("double_plant_fern_bottom", "fern"),
    "vine": ("vine_carried",),
    "mushroom_block_skin_brown": ("mushroom_block_inside",),
    "mushroom_block_skin_red": ("mushroom_block_inside",),
    "mushroom_block_skin_stem": ("mushroom_block_inside",),
    "red_shrub": ("deadbush",),
    "nether_sprouts": ("warped_roots",),
    "twisting_vines": ("twisting_vines_base", "twisting_vines_plant"),
    "weeping_vines": ("weeping_vines_base", "weeping_vines_plant"),
}

FILES = [
    "leaves_oak",
    "leaves_birch",
    "leaves_spruce",
    "leaves_jungle",
    "leaves_acacia",
    "leaves_big_oak",
    "mangrove_leaves",
    "cherry_leaves",
    "azalea_leaves",
    "azalea_leaves_flowers",
    "pale_oak_leaves",
    "red_poplar_leaves",
    "orange_poplar_leaves",
    "yellow_poplar_leaves",
    "log_oak",
    "log_oak_top",
    "log_birch",
    "log_birch_top",
    "log_spruce",
    "log_spruce_top",
    "log_jungle",
    "log_jungle_top",
    "log_acacia",
    "log_acacia_top",
    "log_big_oak",
    "log_big_oak_top",
    "mangrove_log_side",
    "mangrove_log_top",
    "cherry_log_side",
    "cherry_log_top",
    "pale_oak_log_side",
    "pale_oak_log_top",
    "stripped_oak_log",
    "stripped_oak_log_top",
    "stripped_birch_log",
    "stripped_birch_log_top",
    "stripped_spruce_log",
    "stripped_spruce_log_top",
    "stripped_jungle_log",
    "stripped_jungle_log_top",
    "stripped_acacia_log",
    "stripped_acacia_log_top",
    "stripped_dark_oak_log",
    "stripped_dark_oak_log_top",
    "stripped_mangrove_log_side",
    "stripped_mangrove_log_top",
    "stripped_cherry_log_side",
    "stripped_cherry_log_top",
    "stripped_pale_oak_log_side",
    "stripped_pale_oak_log_top",
    "poplar_log",
    "poplar_log_top",
    "stripped_poplar_log",
    "stripped_poplar_log_top",
    "huge_fungus/crimson_log_side",
    "huge_fungus/crimson_log_top",
    "huge_fungus/warped_stem_side",
    "huge_fungus/warped_stem_top",
    "huge_fungus/stripped_crimson_stem_side",
    "huge_fungus/stripped_crimson_stem_top",
    "huge_fungus/stripped_warped_stem_side",
    "huge_fungus/stripped_warped_stem_top",
    "nether_wart_block",
    "warped_wart_block",
    "short_grass",
    "tallgrass",
    "fern",
    "double_plant_grass_bottom",
    "double_plant_grass_top",
    "double_plant_fern_bottom",
    "double_plant_fern_top",
    "firefly_bush",
    "mushroom_red",
    "mushroom_brown",
    "red_shrub",
    "vine",
    "leaf_litter",
    "mushroom_block_skin_brown",
    "mushroom_block_skin_red",
    "mushroom_block_skin_stem",
    "warped_roots",
    "crimson_roots",
    "nether_sprouts",
    "warped_fungus",
    "crimson_fungus",
    "twisting_vines",
    "weeping_vines",
]


def fetch_stem(stem: str) -> Path | None:
    OUT.mkdir(parents=True, exist_ok=True)
    wanted = stem.split("/")[-1]
    stems = (stem,) + ALTERNATE_STEMS.get(stem, ())
    for candidate in stems:
        for ext in (".tga", ".png"):
            dest = OUT / f"{wanted}{ext}"
            if dest.is_file() and dest.stat().st_size > 64:
                print("have", dest.name)
                return dest
            for base in BASES:
                url = f"{base}/{candidate}{ext}"
                try:
                    urllib.request.urlretrieve(url, dest)
                    if dest.stat().st_size < 64:
                        dest.unlink(missing_ok=True)
                        continue
                    print("got", dest.name, "from", candidate + ext)
                    return dest
                except Exception as err:
                    dest.unlink(missing_ok=True)
                    print("miss", candidate + ext, err)
    return None


def main():
    missing = []
    for stem in FILES:
        if not fetch_stem(stem):
            missing.append(stem)
    if missing:
        raise SystemExit("missing: " + ", ".join(missing))
    print("ok", len(FILES), "files")


if __name__ == "__main__":
    main()
