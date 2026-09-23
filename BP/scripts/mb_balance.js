/**
 * Central balance tuning: spawn type caps, mob→bear conversion pressure, infection conversion rates.
 * Prefer editing this file (and `SPAWN_CONFIGS` in mb_spawnConfigs.js) over scattering magic numbers.
 */

import { getAddonDifficultyState, getWorldProperty, setWorldProperty } from "./mb_dynamicPropertyHandler.js";

// --- Spawn: entity family keys (used with ENTITY_TYPE_CAPS and ENTITY_TO_TYPE_MAP) ---
export const TINY_TYPE = "tiny";
export const INFECTED_TYPE = "infected";
export const MINING_TYPE = "mining";
export const FLYING_TYPE = "flying";
export const TORPEDO_TYPE = "torpedo";

/** Nearby cap per family — all variants of that family count toward the same cap. */
export const ENTITY_TYPE_CAPS = {
    [TINY_TYPE]: 38,
    [INFECTED_TYPE]: 17,
    [MINING_TYPE]: 2,
    [FLYING_TYPE]: 20,
    [TORPEDO_TYPE]: 10
};

/**
 * Nearby infected-family cap (normal infected Maple Bears).
 * Base is ENTITY_TYPE_CAPS.infected. Scales with players in spawn range and
 * Journal → Settings addon difficulty (Easy 0.7 / Normal 1 / Hard 1.3).
 * @param {number} playerCount players sharing the spawn radius
 * @param {number} [spawnMultiplier=1] from getAddonDifficultyState().spawnMultiplier
 */
export function getInfectedTypeCap(playerCount, spawnMultiplier = 1) {
    const n = Math.max(1, playerCount | 0);
    const base = ENTITY_TYPE_CAPS[INFECTED_TYPE];
    const mp = n <= 1 ? 1 : n === 2 ? 1.4 : n === 3 ? 1.75 : 2;
    const diff = Number.isFinite(spawnMultiplier) && spawnMultiplier > 0 ? spawnMultiplier : 1;
    return Math.max(6, Math.min(48, Math.round(base * mp * diff)));
}

/** Natural spawn controller only: min ticks between successful buff bear spawns. Conversions ignore this. */
export const NATURAL_BUFF_SPAWN_COOLDOWN_TICKS = 20 * 120;

// --- Mob → Maple Bear conversion (mb_mainMobConversion.js) — pressure when many addon bears are nearby / in world ---
/** Below this nearby count (64m), mob→bear conversions use full pressure mult (1.0). */
export const MB_CONVERSION_NEARBY_PRESSURE_START = 24;
/** Above this nearby count, nearby pressure mult bottoms out at MB_CONVERSION_NEARBY_MULT_MIN. */
export const MB_CONVERSION_NEARBY_PRESSURE_END = 96;
export const MB_CONVERSION_NEARBY_MULT_MIN = 0.035;

/** World-wide addon bear total: start extra dampening (spread-out herds). */
export const MB_CONVERSION_WORLD_PRESSURE_START = 60;
export const MB_CONVERSION_WORLD_PRESSURE_END = 300;
export const MB_CONVERSION_WORLD_MULT_MIN = 0.025;

/** Absolute safety ceiling: block boss→buff conversions when this many buff bears already within 64m. */
export const MB_CONVERSION_BUFF_NEAR_CAP = 5;

/**
 * Max buff bears near a player / spawn site (loaded, within scan radius).
 * @param {number} playerCount players in dimension (or near the site)
 */
export function getMaxBuffBearsNearPlayerCount(playerCount) {
    const n = Math.max(1, playerCount);
    if (n <= 2) return 1;
    if (n <= 4) return 2;
    return 3;
}

/** Loaded mining bears allowed per player in a dimension (AI-heavy). */
export const MINING_BEARS_MAX_PER_PLAYER = 2;

/** Within spawn scan radius of one player — all mining variants share this cap. */
export function getMaxMiningBearsNearPlayerCount() {
    return MINING_BEARS_MAX_PER_PLAYER;
}

/**
 * Max mining bears in the whole dimension (loaded).
 * @param {number} playerCount players in the dimension
 */
export function getMaxMiningBearsDimensionWideCount(playerCount) {
    const n = Math.max(1, playerCount);
    return Math.min(12, n * MINING_BEARS_MAX_PER_PLAYER);
}

/**
 * Max buff bears in the whole dimension (loaded) — higher than near-player cap.
 * Both caps apply (`mb_buffCap.js`).
 * @param {number} playerCount players in the dimension
 */
