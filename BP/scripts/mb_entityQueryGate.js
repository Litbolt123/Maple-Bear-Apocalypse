/**
 * Global gate for expensive Script API entity queries when no Maple Bears are loaded.
 * Villagers (and other mobs) still make location-scoped getEntities costly even with
 * type filters — avoid snapshot/mob-cache refresh until a bear exists or a slow probe runs.
 */

import { system } from "@minecraft/server";
import { getCurrentDay } from "./mb_dayTracker.js";
import { MINING_BEAR_TYPES } from "./mb_miningConstants.js";
import { shouldSleepDayZeroWorldWork } from "./mb_dayZeroPerfBisect.js";
import { traceEntityQuerySkip } from "./mb_entityQueryTraceDev.js";

/** After any adult villager spawn, skip broad entity scans (~5s @ 20 TPS; use 60–100 for 3–5s). */
export const VILLAGER_ENTITY_QUERY_MUTE_TICKS = 100;

/** Set from mb_workSpread at load (avoids circular import). */
let villagerDeferActiveFn = () => false;
/** Max of burst/pressure/session remaining — for HUD "mute" display. */
let villagerQuietTicksRemainingFn = () => 0;

export function registerVillagerDeferChecker(fn) {
    if (typeof fn === "function") villagerDeferActiveFn = fn;
}

export function registerVillagerQuietTicksRemaining(fn) {
    if (typeof fn === "function") villagerQuietTicksRemainingFn = fn;
}

function isVillagerDeferForQueries() {
    try {
        return !!villagerDeferActiveFn();
    } catch {
        return false;
    }
}

/** After a confirmed zero-bear refresh, skip typed snapshot/mob queries for this long. */
export const ZERO_BEAR_STANDDOWN_TICKS = 200;

/** While in standdown, one lightweight probe at most this often (overworld, one type). */
export const ZERO_BEAR_PROBE_INTERVAL_TICKS = 80;

/** Through this day, zero bears → bear AI loops sleep (no snapshot probes). */
export const ZERO_BEAR_AI_SLEEP_DAY_MAX = 1;

/** Through this day with zero MB bears, block broad/typed entity scans (village spread window). */
export const EARLY_WORLD_ENTITY_QUERY_DAY_MAX = 3;

/** When sleeping, bear AI `runInterval` callbacks return early on most ticks. */
export const ZERO_BEAR_AI_WAKE_EVERY_TICKS = 40;

let lastGlobalBearCount = 0;
let zeroBearStanddownUntilTick = 0;
let lastZeroBearProbeTick = -999999;
/** After the game skips ticks (vanilla spawn stall), keep polls quiet while scripts catch up. */
let engineBacklogQuietUntilTick = 0;
/** Game ticks skipped in one wall-clock gap before we extend quiet time. */
const ENGINE_TICK_BACKLOG_THRESHOLD = 2;
/** @type {((skippedTicks: number) => void) | null} */
let engineBacklogHandler = null;

export function registerEngineBacklogHandler(fn) {
    if (typeof fn === "function") engineBacklogHandler = fn;
}

let snapshotRefreshSkipCount = 0;
let mobCacheSkipCount = 0;
let dormantAiSkipCount = 0;
let genericEntityQuerySkipCount = 0;
let villagerEntityMuteUntilTick = 0;
let lastKnownMiningBearCount = 0;

/** @returns {boolean} Day 0–3 and no Maple Bears loaded in snapshots. */
export function isEarlyWorldZeroBearPhase() {
    if (lastGlobalBearCount > 0) return false;
    try {
        return getCurrentDay() <= EARLY_WORLD_ENTITY_QUERY_DAY_MAX;
    } catch {
        return false;
    }
}

/** Extend post-villager entity-query mute (each adult villager spawn should call this). */
/**
 * Wall-clock sampler saw several game ticks skipped (spawn stall / hitch).
 * Extends entity quiet before villager entitySpawn handlers may run.
 * @param {number} skippedTicks
 */
export function noteEngineTickBacklog(skippedTicks) {
    const d = Math.floor(Number(skippedTicks) || 0);
    if (d < ENGINE_TICK_BACKLOG_THRESHOLD) return;
    const tick = system.currentTick;
    const extra = Math.min(200, d * 25);
    engineBacklogQuietUntilTick = Math.max(engineBacklogQuietUntilTick, tick + extra);
    extendVillagerEntityQueryMute(VILLAGER_ENTITY_QUERY_MUTE_TICKS);
    extendZeroBearStanddown(extra);
    try {
        engineBacklogHandler?.(d);
    } catch {
        /* ignore */
    }
}

export function isEngineBacklogQuietActive() {
    return system.currentTick < engineBacklogQuietUntilTick;
}

