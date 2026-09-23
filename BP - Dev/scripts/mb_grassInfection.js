/**
 * Infection spread through grass plants, grass_block, and dirt-like ground.
 *
 * Vanilla grass cannot tick a custom component. Do not put minecraft:tick on
 * every dusted_dirt. Ground infection grows like a vine: one random neighbor
 * per attempt, not every face at once. Placed / mob snow and dusted dirt are
 * remembered and retried. Dirt has no stages — grass_block / dirt become
 * dusted_dirt in one convert. Shade under trees is dirt, not grass_block, so
 * the vine must convert that dirt or it never reaches the trunk. Hills are
 * not a wall: each step may climb or drop a few blocks in that column, and
 * the player scan looks farther up and down than a flat lawn.
 *
 * Day 0–1: nothing (same as canopy). setType does not fire custom onPlace.
 */

import { system, world, BlockPermutation } from "@minecraft/server";
import { isScriptEnabled, SCRIPT_IDS } from "./mb_scriptToggles.js";
import { getCurrentDay } from "./mb_dayTracker.js";
import { getGreeneryNeighborSpreadChance, getGreenerySpreadChance, getGroundConvertChanceMult, getResistantSoilBiomeSpreadMult, getFoliageConvertChanceMult } from "./mb_balance.js";
import { scaleWorldInfectionChance } from "./mb_infectionDirector.js";
import {
    ALL_INFECTED_LEAF_IDS,
    ALL_INFECTED_WOOD_IDS,
    isConvertibleVanillaLeaf,
    isConvertibleVanillaWood
} from "./mb_infectedVegetation.js";
import {
    ALL_INFECTED_FOLIAGE_WALKABLE_IDS,
    CONVERTIBLE_FOLIAGE,
    DOUBLE_INFECTED_FOLIAGE_IDS,
    infectedFoliageIdForVanilla,
    isConvertibleVanillaFoliage,
    isInfectedFoliageId,
    isInfectedFoliageWalkable
} from "./mb_infectedFoliage.js";
import { getOnlinePlayerCount } from "./mb_workSpread.js";

export const DUSTED_DIRT_ID = "mb:dusted_dirt";
export const DUSTED_PODZOL_ID = "mb:dusted_podzol";
export const MB_SNOW_LAYER_ID = "mb:snow_layer";
const INFECTED_LEAF_IDS = new Set(ALL_INFECTED_LEAF_IDS);
const INFECTED_WOOD_IDS = new Set(ALL_INFECTED_WOOD_IDS);

/** Ground plants converted to infected foliage (not powder). Flowers/crops later. */
const GREENERY_PLANTS = new Set([
    ...CONVERTIBLE_FOLIAGE,
    "minecraft:double_plant"
]);

const TALL_GREENERY = new Set([
    "minecraft:tall_grass",
    "minecraft:double_tall_grass",
    "minecraft:tallgrass",
    "minecraft:large_fern",
    "minecraft:double_plant"
]);
const DOUBLE_INFECTED = new Set(DOUBLE_INFECTED_FOLIAGE_IDS);

/** Infected grass/ferns must sit on soil. Air / log / leaf is orphan. */
const GROUND_ONLY_INFECTED_GRASS = new Set([
    "mb:infected_short_grass",
    "mb:infected_tall_grass",
    "mb:infected_fern",
    "mb:infected_large_fern",
    "mb:infected_firefly_bush"
]);

/** Four ground faces — vine prefers these so it does not fill a disk. */
const VINE_CARDINALS = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1]
];
/** Horizontal diagonals — tree trunks sit on dirt one cell off the front. */
const VINE_DIAGONALS = [
    [1, 0, 1],
    [1, 0, -1],
    [-1, 0, 1],
    [-1, 0, -1]
];
/** Same-column climb/drop so a hillside is not a safe terrace. */
const VINE_CLIMB_DY = 4;

const GROUND_SCAN_RADIUS = 16;
const GROUND_SCAN_COLUMNS = 8;
const GROUND_RAY_UP = 12;
const GROUND_RAY_DISTANCE = 22;
const GROUND_RAY_CONVERT_CAP = 8;
const DIRT_FRONT_COLUMNS = 8;
const DIRT_FRONT_RADIUS = 16;
const DIRT_FRONT_SOURCE_CAP = 3;
/** Local getBlock neighborhood — hills sit several blocks above/below the player. */
const FOOTPRINT_RX = 6;
const FOOTPRINT_Y_MIN = -8;
const FOOTPRINT_Y_MAX = 8;
const LOOK_MAX_DISTANCE = 16;
const KNOWN_SOURCE_MAX = 256;
const KNOWN_SOURCE_RETRY_TICKS = 40;
const KNOWN_SOURCE_MAX_AGE = 1200;
/** Vine steps per drain so a painted patch does not ring-expand in one burst. */
const KNOWN_VINE_STEPS_PER_DRAIN = 3;
/** Sources visited per drain (wood/leaf hop from dirt under trees even if vine misses). */
const KNOWN_DRAIN_VISIT_CAP = 8;

