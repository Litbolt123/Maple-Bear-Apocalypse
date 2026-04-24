/**
 * Short-TTL block read cache.
 *
 * Several hot loops read the same `(dim, x, y, z)` block multiple times per tick
 * or within a few ticks: ground-infection exposure (isStandingOnInfectedGround,
 * isPlayerAirborne), LOS ray sampling, snow-storm shelter checks. A 5-10 tick
 * memo saves a lot of `dimension.getBlock` calls when 3-5 players pile on the
 * same chunk (or share an LOS) without losing correctness because blocks don't
 * change identity that quickly in practice.
 *
 * The cache keeps a rolling bucket keyed by `tickBucket = floor(tick / BUCKET_TTL)`
 * so old entries don't leak. Call sites pass in a default TTL; 5 ticks is usually
 * fine for ground checks, 10 ticks for LOS rays.
 */

import { system } from "@minecraft/server";

const DEFAULT_TTL_TICKS = 5;
const MAX_ENTRIES = 4096;

/** @type {Map<string, { typeId: string | null, isLiquid: boolean, isAir: boolean, tick: number }>} */
const blockCache = new Map();

function trimCache() {
    if (blockCache.size <= MAX_ENTRIES) return;
    // Cheap trim: drop first N oldest entries (insertion order).
    const drop = blockCache.size - MAX_ENTRIES;
    let i = 0;
    for (const key of blockCache.keys()) {
        if (i++ >= drop) break;
        blockCache.delete(key);
    }
}

function makeKey(dimId, x, y, z) {
    return `${dimId}|${x}|${y}|${z}`;
}

/**
 * Read a block with a short-TTL cache. Returns a small descriptor with the
 * minimum info most hot paths need; use `dimension.getBlock(...)` directly if
 * you need the live Block object (e.g. for permutation updates).
 *
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {{x:number,y:number,z:number}} loc integer coordinates
 * @param {number} [ttlTicks=DEFAULT_TTL_TICKS]
 * @returns {{ typeId: string | null, isLiquid: boolean, isAir: boolean }}
 */
export function getCachedBlockInfo(dimension, loc, ttlTicks = DEFAULT_TTL_TICKS) {
    if (!dimension) return { typeId: null, isLiquid: false, isAir: false };
    const dimId = dimension.id || "";
    const key = makeKey(dimId, loc.x, loc.y, loc.z);
    const tick = system.currentTick;
    const cached = blockCache.get(key);
    if (cached && (tick - cached.tick) < ttlTicks) {
        return { typeId: cached.typeId, isLiquid: cached.isLiquid, isAir: cached.isAir };
    }
    let typeId = null;
    let isLiquid = false;
    let isAir = false;
    try {
        const block = dimension.getBlock(loc);
        if (block) {
            typeId = block.typeId || null;
            isLiquid = !!block.isLiquid;
            // Fall back to typeId check if `isAir` isn't exposed.
            isAir = typeof block.isAir === "boolean" ? block.isAir : typeId === "minecraft:air";
        }
    } catch {
        // Unloaded chunk or invalid read; cache the negative so we don't thrash.
    }
    blockCache.set(key, { typeId, isLiquid, isAir, tick });
    trimCache();
    return { typeId, isLiquid, isAir };
}

/** Force a fresh read on the next call for this coordinate. */
export function invalidateCachedBlock(dimension, loc) {
    if (!dimension) return;
    const dimId = dimension.id || "";
    blockCache.delete(makeKey(dimId, loc.x, loc.y, loc.z));
}

/** Debug: current cache size. */
export function getBlockCacheSize() {
    return blockCache.size;
}
