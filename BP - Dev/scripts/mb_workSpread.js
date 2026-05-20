/**
 * Day 0–1 (and chunk-edge) work spreading: avoid bursting expensive Script API calls
 * when many chunks load at once (first village, fast travel). Systems stay correct but
 * react over a longer window.
 *
 * Entity queries use a 3×3 grid of smaller radii around each player (32 blocks per cell)
 * instead of one large sphere (e.g. 128 blocks) per tick.
 */

import { system, world } from "@minecraft/server";
import { getCurrentDay } from "./mb_dayTracker.js";

/** Through day 1 inclusive — matches spawn loop off before day 2. */
export const SPREAD_THROTTLE_DAY_MAX = 1;

/** How much longer intervals run while throttling (8× ≈ 8 seconds per 1-second nominal tick). */
export const SPREAD_THROTTLE_MULT = 8;

/** Each staggered entity query uses this radius (smaller than full mob cache radius). */
export const SPREAD_CELL_RADIUS = 32;

/** 3×3 grid around player feet (XZ), one cell per stagger step. */
export const SPREAD_CELL_OFFSETS_XZ = [
    { dx: 0, dz: 0 },
    { dx: 32, dz: 0 },
    { dx: -32, dz: 0 },
    { dx: 0, dz: 32 },
    { dx: 0, dz: -32 },
    { dx: 32, dz: 32 },
    { dx: 32, dz: -32 },
    { dx: -32, dz: 32 },
    { dx: -32, dz: -32 }
];

export const SPREAD_CELL_COUNT = SPREAD_CELL_OFFSETS_XZ.length;

const sliceLastTick = new Map();
const playerRotate = new Map();
const sectionRotate = new Map();

/**
 * @returns {boolean} True on day 0–1 when work should be spread aggressively.
 */
export function isSpreadThrottleActive() {
    try {
        return getCurrentDay() <= SPREAD_THROTTLE_DAY_MAX;
    } catch {
        return false;
    }
}

/** @returns {number} Interval multiplier (1 or SPREAD_THROTTLE_MULT). */
export function getSpreadThrottleMult() {
    return isSpreadThrottleActive() ? SPREAD_THROTTLE_MULT : 1;
}

/**
 * Gate periodic work: returns true at most once per (baseInterval × throttle mult) ticks per category.
 * @param {string} category
 * @param {number} baseIntervalTicks nominal spacing at normal throttle
 */
export function claimSpreadSlice(category, baseIntervalTicks) {
    const now = system.currentTick;
    const eff = Math.max(1, Math.floor(baseIntervalTicks * getSpreadThrottleMult()));
    const last = sliceLastTick.get(category) ?? -999999;
    if (now - last < eff) return false;
    sliceLastTick.set(category, now);
    return true;
}

/**
 * Pick one player per call (round-robin) while throttling MP; otherwise all players.
 * @param {import("@minecraft/server").Player[]} players
 * @param {string} category
 * @returns {import("@minecraft/server").Player[]}
 */
export function spreadPlayersForWork(players, category) {
    if (!players?.length) return [];
    if (!isSpreadThrottleActive() || players.length <= 1) return players;
    let i = playerRotate.get(category) ?? 0;
    const picked = players[i % players.length];
    playerRotate.set(category, (i + 1) % players.length);
    return picked ? [picked] : [];
}

/** Mob cache TTL when a full refresh completed. */
export function getSpreadMobCacheCompletedTicks() {
    return isSpreadThrottleActive() ? 50 : 2;
}

/** Bear snapshot TTL when dimension has zero bears. */
export function getSpreadBearSnapshotEmptyTtl() {
    return isSpreadThrottleActive() ? 240 : 40;
}

/**
 * @param {number} nominalRadius full search radius when not throttling
 */
export function getSpreadEntityQueryRadius(nominalRadius) {
    if (!isSpreadThrottleActive()) return nominalRadius;
    return Math.min(nominalRadius, SPREAD_CELL_RADIUS);
}

/**
 * @param {{ x: number, y: number, z: number }} baseAnchor
 * @param {number} sectionIndex
 */
export function getSpreadSectionLocation(baseAnchor, sectionIndex) {
    const off = SPREAD_CELL_OFFSETS_XZ[sectionIndex % SPREAD_CELL_COUNT];
    return {
        x: baseAnchor.x + off.dx,
        y: baseAnchor.y,
        z: baseAnchor.z + off.dz
    };
}

/**
 * Advance section index for a category (per dimension).
 * @param {string} categoryKey
 * @returns {number} section index used this call
 */
export function nextSpreadSectionIndex(categoryKey) {
    const i = sectionRotate.get(categoryKey) ?? 0;
    sectionRotate.set(categoryKey, (i + 1) % SPREAD_CELL_COUNT);
    return i;
}

/**
 * Player feet positions in a dimension (for location-scoped entity queries).
 * @param {import("@minecraft/server").Dimension} dimension
 * @returns {{ x: number, y: number, z: number }[]}
 */
export function getPlayerAnchorsInDimension(dimension) {
    const out = [];
    if (!dimension?.id) return out;
    try {
        for (const p of world.getAllPlayers()) {
            if (!p?.isValid || p.dimension?.id !== dimension.id) continue;
            const loc = p.location;
            if (loc) out.push({ x: loc.x, y: loc.y, z: loc.z });
        }
    } catch {
        /* ignore */
    }
    return out;
}

/**
 * Merge entity lists; dedupe by id.
 * @param {import("@minecraft/server").Entity[]} prior
 * @param {import("@minecraft/server").Entity[]} added
 * @returns {import("@minecraft/server").Entity[]}
 */
export function mergeEntitiesById(prior, added) {
    const seen = new Set();
    const out = [];
    for (const e of [...(prior || []), ...(added || [])]) {
        if (!e?.id) continue;
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        out.push(e);
    }
    return out;
}

/**
 * One small section per call when throttling; full nominal sphere when not.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {string} categoryKey unique key per consumer (e.g. "mobCache:overworld")
 * @param {{ x: number, y: number, z: number }} baseAnchor
 * @param {number} nominalRadius
 * @param {object} options getEntities filter (type, families, excludeTypes, …)
 * @returns {import("@minecraft/server").Entity[]}
 */
export function queryEntitiesOneSpreadSection(dimension, categoryKey, baseAnchor, nominalRadius, options = {}) {
    if (!dimension || !baseAnchor) return [];
    if (!isSpreadThrottleActive()) {
        try {
            return dimension.getEntities({
                ...options,
                location: baseAnchor,
                maxDistance: nominalRadius
            }) ?? [];
        } catch {
            return [];
        }
    }
    const secIdx = nextSpreadSectionIndex(categoryKey);
    const loc = getSpreadSectionLocation(baseAnchor, secIdx);
    try {
        return dimension.getEntities({
            ...options,
            location: loc,
            maxDistance: SPREAD_CELL_RADIUS
        }) ?? [];
    } catch {
        return [];
    }
}

/**
 * Full query immediately, or one section while throttling (call every tick to cover 3×3 grid).
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {string} categoryKey
 * @param {{ x: number, y: number, z: number }} baseAnchor
 * @param {number} nominalRadius
 * @param {object} options
 * @returns {import("@minecraft/server").Entity[]}
 */
export function queryEntitiesSpread(dimension, categoryKey, baseAnchor, nominalRadius, options = {}) {
    return queryEntitiesOneSpreadSection(dimension, categoryKey, baseAnchor, nominalRadius, options);
}