export function getMaxBuffBearsDimensionWideCount(playerCount) {
    const n = Math.max(1, playerCount);
    if (n <= 2) return 3;
    if (n <= 4) return 5;
    return 6;
}

/** @deprecated Use getMaxBuffBearsNearPlayerCount */
export function getMaxBuffBearsForNearbyPlayerCount(nearbyPlayerCount) {
    return getMaxBuffBearsNearPlayerCount(nearbyPlayerCount);
}

// --- Global bear population cull (mb_bearPopulationCull.js): trim distant tiny + infected when world totals run high ---
/** Total MB addon bears (overworld+nether+end) at or above this → eligible for cull passes (only tiny/infected types are removed). */
export const MB_BEAR_CULL_WHEN_GLOBAL_ABOVE = 80;
/** Soft floor for global total; each pass removes up to MAX toward this (only distant tiny/infected). */
export const MB_BEAR_CULL_TARGET_GLOBAL = 68;
export const MB_BEAR_CULL_MAX_REMOVED_PER_PASS = 6;
/**
 * Only mobs with nearest player (same dimension) farther than this (blocks) are eligible — vanilla-like
 * (things nobody is "loaded next to" go first). Lower = more aggressive; tune with urgent block below.
 */
export const MB_BEAR_CULL_MIN_NEAREST_PLAYER_BLOCKS = 56;
/**
 * When count explodes, relax distance so culling can still work if everyone is bunched in one region.
 * Still culls farthest-from-player first.
 */
export const MB_BEAR_CULL_URGENT_WHEN_GLOBAL_ABOVE = 140;
export const MB_BEAR_CULL_URGENT_MIN_NEAREST_PLAYER_BLOCKS = 28;
export const MB_BEAR_CULL_INTERVAL_TICKS = 40;

// --- Progressive conversion rate by day (mob kills / storm) ---
export const INFECTION_RATE_STEPS = [
    { day: 2, rate: 0.20 },
    { day: 3, rate: 0.30 },
    { day: 4, rate: 0.40 },
    { day: 5, rate: 0.40 },
    { day: 6, rate: 0.50 },
    { day: 7, rate: 0.50 },
    { day: 8, rate: 0.60 },
    { day: 11, rate: 0.70 },
    { day: 15, rate: 0.80 },
    { day: 17, rate: 0.90 },
    { day: 20, rate: 1.00 }
];

/**
 * @param {number} day
 * @returns {number} 0 before day 2, else stepped infection probability for *mob* conversions (not block spread)
 */
export function getInfectionRate(day) {
    if (day < 2) return 0;
    let currentRate = 0;
    for (const step of INFECTION_RATE_STEPS) {
        if (day >= step.day) {
            currentRate = step.rate;
        } else {
            break;
        }
    }
    return currentRate;
}

/**
 * Play curve for *block* spread (leaves, wood, grass). 0 before day 2.
 * Testing tables hit ~day-20 fire speed by calendar day 20; this is much slower
 * and caps at day 100. Knots: 2→20, 20→25 (steeper), then slower 25→50→75→100.
 * Linear between knots. Mob conversion still uses {@link getInfectionRate}.
 */
export const BLOCK_SPREAD_PROGRESS_KNOTS = [
    { day: 2, s: 0.04 },
    { day: 20, s: 0.18 },
    { day: 25, s: 0.28 },
    { day: 50, s: 0.45 },
    { day: 75, s: 0.70 },
    { day: 100, s: 1.00 }
];

/**
 * @param {number} day
 * @returns {number} 0–1 block-spread progress (0 before day 2, 1 at day 100+)
 */
export function getBlockSpreadProgress(day) {
    if (day < 2) return 0;
    const knots = BLOCK_SPREAD_PROGRESS_KNOTS;
    const last = knots[knots.length - 1];
    if (day >= last.day) return last.s;
    for (let i = 0; i < knots.length - 1; i++) {
        const a = knots[i];
        const b = knots[i + 1];
        if (day >= a.day && day < b.day) {
            const t = (day - a.day) / (b.day - a.day);
            return a.s + t * (b.s - a.s);
        }
    }
    return last.s;
}

/**
 * Multiplier on leaf/wood/grass convert chances. Knots stay the same.
 * 1 = first play table (day 2 canopy convert ~2%). August 2026-09-01: 2 (~4%).
 */
export const BLOCK_SPREAD_CHANCE_MULT = 2;

/** World property: extra convert-chance scale. Unset / 1 = play curve. 0 = pause. Dev Tools → Infection. */
export const BLOCK_SPREAD_SPEED_PROPERTY = "mb_block_spread_speed_mult";
export const BLOCK_SPREAD_SPEED_MIN = 0;
export const BLOCK_SPREAD_SPEED_MAX = 16;

