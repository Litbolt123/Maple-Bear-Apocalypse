/**
 * Shared Maple Bear entity snapshot.
 *
 * Aggregates all Maple Bear / infected variant `typeId`s in **one** refresh per
 * dimension (shared by mining, infected, buff, flying, torpedo, snow trail, metrics, …).
 * Build path is one `getEntities({ type })` per known type in `ALL_MB_BEAR_TYPES`
 * (not N independent AI loops each doing their own full sweep).
 *
 * The cache is keyed on dimension + system.currentTick and refreshes every
 * SNAPSHOT_TTL_TICKS. Callers should treat returned entities as possibly-stale for
 * a few ticks; re-check `isEntityValid` before property access.
 */

import { system, world } from "@minecraft/server";
import { isEntityValid } from "./mb_sharedCache.js";
import {
    getPlayerAnchorsInDimension,
    getSpreadBearSnapshotEmptyTtl,
    getSpreadSectionLocation,
    isSpreadThrottleActive,
    isVillageEntitySpreadActive,
    shouldDeferVillageBurst,
    SPREAD_CELL_COUNT,
    SPREAD_CELL_RADIUS
} from "./mb_workSpread.js";

/** How long a snapshot stays fresh when bears exist. 4 ticks ≈ 200 ms — below every AI's working cadence. */
const SNAPSHOT_TTL_TICKS = 4;
/** When no bears are loaded, refresh less often (see getSpreadBearSnapshotEmptyTtl on day 0–1). */
const SNAPSHOT_TTL_EMPTY_TICKS = 40;

let spreadDimRefreshRotate = 0;

/** Bear types queried per spread refresh slice (day 0–1). */
const BEAR_TYPES_PER_SPREAD_SLICE = 3;

/** @type {Map<string, { tick: number, all: import("@minecraft/server").Entity[], byType: Map<string, import("@minecraft/server").Entity[]>, typeIdx: number, anchorIdx: number, sectionIdx: number, anchors: { x: number, y: number, z: number }[] }>} */
const spreadPartialByDimension = new Map();

/** All addon bear / infected mobs. Kept in sync with mb_spawnLoadMetrics.ALL_MB_MOB_TYPES. */
export const ALL_MB_BEAR_TYPES = [
    "mb:mb_day00",
    "mb:mb_day04",
    "mb:mb_day08",
    "mb:mb_day13",
    "mb:mb_day20",
    "mb:infected",
    "mb:infected_day08",
    "mb:infected_day13",
    "mb:infected_day20",
    "mb:infected_pig",
    "mb:infected_cow",
    "mb:buff_mb",
    "mb:buff_mb_day13",
    "mb:buff_mb_day20",
    "mb:flying_mb",
    "mb:flying_mb_day15",
    "mb:flying_mb_day20",
    "mb:mining_mb",
    "mb:mining_mb_day20",
    "mb:torpedo_mb",
    "mb:torpedo_mb_day20"
];

const ALL_MB_BEAR_TYPES_SET = new Set(ALL_MB_BEAR_TYPES);

/**
 * Per-dimension snapshot record.
 * @typedef {Object} BearSnapshot
 * @property {number} tick - system.currentTick at last refresh
 * @property {Array<import("@minecraft/server").Entity>} all - every live MB entity in the dimension
 * @property {Map<string, Array<import("@minecraft/server").Entity>>} byType - buckets keyed on typeId
 * @property {boolean} familyQueryOk - true when the family query returned entities last refresh
 */

/** @type {Map<string, BearSnapshot>} */
const snapshotsByDimension = new Map();

function normalizeDimensionId(id) {
    if (!id) return "";
    return id.startsWith("minecraft:") ? id.substring(10) : id;
}

function emptySnapshot(tick) {
    return { tick, all: [], byType: new Map(), familyQueryOk: false };
}

function bucketEntitiesIntoSnapshot(all, currentTick) {
    const byType = new Map();
    const validAll = [];
    for (const entity of all) {
        if (!entity) continue;
        if (!isEntityValid(entity)) continue;
        let typeId;
        try {
            typeId = entity.typeId;
        } catch {
            continue;
        }
        if (!typeId || !ALL_MB_BEAR_TYPES_SET.has(typeId)) continue;
        validAll.push(entity);
        let bucket = byType.get(typeId);
        if (!bucket) {
            bucket = [];
            byType.set(typeId, bucket);
        }
        bucket.push(entity);
    }
    return { tick: currentTick, all: validAll, byType, familyQueryOk: validAll.length > 0 };
}

function mergeIntoPartialList(partialAll, entities) {
    const seen = new Set(partialAll.map((e) => e.id));
    for (const entity of entities || []) {
        if (!entity?.id || seen.has(entity.id)) continue;
        seen.add(entity.id);
        partialAll.push(entity);
    }
}

