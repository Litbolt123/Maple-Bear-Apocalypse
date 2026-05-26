/**
 * Buff bear caps: **near-player** (tight) + **dimension-wide** (higher ceiling).
 * Both must pass for natural spawn and mob→buff conversions.
 */

import { system, world } from "@minecraft/server";
import {
    getMaxBuffBearsNearPlayerCount,
    getMaxBuffBearsDimensionWideCount
} from "./mb_balance.js";
import { getBearSnapshot, invalidateBearSnapshots } from "./mb_bearSnapshot.js";
import { isEntityValid } from "./mb_sharedCache.js";
import { BUFF_BEAR_ID, BUFF_BEAR_DAY13_ID, BUFF_BEAR_DAY20_ID } from "./mb_spawnEntityIds.js";

const BUFF_BEAR_TYPE_IDS = [BUFF_BEAR_ID, BUFF_BEAR_DAY13_ID, BUFF_BEAR_DAY20_ID];
const BUFF_BEAR_TYPE_SET = new Set(BUFF_BEAR_TYPE_IDS);

/** Near cap radius for conversions / fallback checks (blocks). */
export const BUFF_NEAR_CAP_RADIUS = 64;

const OVERFLOW_CULL_INTERVAL_TICKS = 40;

/** @param {import("@minecraft/server").Dimension} dimension */
export function getPlayerCountInDimension(dimension) {
    try {
        const dimId = dimension?.id;
        let n = 0;
        for (const player of world.getAllPlayers()) {
            if (player?.isValid && player.dimension?.id === dimId) n++;
        }
        return Math.max(1, n);
    } catch {
        return 1;
    }
}

/** @param {import("@minecraft/server").Dimension} dimension */
export function getBuffBearNearCap(dimension, nearbyPlayerCount) {
    const n = nearbyPlayerCount != null ? nearbyPlayerCount : getPlayerCountInDimension(dimension);
    return getMaxBuffBearsNearPlayerCount(Math.max(1, n));
}

/** @param {import("@minecraft/server").Dimension} dimension */
export function getBuffBearDimensionCap(dimension) {
    return getMaxBuffBearsDimensionWideCount(getPlayerCountInDimension(dimension));
}

/** @deprecated Use getBuffBearDimensionCap */
export function getBuffBearCapForDimension(dimension) {
    return getBuffBearDimensionCap(dimension);
}

/** Sum buff variant counts from spawn controller entityCounts cache. */
export function countBuffBearsFromEntityCounts(entityCounts) {
    if (!entityCounts || typeof entityCounts !== "object") return 0;
    return (
        (entityCounts[BUFF_BEAR_ID] || 0) +
        (entityCounts[BUFF_BEAR_DAY13_ID] || 0) +
        (entityCounts[BUFF_BEAR_DAY20_ID] || 0)
    );
}

/** Loaded buff bears in dimension (bear snapshot). */
export function countLoadedBuffBearsInDimension(dimension) {
    if (!dimension) return 0;
    let n = 0;
    try {
        const snap = getBearSnapshot(dimension);
        for (const typeId of BUFF_BEAR_TYPE_IDS) {
            const bucket = snap.byType.get(typeId);
            if (bucket?.length) n += bucket.length;
        }
    } catch {
        /* ignore */
    }
    return n;
}

/**
 * Loaded buff bears within radius of a point (bear snapshot).
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {{ x: number, y: number, z: number }} centerPos
 * @param {number} [maxRadius]
 */
export function countLoadedBuffBearsNear(dimension, centerPos, maxRadius = BUFF_NEAR_CAP_RADIUS) {
    if (!dimension || !centerPos) return 0;
    const maxSq = maxRadius * maxRadius;
    let n = 0;
    try {
        const snap = getBearSnapshot(dimension);
        for (const entity of snap.all) {
            if (!isEntityValid(entity)) continue;
            if (!BUFF_BEAR_TYPE_SET.has(entity.typeId)) continue;
            try {
                const loc = entity.location;
                const dx = loc.x - centerPos.x;
                const dy = loc.y - centerPos.y;
                const dz = loc.z - centerPos.z;
                if (dx * dx + dy * dy + dz * dz <= maxSq) n++;
            } catch {
                /* skip */
            }
        }
    } catch {
        /* ignore */
    }
    return n;
}

