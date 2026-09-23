// Canonical bear-break lists. tools/updateMiningBlocks.js copies MINING_BREAKABLE_BLOCKS
// into entity minecraft:break_blocks (script digging does not use that component).

/** Survival-unbreakable. Bears never chew these (bedrock, portals, operator blocks). */
export const UNBREAKABLE_BLOCKS = new Set([
    "minecraft:bedrock",
    "minecraft:barrier",
    "minecraft:command_block",
    "minecraft:chain_command_block",
    "minecraft:repeating_command_block",
    "minecraft:structure_block",
    "minecraft:structure_void",
    "minecraft:jigsaw",
    "minecraft:light_block",
    "minecraft:deny",
    "minecraft:allow",
    "minecraft:end_portal",
    "minecraft:end_portal_frame",
    "minecraft:end_gateway",
    "minecraft:reinforced_deepslate",
    "minecraft:invisible_bedrock"
]);

/**
 * Diamond-slow in survival. Mining chews these on a timer; buff smash rolls a low chance.
 * Explosions and torpedo path bursts still skip so a cube is not a one-tick delete.
 */
export const SLOW_BREAK_BLOCKS = new Set([
    "minecraft:obsidian",
    "minecraft:crying_obsidian",
    "minecraft:ancient_debris",
    "minecraft:netherite_block",
    "minecraft:respawn_anchor"
]);

/** ~5s at 20 tps. Mining dedicated chew; other solids break in one script hit. */
export const SLOW_BREAK_TICKS = 100;
const SLOW_BREAK_STALE_TICKS = 200;

/** Per smash hit while climbing. Stone is 100%; this is the obsidian/etc. roll. */
export const BUFF_SLOW_BREAK_CHANCE = 0.12;

/** @type {Map<string, { start: number, last: number }>} */
const slowBreakStarts = new Map();

export function isSlowBreakBlockId(typeId) {
    return !!typeId && SLOW_BREAK_BLOCKS.has(typeId);
}

/** Buff smash only. True = destroy this slow block now. */
export function rollBuffSlowBreak() {
    return Math.random() < BUFF_SLOW_BREAK_CHANCE;
}

/** Instant smash (buff explode, torpedo burst) must not melt slow blocks. */
export function isInstantDestroyBlocked(typeId) {
    return !!typeId && (UNBREAKABLE_BLOCKS.has(typeId) || SLOW_BREAK_BLOCKS.has(typeId));
}

/**
 * @returns {boolean} true when the caller should destroy the block now
 */
export function consumeSlowBreakProgress(dimId, x, y, z, typeId, nowTick) {
    if (!SLOW_BREAK_BLOCKS.has(typeId)) return true;
    const key = `${dimId}|${x}|${y}|${z}`;
    let rec = slowBreakStarts.get(key);
    if (!rec || nowTick - rec.last > SLOW_BREAK_STALE_TICKS) {
        rec = { start: nowTick, last: nowTick };
        slowBreakStarts.set(key, rec);
        if (slowBreakStarts.size > 256) {
            const oldest = slowBreakStarts.keys().next().value;
            if (oldest) slowBreakStarts.delete(oldest);
        }
        return false;
    }
    rec.last = nowTick;
    if (nowTick - rec.start >= SLOW_BREAK_TICKS) {
        slowBreakStarts.delete(key);
        return true;
    }
    return false;
}