/** Dirt-like blocks the vine / snow may convert. Coarse dirt stays clean. */
const SNOW_UNDER_CONVERT = new Set([
    "minecraft:dirt",
    "minecraft:grass_block",
    "minecraft:podzol",
    "minecraft:mycelium",
    "minecraft:rooted_dirt",
    "minecraft:moss_block",
    "minecraft:farmland",
    "minecraft:dirt_path",
    "minecraft:grass_path",
    "minecraft:crimson_nylium",
    "minecraft:warped_nylium"
]);

/** Living topsoil that can hold plants (overworld grass / nether nylium / mycelium). */
const LIVING_SURFACE_IDS = new Set([
    "minecraft:grass_block",
    "minecraft:crimson_nylium",
    "minecraft:warped_nylium",
    "minecraft:mycelium"
]);

/** @type {Map<string, { dimId: string, x: number, y: number, z: number, added: number, lastTry: number }>} */
const knownGroundSources = new Map();
let knownDrainCursor = 0;

function grassInfectionEnabled() {
    return isScriptEnabled(SCRIPT_IDS.leafInfection);
}

/** @type {null | ((block: import("@minecraft/server").Block) => boolean)} */
let infectionDetoxGuard = null;

/**
 * Wire from spawnController so ground infection does not hop inside an active
 * emulsifier dome (avoids grass ↔ spawnController import cycle).
 * @param {(block: import("@minecraft/server").Block) => boolean} fn
 */
export function registerGrassInfectionDetoxGuard(fn) {
    infectionDetoxGuard = typeof fn === "function" ? fn : null;
}

function isInfectionSpreadBlockedAt(block) {
    if (!infectionDetoxGuard) return false;
    try {
        return infectionDetoxGuard(block) === true;
    } catch {
        return false;
    }
}

function currentWorldDay() {
    try {
        return getCurrentDay();
    } catch {
        return 0;
    }
}

function biomeIdAtBlock(block) {
    try {
        const b = block.dimension?.getBiome?.(block.location);
        return b?.id;
    } catch {
        return undefined;
    }
}

function spreadResistMultForGround(block) {
    return getGroundConvertChanceMult(block?.typeId)
        * getResistantSoilBiomeSpreadMult(biomeIdAtBlock(block));
}

function spreadResistMultForFoliage(block) {
    return getFoliageConvertChanceMult(block?.typeId)
        * getResistantSoilBiomeSpreadMult(biomeIdAtBlock(block));
}

function greeneryNeighborChanceAt(block) {
    if (!block?.location) return getGreeneryNeighborSpreadChance(currentWorldDay());
    const loc = block.location;
    return scaleWorldInfectionChance(
        getGreeneryNeighborSpreadChance(currentWorldDay()),
        currentWorldDay(),
        block.dimension,
        loc.x,
        loc.z
    );
}

function isSnowLayerId(typeId) {
    return typeId === MB_SNOW_LAYER_ID || typeId === "minecraft:snow_layer";
}

function isInfectionSourceId(typeId) {
    if (!typeId) return false;
    return typeId === DUSTED_DIRT_ID
        || typeId === DUSTED_PODZOL_ID
        || INFECTED_LEAF_IDS.has(typeId)
        || INFECTED_WOOD_IDS.has(typeId)
        || isInfectedFoliageId(typeId)
        || typeId === MB_SNOW_LAYER_ID;
}

function isGreeneryPlantId(typeId) {
    return GREENERY_PLANTS.has(typeId);
}

function isTrunkOrCanopyCover(typeId) {
    if (!typeId) return false;
    if (INFECTED_WOOD_IDS.has(typeId) || INFECTED_LEAF_IDS.has(typeId)) return true;
    if (isConvertibleVanillaWood(typeId) || isConvertibleVanillaLeaf(typeId)) return true;
    return typeof typeId === "string" && typeId.includes("leaves");
}

function isAllowedCoverAbove(typeId) {
    if (!typeId) return true;
    if (typeId === "minecraft:air") return true;
    if (isSnowLayerId(typeId)) return true;
    if (isGreeneryPlantId(typeId)) return true;
    if (isInfectedFoliageWalkable(typeId)) return true;
    if (typeId === "minecraft:deadbush" || typeId === "minecraft:dead_bush") return true;
    if (typeId === "minecraft:moss_carpet" || typeId === "minecraft:leaf_litter") return true;
    if (isTrunkOrCanopyCover(typeId)) return true;
    return false;
}

function isConvertibleGroundId(typeId) {
    return !!typeId && SNOW_UNDER_CONVERT.has(typeId) && !isDustedGroundId(typeId);
}

/**
 * @param {string|undefined} typeId
 * @returns {boolean}
 */
export function isDustedGroundId(typeId) {
    return typeId === DUSTED_DIRT_ID || typeId === DUSTED_PODZOL_ID;
}

/**
 * @param {string|undefined} vanillaId
 * @returns {string}
 */
export function dustedGroundIdForVanilla(vanillaId) {
    // Unique dusty podzol is parked (August 2026-09-19: convert to dusted dirt for now).
    return DUSTED_DIRT_ID;
}

function shuffleOffsets(offsets) {
    const copy = offsets.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
    }
    return copy;
}

