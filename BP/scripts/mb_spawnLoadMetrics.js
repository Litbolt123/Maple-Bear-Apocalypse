/**
 * Spawn load snapshot: Maple Bear entity counts, item entities (overworld sample), active dust storms,
 * plus optional probes for wall-clock tick stress and weighted mob pressure (registered from main.js).
 * Drives cheaper spawn scanning when the world is heavy — only affects spawn work, not game rules.
 */

import { system, world } from "@minecraft/server";
import { getWorldProperty, setWorldProperty } from "./mb_dynamicPropertyHandler.js";
import { countBearsAcrossDimensions } from "./mb_bearSnapshot.js";
import { getCurrentDay } from "./mb_dayTracker.js";
import {
    claimSpreadSlice,
    isEntityQuerySpreadActive,
    isMetricsSpreadActive,
    isSpreadThrottleActive,
    isVillageEntitySpreadActive,
    queryEntitiesOneSpreadSection,
    setMetricsSpreadLoad01,
    shouldDeferVillageBurst,
    SPREAD_CELL_COUNT
} from "./mb_workSpread.js";

/** 1 = apply auto scaling from world snapshot + probes (default). 0 = bias presets only. */
export const SPAWN_LOAD_AUTO_PROPERTY = "mb_spawn_load_auto";

/** 0–4 manual thrift tier on top of (or instead of) auto. */
export const SPAWN_LOAD_BIAS_PROPERTY = "mb_spawn_load_bias";

const DIMENSION_IDS = ["overworld", "nether", "the_end"];

