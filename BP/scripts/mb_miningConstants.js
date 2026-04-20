/**
 * Shared mining-path constants (dimensions, bear types, pathfinding union, air set).
 * Keep large walkable/block lists in mb_miningAI.js.
 */

/** @type {readonly string[]} */
export const DIMENSION_IDS = ["overworld", "nether", "the_end"];

export const MINING_BEAR_TYPES = [
    { id: "mb:mining_mb", tunnelHeight: 2 },
    { id: "mb:mining_mb_day20", tunnelHeight: 2 }
];

/** Shared pathfinding for mining + infected mobs. */
export const PATHFINDING_ENTITY_TYPES = [
    "mb:mining_mb", "mb:mining_mb_day20",
    "mb:infected", "mb:infected_day08", "mb:infected_day13", "mb:infected_day20",
    "mb:infected_pig", "mb:infected_cow"
];

export const AIR_BLOCKS = new Set([
    "minecraft:air",
    "minecraft:cave_air",
    "minecraft:void_air"
]);
