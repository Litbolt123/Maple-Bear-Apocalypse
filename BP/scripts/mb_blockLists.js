import { ALL_INFECTED_LEAF_IDS } from "./mb_infectedVegetation.js";
import { ALL_INFECTED_FOLIAGE_IDS, ALL_INFECTED_FOLIAGE_WALKABLE_IDS } from "./mb_infectedFoliage.js";

// Shared block lists for snow replacement.
// - STORM places powder in air above full ground (grass_block, dirt) and on leaves;
//   never turns those ground blocks into snow. Script-placed powder infects under it.
// - Death/torpedo/buff snow placement: SNOW_REPLACEABLE_BLOCKS (plants replaced with snow).

/** Full ground blocks that must NEVER be replaced by snow (storm only places in air above these). */
export const SNOW_NEVER_REPLACE_BLOCKS = new Set([
    "minecraft:dirt", "minecraft:grass_block", "minecraft:coarse_dirt", "minecraft:podzol",
    "minecraft:mycelium", "minecraft:dirt_with_roots", "minecraft:moss_block", "minecraft:mud",
    "minecraft:crimson_nylium", "minecraft:warped_nylium",
    "mb:dusted_dirt", "mb:dusted_podzol"
]);

/** Blocks that death/torpedo/buff snow placement can replace (land grass, flowers, foliage). Not water plants — powder must not sit on kelp. */
export const SNOW_REPLACEABLE_BLOCKS = new Set([
    "minecraft:grass", "minecraft:short_grass", "minecraft:tall_grass", "minecraft:double_tall_grass", "minecraft:fern", "minecraft:large_fern",
    "minecraft:dandelion", "minecraft:poppy", "minecraft:blue_orchid", "minecraft:allium", "minecraft:azure_bluet", "minecraft:red_tulip",
    "minecraft:orange_tulip", "minecraft:white_tulip", "minecraft:pink_tulip", "minecraft:oxeye_daisy", "minecraft:cornflower", "minecraft:lily_of_the_valley",
    "minecraft:sunflower", "minecraft:lilac", "minecraft:rose_bush", "minecraft:peony", "minecraft:dead_bush", "minecraft:cactus",
    "minecraft:sweet_berry_bush", "minecraft:nether_sprouts", "minecraft:warped_roots", "minecraft:crimson_roots",
    "minecraft:warped_fungus", "minecraft:crimson_fungus", "minecraft:small_dripleaf",
    "minecraft:big_dripleaf", "minecraft:big_dripleaf_stem", "minecraft:spore_blossom", "minecraft:glow_lichen", "minecraft:moss_carpet",
    "minecraft:vine", "minecraft:weeping_vines", "minecraft:twisting_vines", "minecraft:cave_vines",
    "minecraft:torchflower",     "minecraft:pitcher_plant", "minecraft:pitcher_crop",
    "minecraft:leaf_litter", "minecraft:red_shrub", "minecraft:shelf_mushroom", "minecraft:brown_mushroom",
    "minecraft:red_mushroom", "minecraft:firefly_bush",
    ...ALL_INFECTED_FOLIAGE_WALKABLE_IDS
]);

/** Water / ocean plants. Powder must not replace these (infected biomes can replace ocean chunks). */
export const WATER_COLUMN_SNOW_BLOCK_IDS = new Set([
    "minecraft:water",
    "minecraft:flowing_water",
    "minecraft:bubble_column",
    "minecraft:kelp",
    "minecraft:kelp_plant",
    "minecraft:seagrass",
    "minecraft:tall_seagrass",
    "minecraft:sea_pickle",
    "minecraft:waterlily",
    "minecraft:lily_pad"
]);

/**
 * @param {string} [typeId]
 * @returns {boolean}
 */
export function isWaterColumnSnowTypeId(typeId) {
    if (!typeId || typeof typeId !== "string") return false;
    if (WATER_COLUMN_SNOW_BLOCK_IDS.has(typeId)) return true;
    const id = typeId.toLowerCase();
    return id.includes("kelp") || id.includes("seagrass");
}

/**
 * Do not place or convert infection powder onto this block (water, kelp, seagrass).
 * @param {import("@minecraft/server").Block | undefined} block
 * @returns {boolean}
 */