// List of blocks that mining bears can break
// All blocks are breakable by default except those in UNBREAKABLE_BLOCKS
// This list is used to create MINING_BREAKABLE_BLOCK_SET for efficient membership checks
export const MINING_BREAKABLE_BLOCKS = [
    "minecraft:stone",
    "minecraft:cobblestone",
    "minecraft:mossy_cobblestone",
    "minecraft:stone_bricks",
    "minecraft:mossy_stone_bricks",
    "minecraft:cracked_stone_bricks",
    "minecraft:chiseled_stone_bricks",
    "minecraft:granite",
    "minecraft:diorite",
    "minecraft:andesite",
    "minecraft:deepslate",
    "minecraft:cobbled_deepslate",
    "minecraft:polished_deepslate",
    "minecraft:deepslate_bricks",
    "minecraft:deepslate_tiles",
    "minecraft:cracked_deepslate_bricks",
    "minecraft:cracked_deepslate_tiles",
    "minecraft:chiseled_deepslate",
    "minecraft:sand",
    "minecraft:red_sand",
    "minecraft:gravel",
    "minecraft:clay",
    "minecraft:dirt",
    "minecraft:coarse_dirt",
    "minecraft:grass",
    "minecraft:podzol",
    "minecraft:mycelium",
    "minecraft:snow",
    "minecraft:ice",
    "minecraft:packed_ice",
    "minecraft:soul_sand",
    "minecraft:soul_soil",
    "minecraft:netherrack",
    "minecraft:end_stone",
    "minecraft:oak_log",
    "minecraft:spruce_log",
    "minecraft:birch_log",
    "minecraft:jungle_log",
    "minecraft:acacia_log",
    "minecraft:dark_oak_log",
    "minecraft:oak_planks",
    "minecraft:spruce_planks",
    "minecraft:birch_planks",
    "minecraft:jungle_planks",
    "minecraft:acacia_planks",
    "minecraft:dark_oak_planks",
    "minecraft:oak_leaves",
    "minecraft:spruce_leaves",
    "minecraft:birch_leaves",
    "minecraft:jungle_leaves",
    "minecraft:acacia_leaves",
    "minecraft:dark_oak_leaves",
    "minecraft:glass",
    "minecraft:white_stained_glass",
    "minecraft:orange_stained_glass",
    "minecraft:magenta_stained_glass",
    "minecraft:light_blue_stained_glass",
    "minecraft:yellow_stained_glass",
    "minecraft:lime_stained_glass",
    "minecraft:pink_stained_glass",
    "minecraft:gray_stained_glass",
    "minecraft:light_gray_stained_glass",
    "minecraft:cyan_stained_glass",
    "minecraft:purple_stained_glass",
    "minecraft:blue_stained_glass",
    "minecraft:brown_stained_glass",
    "minecraft:green_stained_glass",
    "minecraft:red_stained_glass",
    "minecraft:black_stained_glass",
    "minecraft:brick_block",
    "minecraft:nether_brick",
    "minecraft:red_nether_brick",
    "minecraft:purpur_block",
    "minecraft:quartz_block",
    "minecraft:sandstone",
    "minecraft:red_sandstone",
    "minecraft:smooth_sandstone",
    "minecraft:smooth_red_sandstone",
    "minecraft:bookshelf",
    "minecraft:hay_block",
    "minecraft:bone_block",
    "minecraft:grass_path",
    "minecraft:farmland",
    "minecraft:scaffolding",
    // Ores - mining bears should be able to break all ores
    "minecraft:coal_ore",
    "minecraft:deepslate_coal_ore",
    "minecraft:iron_ore",
    "minecraft:deepslate_iron_ore",
    "minecraft:gold_ore",
    "minecraft:deepslate_gold_ore",
    "minecraft:copper_ore",
    "minecraft:deepslate_copper_ore",
    "minecraft:lapis_ore",
    "minecraft:deepslate_lapis_ore",
    "minecraft:redstone_ore",
    "minecraft:deepslate_redstone_ore",
    "minecraft:diamond_ore",
    "minecraft:deepslate_diamond_ore",
    "minecraft:emerald_ore",
    "minecraft:deepslate_emerald_ore",
    "minecraft:nether_gold_ore",
    "minecraft:nether_quartz_ore",
    // Metal blocks
    "minecraft:coal_block",
    "minecraft:iron_block",
    "minecraft:gold_block",
    "minecraft:copper_block",
    "minecraft:lapis_block",
    "minecraft:redstone_block",
    "minecraft:diamond_block",
    "minecraft:emerald_block",
    // Additional stone variants
    "minecraft:polished_granite",
    "minecraft:polished_diorite",
    "minecraft:polished_andesite",
    "minecraft:smooth_stone",
    "minecraft:cut_sandstone",
    "minecraft:cut_red_sandstone",
    "minecraft:chiseled_sandstone",
    "minecraft:chiseled_red_sandstone",
    // Tuff and related
    "minecraft:tuff",
    "minecraft:polished_tuff",
    "minecraft:tuff_bricks",
    "minecraft:chiseled_tuff_bricks",
    "minecraft:polished_tuff_bricks",
    "minecraft:tuff_slab",
    "minecraft:tuff_stairs",
    "minecraft:tuff_wall",
    // Calcite and dripstone
    "minecraft:calcite",
    "minecraft:dripstone_block",
    "minecraft:pointed_dripstone",
    // Additional wood types (modern Minecraft)
    "minecraft:cherry_log",
    "minecraft:cherry_planks",
    "minecraft:cherry_leaves",
    "minecraft:mangrove_log",
    "minecraft:mangrove_planks",
    "minecraft:mangrove_leaves",
    "minecraft:pale_oak_log",
    "minecraft:pale_oak_planks",
    "minecraft:pale_oak_leaves",
    "minecraft:poplar_log",
    "minecraft:poplar_wood",
    "minecraft:stripped_poplar_log",
    "minecraft:stripped_poplar_wood",
    "minecraft:poplar_planks",
    "minecraft:red_poplar_leaves",
    "minecraft:orange_poplar_leaves",
    "minecraft:yellow_poplar_leaves",
    // Additional building blocks
    "minecraft:terracotta",
    "minecraft:white_terracotta",
    "minecraft:orange_terracotta",
    "minecraft:magenta_terracotta",
    "minecraft:light_blue_terracotta",
    "minecraft:yellow_terracotta",
    "minecraft:lime_terracotta",
    "minecraft:pink_terracotta",
    "minecraft:gray_terracotta",
    "minecraft:light_gray_terracotta",
    "minecraft:cyan_terracotta",
    "minecraft:purple_terracotta",
    "minecraft:blue_terracotta",
    "minecraft:brown_terracotta",
    "minecraft:green_terracotta",
    "minecraft:red_terracotta",
    "minecraft:black_terracotta",
    "minecraft:glazed_terracotta",
    "minecraft:white_glazed_terracotta",
    "minecraft:orange_glazed_terracotta",
    "minecraft:magenta_glazed_terracotta",
    "minecraft:light_blue_glazed_terracotta",
    "minecraft:yellow_glazed_terracotta",
    "minecraft:lime_glazed_terracotta",
    "minecraft:pink_glazed_terracotta",
    "minecraft:gray_glazed_terracotta",
    "minecraft:light_gray_glazed_terracotta",
    "minecraft:cyan_glazed_terracotta",
    "minecraft:purple_glazed_terracotta",
    "minecraft:blue_glazed_terracotta",
    "minecraft:brown_glazed_terracotta",
    "minecraft:green_glazed_terracotta",
    "minecraft:red_glazed_terracotta",
    "minecraft:black_glazed_terracotta",
    // Concrete
    "minecraft:concrete",
    "minecraft:white_concrete",
    "minecraft:orange_concrete",
    "minecraft:magenta_concrete",
    "minecraft:light_blue_concrete",
    "minecraft:yellow_concrete",
    "minecraft:lime_concrete",
    "minecraft:pink_concrete",
    "minecraft:gray_concrete",
    "minecraft:light_gray_concrete",
    "minecraft:cyan_concrete",
    "minecraft:purple_concrete",
    "minecraft:blue_concrete",
    "minecraft:brown_concrete",
    "minecraft:green_concrete",
    "minecraft:red_concrete",
    "minecraft:black_concrete",
    // Concrete powder
    "minecraft:concrete_powder",
    "minecraft:white_concrete_powder",
    "minecraft:orange_concrete_powder",
    "minecraft:magenta_concrete_powder",
    "minecraft:light_blue_concrete_powder",
    "minecraft:yellow_concrete_powder",
    "minecraft:lime_concrete_powder",
    "minecraft:pink_concrete_powder",
    "minecraft:gray_concrete_powder",
    "minecraft:light_gray_concrete_powder",
    "minecraft:cyan_concrete_powder",
    "minecraft:purple_concrete_powder",
    "minecraft:blue_concrete_powder",
    "minecraft:brown_concrete_powder",
    "minecraft:green_concrete_powder",
    "minecraft:red_concrete_powder",
    "minecraft:black_concrete_powder",
    // Wool and carpet
    "minecraft:wool",
    "minecraft:white_wool",
    "minecraft:orange_wool",
    "minecraft:magenta_wool",
    "minecraft:light_blue_wool",
    "minecraft:yellow_wool",
    "minecraft:lime_wool",
    "minecraft:pink_wool",
    "minecraft:gray_wool",
    "minecraft:light_gray_wool",
    "minecraft:cyan_wool",
    "minecraft:purple_wool",
    "minecraft:blue_wool",
    "minecraft:brown_wool",
    "minecraft:green_wool",
    "minecraft:red_wool",
    "minecraft:black_wool",
    "minecraft:carpet",
    "minecraft:white_carpet",
    "minecraft:orange_carpet",
    "minecraft:magenta_carpet",
    "minecraft:light_blue_carpet",
    "minecraft:yellow_carpet",
    "minecraft:lime_carpet",
    "minecraft:pink_carpet",
    "minecraft:gray_carpet",
    "minecraft:light_gray_carpet",
    "minecraft:cyan_carpet",
    "minecraft:purple_carpet",
    "minecraft:blue_carpet",
    "minecraft:brown_carpet",
    "minecraft:green_carpet",
    "minecraft:red_carpet",
    "minecraft:black_carpet",
    // Additional blocks
    "minecraft:glowstone",
    "minecraft:slime_block",
    "minecraft:honey_block",
    "minecraft:sea_lantern",
    "minecraft:shroomlight",
    "minecraft:end_stone_bricks",
    "minecraft:polished_blackstone",
    "minecraft:polished_blackstone_bricks",
    "minecraft:blackstone",
    "minecraft:gilded_blackstone",
    "minecraft:cracked_polished_blackstone_bricks",
    "minecraft:chiseled_polished_blackstone",
    // Nether blocks
    "minecraft:basalt",
    "minecraft:polished_basalt",
    "minecraft:smooth_basalt",
    "minecraft:blackstone_slab",
    "minecraft:blackstone_stairs",
    "minecraft:blackstone_wall",
    "minecraft:polished_blackstone_slab",
    "minecraft:polished_blackstone_stairs",
    "minecraft:polished_blackstone_wall",
    "minecraft:chiseled_polished_blackstone",
    // Additional common blocks
    "minecraft:mud",
    "minecraft:mud_bricks",
    "minecraft:packed_mud",
    "minecraft:muddy_mangrove_roots"
];
export const MINING_BREAKABLE_BLOCK_SET = new Set(MINING_BREAKABLE_BLOCKS);