function climbYOrder() {
    const order = [0];
    for (let d = 1; d <= VINE_CLIMB_DY; d++) {
        order.push(d, -d);
    }
    return order;
}

/**
 * One convert in a shuffled horizontal ring. Prefer same Y, then ±1…±climb
 * so the vine crawls a hill instead of stopping at a one-block terrace.
 */
function tryVineStepAlongDirs(source, chance, dirs) {
    const loc = source.location;
    const dim = source.dimension;
    const shuffled = shuffleOffsets(dirs);
    for (const dy of climbYOrder()) {
        for (const [dx, , dz] of shuffled) {
            const n = getBlockAt(dim, loc.x + dx, loc.y + dy, loc.z + dz);
            if (tryConvertEligibleGround(n, chance, { knownAdjacent: true })) return true;
        }
    }
    return false;
}

function neighborIsSpreadFront(dim, x, y, z) {
    const n = getBlockAt(dim, x, y, z);
    if (!n) return false;
    if (isConvertibleGroundId(n.typeId)) return true;
    return isConvertibleVanillaWood(n.typeId) || isConvertibleVanillaLeaf(n.typeId);
}

function forEachClimbNeighbor(loc, visit) {
    const dirs = VINE_CARDINALS.concat(VINE_DIAGONALS);
    for (const [dx, , dz] of dirs) {
        for (let dy = -VINE_CLIMB_DY; dy <= VINE_CLIMB_DY; dy++) {
            if (visit(loc.x + dx, loc.y + dy, loc.z + dz)) return true;
        }
    }
    return visit(loc.x, loc.y - 1, loc.z);
}

function sourceKey(block) {
    const loc = block.location;
    const dimId = block.dimension?.id ?? "";
    return `${dimId}|${loc.x}|${loc.y}|${loc.z}`;
}

function isKnownGroundId(typeId) {
    return isDustedGroundId(typeId) || isSnowLayerId(typeId);
}

/**
 * Player-placed snow / dusted dirt, and cells just converted. Not worldgen carpet.
 * @param {import("@minecraft/server").Block} block
 * @param {{ alreadySpread?: boolean }} [opts]
 */
export function rememberKnownGroundSource(block, opts = {}) {
    if (!block?.isValid || !isKnownGroundId(block.typeId)) return;
    const loc = block.location;
    const key = sourceKey(block);
    const now = system.currentTick;
    if (knownGroundSources.size >= KNOWN_SOURCE_MAX && !knownGroundSources.has(key)) {
        const oldest = knownGroundSources.keys().next().value;
        if (oldest) knownGroundSources.delete(oldest);
    }
    const prev = knownGroundSources.get(key);
    knownGroundSources.set(key, {
        dimId: block.dimension.id,
        x: loc.x,
        y: loc.y,
        z: loc.z,
        added: prev?.added ?? now,
        lastTry: opts.alreadySpread ? now : (prev?.lastTry ?? -999999)
    });
}

function sourceHasSpreadFront(block) {
    if (!block?.isValid) return false;
    const dim = block.dimension;
    return forEachClimbNeighbor(block.location, (x, y, z) => neighborIsSpreadFront(dim, x, y, z));
}

function dirtTouchesGrass(dirtBlock) {
    return sourceHasSpreadFront(dirtBlock);
}

/**
 * Retry remembered snow / dusted dirt. Vine: at most a few one-cell steps
 * per poll, round-robin so a painted patch does not ring-expand at once.
 * @param {(block: import("@minecraft/server").Block) => void} [onSource]
 */
export function drainKnownGroundSources(onSource) {
    if (!grassInfectionEnabled() || knownGroundSources.size === 0) return;
    const now = system.currentTick;
    const mp = getOnlinePlayerCount() >= 2;
    const keys = Array.from(knownGroundSources.keys());
    if (keys.length === 0) return;
    const start = ((knownDrainCursor % keys.length) + keys.length) % keys.length;
    let steps = 0;
    let extraHops = 0;
    let walked = 0;
    const visitCap = Math.min(keys.length, mp ? 4 : KNOWN_DRAIN_VISIT_CAP);
    const stepCap = mp ? 2 : KNOWN_VINE_STEPS_PER_DRAIN;
    const extraHopCap = mp ? 2 : 6;
    for (; walked < visitCap; walked++) {
        const key = keys[(start + walked) % keys.length];
        const rec = knownGroundSources.get(key);
        if (!rec) continue;
        if (now - rec.added > KNOWN_SOURCE_MAX_AGE) {
            knownGroundSources.delete(key);
            continue;
        }
        if (now - rec.lastTry < KNOWN_SOURCE_RETRY_TICKS) continue;
        rec.lastTry = now;
        let dim;
        try {
            dim = world.getDimension(rec.dimId);
        } catch {
            knownGroundSources.delete(key);
            continue;
        }
        const block = getBlockAt(dim, rec.x, rec.y, rec.z);
        if (!block || !isKnownGroundId(block.typeId)) {
            knownGroundSources.delete(key);
            continue;
        }
        if (tryInfectGrassAround(block)) steps++;
        if (onSource && extraHops < extraHopCap) {
            try {
                onSource(block);
                extraHops++;
            } catch {
                /* extras optional */
            }
        }
        if (!sourceHasSpreadFront(block)) knownGroundSources.delete(key);
        if (steps >= stepCap) {
            walked++;
            break;
        }
    }
    knownDrainCursor = start + walked;
}