/**
 * Dev override on leaf/wood/grass convert chance. 1 = shipped play curve. 0 = pause.
 * Does not change mob conversion or scan interval.
 * @returns {number}
 */
export function getBlockSpreadSpeedMultiplier() {
    const raw = getWorldProperty(BLOCK_SPREAD_SPEED_PROPERTY);
    if (raw === undefined || raw === null || raw === "") return 1;
    const num = Number(raw);
    if (!Number.isFinite(num)) return 1;
    return Math.max(BLOCK_SPREAD_SPEED_MIN, Math.min(BLOCK_SPREAD_SPEED_MAX, num));
}

/**
 * @param {number} mult
 * @returns {number} clamped value that was stored (1 clears the world property)
 */
export function setBlockSpreadSpeedMultiplier(mult) {
    const num = Number(mult);
    const clamped = !Number.isFinite(num)
        ? 1
        : Math.max(BLOCK_SPREAD_SPEED_MIN, Math.min(BLOCK_SPREAD_SPEED_MAX, num));
    setWorldProperty(BLOCK_SPREAD_SPEED_PROPERTY, clamped === 1 ? undefined : clamped);
    return clamped;
}

/**
 * Journal → Settings addon difficulty scale for leaf/wood/grass convert chance.
 * Same Easy 0.7 / Normal 1 / Hard 1.3 as spawn. Does not change scan interval or mob conversion.
 * @returns {number}
 */
export function getBlockSpreadDifficultyMultiplier() {
    try {
        const m = Number(getAddonDifficultyState()?.blockSpreadMultiplier);
        if (Number.isFinite(m) && m > 0) return m;
    } catch {
        /* world not ready */
    }
    return 1;
}

/**
 * @param {number} s getBlockSpreadProgress
 * @param {number} intercept
 * @param {number} slope
 * @returns {number} 0–1
 */
function blockSpreadChance(s, intercept, slope) {
    if (s <= 0) return 0;
    const speed = getBlockSpreadSpeedMultiplier();
    if (speed <= 0) return 0;
    const diff = getBlockSpreadDifficultyMultiplier();
    return Math.min(1, (intercept + s * slope) * BLOCK_SPREAD_CHANCE_MULT * speed * diff);
}

/**
 * Canopy leaf infection (`mb_leafInfection.js`). 0 before day 2.
 * @param {number} day
 * @returns {number} 0–1 chance per canopy scan hit that snow-on-leaf converts
 */
export function getLeafSnowConvertChance(day) {
    return blockSpreadChance(getBlockSpreadProgress(day), 0.012, 0.20);
}

/**
 * @param {number} day
 * @returns {number} 0–1 chance per infected-leaf tick to infect one neighbor
 */
export function getLeafNeighborSpreadChance(day) {
    return blockSpreadChance(getBlockSpreadProgress(day), 0.008, 0.12);
}

/**
 * Log / stem / wart neighbor hops. Slightly faster than leaves, same day curve.
 * @param {number} day
 * @returns {number} 0–1
 */
export function getWoodNeighborSpreadChance(day) {
    return blockSpreadChance(getBlockSpreadProgress(day), 0.012, 0.16);
}

/**
 * Grass plants + grass_block (`mb_grassInfection.js`). 0 before day 2.
 * Random player-scan hits stay slower than leaf neighbor spread.
 * Dirt→grass_block neighbor spread uses {@link getGreeneryNeighborSpreadChance}.
 * Live chances go through {@link blockSpreadChance} (dev speed × journal difficulty); this table is knot snapshots only.
 */
export const GREENERY_SPREAD_STEPS = BLOCK_SPREAD_PROGRESS_KNOTS.map((k) => ({
    day: k.day,
    chance: (0.006 + k.s * 0.08) * BLOCK_SPREAD_CHANCE_MULT
}));

/**
 * @param {number} day
 * @returns {number} 0–1 chance per eligible grass cell to convert this scan/tick
 */
export function getGreenerySpreadChance(day) {
    return blockSpreadChance(getBlockSpreadProgress(day), 0.006, 0.08);
}

/**
 * Dusted dirt / powder / infected leaf → adjacent grass_block.
 * Matches {@link getLeafNeighborSpreadChance} so ground spread is visible
 * next to a small creative patch (leaves tick; dirt does not).
 * @param {number} day
 * @returns {number} 0–1
 */
export function getGreeneryNeighborSpreadChance(day) {
    return getLeafNeighborSpreadChance(day);
}

