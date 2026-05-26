/**
 * Shared cache system for AI scripts
 * Reduces duplicate queries across mining, torpedo, and flying AI
 */

import { system } from "@minecraft/server";
import { getAllPlayersIncludingSim } from "./mb_simPlayers.js";
import {
    getSpreadMobCacheCompletedTicks,
    isEntityQuerySpreadActive,
    isSpreadThrottleActive,
    queryEntitiesOneSpreadSection,
    shouldDeferVillageBurst,
    SPREAD_CELL_COUNT
} from "./mb_workSpread.js";

/**
 * @minecraft/server `Entity.isValid` is a **boolean**; treat both boolean and
 * (legacy/defensive) function forms so we never read `.location` on a removed
 * entity — e.g. cached bear snapshots can briefly hold dead references.
 * @param {import("@minecraft/server").Entity | null | undefined} entity
 * @returns {boolean}
 */
export function isEntityValid(entity) {
    if (entity == null) return false;
    try {
        const v = entity.isValid;
        if (typeof v === "function") return !!v.call(entity);
        if (typeof v === "boolean") return v;
    } catch {
        return false;
    }
    return false;
}

// Player cache - shared across all AI scripts
const PLAYER_CACHE_TICKS = 2; // Cache players for 2 ticks (same as AI_TICK_INTERVAL)
let cachedPlayers = null;
let cachedPlayersTick = 0;
let cachedPlayerPositions = null; // Map<dimensionId, positions[]>

// Mob cache - shared across all AI scripts (completed refresh TTL from mb_workSpread on day 0–1)
const MOB_CACHE_TICKS = 2;
/** Per-player query radius when refreshing mob cache (not full dimension). */
export const MOB_CACHE_DISTANCE = 128;
const MOB_CACHE_QUERY_RADIUS = MOB_CACHE_DISTANCE;
/** Dropped items / orbs are dense in villages but irrelevant to bear AI targeting. */
const MOB_CACHE_EXCLUDE_TYPES = [
    "minecraft:item",
    "minecraft:xp_orb",
    "minecraft:arrow",
    "minecraft:spectral_arrow",
    "minecraft:thrown_trident",
    "minecraft:snowball",
    "minecraft:egg",
    "minecraft:ender_pearl",
    "minecraft:experience_bottle"
];
let cachedMobsByDimension = new Map(); // Map<dimensionId, {mobs: Entity[], tick: number, center: {x, y, z} | null}>

function normalizeDimensionKey(dimId) {
    if (!dimId) return "";
    return dimId.replace(/^minecraft:/, "");
}

/**
 * Query mobs/villagers near one or more anchors; dedupe by entity id.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {{ x: number, y: number, z: number }[]} anchors
 * @returns {import("@minecraft/server").Entity[]}
 */
const MOB_CACHE_QUERY_OPTS = {
    families: ["mob", "villager"],
    excludeTypes: MOB_CACHE_EXCLUDE_TYPES
};

function queryMobsNearAnchors(dimension, anchors) {
    if (!anchors?.length) return [];

    const dimKey = normalizeDimensionKey(dimension.id);
    const seen = new Set();
    const validMobs = [];
    for (const pos of anchors) {
        let part;
        if (isEntityQuerySpreadActive()) {
            for (let s = 0; s < SPREAD_CELL_COUNT; s++) {
                const slice = queryEntitiesOneSpreadSection(
                    dimension,
                    `mobCache:${dimKey}:${pos.x}:${pos.z}`,
                    pos,
                    MOB_CACHE_QUERY_RADIUS,
                    MOB_CACHE_QUERY_OPTS
                );
                for (const mob of slice) {
                    if (!isEntityValid(mob)) continue;
                    const id = mob.id;
                    if (seen.has(id)) continue;
                    seen.add(id);
                    validMobs.push(mob);
                }
            }
            continue;
        }
        try {
            part = dimension.getEntities({
                ...MOB_CACHE_QUERY_OPTS,
                location: pos,
                maxDistance: MOB_CACHE_QUERY_RADIUS
            });
        } catch {
            continue;
        }
        if (!part?.length) continue;
        for (const mob of part) {
            if (!isEntityValid(mob)) continue;
            const id = mob.id;
            if (seen.has(id)) continue;
            seen.add(id);
            validMobs.push(mob);
        }
    }
    return validMobs;
}

/** @param {import("@minecraft/server").Entity[]} prior */
function mergeMobLists(prior, added) {
    const seen = new Set();
    const out = [];
    for (const mob of [...(prior || []), ...(added || [])]) {
        if (!isEntityValid(mob)) continue;
        const id = mob.id;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(mob);
    }
    return out;
}

function averagePosition(positions) {
    if (!positions.length) return null;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    for (const pos of positions) {
        sumX += pos.x;
        sumY += pos.y;
        sumZ += pos.z;
    }
    const n = positions.length;
    return { x: sumX / n, y: sumY / n, z: sumZ / n };
}

function filterMobsByCenter(mobs, center, maxDistance) {
    const maxSq = maxDistance * maxDistance;
    const filtered = [];
    for (const mob of mobs) {
        try {
            if (!isEntityValid(mob)) continue;
            const mobLoc = mob.location;
            const dx = mobLoc.x - center.x;
            const dy = mobLoc.y - center.y;
            const dz = mobLoc.z - center.z;
            if (dx * dx + dy * dy + dz * dz <= maxSq) {
                filtered.push(mob);
            }
        } catch {
            /* skip */
        }
    }
    return filtered;
}