/**
 * Player placed snow or dusted dirt — seed the vine, do not flood neighbors.
 * @param {import("@minecraft/server").Block} block
 */
export function handlePlayerPlacedInfectionBlock(block) {
    if (!block?.isValid) return;
    if (isInfectionSpreadBlockedAt(block)) return;
    if (block.typeId === DUSTED_DIRT_ID || block.typeId === DUSTED_PODZOL_ID) {
        if (grassInfectionEnabled()) rememberKnownGroundSource(block, { alreadySpread: true });
        return;
    }
    if (!isSnowLayerId(block.typeId)) return;
    const loc = block.location;
    const below = getBlockAt(block.dimension, loc.x, loc.y - 1, loc.z);
    if (below) convertGroundCell(below);
    if (!grassInfectionEnabled()) return;
    rememberKnownGroundSource(block, { alreadySpread: true });
    if (isDustedGroundId(below?.typeId)) {
        rememberKnownGroundSource(below, { alreadySpread: true });
    }
}

function getBlockAt(dim, x, y, z) {
    try {
        return dim.getBlock({ x, y, z });
    } catch {
        return undefined;
    }
}

function isUpperBlockBitOn(v) {
    return v === true || v === 1 || v === "1" || v === "true";
}

function readUpperBlockBit(block) {
    try {
        return block.permutation.getState("upper_block_bit");
    } catch {
        /* missing */
    }
    try {
        return block.permutation.getState("minecraft:upper_block_bit");
    } catch {
        return undefined;
    }
}

function isFoliageSoilId(typeId) {
    return isConvertibleGroundId(typeId) || isDustedGroundId(typeId);
}

function blockBelow(block) {
    if (!block?.location) return undefined;
    return getBlockAt(block.dimension, block.location.x, block.location.y - 1, block.location.z);
}

function isDoublePlantUpper(block) {
    if (isUpperBlockBitOn(readUpperBlockBit(block))) return true;
    const below = blockBelow(block);
    if (!below) return false;
    // Infected bottom already placed — leftover vanilla top is still the top half.
    if (DOUBLE_INFECTED.has(below.typeId)) return true;
    // 26.50 can pair tall_grass with double_tall_grass; do not require the same id.
    return !!(TALL_GREENERY.has(below.typeId) && TALL_GREENERY.has(block.typeId));
}

/**
 * @param {import("@minecraft/server").Block} plant
 */
function infectedDestForPlant(plant) {
    const mapped = infectedFoliageIdForVanilla(plant.typeId);
    if (mapped) return mapped;
    if (plant.typeId === "minecraft:double_plant") {
        try {
            const t = plant.permutation.getState("double_plant_type");
            if (t === "fern" || t === "double_fern") return "mb:infected_large_fern";
        } catch {
            /* missing */
        }
        return "mb:infected_tall_grass";
    }
    return undefined;
}

function repairOrphanInfectedGrass(block) {
    if (!block?.isValid || !GROUND_ONLY_INFECTED_GRASS.has(block.typeId)) return false;
    const below = blockBelow(block);
    if (DOUBLE_INFECTED.has(block.typeId)) {
        let part = 0;
        try {
            part = Number(block.permutation.getState("minecraft:multi_block_part")) || 0;
        } catch {
            /* default bottom */
        }
        if (part === 1) {
            if (below && below.typeId === block.typeId) return false;
            try {
                block.setType("minecraft:air");
                return true;
            } catch {
                return false;
            }
        }
        if (isFoliageSoilId(below?.typeId)) return false;
        const above = getBlockAt(block.dimension, block.location.x, block.location.y + 1, block.location.z);
        try {
            if (above && above.typeId === block.typeId) above.setType("minecraft:air");
            block.setType("minecraft:air");
            return true;
        } catch {
            return false;
        }
    }
    if (isFoliageSoilId(below?.typeId)) return false;
    try {
        block.setType("minecraft:air");
        return true;
    } catch {
        return false;
    }
}

function convertGreeneryPlant(plant) {
    if (!plant?.isValid) return false;
    const dest = infectedDestForPlant(plant);
    if (!dest) return false;
    if (dest === "mb:infected_vine") return placeInfectedVine(plant);
    const tall = TALL_GREENERY.has(plant.typeId);
    try {
        if (tall && isDoublePlantUpper(plant)) {
            const below = blockBelow(plant);
            if (below && DOUBLE_INFECTED.has(below.typeId) && below.typeId === dest) {
                plant.setPermutation(BlockPermutation.resolve(dest, { "minecraft:multi_block_part": 1 }));
                return true;
            }
            if (below && (isGreeneryPlantId(below.typeId) || TALL_GREENERY.has(below.typeId))) {
                if (DOUBLE_INFECTED.has(dest)) return placeInfectedDoublePlant(below, dest);
            }
            return false;
        }
        if (tall) {
            if (DOUBLE_INFECTED.has(dest)) return placeInfectedDoublePlant(plant, dest);
            return false;
        }
        if (!isFoliageSoilId(blockBelow(plant)?.typeId)) return false;
        plant.setType(dest);
        return true;
    } catch {
        return false;
    }
}