/**
 * True when either cap would block another buff bear.
 * @param {object} opts
 * @param {import("@minecraft/server").Dimension} opts.dimension
 * @param {Record<string, number>} [opts.entityCounts] spawn scan counts near player
 * @param {number} [opts.nearbyPlayerCount] for cap tier (defaults to players in dimension)
 * @param {{ x: number, y: number, z: number }} [opts.nearCenter] conversion / fallback near check
 * @param {number} [opts.nearRadius]
 * @param {number} [opts.extraPending] reserved conversion slots this tick
 */
export function isBuffBearSpawnBlocked(opts) {
    const dimension = opts?.dimension;
    if (!dimension) return true;

    const playersInDim = getPlayerCountInDimension(dimension);
    const capPlayers = opts.nearbyPlayerCount != null ? Math.max(1, opts.nearbyPlayerCount) : playersInDim;

    let nearCount = 0;
    if (opts.entityCounts) {
        nearCount = countBuffBearsFromEntityCounts(opts.entityCounts);
    } else if (opts.nearCenter) {
        nearCount = countLoadedBuffBearsNear(dimension, opts.nearCenter, opts.nearRadius ?? BUFF_NEAR_CAP_RADIUS);
    }

    const dimCount = countLoadedBuffBearsInDimension(dimension) + Math.max(0, opts.extraPending ?? 0);

    if (nearCount >= getMaxBuffBearsNearPlayerCount(capPlayers)) return true;
    if (dimCount >= getMaxBuffBearsDimensionWideCount(playersInDim)) return true;
    return false;
}

/** @param {import("@minecraft/server").Dimension} dimension */
export function isBuffBearDimensionCapReached(dimension, extraPending = 0) {
    return (
        countLoadedBuffBearsInDimension(dimension) + Math.max(0, extraPending) >=
        getBuffBearDimensionCap(dimension)
    );
}

export function isBuffBearTypeId(typeId) {
    return !!typeId && BUFF_BEAR_TYPE_SET.has(typeId);
}

function nearestPlayerDistSq(entity, players) {
    if (!isEntityValid(entity)) return 0;
    let minSq = Infinity;
    const locE = entity.location;
    const dimId = entity.dimension?.id;
    for (const p of players) {
        if (!p?.isValid || p.dimension?.id !== dimId) continue;
        try {
            const l = p.location;
            const dx = l.x - locE.x;
            const dy = l.y - locE.y;
            const dz = l.z - locE.z;
            const s = dx * dx + dy * dy + dz * dz;
            if (s < minSq) minSq = s;
        } catch {
            /* ignore */
        }
    }
    return minSq;
}

/** Remove farthest loaded buff bears down to the **dimension** cap only. */
function cullExcessBuffBearsInDimension(dimension) {
    const cap = getBuffBearDimensionCap(dimension);
    const snap = getBearSnapshot(dimension);
    const buffs = [];
    for (const typeId of BUFF_BEAR_TYPE_IDS) {
        const bucket = snap.byType.get(typeId);
        if (!bucket) continue;
        for (const entity of bucket) {
            if (isEntityValid(entity)) buffs.push(entity);
        }
    }
    const excess = buffs.length - cap;
    if (excess <= 0) return 0;

    const players = world.getAllPlayers();
    const ranked = buffs.map((entity) => ({ entity, dSq: nearestPlayerDistSq(entity, players) }));
    ranked.sort((a, b) => b.dSq - a.dSq);

    let removed = 0;
    for (let i = 0; i < ranked.length && removed < excess; i++) {
        const { entity } = ranked[i];
        if (!isEntityValid(entity)) continue;
        try {
            entity.remove();
            removed++;
        } catch {
            /* ignore */
        }
    }
    if (removed > 0) {
        try {
            invalidateBearSnapshots();
        } catch {
            /* ignore */
        }
    }
    return removed;
}

let overflowCullStarted = false;

export function initializeBuffBearOverflowCull() {
    if (overflowCullStarted) return;
    overflowCullStarted = true;
    system.runInterval(() => {
        try {
            for (const dimId of ["overworld", "nether", "the_end"]) {
                let dimension;
                try {
                    dimension = world.getDimension(dimId);
                } catch {
                    continue;
                }
                if (!dimension) continue;
                cullExcessBuffBearsInDimension(dimension);
            }
        } catch {
            /* ignore */
        }
    }, OVERFLOW_CULL_INTERVAL_TICKS);
}