function refreshDimensionNearPlayers(dimension, currentTick, anchors, queryRadius) {
    const all = [];
    for (const typeId of ALL_MB_BEAR_TYPES) {
        for (const anchor of anchors) {
            try {
                const part = dimension.getEntities({
                    type: typeId,
                    location: anchor,
                    maxDistance: queryRadius
                });
                if (part?.length) mergeIntoPartialList(all, part);
            } catch {
                /* ignore one query */
            }
        }
    }
    return bucketEntitiesIntoSnapshot(all, currentTick);
}

function refreshDimensionSpread(dimension, currentTick) {
    const key = normalizeDimensionId(dimension.id);
    const anchors = getPlayerAnchorsInDimension(dimension);
    if (!anchors.length) return emptySnapshot(currentTick);

    let partial = spreadPartialByDimension.get(key);
    if (!partial) {
        partial = {
            tick: currentTick,
            all: [],
            byType: new Map(),
            typeIdx: 0,
            anchorIdx: 0,
            sectionIdx: 0,
            anchors
        };
        spreadPartialByDimension.set(key, partial);
    }

    const anchor = anchors[partial.anchorIdx % anchors.length];
    const loc = getSpreadSectionLocation(anchor, partial.sectionIdx);
    for (let i = 0; i < BEAR_TYPES_PER_SPREAD_SLICE; i++) {
        const typeId = ALL_MB_BEAR_TYPES[(partial.typeIdx + i) % ALL_MB_BEAR_TYPES.length];
        try {
            const part = dimension.getEntities({
                type: typeId,
                location: loc,
                maxDistance: SPREAD_CELL_RADIUS
            });
            if (part?.length) mergeIntoPartialList(partial.all, part);
        } catch {
            /* ignore */
        }
    }
    partial.typeIdx = (partial.typeIdx + BEAR_TYPES_PER_SPREAD_SLICE) % ALL_MB_BEAR_TYPES.length;
    partial.sectionIdx = (partial.sectionIdx + 1) % SPREAD_CELL_COUNT;
    if (partial.sectionIdx === 0) {
        partial.anchorIdx = (partial.anchorIdx + 1) % anchors.length;
        if (partial.anchorIdx === 0 && partial.typeIdx === 0) {
            const snap = bucketEntitiesIntoSnapshot(partial.all, currentTick);
            snapshotsByDimension.set(key, snap);
            spreadPartialByDimension.delete(key);
            return snap;
        }
    }

    const stale = snapshotsByDimension.get(key);
    if (stale) return stale;
    return bucketEntitiesIntoSnapshot(partial.all, partial.tick);
}

function refreshDimension(dimension, currentTick) {
    if (!dimension) return emptySnapshot(currentTick);

    const anchors = getPlayerAnchorsInDimension(dimension);
    if (isSpreadThrottleActive() || isVillageEntitySpreadActive()) {
        return refreshDimensionSpread(dimension, currentTick);
    }
    if (anchors.length) {
        return refreshDimensionNearPlayers(dimension, currentTick, anchors, 96);
    }

    // No players in dimension: rare; one unscoped pass per type.
    const all = [];
    for (const typeId of ALL_MB_BEAR_TYPES) {
        try {
            const part = dimension.getEntities({ type: typeId });
            if (part?.length) mergeIntoPartialList(all, part);
        } catch {
            /* ignore */
        }
    }
    return bucketEntitiesIntoSnapshot(all, currentTick);
}

function getOrRefresh(dimension) {
    const currentTick = system.currentTick;
    const key = normalizeDimensionId(dimension?.id || "");
    if (!key) return emptySnapshot(currentTick);

    const cached = snapshotsByDimension.get(key);
    if (cached) {
        const emptyTtl = getSpreadBearSnapshotEmptyTtl();
        const ttl = cached.all.length > 0 ? SNAPSHOT_TTL_TICKS : emptyTtl;
        if (currentTick - cached.tick < ttl) {
            return cached;
        }
    }

    if (shouldDeferVillageBurst("bearSnapshot") && cached) {
        return cached;
    }

    if (isSpreadThrottleActive() || isVillageEntitySpreadActive()) {
        spreadPartialByDimension.delete(key);
    }

    const fresh = refreshDimension(dimension, currentTick);
    snapshotsByDimension.set(key, fresh);
    return fresh;
}

function resolveDimension(dim) {
    if (!dim) return null;
    if (typeof dim === "string") {
        try {
            return world.getDimension(dim);
        } catch {
            return null;
        }
    }
    return dim;
}

/**
 * Get the MB bear snapshot for a dimension (refreshed at most every SNAPSHOT_TTL_TICKS).
 * @param {string | import("@minecraft/server").Dimension} dim dimension or its id
 * @returns {BearSnapshot}
 */
export function getBearSnapshot(dim) {
    const dimension = resolveDimension(dim);
    if (!dimension) return emptySnapshot(system.currentTick);
    return getOrRefresh(dimension);
}

/**
 * Get all live MB entities of a typeId in a dimension. Distance filter optional.
 * @param {string | import("@minecraft/server").Dimension} dim
 * @param {string} typeId
 * @param {{x:number,y:number,z:number} | null} center optional point to filter by distance
 * @param {number} maxDistance inclusive, only applied when center is set
 * @returns {Array<import("@minecraft/server").Entity>}
 */