/** Never overwritten by abandoned village structure placement (bedrock, fluids, etc.). */
export const SETTLEMENT_NEVER_REPLACE_IDS = new Set([
    ...UNBREAKABLE_BLOCKS,
    ...SLOW_BREAK_BLOCKS,
    "minecraft:water",
    "minecraft:flowing_water",
    "minecraft:lava",
    "minecraft:flowing_lava",
    "minecraft:bubble_column"
]);

/**
 * Mining-style: replace anything except unbreakables and open fluids.
 * @param {string|undefined} typeId
 */
export function isSettlementReplaceableBlockId(typeId) {
    if (!typeId || typeId === "minecraft:air") return true;
    if (SETTLEMENT_NEVER_REPLACE_IDS.has(typeId)) return false;
    return true;
}

// Extended block list for torpedo bears - includes more building blocks
export const TORPEDO_BREAKABLE_BLOCKS = [
    ...MINING_BREAKABLE_BLOCKS,
    "minecraft:coal_block",
    "minecraft:coal_ore",
    "minecraft:deepslate_coal_ore",
    "minecraft:iron_block",
    "minecraft:iron_ore",
    "minecraft:deepslate_iron_ore",
    "minecraft:gold_block",
    "minecraft:gold_ore",
    "minecraft:deepslate_gold_ore",
    "minecraft:copper_block",
    "minecraft:copper_ore",
    "minecraft:deepslate_copper_ore",
    "minecraft:lapis_block",
    "minecraft:lapis_ore",
    "minecraft:deepslate_lapis_ore",
    "minecraft:redstone_block",
    "minecraft:redstone_ore",
    "minecraft:deepslate_redstone_ore",
    "minecraft:diamond_block",
    "minecraft:diamond_ore",
    "minecraft:deepslate_diamond_ore",
    "minecraft:emerald_block",
    "minecraft:emerald_ore",
    "minecraft:deepslate_emerald_ore",
    "minecraft:terracotta",
    "minecraft:white_terracotta",
    "minecraft:orange_terracotta",
    "minecraft:magenta_terracotta",
    "minecraft:light_blue_terracotta",
    "minecraft:yellow_terracotta",
    "minecraft:lime_terracotta",
    "minecraft:pink_terracotta",
    "minecraft:gray_terracotta",
    "minecraft:light_gray_terracotta",
    "minecraft:cyan_terracotta",
    "minecraft:purple_terracotta",
    "minecraft:blue_terracotta",
    "minecraft:brown_terracotta",
    "minecraft:green_terracotta",
    "minecraft:red_terracotta",
    "minecraft:black_terracotta",
    "minecraft:concrete",
    "minecraft:white_concrete",
    "minecraft:orange_concrete",
    "minecraft:magenta_concrete",
    "minecraft:light_blue_concrete",
    "minecraft:yellow_concrete",
    "minecraft:lime_concrete",
    "minecraft:pink_concrete",
    "minecraft:gray_concrete",
    "minecraft:light_gray_concrete",
    "minecraft:cyan_concrete",
    "minecraft:purple_concrete",
    "minecraft:blue_concrete",
    "minecraft:brown_concrete",
    "minecraft:green_concrete",
    "minecraft:red_concrete",
    "minecraft:black_concrete",
    "minecraft:concrete_powder",
    "minecraft:white_concrete_powder",
    "minecraft:orange_concrete_powder",
    "minecraft:magenta_concrete_powder",
    "minecraft:light_blue_concrete_powder",
    "minecraft:yellow_concrete_powder",
    "minecraft:lime_concrete_powder",
    "minecraft:pink_concrete_powder",
    "minecraft:gray_concrete_powder",
    "minecraft:light_gray_concrete_powder",
    "minecraft:cyan_concrete_powder",
    "minecraft:purple_concrete_powder",
    "minecraft:blue_concrete_powder",
    "minecraft:brown_concrete_powder",
    "minecraft:green_concrete_powder",
    "minecraft:red_concrete_powder",
    "minecraft:black_concrete_powder",
    "minecraft:wool",
    "minecraft:white_wool",
    "minecraft:orange_wool",
    "minecraft:magenta_wool",
    "minecraft:light_blue_wool",
    "minecraft:yellow_wool",
    "minecraft:lime_wool",
    "minecraft:pink_wool",
    "minecraft:gray_wool",
    "minecraft:light_gray_wool",
    "minecraft:cyan_wool",
    "minecraft:purple_wool",
    "minecraft:blue_wool",
    "minecraft:brown_wool",
    "minecraft:green_wool",
    "minecraft:red_wool",
    "minecraft:black_wool",
    "minecraft:carpet",
    "minecraft:white_carpet",
    "minecraft:orange_carpet",
    "minecraft:magenta_carpet",
    "minecraft:light_blue_carpet",
    "minecraft:yellow_carpet",
    "minecraft:lime_carpet",
    "minecraft:pink_carpet",
    "minecraft:gray_carpet",
    "minecraft:light_gray_carpet",
    "minecraft:cyan_carpet",
    "minecraft:purple_carpet",
    "minecraft:blue_carpet",
    "minecraft:brown_carpet",
    "minecraft:green_carpet",
    "minecraft:red_carpet",
    "minecraft:black_carpet",
    "minecraft:glowstone",
    "minecraft:slime_block",
    "minecraft:honey_block",
    "minecraft:sea_lantern",
    "minecraft:shroomlight",
    "minecraft:end_stone_bricks",
    "minecraft:polished_blackstone",
    "minecraft:polished_blackstone_bricks",
    "minecraft:blackstone",
    "minecraft:gilded_blackstone",
    "minecraft:cracked_polished_blackstone_bricks"
];
export const TORPEDO_BREAKABLE_BLOCK_SET = new Set(TORPEDO_BREAKABLE_BLOCKS);