/**
 * Get all players (cached): real clients plus ghost sims when sim players are enabled (`getAllPlayersIncludingSim`).
 * @returns {Player[]} Array of all players
 */
export function getCachedPlayers() {
    const currentTick = system.currentTick;

    // Return cached players if still valid
    if (cachedPlayers && (currentTick - cachedPlayersTick) < PLAYER_CACHE_TICKS) {
        return cachedPlayers;
    }

    // Update cache
    try {
        cachedPlayers = getAllPlayersIncludingSim();
        cachedPlayersTick = currentTick;

        // Also cache player positions by dimension
        cachedPlayerPositions = new Map();
        for (const player of cachedPlayers) {
            try {
                const dimId = player.dimension.id;
                const normalizedDimId = normalizeDimensionKey(dimId);
                if (!cachedPlayerPositions.has(normalizedDimId)) {
                    cachedPlayerPositions.set(normalizedDimId, []);
                }
                cachedPlayerPositions.get(normalizedDimId).push(player.location);
            } catch {
                // Skip invalid players
            }
        }

        return cachedPlayers;
    } catch {
        // On error, return empty array
        return [];
    }
}

/**
 * Get player positions by dimension (cached)
 * @returns {Map<string, Array>} Map of dimensionId -> player positions
 */
export function getCachedPlayerPositions() {
    // Ensure cache is up to date
    getCachedPlayers();
    return cachedPlayerPositions || new Map();
}

/**
 * Clear the player cache (force refresh on next call)
 */
export function clearPlayerCache() {
    cachedPlayers = null;
    cachedPlayersTick = 0;
    cachedPlayerPositions = null;
}

/**
 * Get cached mobs for a dimension (batched query)
 * Refreshes with location-scoped queries around players in that dimension (not whole-world).
 * @param {Dimension} dimension - The dimension to query
 * @param {Object} center - Optional center point {x, y, z} for location-based queries
 * @param {number} maxDistance - Maximum distance from center (default: MOB_CACHE_DISTANCE)
 * @returns {Entity[]} Array of mobs in the dimension
 */
export function getCachedMobs(dimension, center = null, maxDistance = MOB_CACHE_DISTANCE) {
    if (!dimension) return [];

    const currentTick = system.currentTick;
    const dimId = dimension.id;

    // Check if we have a valid cache for this dimension
    const completedTtl = getSpreadMobCacheCompletedTicks();
    const cached = cachedMobsByDimension.get(dimId);
    if (cached && !cached.building && currentTick - cached.tick < completedTtl) {
        const mobs = cached.mobs.filter((mob) => {
            try {
                return isEntityValid(mob);
            } catch {
                return false;
            }
        });
        if (center) {
            return filterMobsByCenter(mobs, center, maxDistance);
        }
        return mobs;
    }

    try {
        getCachedPlayers();
        const norm = normalizeDimensionKey(dimId);
        const playerPositions = cachedPlayerPositions?.get(norm) || [];
        const cacheCenter = center || averagePosition(playerPositions);

        if (shouldDeferVillageBurst("mobCache")) {
            if (cached?.mobs?.length) {
                return filterMobsByCenter(cached.mobs.filter((m) => isEntityValid(m)), cacheCenter, maxDistance);
            }
        }
        if (isEntityQuerySpreadActive() && playerPositions.length > 0) {
            let entry = cached;
            if (!entry?.building) {
                const seed = entry?.mobs?.filter((m) => isEntityValid(m)) ?? [];
                entry = {
                    mobs: seed,
                    tick: currentTick,
                    center: cacheCenter,
                    building: true,
                    anchorIdx: 0,
                    sectionIdx: 0,
                    anchors: playerPositions.map((p) => ({ x: p.x, y: p.y, z: p.z }))
                };
                cachedMobsByDimension.set(dimId, entry);
            }

            if (entry.anchorIdx < entry.anchors.length) {
                const anchor = entry.anchors[entry.anchorIdx];
                const dimKey = normalizeDimensionKey(dimId);
                const added = queryEntitiesOneSpreadSection(
                    dimension,
                    `mobCache:${dimKey}:${entry.anchorIdx}:${entry.sectionIdx}`,
                    anchor,
                    MOB_CACHE_QUERY_RADIUS,
                    MOB_CACHE_QUERY_OPTS
                );
                entry.mobs = mergeMobLists(entry.mobs, added);
                entry.sectionIdx++;
                if (entry.sectionIdx >= SPREAD_CELL_COUNT) {
                    entry.sectionIdx = 0;
                    entry.anchorIdx++;
                }
            }

            if (entry.anchorIdx >= entry.anchors.length) {
                entry.building = false;
                entry.tick = currentTick;
            }

            const mobs = entry.mobs.filter((m) => isEntityValid(m));
            if (center) {
                return filterMobsByCenter(mobs, center, maxDistance);
            }
            return mobs;
        }

        const validMobs = queryMobsNearAnchors(dimension, playerPositions);
        cachedMobsByDimension.set(dimId, {
            mobs: validMobs,
            tick: currentTick,
            center: cacheCenter,
            building: false
        });

        if (center) {
            return filterMobsByCenter(validMobs, center, maxDistance);
        }

        return validMobs;
    } catch {
        return [];
    }
}

/**
 * Clear the mob cache (force refresh on next call)
 */
export function clearMobCache() {
    cachedMobsByDimension.clear();
}