export function isWaterColumnSnowBlock(block) {
    if (!block) return true;
    try {
        if (block.isLiquid) return true;
        return isWaterColumnSnowTypeId(block.typeId);
    } catch {
        return true;
    }
}

/** Blocks that storm particles pass through to find ground (leaves, foliage - don't treat as surface). */
export const STORM_PARTICLE_PASS_THROUGH = new Set([
    "minecraft:leaves", "minecraft:leaves2", "minecraft:azalea_leaves", "minecraft:azalea_leaves_flowered",
    "minecraft:oak_leaves", "minecraft:spruce_leaves", "minecraft:birch_leaves", "minecraft:jungle_leaves",
    "minecraft:acacia_leaves", "minecraft:dark_oak_leaves", "minecraft:mangrove_leaves",
    "minecraft:cherry_leaves", "minecraft:pale_oak_leaves",
    "minecraft:red_poplar_leaves", "minecraft:orange_poplar_leaves", "minecraft:yellow_poplar_leaves",
    ...ALL_INFECTED_LEAF_IDS,
    "minecraft:grass", "minecraft:short_grass", "minecraft:tall_grass", "minecraft:double_tall_grass",
    "minecraft:fern", "minecraft:large_fern", "minecraft:dandelion", "minecraft:poppy",
    "minecraft:blue_orchid", "minecraft:allium", "minecraft:azure_bluet", "minecraft:red_tulip",
    "minecraft:orange_tulip", "minecraft:white_tulip", "minecraft:pink_tulip", "minecraft:oxeye_daisy",
    "minecraft:cornflower", "minecraft:lily_of_the_valley", "minecraft:sunflower", "minecraft:lilac",
    "minecraft:rose_bush", "minecraft:peony", "minecraft:dead_bush", "minecraft:vine",
    "minecraft:weeping_vines", "minecraft:twisting_vines", "minecraft:cave_vines",
    "minecraft:glow_lichen", "minecraft:moss_carpet", "minecraft:spore_blossom",
    "minecraft:torchflower", "minecraft:pitcher_plant", "minecraft:pitcher_crop",
    "minecraft:small_dripleaf", "minecraft:big_dripleaf", "minecraft:big_dripleaf_stem",
    "minecraft:leaf_litter", "minecraft:red_shrub", "minecraft:shelf_mushroom", "minecraft:brown_mushroom",
    "minecraft:red_mushroom", "minecraft:firefly_bush",
    "minecraft:nether_sprouts", "minecraft:warped_roots", "minecraft:crimson_roots",
    "minecraft:warped_fungus", "minecraft:crimson_fungus",
    ...ALL_INFECTED_FOLIAGE_WALKABLE_IDS,
    "minecraft:kelp", "minecraft:kelp_plant",
    "minecraft:seagrass", "minecraft:tall_seagrass",
    "minecraft:sea_pickle",
    "minecraft:waterlily", "minecraft:lily_pad"
]);

/**
 * Blocks that count as "open sky" for storm spawn checks — air column through forest canopy.
 * Includes explicit {@link STORM_PARTICLE_PASS_THROUGH} plus any type id containing `leaves`
 * (covers variants and future vanilla leaf blocks like dense dark oak forests).
 */
export function isStormSkyPassThroughBlock(typeId) {
    if (!typeId || typeof typeId !== "string") return false;
    if (STORM_PARTICLE_PASS_THROUGH.has(typeId)) return true;
    return typeId.toLowerCase().includes("leaves");
}