export function extendVillagerEntityQueryMute(extraTicks = VILLAGER_ENTITY_QUERY_MUTE_TICKS) {
    const tick = system.currentTick;
    const add = Math.max(0, Number(extraTicks) || 0);
    villagerEntityMuteUntilTick = Math.max(villagerEntityMuteUntilTick, tick + add);
    if (lastGlobalBearCount <= 0 && getZeroBearStanddownTicksRemaining() < add * 0.5) {
        extendZeroBearStanddown(Math.min(add, VILLAGER_ENTITY_QUERY_MUTE_TICKS));
    }
}

/** True while the per-spawn (~5s) entity-query mute window is active. */
export function isVillagerEntityQueryMuteActive() {
    return system.currentTick < villagerEntityMuteUntilTick;
}

/** Effective entity-quiet time left (per-egg mute OR burst/pressure/session). */
export function getVillagerEntityQueryMuteTicksRemaining() {
    const tick = system.currentTick;
    const fromMute = Math.max(0, villagerEntityMuteUntilTick - tick);
    let fromSession = 0;
    try {
        fromSession = Math.max(0, Number(villagerQuietTicksRemainingFn()) || 0);
    } catch {
        /* ignore */
    }
    return Math.max(fromMute, fromSession);
}

export function setLastKnownMiningBearCount(count) {
    lastKnownMiningBearCount = Math.max(0, Number(count) || 0);
}

export function getLastKnownMiningBearCount() {
    return lastKnownMiningBearCount;
}

/** Mining bear spawned or snapshot saw one — allow mining AI through villager mute. */
export function noteMiningBearPresent() {
    lastKnownMiningBearCount = Math.max(1, lastKnownMiningBearCount);
}

/**
 * @param {string} [category]
 * @returns {boolean} True when this query may run during post-villager mute.
 */
function isQueryAllowedDuringVillagerMute(category) {
    if (lastKnownMiningBearCount <= 0) return false;
    if (!category) return false;
    const c = String(category).toLowerCase();
    return c.includes("mining");
}

/**
 * @param {string} [category]
 * @returns {string | null} Skip reason, or null if queries may run.
 */
export function getExpensiveEntityQuerySkipReason(category) {
    if (shouldSleepDayZeroWorldWork("entity_queries")) return "entityBlind";
    if (isVillagerEntityQueryMuteActive()) {
        return isQueryAllowedDuringVillagerMute(category) ? null : "villagerMute";
    }
    if (isVillagerDeferForQueries()) return "villagerDefer";
    if (lastGlobalBearCount > 0) return null;
    if (isZeroBearStanddownActive()) return "zeroBearStanddown";
    if (isEarlyWorldZeroBearPhase()) return "earlyZeroBear";
    return null;
}

/**
 * Single gate for `dimension.getEntities`, snapshot rebuilds, and mob-cache refresh.
 * Post-villager mute blocks almost everything for ~5s; mining-tagged queries stay if mining MB exist.
 * @param {string} [category]
 */
export function shouldSkipExpensiveEntityQueries(category) {
    const reason = getExpensiveEntityQuerySkipReason(category);
    if (reason) {
        traceEntityQuerySkip(category ?? "?", reason);
        return true;
    }
    return false;
}

export function noteGenericEntityQuerySkipped() {
    genericEntityQuerySkipCount++;
}

export function getLastGlobalBearCount() {
    return lastGlobalBearCount;
}

/**
 * @param {number} count total MB bears across dimensions (from latest snapshot pass)
 */
export function setLastGlobalBearCount(count) {
    const n = Math.max(0, Number(count) || 0);
    lastGlobalBearCount = n;
    if (n > 0) {
        zeroBearStanddownUntilTick = 0;
        return;
    }
    extendZeroBearStanddown(ZERO_BEAR_STANDDOWN_TICKS);
}

/** Keep snapshot/mob queries quiet while villagers load (avoids post-defer query burst). */
export function extendZeroBearStanddown(extraTicks) {
    if (lastGlobalBearCount > 0) return;
    const tick = system.currentTick;
    const add = Math.max(0, Number(extraTicks) || 0);
    zeroBearStanddownUntilTick = Math.max(zeroBearStanddownUntilTick, tick + add);
}

/** Maple bear spawned — allow immediate snapshot refresh. */
export function wakeFromZeroBearStanddown() {
    zeroBearStanddownUntilTick = 0;
    lastZeroBearProbeTick = -999999;
}

export function isZeroBearStanddownActive() {
    if (lastGlobalBearCount > 0) return false;
    return system.currentTick < zeroBearStanddownUntilTick;
}

/**
 * Skip full bear-snapshot refresh (return stale cache) while standdown is active.
 * @param {boolean} [hasCachedEmpty]
 */
