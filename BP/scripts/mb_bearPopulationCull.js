/**
 * When global Maple Bear population is high, despawn a few addon bears that are *far* from the nearest
 * player in their dimension (like vanilla "natural" culling). Which typeIds are eligible is pack-default
 * (tiny + infected) or overridden per-type via dev world props (`mb_bearCullDev.js`).
 * World property `mb_bear_cull` = `0` to disable. Optional `mb_bear_cull_log` = `1` for throttled
 * `console.warn` (dev). Skips `infected_by` thrall bodies (player corpses) from culling.
 */

import { system, world } from "@minecraft/server";
import { countBearsAcrossDimensions, getBearSnapshot, invalidateBearSnapshots } from "./mb_bearSnapshot.js";
import { isEntityValid } from "./mb_sharedCache.js";
import { shouldPauseDayZeroAddonLoops } from "./mb_dayZeroPerfBisect.js";
import { isScriptEnabled, SCRIPT_IDS } from "./mb_scriptToggles.js";
import { getWorldProperty } from "./mb_dynamicPropertyHandler.js";
import { getBearCullEffectiveParams, getBearCullEligibleTypeSet, BEAR_CULL_POLL_INTERVAL_TICKS } from "./mb_bearCullDev.js";

const DIMENSION_IDS = ["overworld", "nether", "the_end"];

function isCullEligibleBear(entity, eligibleTypeIds) {
    try {
        const id = entity?.typeId;
        return !!id && eligibleTypeIds.has(id);
    } catch {
        return false;
    }
}

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
let lastBearCullPassTick = -999999;

/** @param {ReturnType<typeof getBearCullEffectiveParams>} [p] */
function runCullPass(p) {
    if (isCullingOff()) return 0;
    const tuning = p ?? getBearCullEffectiveParams();
    const eligibleTypeIds = getBearCullEligibleTypeSet();

    const total = countBearsAcrossDimensions(DIMENSION_IDS);
    if (total <= tuning.whenAbove) return 0;

    const toRemove = Math.min(tuning.maxRemovedPerPass, total - tuning.targetGlobal);
    if (toRemove <= 0) return 0;

    const urgent = total > tuning.urgentWhenAbove;
    const minBlocks = urgent ? tuning.urgentMinNearestBlocks : tuning.minNearestBlocks;
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
            if (!isCullEligibleBear(entity, eligibleTypeIds)) continue;
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
            console.warn(`[BEAR CULL] removed ${removed} (mode=${mode} · total≈${total} · minDist≥${minBlocks}m · types=${eligibleTypeIds.size})`);
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
            if (!isScriptEnabled(SCRIPT_IDS.bearCull)) return;
            if (shouldPauseDayZeroAddonLoops()) return;
            const now = system.currentTick;
            const p = getBearCullEffectiveParams();
            if (now - lastBearCullPassTick < p.intervalTicks) return;
            lastBearCullPassTick = now;
            runCullPass(p);
        } catch (err) {
            console.warn("[BEAR CULL] tick error:", err);
        }
    }, BEAR_CULL_POLL_INTERVAL_TICKS);
}