/** Blocks major storms can destroy when big (leaves, grass, flowers, bamboo). */
export const STORM_DESTRUCT_BLOCKS = new Set([
    "minecraft:oak_leaves", "minecraft:spruce_leaves", "minecraft:birch_leaves", "minecraft:jungle_leaves",
    "minecraft:acacia_leaves", "minecraft:dark_oak_leaves", "minecraft:mangrove_leaves", "minecraft:cherry_leaves",
    "minecraft:azalea_leaves", "minecraft:azalea_leaves_flowered", "minecraft:pale_oak_leaves",
    "minecraft:red_poplar_leaves", "minecraft:orange_poplar_leaves", "minecraft:yellow_poplar_leaves",
    "minecraft:leaves", "minecraft:leaves2",
    ...ALL_INFECTED_LEAF_IDS,
    "minecraft:grass", "minecraft:short_grass", "minecraft:tall_grass", "minecraft:double_tall_grass",
    "minecraft:fern", "minecraft:large_fern", "minecraft:dandelion", "minecraft:poppy", "minecraft:blue_orchid",
    "minecraft:allium", "minecraft:azure_bluet", "minecraft:red_tulip", "minecraft:orange_tulip",
    "minecraft:white_tulip", "minecraft:pink_tulip", "minecraft:oxeye_daisy", "minecraft:cornflower",
    "minecraft:lily_of_the_valley", "minecraft:sunflower", "minecraft:lilac", "minecraft:rose_bush",
    "minecraft:peony", "minecraft:dead_bush", "minecraft:vine", "minecraft:torchflower", "minecraft:pitcher_plant",
    "minecraft:pitcher_crop", "minecraft:small_dripleaf", "minecraft:big_dripleaf", "minecraft:big_dripleaf_stem",
    "minecraft:glow_lichen", "minecraft:moss_carpet", "minecraft:spore_blossom",
    "minecraft:leaf_litter", "minecraft:red_shrub", "minecraft:shelf_mushroom", "minecraft:brown_mushroom",
    "minecraft:red_mushroom", "minecraft:firefly_bush",
    "minecraft:nether_sprouts", "minecraft:warped_roots", "minecraft:crimson_roots",
    "minecraft:warped_fungus", "minecraft:crimson_fungus",
    ...ALL_INFECTED_FOLIAGE_IDS,
    "minecraft:bamboo", "minecraft:bamboo_sapling"
]);

/** Glass blocks storm cannot break (tinted glass blocks light, hardened - Education). */
export const STORM_DESTRUCT_GLASS_EXCLUDE = new Set([
    "minecraft:tinted_glass",
    "minecraft:hard_glass", "minecraft:hardened_glass",
    "minecraft:hardened_glass_pane", "minecraft:hard_glass_pane"
]);

/** Glass blocks - lower chance to break in storm. */
export const STORM_DESTRUCT_GLASS = new Set([
    "minecraft:glass", "minecraft:white_stained_glass", "minecraft:orange_stained_glass", "minecraft:magenta_stained_glass",
    "minecraft:light_blue_stained_glass", "minecraft:yellow_stained_glass", "minecraft:lime_stained_glass",
    "minecraft:pink_stained_glass", "minecraft:gray_stained_glass", "minecraft:light_gray_stained_glass",
    "minecraft:cyan_stained_glass", "minecraft:purple_stained_glass", "minecraft:blue_stained_glass",
    "minecraft:brown_stained_glass", "minecraft:green_stained_glass", "minecraft:red_stained_glass",
    "minecraft:black_stained_glass", "minecraft:glass_pane", "minecraft:white_stained_glass_pane",
    "minecraft:orange_stained_glass_pane", "minecraft:magenta_stained_glass_pane", "minecraft:light_blue_stained_glass_pane",
    "minecraft:yellow_stained_glass_pane", "minecraft:lime_stained_glass_pane", "minecraft:pink_stained_glass_pane",
    "minecraft:gray_stained_glass_pane", "minecraft:light_gray_stained_glass_pane", "minecraft:cyan_stained_glass_pane",
    "minecraft:purple_stained_glass_pane", "minecraft:blue_stained_glass_pane", "minecraft:brown_stained_glass_pane",
    "minecraft:green_stained_glass_pane", "minecraft:red_stained_glass_pane", "minecraft:black_stained_glass_pane"
]);

/** 2-block-tall plants: replace bottom with snow, top with air. */
export const SNOW_TWO_BLOCK_PLANTS = new Set([
    "minecraft:sunflower", "minecraft:lilac", "minecraft:rose_bush", "minecraft:peony", "minecraft:large_fern",
    "minecraft:double_tall_grass", "minecraft:tall_grass",
    "minecraft:pitcher_plant", "minecraft:pitcher_crop",
    "minecraft:big_dripleaf", "minecraft:big_dripleaf_stem"
]);