/** Vanilla vine_direction_bits: south=1, west=2, north=4, east=8. */
const VINE_SOUTH = 1;
const VINE_WEST = 2;
const VINE_NORTH = 4;
const VINE_EAST = 8;

function isVineSupportId(typeId) {
    if (!typeId || typeId === "minecraft:air") return false;
    if (isGreeneryPlantId(typeId) || isInfectedFoliageId(typeId)) return false;
    return true;
}

function vineBitsFromNeighbors(block) {
    const loc = block.location;
    const dim = block.dimension;
    let bits = 0;
    const south = getBlockAt(dim, loc.x, loc.y, loc.z + 1);
    const west = getBlockAt(dim, loc.x - 1, loc.y, loc.z);
    const north = getBlockAt(dim, loc.x, loc.y, loc.z - 1);
    const east = getBlockAt(dim, loc.x + 1, loc.y, loc.z);
    if (south && isVineSupportId(south.typeId)) bits |= VINE_SOUTH;
    if (west && isVineSupportId(west.typeId)) bits |= VINE_WEST;
    if (north && isVineSupportId(north.typeId)) bits |= VINE_NORTH;
    if (east && isVineSupportId(east.typeId)) bits |= VINE_EAST;
    return bits;
}

function vineBitsFromBlock(block) {
    try {
        const v = Number(block.permutation.getState("vine_direction_bits"));
        if (Number.isFinite(v) && v > 0) return v | 0;
    } catch {
        /* missing */
    }
    return vineBitsFromNeighbors(block);
}

function repairInfectedVineIfNeeded(block) {
    if (!block?.isValid || block.typeId !== "mb:infected_vine") return false;
    const inferred = vineBitsFromNeighbors(block);
    if (inferred <= 0) return false;
    if (vineBitsFromInfected(block) === inferred) return false;
    try {
        block.setPermutation(BlockPermutation.resolve("mb:infected_vine", vineStatesFromBits(inferred)));
        return true;
    } catch {
        return false;
    }
}

function vineStatesFromBits(bits) {
    const b = bits | 0;
    return {
        "mb:south": (b & VINE_SOUTH) ? 1 : 0,
        "mb:west": (b & VINE_WEST) ? 1 : 0,
        "mb:north": (b & VINE_NORTH) ? 1 : 0,
        "mb:east": (b & VINE_EAST) ? 1 : 0
    };
}

function vineBitsFromInfected(block) {
    let bits = 0;
    try {
        if (block.permutation.getState("mb:south") === 1) bits |= VINE_SOUTH;
        if (block.permutation.getState("mb:west") === 1) bits |= VINE_WEST;
        if (block.permutation.getState("mb:north") === 1) bits |= VINE_NORTH;
        if (block.permutation.getState("mb:east") === 1) bits |= VINE_EAST;
    } catch {
        /* missing */
    }
    return bits;
}

function placeInfectedVine(vanillaVine) {
    if (!vanillaVine?.isValid) return false;
    let bits = vineBitsFromBlock(vanillaVine);
    if (bits <= 0) bits = VINE_SOUTH | VINE_WEST | VINE_NORTH | VINE_EAST;
    try {
        vanillaVine.setPermutation(BlockPermutation.resolve("mb:infected_vine", vineStatesFromBits(bits)));
        return true;
    } catch {
        try {
            vanillaVine.setType("mb:infected_vine");
            return true;
        } catch {
            return false;
        }
    }
}

function placeInfectedDoublePlant(bottom, infectedId) {
    if (!bottom?.isValid) return false;
    if (!isFoliageSoilId(blockBelow(bottom)?.typeId)) return false;
    const loc = bottom.location;
    const above = getBlockAt(bottom.dimension, loc.x, loc.y + 1, loc.z);
    if (!above) return false;
    const aboveId = above.typeId;
    if (aboveId !== "minecraft:air" && !isGreeneryPlantId(aboveId) && aboveId !== infectedId) {
        return false;
    }
    try {
        // Do not air the vanilla top first — that pops the pair (Wiki: breaking
        // one half of a double plant / multi-block breaks all). Place both parts
        // onto the existing cells.
        bottom.setPermutation(BlockPermutation.resolve(infectedId, { "minecraft:multi_block_part": 0 }));
        const top = getBlockAt(bottom.dimension, loc.x, loc.y + 1, loc.z);
        if (!top) return false;
        top.setPermutation(BlockPermutation.resolve(infectedId, { "minecraft:multi_block_part": 1 }));
        return true;
    } catch {
        return false;
    }
}

/**
 * Emulsifier restore. Double plants must set both halves or the pair pops.
 * @param {import("@minecraft/server").Block} block
 * @param {string} vanillaId
 */
