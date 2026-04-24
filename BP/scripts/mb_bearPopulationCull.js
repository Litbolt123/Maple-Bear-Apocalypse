/**
 * When global Maple Bear population is high, despawn a few mobs that are *far* from the nearest
 * player in their dimension (like vanilla "natural" culling) — not `remove()` on everything.
 * World property `mb_bear_cull` = `0` to disable. Optional `mb_bear_cull_log` = `1` for throttled
 * `console.warn` (dev). Skips `infected_by` thrall bodies (player corpses) from culling.
 */

import { system, world } from "@minecraft/server";
import { countBearsAcrossDimensions, getBearSnapshot, invalidateBearSnapshots } from "./mb_bearSnapshot.js";
import { isEntityValid } from "./mb_sharedCache.js";
import { getWorldProperty } from "./mb_dynamicPropertyHandler.js";
import {
    MB_BEAR_CULL_WHEN_GLOBAL_ABOVE,
    MB_BEAR_CULL_TARGET_GLOBAL,
    MB_BEAR_CULL_MAX_REMOVED_PER_PASS,
    MB_BEAR_CULL_MIN_NEAREST_PLAYER_BLOCKS,
    MB_BEAR_CULL_URGENT_WHEN_GLOBAL_ABOVE,
    MB_BEAR_CULL_URGENT_MIN_NEAREST_PLAYER_BLOCKS,
    MB_BEAR_CULL_INTERVAL_TICKS
} from "./mb_balance.js";

const DIMENSION_IDS = ["overworld", "nether", "the_end"];

function isCullingOff() {
    const v = getWorldProperty("mb_bear_cull");
    return v === 0 || v === false || v === "0";
}

function isThrallBody(entity) {
    try {
        if (entity.getDynamicProperty("infected_by") !== undefined) return true;
    } catch { /* */ }
    return false;
}

function nearestPlayerDistSqInDimension(entity, players) {
    if (!isEntityValid(entity)) return 0;
    const locE = entity.location;
    let minSq = Infinity;
    for (const p of players) {
        if (!p || !p.isValid) continue;
        try {
            if (p.dimension.id !== entity.dimension.id) continue;
            const l = p.location;
            const dx = l.x - locE.x;
            const dy = l.y - locE.y;
            const dz = l.z - locE.z;
            const s = dx * dx + dy * dy + dz * dz;
            if (s < minSq) minSq = s;
        } catch { /* */ }
    }
    return minSq;
}

let lastLogTick = -999999;

function runCullPass() {
    if (isCullingOff()) return 0;

    const total = countBearsAcrossDimensions(DIMENSION_IDS);
    if (total <= MB_BEAR_CULL_WHEN_GLOBAL_ABOVE) return 0;

    const toRemove = Math.min(MB_BEAR_CULL_MAX_REMOVED_PER_PASS, total - MB_BEAR_CULL_TARGET_GLOBAL);
    if (toRemove <= 0) return 0;

    const urgent = total > MB_BEAR_CULL_URGENT_WHEN_GLOBAL_ABOVE;
    const minBlocks = urgent
        ? MB_BEAR_CULL_URGENT_MIN_NEAREST_PLAYER_BLOCKS
        : MB_BEAR_CULL_MIN_NEAREST_PLAYER_BLOCKS;
    const needSq = minBlocks * minBlocks;

    const players = world.getAllPlayers();
    const batch = [];
    for (const dimId of DIMENSION_IDS) {
        let dim;
        try {
            dim = world.getDimension(dimId);
        } catch {
            continue;
        }
        if (!dim) continue;
        const snap = getBearSnapshot(dim);
        for (const entity of snap.all) {
            if (!isEntityValid(entity)) continue;
            if (isThrallBody(entity)) continue;
            const dSq = nearestPlayerDistSqInDimension(entity, players);
            if (dSq < needSq) continue;
            if (!isEntityValid(entity)) continue;
            batch.push({ entity, dSq });
        }
    }

    batch.sort((a, b) => b.dSq - a.dSq);
    let removed = 0;
    for (let i = 0; i < batch.length && removed < toRemove; i++) {
        const e = batch[i].entity;
        if (!isEntityValid(e)) continue;
        try {
            e.remove();
            removed++;
        } catch { /* */ }
    }

    if (removed > 0) {
        invalidateBearSnapshots();
    }

    const doLog = getWorldProperty("mb_bear_cull_log");
    if (removed > 0 && (doLog === 1 || doLog === true || doLog === "1")) {
        if (system.currentTick - lastLogTick > 20 * 30) {
            const mode = urgent ? "urgent" : "normal";
            console.warn(`[BEAR CULL] removed ${removed} (mode=${mode} · total≈${total} · minDist≥${minBlocks}m to nearest player)`);
            lastLogTick = system.currentTick;
        }
    }

    return removed;
}

let started = false;

export function initializeBearPopulationCull() {
    if (started) return;
    started = true;
    system.runInterval(() => {
        try {
            runCullPass();
        } catch (err) {
            console.warn("[BEAR CULL] tick error:", err);
        }
    }, MB_BEAR_CULL_INTERVAL_TICKS);
}
