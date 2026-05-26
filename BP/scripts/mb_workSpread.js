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

/** Days 2–3: lighter spread for entity/metrics (villages, early exploration) — slower, not one burst. */
export const VILLAGE_ENTITY_SPREAD_DAY_MAX = 3;
export const VILLAGE_ENTITY_SPREAD_MULT = 4;

/** How much longer intervals run while throttling (8× ≈ 8 seconds per 1-second nominal tick). */
export const SPREAD_THROTTLE_MULT = 8;

/** Softer spread on day 2+ when spawn-load metrics report heavy world (see setMetricsSpreadLoad01). */
export const SOFT_SPREAD_MULT = 2;

/** Vanilla chunk width — detect entering new chunks (villages load many at once). */
export const VANILLA_CHUNK_BLOCKS = 16;

/** After a chunk-edge crossing, defer burst-prone polls (~6s). */
export const CHUNK_EDGE_DEFER_TICKS = 120;

const METRICS_SPREAD_LOAD_THRESHOLD = 0.45;
let metricsSpreadLoad01 = 0;

/** Called from mb_spawnLoadMetrics after recomputeCachedMultipliers. */
export function setMetricsSpreadLoad01(load01) {
    metricsSpreadLoad01 = Math.max(0, Math.min(1, Number(load01) || 0));
}

export function getMetricsSpreadLoad01() {
    return metricsSpreadLoad01;
}

/** Day 0–1 aggressive spread, or day 2+ when load is high (entity metrics only). */
export function isMetricsSpreadActive() {
    if (isSpreadThrottleActive()) return true;
    try {
        if (getCurrentDay() < 2) return false;
    } catch {
        return false;
    }
    return metricsSpreadLoad01 >= METRICS_SPREAD_LOAD_THRESHOLD;
}

/** Effective spread multiplier for claimSpreadSlice (1, 2, or 8). */
export function getEffectiveSpreadMult() {
    let mult = 1;
    if (isSpreadThrottleActive()) {
        mult = SPREAD_THROTTLE_MULT;
    } else if (isVillageEntitySpreadActive()) {
        mult = VILLAGE_ENTITY_SPREAD_MULT;
    } else if (isMetricsSpreadActive()) {
        mult = SOFT_SPREAD_MULT;
    }
    if (isAnyChunkEdgeDeferActive()) {
        mult = Math.max(mult, SOFT_SPREAD_MULT * 2);
    }
    return mult;
}

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
const playerVanillaChunkKey = new Map();
const playerChunkEdgeDeferUntil = new Map();

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

/** Days 2–3: spread entity/metrics work (chunk scans still day 2+ only). */
export function isVillageEntitySpreadActive() {
    if (isSpreadThrottleActive()) return true;
    try {
        return getCurrentDay() <= VILLAGE_ENTITY_SPREAD_DAY_MAX;
    } catch {
        return false;
    }
}

/** Entity queries use section grid when day 0–3 spread or metrics spread is on. */
export function isEntityQuerySpreadActive() {
    return isVillageEntitySpreadActive() || isMetricsSpreadActive();
}

/** @returns {boolean} True while any player is in post-chunk-edge defer window. */
export function isAnyChunkEdgeDeferActive() {
    const now = system.currentTick;
    for (const until of playerChunkEdgeDeferUntil.values()) {
        if (now < until) return true;
    }
    return false;
}

/** @param {string} [playerId]
 * @returns {boolean}
 */
export function isPlayerChunkEdgeDeferActive(playerId) {
    if (!playerId) return isAnyChunkEdgeDeferActive();
    return system.currentTick < (playerChunkEdgeDeferUntil.get(playerId) ?? 0);
}

/**
 * Skip non-critical polls right after crossing a chunk boundary (village approach).
 * @param {string} [_category]
 */
export function shouldDeferVillageBurst(_category) {
    return isAnyChunkEdgeDeferActive();
}

/**
 * Call from a light interval (e.g. 20t) — extends defer when players cross 16-block chunks.
 */
export function tickPlayerChunkEdgeWatch() {
    const now = system.currentTick;
    try {
        for (const p of world.getAllPlayers()) {
            if (!p?.isValid || !p.id || !p.location) continue;
            const cx = Math.floor(p.location.x / VANILLA_CHUNK_BLOCKS);
            const cz = Math.floor(p.location.z / VANILLA_CHUNK_BLOCKS);
            const key = `${cx},${cz}`;
            const prev = playerVanillaChunkKey.get(p.id);
            playerVanillaChunkKey.set(p.id, key);
            if (prev != null && prev !== key) {
                playerChunkEdgeDeferUntil.set(p.id, now + CHUNK_EDGE_DEFER_TICKS);
            }
        }
    } catch {
        /* ignore */
    }
    for (const [pid, until] of playerChunkEdgeDeferUntil.entries()) {
        if (now >= until) playerChunkEdgeDeferUntil.delete(pid);
    }
    for (const [pid] of playerVanillaChunkKey.entries()) {
        if (!world.getAllPlayers().some((p) => p?.id === pid)) {
            playerVanillaChunkKey.delete(pid);
            playerChunkEdgeDeferUntil.delete(pid);
        }
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
    const eff = Math.max(1, Math.floor(baseIntervalTicks * getEffectiveSpreadMult()));
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
    if (!isVillageEntitySpreadActive() || players.length <= 1) return players;
    let i = playerRotate.get(category) ?? 0;
    const picked = players[i % players.length];
    playerRotate.set(category, (i + 1) % players.length);
    return picked ? [picked] : [];
}

/** Mob cache TTL when a full refresh completed. */
export function getSpreadMobCacheCompletedTicks() {
    if (isSpreadThrottleActive()) return 50;
    if (isVillageEntitySpreadActive()) return 24;
    return 2;
}

/** Bear snapshot TTL when dimension has zero bears. */
export function getSpreadBearSnapshotEmptyTtl() {
    if (isSpreadThrottleActive()) return 240;
    if (isVillageEntitySpreadActive()) return 120;
    return 40;
}

/**
 * @param {number} nominalRadius full search radius when not throttling
 */
export function getSpreadEntityQueryRadius(nominalRadius) {
    if (!isEntityQuerySpreadActive()) return nominalRadius;
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
    if (!isEntityQuerySpreadActive()) {
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