export function restoreInfectedFoliageToVanilla(block, vanillaId) {
    if (!block?.isValid || !vanillaId) return false;
    if (!DOUBLE_INFECTED.has(block.typeId)) {
        try {
            if (block.typeId === "mb:infected_vine" && vanillaId === "minecraft:vine") {
                const bits = vineBitsFromInfected(block);
                block.setPermutation(BlockPermutation.resolve(vanillaId, {
                    vine_direction_bits: bits > 0 ? bits : VINE_SOUTH
                }));
                return true;
            }
            block.setType(vanillaId);
            return true;
        } catch {
            return false;
        }
    }
    let bottom = block;
    try {
        if (block.permutation.getState("minecraft:multi_block_part") === 1) {
            const below = getBlockAt(block.dimension, block.location.x, block.location.y - 1, block.location.z);
            if (below) bottom = below;
        }
    } catch {
        // keep this cell as bottom
    }
    const top = getBlockAt(bottom.dimension, bottom.location.x, bottom.location.y + 1, bottom.location.z);
    try {
        bottom.setPermutation(BlockPermutation.resolve(vanillaId, { upper_block_bit: false }));
        if (top) {
            top.setPermutation(BlockPermutation.resolve(vanillaId, { upper_block_bit: true }));
        }
        return true;
    } catch {
        try {
            bottom.setType(vanillaId);
            return true;
        } catch {
            return false;
        }
    }
}

function foliageTouchesInfection(block) {
    if (!block?.isValid) return false;
    const dim = block.dimension;
    const loc = block.location;
    const dirs = [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
    ];
    for (const [dx, dy, dz] of dirs) {
        const n = getBlockAt(dim, loc.x + dx, loc.y + dy, loc.z + dz);
        if (n && isInfectionSourceId(n.typeId)) return true;
    }
    return false;
}

/**
 * Vines / mushrooms / litter sitting next to infection (not only on converting grass).
 * @param {import("@minecraft/server").Block} block
 */
function tryConvertFoliageCell(block) {
    if (!block?.isValid) return false;
    if (greeneryNeighborChanceAt(block) <= 0) return false;
    const resist = spreadResistMultForFoliage(block);
    if (resist < 1 && Math.random() > resist) return false;
    if (!isConvertibleVanillaFoliage(block.typeId) && !GREENERY_PLANTS.has(block.typeId)) return false;
    if (isInfectionSpreadBlockedAt(block)) return false;
    if (!foliageTouchesInfection(block)) return false;
    return convertGreeneryPlant(block);
}

/**
 * One surface cell: grass_block / dirt-like → dusted_dirt.
 * Plants on grass become infected foliage (dusty grass, litter, mushrooms).
 * @param {import("@minecraft/server").Block} grassBlock
 * @returns {boolean}
 */
export function convertGrassCell(grassBlock) {
    return convertGroundCell(grassBlock);
}

function convertGroundCell(groundBlock) {
    if (!groundBlock?.isValid) return false;
    if (isInfectionSpreadBlockedAt(groundBlock)) return false;
    if (!isConvertibleGroundId(groundBlock.typeId)) return false;
    const dim = groundBlock.dimension;
    const loc = groundBlock.location;
    const above = getBlockAt(dim, loc.x, loc.y + 1, loc.z);
    if (above && !isAllowedCoverAbove(above.typeId)) return false;
    const isLivingSurface = LIVING_SURFACE_IDS.has(groundBlock.typeId);
    const hadPlant = !!(isLivingSurface && above && isGreeneryPlantId(above.typeId));
    if (hadPlant && !convertGreeneryPlant(above)) return false;
    try {
        groundBlock.setType(dustedGroundIdForVanilla(groundBlock.typeId));
    } catch {
        return false;
    }
    rememberKnownGroundSource(groundBlock, { alreadySpread: true });
    return true;
}

function grassTouchesInfection(grassBlock) {
    const dim = grassBlock.dimension;
    const loc = grassBlock.location;
    const above = getBlockAt(dim, loc.x, loc.y + 1, loc.z);
    if (above && isSnowLayerId(above.typeId)) return true;
    if (above && INFECTED_LEAF_IDS.has(above.typeId)) return true;
    if (above && INFECTED_WOOD_IDS.has(above.typeId)) return true;
    return forEachClimbNeighbor(loc, (x, y, z) => {
        const n = getBlockAt(dim, x, y, z);
        if (n && isInfectionSourceId(n.typeId)) return true;
        if (!n) return false;
        const nAbove = getBlockAt(dim, n.location.x, n.location.y + 1, n.location.z);
        return !!(nAbove && isSnowLayerId(nAbove.typeId) && isDustedGroundId(n.typeId));
    });
}

/**
 * @param {import("@minecraft/server").Block} grassBlock
 * @param {number} chance
 * @param {{ knownAdjacent?: boolean }} [opts] skip neighbor probe when already next to the source
 * @returns {boolean}
 */
function tryConvertEligibleGround(grassBlock, chance, opts = {}) {
    if (!grassBlock?.isValid) return false;
    if (!isConvertibleGroundId(grassBlock.typeId)) return false;
    if (chance <= 0) return false;
    if (!opts.knownAdjacent && !grassTouchesInfection(grassBlock)) return false;
    const soilChance = chance * spreadResistMultForGround(grassBlock);
    if (soilChance <= 0 || Math.random() > soilChance) return false;
    return convertGroundCell(grassBlock);
}