export function getBearsOfType(dim, typeId, center = null, maxDistance = Infinity) {
    const snap = getBearSnapshot(dim);
    const bucket = snap.byType.get(typeId);
    if (!bucket || !bucket.length) return [];
    if (!center || !Number.isFinite(maxDistance) || maxDistance === Infinity) {
        return bucket.slice();
    }
    const maxSq = maxDistance * maxDistance;
    const out = [];
    for (const entity of bucket) {
        if (!isEntityValid(entity)) continue;
        try {
            const loc = entity.location;
            const dx = loc.x - center.x;
            const dy = loc.y - center.y;
            const dz = loc.z - center.z;
            if (dx * dx + dy * dy + dz * dz <= maxSq) out.push(entity);
        } catch {
            /* skip invalid */
        }
    }
    return out;
}

/**
 * Get all live MB entities in a dimension, optionally filtered by a distance to `center`.
 * @param {string | import("@minecraft/server").Dimension} dim
 * @param {{x:number,y:number,z:number} | null} center
 * @param {number} maxDistance
 * @returns {Array<import("@minecraft/server").Entity>}
 */
export function getAllBears(dim, center = null, maxDistance = Infinity) {
    const snap = getBearSnapshot(dim);
    if (!center || !Number.isFinite(maxDistance) || maxDistance === Infinity) {
        return snap.all.slice();
    }
    const maxSq = maxDistance * maxDistance;
    const out = [];
    for (const entity of snap.all) {
        if (!isEntityValid(entity)) continue;
        try {
            const loc = entity.location;
            const dx = loc.x - center.x;
            const dy = loc.y - center.y;
            const dz = loc.z - center.z;
            if (dx * dx + dy * dy + dz * dz <= maxSq) out.push(entity);
        } catch {
            /* skip invalid */
        }
    }
    return out;
}

/**
 * Iterate MB bears across all known dimensions. Returns a per-dimension map of
 * snapshots for callers that walk overworld/nether/end together.
 * @param {string[]} dimensionIds e.g. ["overworld","nether","the_end"]
 * @returns {Map<string, BearSnapshot>}
 */
export function getBearSnapshotsForDimensions(dimensionIds) {
    const out = new Map();
    const currentTick = system.currentTick;

    if ((isSpreadThrottleActive() || isVillageEntitySpreadActive()) && dimensionIds.length > 1) {
        const refreshId = dimensionIds[spreadDimRefreshRotate % dimensionIds.length];
        spreadDimRefreshRotate++;

        for (const id of dimensionIds) {
            const dimension = resolveDimension(id);
            const key = normalizeDimensionId(id);
            if (!dimension || !key) {
                out.set(id, emptySnapshot(currentTick));
                continue;
            }
            if (id === refreshId) {
                out.set(id, getOrRefresh(dimension));
            } else {
                const cached = snapshotsByDimension.get(key);
                const emptyTtl = getSpreadBearSnapshotEmptyTtl();
                const ttl = cached?.all?.length > 0 ? SNAPSHOT_TTL_TICKS : emptyTtl;
                if (cached && currentTick - cached.tick < ttl) {
                    out.set(id, cached);
                } else {
                    out.set(id, cached ?? emptySnapshot(currentTick));
                }
            }
        }
        return out;
    }

    for (const id of dimensionIds) {
        const dimension = resolveDimension(id);
        if (!dimension) {
            out.set(id, emptySnapshot(currentTick));
            continue;
        }
        out.set(id, getOrRefresh(dimension));
    }
    return out;
}

/**
 * Count total MB bears across provided dimensions using snapshots. Used by
 * `mb_spawnLoadMetrics` / `mb_performanceProfile` instead of N per-type queries.
 * @param {string[]} dimensionIds
 * @param {Set<string> | null} onlyTypes optional restrict to a subset of typeIds
 * @returns {number}
 */
export function countBearsAcrossDimensions(dimensionIds, onlyTypes = null) {
    let total = 0;
    for (const id of dimensionIds) {
        const dimension = resolveDimension(id);
        if (!dimension) continue;
        const snap = getOrRefresh(dimension);
        if (!onlyTypes) {
            total += snap.all.length;
            continue;
        }
        for (const [typeId, bucket] of snap.byType) {
            if (onlyTypes.has(typeId)) total += bucket.length;
        }
    }
    return total;
}

/** Force-refresh all snapshots next call (testing / telemetry). */
export function invalidateBearSnapshots() {
    snapshotsByDimension.clear();
    spreadPartialByDimension.clear();
}

/** Debug: snapshot state for dev tools. */
export function getBearSnapshotDebug() {
    const out = [];
    for (const [dimId, snap] of snapshotsByDimension) {
        out.push({
            dim: dimId,
            tick: snap.tick,
            total: snap.all.length,
            familyQueryOk: snap.familyQueryOk,
            types: snap.byType.size
        });
    }
    return out;
}