/** All addon bear / infected mobs that add ongoing script or pathfinding load. */
export const ALL_MB_MOB_TYPES = [
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

const ITEM_ENTITY_TYPE = "minecraft:item";

const probes = {
    storm: () => 0,
    wallStress: () => 0,
    mobPressure: () => 0
};

/** Re-query bear totals at least this often so load model reacts to population spikes. */
const BEAR_COUNT_REFRESH_INTERVAL_TICKS = 24;
let lastBearRefreshTick = -999999;
let lastItemRefreshTick = -999999;
let cachedBearTotal = 0;
let cachedItemTotal = 0;

/** Incremental item sample while day 0–1 spread is active (one player cell per slice). */
let itemSampleBuild = null;

let cachedIntervalMult = 1;
let cachedBlockScale = 1;

let scalerWatchStarted = false;

/**
 * Wire storm count + perf probes (wall stress, weighted mob pressure). Safe to call multiple times.
 * @param {{ storm?: () => number, wallStress?: () => number, mobPressure?: () => number }} partial
 */
export function registerSpawnLoadProbes(partial) {
    if (partial.storm) probes.storm = partial.storm;
    if (partial.wallStress) probes.wallStress = partial.wallStress;
    if (partial.mobPressure) probes.mobPressure = partial.mobPressure;
}

export function isSpawnLoadAutoEnabled() {
    const v = getWorldProperty(SPAWN_LOAD_AUTO_PROPERTY);
    if (v === undefined || v === null || v === "") return true;
    return !(v === 0 || v === false || v === "0");
}

export function setSpawnLoadAutoEnabled(on) {
    setWorldProperty(SPAWN_LOAD_AUTO_PROPERTY, on ? 1 : 0);
}

export function getSpawnLoadBiasLevel() {
    const n = Number(getWorldProperty(SPAWN_LOAD_BIAS_PROPERTY));
    if (Number.isFinite(n) && n >= 0 && n <= 4) return Math.floor(n);
    return 0;
}

export function setSpawnLoadBiasLevel(level) {
    const n = Math.max(0, Math.min(4, Math.floor(Number(level) || 0)));
    setWorldProperty(SPAWN_LOAD_BIAS_PROPERTY, n);
}

// Shared bear-snapshot set for restricting the cross-dimension count to known MB types.
const ALL_MB_MOB_TYPES_SET = new Set(ALL_MB_MOB_TYPES);

function countBearsAllDimensions(tick) {
    if (tick - lastBearRefreshTick < BEAR_COUNT_REFRESH_INTERVAL_TICKS) return;
    lastBearRefreshTick = tick;
    try {
        cachedBearTotal = countBearsAcrossDimensions(DIMENSION_IDS, ALL_MB_MOB_TYPES_SET);
    } catch {
        cachedBearTotal = 0;
    }
}

const ITEM_SAMPLE_RADIUS = 96;

function countItemEntitiesNear(ow, anchor, seen, n) {
    if (isEntityQuerySpreadActive()) {
        const slice = queryEntitiesOneSpreadSection(ow, "spawnItems:ow", anchor, ITEM_SAMPLE_RADIUS, {
            type: ITEM_ENTITY_TYPE
        });
        for (const item of slice) {
            const id = item?.id;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            n++;
            if (n >= 4000) return n;
        }
        return n;
    }
    try {
        const items = ow.getEntities({
            type: ITEM_ENTITY_TYPE,
            location: anchor,
            maxDistance: ITEM_SAMPLE_RADIUS
        });
        for (const item of items || []) {
            const id = item?.id;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            n++;
            if (n >= 4000) return n;
        }
    } catch {
        /* ignore */
    }
    return n;
}

function countItemsOverworldThrottled(tick) {
    if (shouldDeferVillageBurst("spawnItems")) return;

    const spreadSampling = isVillageEntitySpreadActive() || isMetricsSpreadActive();
    const interval = spreadSampling ? 40 : 120;
    if (tick - lastItemRefreshTick < interval) return;

    if (spreadSampling && !claimSpreadSlice("spawnItems", 5)) return;

    lastItemRefreshTick = tick;
    try {
        const ow = world.getDimension("overworld");
        if (!ow) {
            cachedItemTotal = 0;
            itemSampleBuild = null;
            return;
        }
        const players = world.getAllPlayers().filter(
            (p) => p?.isValid && p.dimension?.id === ow.id && p.location
        );
        if (!players.length) {
            cachedItemTotal = 0;
            itemSampleBuild = null;
            return;
        }

        if (isEntityQuerySpreadActive()) {
            if (!itemSampleBuild?.building) {
                itemSampleBuild = {
                    building: true,
                    seen: new Set(),
                    n: 0,
                    playerIdx: 0,
                    sectionIdx: 0,
                    anchors: players.map((p) => ({ x: p.location.x, y: p.location.y, z: p.location.z }))
                };
            }
            const b = itemSampleBuild;
            if (b.playerIdx < b.anchors.length) {
                b.n = countItemEntitiesNear(ow, b.anchors[b.playerIdx], b.seen, b.n);
                b.sectionIdx++;
                if (b.sectionIdx >= SPREAD_CELL_COUNT) {
                    b.sectionIdx = 0;
                    b.playerIdx++;
                }
            }
            if (b.playerIdx >= b.anchors.length) {
                cachedItemTotal = Math.min(b.n, 4000);
                itemSampleBuild = null;
            }
            return;
        }

        itemSampleBuild = null;
        const seen = new Set();
        let n = 0;
        for (const player of players) {
            n = countItemEntitiesNear(ow, player.location, seen, n);
            if (n >= 4000) break;
        }
        cachedItemTotal = Math.min(n, 4000);
    } catch {
        cachedItemTotal = 0;
        itemSampleBuild = null;
    }
}

function computeLoad01() {
    const t = cachedBearTotal;
    // Core curve (was too weak past ~90 bears: min(1,t/90)*0.26 capped bear signal at 0.26).
    const bearCore = Math.min(0.52, Math.min(1, t / 42) * 0.38);
    const bearTail = Math.min(0.42, Math.max(0, t - 28) / 95);
    const bearCombined = Math.min(0.88, bearCore + bearTail);
    const stormN = Math.min(1, Math.max(0, probes.storm()) / 4);
    const itemN = Math.min(1, cachedItemTotal / 1400);
    const wall = Math.min(1, Math.max(0, probes.wallStress()));
    const mobP = Math.min(1, Math.max(0, probes.mobPressure()));
    return Math.min(
        1,
        bearCombined + stormN * 0.16 + itemN * 0.12 + wall * 0.16 + mobP * 0.18
    );
}

function recomputeCachedMultipliers() {
    const bias = getSpawnLoadBiasLevel();
    const biasInt = [1, 1.06, 1.12, 1.22, 1.34][bias] ?? 1;
    const biasBlock = [1, 0.95, 0.9, 0.82, 0.72][bias] ?? 1;

    if (!isSpawnLoadAutoEnabled()) {
        cachedIntervalMult = Math.min(2.15, biasInt);
        cachedBlockScale = Math.max(0.52, biasBlock);
        setMetricsSpreadLoad01(0);
        return;
    }

    const load01 = computeLoad01();
    const autoInt = 1 + load01 * 0.55;
    const autoBlock = 1 - load01 * 0.28;
    cachedIntervalMult = Math.min(2.35, biasInt * autoInt);
    cachedBlockScale = Math.max(0.5, biasBlock * autoBlock);
    setMetricsSpreadLoad01(load01);
}

/**
 * Refresh counts and recompute multipliers. Safe to call often; internal throttling for queries.
 * @param {number} tick system.currentTick
 */
export function refreshSpawnLoadMetrics(tick) {
    try {
        const day = getCurrentDay();
        if (day < 2) {
            cachedBearTotal = 0;
            cachedItemTotal = 0;
            recomputeCachedMultipliers();
            return;
        }
        countBearsAllDimensions(tick);
        countItemsOverworldThrottled(tick);
        recomputeCachedMultipliers();
    } catch {
        /* ignore */
    }
}

/** Multiply main spawn controller interval (higher = less frequent full spawn ticks). */
export function getSpawnControllerIntervalMultiplier() {
    return cachedIntervalMult;
}

/** Multiply block-query budgets and candidate caps (lower = cheaper scans). */
export function getSpawnBlockBudgetScale() {
    return cachedBlockScale;
}

/** Stretch per-player block scan cooldowns (milder than full interval mult). */
export function getSpawnScanCooldownMultiplier() {
    const m = cachedIntervalMult;
    return Math.min(1.85, 1 + (m - 1) * 0.52);
}

export function getSpawnLoadDebugSnapshot() {
    return {
        bears: cachedBearTotal,
        itemsOw: cachedItemTotal,
        storms: probes.storm(),
        load01: computeLoad01(),
        intervalMult: cachedIntervalMult,
        blockScale: cachedBlockScale,
        scanCooldownMult: getSpawnScanCooldownMultiplier(),
        auto: isSpawnLoadAutoEnabled(),
        bias: getSpawnLoadBiasLevel()
    };
}

export function initializeSpawnLoadScalerWatch() {
    if (scalerWatchStarted) return;
    scalerWatchStarted = true;
    try {
        system.runTimeout(() => {
            try {
                refreshSpawnLoadMetrics(system.currentTick);
            } catch {
                /* ignore */
            }
        }, 4);
        system.runInterval(() => {
            try {
                if (shouldDeferVillageBurst("spawnLoadMetrics")) return;
                const base = isVillageEntitySpreadActive() ? 80 : 40;
                if (!claimSpreadSlice("spawnLoadMetrics", base)) return;
                refreshSpawnLoadMetrics(system.currentTick);
            } catch {
                /* ignore */
            }
        }, 10);
    } catch {
        /* ignore */
    }
}