/**
 * Powder sitting on grass infects that grass_block (one-shot, no stages).
 * Then every orifice of the powder (and the new dirt) rolls independently.
 * @param {import("@minecraft/server").Block} snowBlock
 * @param {{ force?: boolean }} [opts]
 */
export function tryInfectGrassUnderSnow(snowBlock, opts = {}) {
    if (!grassInfectionEnabled()) return false;
    if (!snowBlock?.isValid) return false;
    if (isInfectionSpreadBlockedAt(snowBlock)) return false;
    if (!isSnowLayerId(snowBlock.typeId)) return false;
    const loc = snowBlock.location;
    const below = getBlockAt(snowBlock.dimension, loc.x, loc.y - 1, loc.z);
    let converted = false;
    if (below && isConvertibleGroundId(below.typeId)) {
        if (opts.force) converted = convertGroundCell(below);
        else {
            converted = tryConvertEligibleGround(
                below,
                greeneryNeighborChanceAt(snowBlock),
                { knownAdjacent: true }
            );
        }
    }
    rememberKnownGroundSource(snowBlock, { alreadySpread: true });
    if (isDustedGroundId(below?.typeId)) {
        rememberKnownGroundSource(below, { alreadySpread: true });
    }
    return converted;
}

/**
 * One vine step: random cardinal column (same Y then climb/drop), else diagonal.
 * At most one convert. Hills of a few blocks are not a wall.
 * @param {import("@minecraft/server").Block} source
 * @returns {boolean}
 */
export function tryInfectGrassAround(source) {
    if (!grassInfectionEnabled()) return false;
    if (!source?.isValid) return false;
    if (isInfectionSpreadBlockedAt(source)) return false;
    const chance = greeneryNeighborChanceAt(source);
    if (chance <= 0) return false;
    const loc = source.location;
    const dim = source.dimension;
    const above = getBlockAt(dim, loc.x, loc.y + 1, loc.z);
    if (above && tryConvertFoliageCell(above)) return true;
    const adj = [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
    ];
    for (const [dx, dy, dz] of adj) {
        const n = getBlockAt(dim, loc.x + dx, loc.y + dy, loc.z + dz);
        if (n && tryConvertFoliageCell(n)) return true;
    }
    if (tryVineStepAlongDirs(source, chance, VINE_CARDINALS)) return true;
    return tryVineStepAlongDirs(source, chance, VINE_DIAGONALS);
}

function trySpreadFromSolidHit(hit, chance) {
    if (!hit?.isValid) return false;
    const id = hit.typeId;
    if (isConvertibleGroundId(id)) {
        return tryConvertEligibleGround(hit, chance);
    }
    if (isInfectionSourceId(id)) {
        return tryInfectGrassAround(hit);
    }
    return false;
}

function addInfectionSource(into, block) {
    if (!block?.isValid || !isKnownGroundId(block.typeId)) return;
    if (isDustedGroundId(block.typeId) && !dirtTouchesGrass(block)) return;
    if (isSnowLayerId(block.typeId) && !sourceHasSpreadFront(block)) return;
    into.set(sourceKey(block), block);
}

/**
 * Crosshair + the block underfoot. August's screenshot was looking at a 12-block
 * dusty island — getBlocks never guaranteed that cell.
 * @param {import("@minecraft/server").Player} player
 * @param {Map<string, import("@minecraft/server").Block>} into
 */
function collectLookedAtAndStandingDirt(player, into) {
    try {
        const hit = player.getBlockFromViewDirection?.({
            maxDistance: LOOK_MAX_DISTANCE,
            includePassableBlocks: false
        });
        addInfectionSource(into, hit?.block);
    } catch {
        /* view ray optional */
    }
    try {
        const standing = player.getBlockStandingOn?.();
        addInfectionSource(into, standing);
    } catch {
        /* standing optional */
    }
}

/**
 * Stable Dimension.getBlock walk around the player. Do not use getBlocks here:
 * includeTypes for mb:dusted_dirt often returns an empty volume.
 * @param {import("@minecraft/server").Player} player
 * @param {Map<string, import("@minecraft/server").Block>} into
 */
function collectFootprintDustedDirt(player, into) {
    const dim = player.dimension;
    const loc = player.location;
    const ox = Math.floor(loc.x);
    const oy = Math.floor(loc.y);
    const oz = Math.floor(loc.z);
    for (let dx = -FOOTPRINT_RX; dx <= FOOTPRINT_RX; dx++) {
        for (let dz = -FOOTPRINT_RX; dz <= FOOTPRINT_RX; dz++) {
            for (let dy = FOOTPRINT_Y_MIN; dy <= FOOTPRINT_Y_MAX; dy++) {
                const block = getBlockAt(dim, ox + dx, oy + dy, oz + dz);
                if (block?.typeId === "mb:infected_vine") repairInfectedVineIfNeeded(block);
                if (block && GROUND_ONLY_INFECTED_GRASS.has(block.typeId)) repairOrphanInfectedGrass(block);
                addInfectionSource(into, block);
            }
        }
    }
}