/**
 * Vine / kill-burst convert of living soil. Podzol is the giant/old-growth taiga
 * floor; mycelium is mushroom fields. Both crawl slower than dirt/grass.
 * Those biomes are intentionally not infected-biome replace (not immunity).
 * Coarse dirt is the actual dirt+gravel craft — not this multiplier.
 */
export const PODZOL_GROUND_SPREAD_MULT = 0.45;
export const MYCELIUM_GROUND_SPREAD_MULT = 0.45;
/** Extra slow for the whole biome (grass/dirt in giant taiga or mushroom fields). */
export const RESISTANT_SOIL_BIOME_SPREAD_MULT = 0.55;
/** Vanilla brown/red mushrooms resist convert more than grass. They do not purify. */
export const MUSHROOM_PLANT_SPREAD_MULT = 0.4;

const RESISTANT_SOIL_BIOME_IDS = new Set([
    "minecraft:mushroom_island",
    "minecraft:mushroom_island_shore",
    "minecraft:mushroom_fields",
    "minecraft:mushroom_field_shore",
    "minecraft:mega_taiga",
    "minecraft:mega_taiga_hills",
    "minecraft:redwood_taiga_mutated",
    "minecraft:redwood_taiga_hills_mutated",
    "minecraft:old_growth_pine_taiga",
    "minecraft:old_growth_spruce_taiga"
]);

const MUSHROOM_PLANT_IDS = new Set([
    "minecraft:brown_mushroom",
    "minecraft:red_mushroom"
]);

/** @param {string|undefined} typeId */
export function getGroundConvertChanceMult(typeId) {
    if (typeId === "minecraft:podzol") return PODZOL_GROUND_SPREAD_MULT;
    if (typeId === "minecraft:mycelium") return MYCELIUM_GROUND_SPREAD_MULT;
    return 1;
}

/** @param {string|undefined} biomeId */
export function getResistantSoilBiomeSpreadMult(biomeId) {
    if (!biomeId) return 1;
    const id = String(biomeId);
    if (RESISTANT_SOIL_BIOME_IDS.has(id)) return RESISTANT_SOIL_BIOME_SPREAD_MULT;
    if (!id.includes(":") && RESISTANT_SOIL_BIOME_IDS.has(`minecraft:${id}`)) {
        return RESISTANT_SOIL_BIOME_SPREAD_MULT;
    }
    return 1;
}

/** @param {string|undefined} typeId */
export function getFoliageConvertChanceMult(typeId) {
    if (MUSHROOM_PLANT_IDS.has(typeId)) return MUSHROOM_PLANT_SPREAD_MULT;
    return 1;
}

// --- Infection evolution: localized storm reservoirs (Phase 2, mb_snowStorm getStormReservoirSpawnChanceMult + mb_spawnController) ---
/** Max extra natural spawn chance at storm eye; linear falloff to storm radius edge. Overworld only. */
export const STORM_RESERVOIR_SPAWN_CHANCE_MAX_BUMP = 0.08;
/** Inner fraction of storm radius where reservoir influence is full (1); outer ring fades to edge. */
export const STORM_RESERVOIR_INNER_RADIUS_FRACTION = 0.35;

// --- Infection director stages (Phase 3, mb_infectionDirector.js + mb_spawnController) ---
/** Day bands for named director tiers (inclusive upper bounds for scout/pressure/surge). */
export const INFECTION_DIRECTOR_DAY_SCOUT_MAX = 7;
export const INFECTION_DIRECTOR_DAY_PRESSURE_MAX = 14;
export const INFECTION_DIRECTOR_DAY_SURGE_MAX = 19;
/** When spawn-load snapshot load01 is at or above this, director stage bumps one tier (capped). */
export const INFECTION_DIRECTOR_LOAD_ESCALATE = 0.52;
/** Per-stage natural spawn chance multiplier (scout → stormfront). */
export const INFECTION_DIRECTOR_CHANCE_MULT = Object.freeze([1, 1.02, 1.045, 1.07]);
/** Extra tile spawn attempts per config (surge/stormfront emphasize pressure vs pure rate). */
export const INFECTION_DIRECTOR_ATTEMPT_BONUS = Object.freeze([0, 0, 1, 2]);

/** Emulsifier: infected leaves / walkable foliage become air instead of vanilla. */
export const EMULSIFIER_LEAF_VANISH_CHANCE = 0.35;
/** Emulsifier: dusted dirt becomes grass_block when the two cells above are open (lawn / forest floor). */
export const EMULSIFIER_DIRT_TO_GRASS_CHANCE = 0.45;