export function shouldSkipBearSnapshotRefresh(hasCachedEmpty = true) {
    if (!hasCachedEmpty) return false;
    return shouldSkipExpensiveEntityQueries("bearSnapshot");
}

/** Skip mob-cache getEntities while gated (villager defer, standdown, early zero-bear days). */
export function shouldSkipMobCacheQueries() {
    if (isVillagerEntityQueryMuteActive()) {
        traceEntityQuerySkip("mobCache", "villagerMute");
        return true;
    }
    if (lastGlobalBearCount > 0 && !isVillagerDeferForQueries()) return false;
    return shouldSkipExpensiveEntityQueries("mobCache");
}

/**
 * Mining AI may run during post-villager mute when a mining MB was recently known.
 * Uses cached snapshots / per-entity work — no broad mob/villager scans.
 */
export function shouldAllowMiningAiLoop() {
    if (lastKnownMiningBearCount <= 0) return false;
    if (isVillagerEntityQueryMuteActive()) return true;
    return !isAddonBearActivityDormant();
}

/**
 * Mining / flying / torpedo / dimension-adaptation loops can bail early.
 * @param {boolean} [allowProbeTick] when true, still run on probe cadence
 */
/** Day 0–1 with no MB bears: AI intervals should stay asleep (villager egg tests). */
export function isZeroBearAiSleepPhase() {
    if (shouldSleepDayZeroWorldWork("entity_queries")) return true;
    if (lastGlobalBearCount > 0) return false;
    try {
        if (getCurrentDay() > ZERO_BEAR_AI_SLEEP_DAY_MAX) return false;
    } catch {
        return false;
    }
    return isZeroBearStanddownActive() || isVillagerDeferForQueries();
}

/** Throttle bear AI `runInterval` wake-ups while {@link isZeroBearAiSleepPhase}. */
export function shouldDecimateZeroBearAiWake() {
    if (!isZeroBearAiSleepPhase()) return false;
    return system.currentTick % ZERO_BEAR_AI_WAKE_EVERY_TICKS !== 0;
}

export function isAddonBearActivityDormant(allowProbeTick = true) {
    if (shouldSleepDayZeroWorldWork("entity_queries")) return true;
    if (lastGlobalBearCount > 0) return false;
    const quiet =
        isZeroBearStanddownActive() || isVillagerDeferForQueries() || isVillagerEntityQueryMuteActive();
    if (!quiet) return false;
    if (!allowProbeTick) return true;
    if (isVillagerDeferForQueries() || isVillagerEntityQueryMuteActive()) return true;
    try {
        if (getCurrentDay() <= ZERO_BEAR_AI_SLEEP_DAY_MAX) return true;
    } catch {
        /* ignore */
    }
    const tick = system.currentTick;
    if (tick - lastZeroBearProbeTick >= ZERO_BEAR_PROBE_INTERVAL_TICKS) {
        lastZeroBearProbeTick = tick;
        return false;
    }
    return true;
}

export function getZeroBearStanddownTicksRemaining() {
    if (lastGlobalBearCount > 0) return 0;
    return Math.max(0, zeroBearStanddownUntilTick - system.currentTick);
}

export function noteSnapshotRefreshSkipped() {
    snapshotRefreshSkipCount++;
}

export function noteMobCacheQuerySkipped() {
    mobCacheSkipCount++;
}

export function noteDormantAiLoopSkipped() {
    dormantAiSkipCount++;
}

/** @returns {{ bears: number, standdownTicks: number, standdown: boolean, mobCacheSkip: boolean, dormant: boolean, snapshotSkips: number, mobSkips: number, dormantSkips: number }} */
export function getEntityQueryGateDebugSnapshot() {
    const tick = system.currentTick;
    const standdown = isZeroBearStanddownActive();
    const villagerDefer = isVillagerDeferForQueries();
    const villagerMute = isVillagerEntityQueryMuteActive();
    return {
        bears: lastGlobalBearCount,
        miningBears: lastKnownMiningBearCount,
        standdownTicks: getZeroBearStanddownTicksRemaining(),
        standdown,
        villagerDefer,
        villagerMute,
        villagerMuteTicks: getVillagerEntityQueryMuteTicksRemaining(),
        mobCacheSkip: shouldSkipMobCacheQueries(),
        dormant: standdown && isAddonBearActivityDormant(false),
        snapshotSkips: snapshotRefreshSkipCount,
        mobSkips: mobCacheSkipCount,
        dormantSkips: dormantAiSkipCount,
        querySkips: genericEntityQuerySkipCount,
        earlyZeroBear: isEarlyWorldZeroBearPhase(),
        probeDueIn: standdown
            ? Math.max(0, ZERO_BEAR_PROBE_INTERVAL_TICKS - (tick - lastZeroBearProbeTick))
            : 0
    };
}