function shuffleBlocks(blocks) {
    const copy = blocks.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
    }
    return copy;
}

/**
 * Player-centric ground scan. Dusty dirt does not tick; this walk is the
 * only way a placed island next to grass or tree-shade dirt can hop. Neighbor chance
 * matches leaves. Random lawn rays stay on the slower greenery table.
 * @param {import("@minecraft/server").Player} player
 * @param {(dirt: import("@minecraft/server").Block) => void} [onDustedDirt]
 */
export function scanAroundPlayerForGrassInfection(player, onDustedDirt) {
    if (!player?.isValid) return;
    if (!grassInfectionEnabled()) return;
    const dim = player.dimension;
    if (dim.id !== "minecraft:overworld") return;
    const day = currentWorldDay();
    const neighborChance = getGreeneryNeighborSpreadChance(day);
    const scanChance = getGreenerySpreadChance(day);
    if (neighborChance <= 0 && scanChance <= 0) return;
    const loc = player.location;
    const chance = scaleWorldInfectionChance(scanChance, day, dim, loc.x, loc.z);
    const ox = Math.floor(loc.x);
    const oy = Math.floor(loc.y);
    const oz = Math.floor(loc.z);
    const maxY = dim.heightRange?.max ?? 320;
    const startY = Math.min(maxY - 2, oy + GROUND_RAY_UP);
    let converted = 0;

    const priorityDirt = new Map();
    collectLookedAtAndStandingDirt(player, priorityDirt);
    try {
        const hit = player.getBlockFromViewDirection?.({
            maxDistance: LOOK_MAX_DISTANCE,
            includePassableBlocks: false
        });
        const looked = hit?.block;
        if (looked && isConvertibleGroundId(looked.typeId)) {
            if (tryConvertEligibleGround(looked, greeneryNeighborChanceAt(looked))) converted++;
        }
        addInfectionSource(priorityDirt, looked);
    } catch {
        /* view ray optional */
    }
    const dirtHits = new Map(priorityDirt);
    collectFootprintDustedDirt(player, dirtHits);
    const rest = [];
    for (const [key, block] of dirtHits) {
        if (!priorityDirt.has(key)) rest.push(block);
    }
    const dirtSources = Array.from(priorityDirt.values()).concat(shuffleBlocks(rest));
    for (let i = 0; i < dirtSources.length && i < DIRT_FRONT_SOURCE_CAP; i++) {
        const dirt = dirtSources[i];
        if (tryInfectGrassAround(dirt)) converted++;
        if (onDustedDirt) onDustedDirt(dirt);
    }

    if (chance > 0) {
        for (let i = 0; i < GROUND_SCAN_COLUMNS && converted < GROUND_RAY_CONVERT_CAP; i++) {
            const x = ox + Math.floor(Math.random() * (GROUND_SCAN_RADIUS * 2 + 1)) - GROUND_SCAN_RADIUS;
            const z = oz + Math.floor(Math.random() * (GROUND_SCAN_RADIUS * 2 + 1)) - GROUND_SCAN_RADIUS;
            let hit;
            try {
                hit = dim.getBlockFromRay(
                    { x: x + 0.5, y: startY, z: z + 0.5 },
                    { x: 0, y: -1, z: 0 },
                    {
                        maxDistance: GROUND_RAY_DISTANCE,
                        includeLiquidBlocks: false,
                        includePassableBlocks: false
                    }
                );
            } catch {
                continue;
            }
            const block = hit?.block;
            if (!block) continue;
            if (trySpreadFromSolidHit(block, chance)) converted++;
            if (isDustedGroundId(block.typeId) && onDustedDirt) onDustedDirt(block);
        }
    }
    for (let i = 0; i < DIRT_FRONT_COLUMNS && converted < GROUND_RAY_CONVERT_CAP; i++) {
        const x = ox + Math.floor(Math.random() * (DIRT_FRONT_RADIUS * 2 + 1)) - DIRT_FRONT_RADIUS;
        const z = oz + Math.floor(Math.random() * (DIRT_FRONT_RADIUS * 2 + 1)) - DIRT_FRONT_RADIUS;
        let hit;
        try {
            hit = dim.getBlockFromRay(
                { x: x + 0.5, y: startY, z: z + 0.5 },
                { x: 0, y: -1, z: 0 },
                {
                    maxDistance: GROUND_RAY_DISTANCE,
                    includeLiquidBlocks: false,
                    includePassableBlocks: false
                }
            );
        } catch {
            continue;
        }
        const block = hit?.block;
        if (isDustedGroundId(block?.typeId) && tryInfectGrassAround(block)) converted++;
        if (isDustedGroundId(block?.typeId) && onDustedDirt) onDustedDirt(block);
    }
    for (let i = 0; i < 10 && converted < GROUND_RAY_CONVERT_CAP; i++) {
        const x = ox + Math.floor(Math.random() * 17) - 8;
        const y = oy + Math.floor(Math.random() * 13) - 2;
        const z = oz + Math.floor(Math.random() * 17) - 8;
        const cell = getBlockAt(dim, x, y, z);
        if (tryConvertFoliageCell(cell)) converted++;
    }
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mb:infected_foliage", {});
});
