/**
 * Central balance tuning: spawn type caps, mob→bear conversion pressure, infection conversion rates.
 * Prefer editing this file (and `SPAWN_CONFIGS` in mb_spawnConfigs.js) over scattering magic numbers.
 */

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
    [MINING_TYPE]: 3,
    [FLYING_TYPE]: 20,
    [TORPEDO_TYPE]: 10
};

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

/** Block boss→buff conversions when this many buff bears already within 64m. */
export const MB_CONVERSION_BUFF_NEAR_CAP = 5;

// --- Global bear population cull (mb_bearPopulationCull.js): trim distant mobs when world totals run away ---
/** Total MB addon bears (overworld+nether+end) at or above this → cull a few per interval. */
export const MB_BEAR_CULL_WHEN_GLOBAL_ABOVE = 200;
/** Soft floor to work toward; each pass removes up to MAX at most (total - TARGET) combined. */
export const MB_BEAR_CULL_TARGET_GLOBAL = 180;
export const MB_BEAR_CULL_MAX_REMOVED_PER_PASS = 4;
/**
 * Only mobs with nearest player (same dimension) farther than this (blocks) are eligible — vanilla-like
 * (things nobody is "loaded next to" go first). Lower = more aggressive; tune with urgent block below.
 */
export const MB_BEAR_CULL_MIN_NEAREST_PLAYER_BLOCKS = 56;
/**
 * When count explodes, relax distance so culling can still work if everyone is bunched in one region.
 * Still culls farthest-from-player first.
 */
export const MB_BEAR_CULL_URGENT_WHEN_GLOBAL_ABOVE = 360;
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
 * @returns {number} 0 before day 2, else stepped infection probability for conversions
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
