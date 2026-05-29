/**
 * Day 0 + zero Maple Bears: toggle world tick systems one at a time to find spawn lag.
 * Journal → Entity query / village → Day 0 bisect.
 *
 * Entity categories (top of menu): turn on one at a time while all others stay off.
 * "All OFF" = entity-blind (no spawn/die/hurt hooks, no getEntities) + world loops paused.
 */

import { getCurrentDay } from "./mb_dayTracker.js";
import { getLastGlobalBearCount } from "./mb_entityQueryGate.js";
import { getWorldProperty, setWorldProperty } from "./mb_dynamicPropertyHandler.js";
import { areAllScriptTogglesOff, shouldSleepScriptCategoryWork } from "./mb_scriptToggles.js";

const BISECT_MODE_PROP = "mb_day0_bisect_mode";
const BISECT_CAT_PREFIX = "mb_day0_bisect_";

/** @type {Record<string, string>} */
export const DAY0_BISECT_IDS = {
    villagerListen: "villager_listen",
    villagerQuiet: "villager_quiet",
    villagerSpawn: "villager_spawn",
    entityQueries: "entity_queries",
    entityHurt: "entity_hurt",
    entityDie: "entity_die",
    bearEntitySpawn: "bear_entity_spawn",
    infection: "infection",
    ground: "ground",
    perfSampler: "perf_sampler",
    entityQueryHud: "entity_query_hud",
    spawnMetrics: "spawn_metrics",
    chunkEdge: "chunk_edge",
    discovery: "discovery",
    snowTrail: "snow_trail",
    biomeAmbience: "biome_ambience",
    spawnEmulsifier: "spawn_emulsifier",
    infectionDirector: "infection_director"
};

/** Menu order — entity hooks first for one-at-a-time testing. */
export const DAY0_BISECT_MENU_ORDER = [
    DAY0_BISECT_IDS.villagerListen,
    DAY0_BISECT_IDS.villagerQuiet,
    DAY0_BISECT_IDS.villagerSpawn,
    DAY0_BISECT_IDS.entityQueries,
    DAY0_BISECT_IDS.entityHurt,
    DAY0_BISECT_IDS.entityDie,
    DAY0_BISECT_IDS.bearEntitySpawn,
    DAY0_BISECT_IDS.infection,
    DAY0_BISECT_IDS.ground,
    DAY0_BISECT_IDS.perfSampler,
    DAY0_BISECT_IDS.entityQueryHud,
    DAY0_BISECT_IDS.spawnMetrics,
    DAY0_BISECT_IDS.chunkEdge,
    DAY0_BISECT_IDS.discovery,
    DAY0_BISECT_IDS.snowTrail,
    DAY0_BISECT_IDS.biomeAmbience,
    DAY0_BISECT_IDS.spawnEmulsifier,
    DAY0_BISECT_IDS.infectionDirector
];

/** Categories that touch entities / entity queries (see {@link isDayZeroEntityBlind}). */
export const DAY0_ENTITY_BISECT_IDS = [
    DAY0_BISECT_IDS.villagerListen,
    DAY0_BISECT_IDS.villagerQuiet,
    DAY0_BISECT_IDS.villagerSpawn,
    DAY0_BISECT_IDS.entityQueries,
    DAY0_BISECT_IDS.entityHurt,
    DAY0_BISECT_IDS.entityDie,
    DAY0_BISECT_IDS.bearEntitySpawn
];

/** @type {Record<string, string>} */
export const DAY0_BISECT_LABELS = {
    [DAY0_BISECT_IDS.villagerListen]: "§e[E]§r Villager entitySpawn listen",
    [DAY0_BISECT_IDS.villagerQuiet]: "§e[E]§r Villager quiet timers / eggs",
    [DAY0_BISECT_IDS.villagerSpawn]: "§e[E]§r Villager spawn drain",
    [DAY0_BISECT_IDS.entityQueries]: "§e[E]§r getEntities / mob cache / snapshot",
    [DAY0_BISECT_IDS.entityHurt]: "§e[E]§r entityHurt handlers",
    [DAY0_BISECT_IDS.entityDie]: "§e[E]§r entityDie (mob conversion, etc.)",
    [DAY0_BISECT_IDS.bearEntitySpawn]: "§e[E]§r Maple Bear entitySpawn hooks",
    [DAY0_BISECT_IDS.infection]: "Infection timer (main)",
    [DAY0_BISECT_IDS.ground]: "Ground exposure loops",
    [DAY0_BISECT_IDS.perfSampler]: "Perf mob snapshot (wall clock always on)",
    [DAY0_BISECT_IDS.entityQueryHud]: "Entity-query HUD watch",
    [DAY0_BISECT_IDS.spawnMetrics]: "Spawn load metrics watch",
    [DAY0_BISECT_IDS.chunkEdge]: "Chunk-edge watch",
    [DAY0_BISECT_IDS.discovery]: "Biome + inventory discovery",
    [DAY0_BISECT_IDS.snowTrail]: "Snow trail loop",
    [DAY0_BISECT_IDS.biomeAmbience]: "Biome ambience (getBiome)",
    [DAY0_BISECT_IDS.spawnEmulsifier]: "Spawn emulsifier loops",
    [DAY0_BISECT_IDS.infectionDirector]: "Infection director HUD"
};

/** Short menu labels. */
export const DAY0_BISECT_SHORT = {
    [DAY0_BISECT_IDS.villagerListen]: "Vill listen",
    [DAY0_BISECT_IDS.villagerQuiet]: "Vill quiet",
    [DAY0_BISECT_IDS.villagerSpawn]: "Vill drain",
    [DAY0_BISECT_IDS.entityQueries]: "getEntities",
    [DAY0_BISECT_IDS.entityHurt]: "entityHurt",
    [DAY0_BISECT_IDS.entityDie]: "entityDie",
    [DAY0_BISECT_IDS.bearEntitySpawn]: "MB spawn",
    [DAY0_BISECT_IDS.infection]: "Infection",
    [DAY0_BISECT_IDS.ground]: "Ground loops",
    [DAY0_BISECT_IDS.perfSampler]: "Perf mob snap",
    [DAY0_BISECT_IDS.entityQueryHud]: "EQ HUD watch",
    [DAY0_BISECT_IDS.spawnMetrics]: "Spawn metrics",
    [DAY0_BISECT_IDS.chunkEdge]: "Chunk edge",
    [DAY0_BISECT_IDS.discovery]: "Discovery",
    [DAY0_BISECT_IDS.snowTrail]: "Snow trail",
    [DAY0_BISECT_IDS.biomeAmbience]: "Biome ambience",
    [DAY0_BISECT_IDS.spawnEmulsifier]: "Emulsifier",
    [DAY0_BISECT_IDS.infectionDirector]: "Inf. director"
};

/** @returns {boolean} Day 0 and no MB bears loaded. */
export function isDayZeroBisectEligible() {
    if (getLastGlobalBearCount() > 0) return false;
    try {
        return getCurrentDay() <= 0;
    } catch {
        return false;
    }
}

export function isDayZeroBisectModeActive() {
    const v = getWorldProperty(BISECT_MODE_PROP);
    return v === true || v === 1 || v === "1";
}

export function setDayZeroBisectModeActive(on) {
    setWorldProperty(BISECT_MODE_PROP, on ? 1 : 0);
}

/**
 * @param {string} category One of {@link DAY0_BISECT_IDS} values.
 */
export function isDayZeroBisectCategoryEnabled(category) {
    const key = BISECT_CAT_PREFIX + String(category || "");
    const val = getWorldProperty(key);
    return val === true || val === 1 || val === "1";
}

/**
 * @param {string} category
 * @param {boolean} on
 */
export function setDayZeroBisectCategoryEnabled(category, on) {
    setWorldProperty(BISECT_CAT_PREFIX + String(category || ""), on ? 1 : 0);
}

/** @param {boolean} on */
export function setAllDayZeroBisectCategories(on) {
    for (const id of Object.values(DAY0_BISECT_IDS)) {
        setDayZeroBisectCategoryEnabled(id, on);
    }
}

/**
 * @param {string} category
 * @returns {boolean} True → skip this system's day-0 work (sleep).
 */
export function shouldSleepDayZeroWorldWork(category) {
    if (shouldSleepScriptCategoryWork(category)) return true;
    if (!isDayZeroBisectEligible()) return false;
    if (!isDayZeroBisectModeActive()) return false;
    return !isDayZeroBisectCategoryEnabled(category);
}

/** Bisect on and every category disabled. */
export function isDayZeroBisectAllSystemsSleeping() {
    if (!isDayZeroBisectEligible() || !isDayZeroBisectModeActive()) return false;
    for (const id of Object.values(DAY0_BISECT_IDS)) {
        if (isDayZeroBisectCategoryEnabled(id)) return false;
    }
    return true;
}

/** Bisect on and all entity categories disabled — no spawn/die/hurt hooks, no getEntities. */
export function isDayZeroEntityBlind() {
    if (!isDayZeroBisectEligible() || !isDayZeroBisectModeActive()) return false;
    for (const id of DAY0_ENTITY_BISECT_IDS) {
        if (isDayZeroBisectCategoryEnabled(id)) return false;
    }
    return true;
}

/** Pause burst-prone world loops when every category is off. */
export function shouldPauseDayZeroAddonLoops() {
    if (areAllScriptTogglesOff()) return true;
    return isDayZeroBisectAllSystemsSleeping();
}

/** One-line state for Content log / HUD (why bisect may look inactive). */
export function getDayZeroBisectDebugOneLiner() {
    if (areAllScriptTogglesOff()) return "script toggles ALL OFF — journal + day only";
    if (!isDayZeroBisectModeActive()) return "bisect OFF — full addon";
    if (!isDayZeroBisectEligible()) {
        let day = "?";
        try {
            day = String(getCurrentDay());
        } catch {
            /* ignore */
        }
        return `bisect ON but INACTIVE (day ${day}, bears ${getLastGlobalBearCount()})`;
    }
    if (isDayZeroBisectAllSystemsSleeping()) {
        return "bisect ALL OFF — entity-blind + world loops paused";
    }
    if (isDayZeroEntityBlind()) {
        return "bisect entity-blind — enable one [E] row to test";
    }
    const on = DAY0_BISECT_MENU_ORDER.filter((id) => isDayZeroBisectCategoryEnabled(id));
    return on.length ? `bisect ONLY: ${on.join(", ")}` : "bisect (no categories on?)";
}

/** @returns {string[]} */
export function buildDayZeroBisectStatusLines() {
    const lines = [];
    if (!isDayZeroBisectEligible()) {
        lines.push("§8Not day 0 zero-bear (bisect inactive).");
        return lines;
    }
    lines.push(`§7Bisect mode: §f${isDayZeroBisectModeActive() ? "§aON" : "§cOFF"}`);
    if (!isDayZeroBisectModeActive()) {
        lines.push("§8Turn on to toggle systems one at a time.");
        return lines;
    }
    if (isDayZeroBisectAllSystemsSleeping()) {
        lines.push("§aAll OFF §7— entity-blind, world loops paused.");
    } else if (isDayZeroEntityBlind()) {
        lines.push("§eEntity-blind §7— enable one §e[E]§7 row, then test spawn.");
    }
    for (const id of DAY0_BISECT_MENU_ORDER) {
        const on = isDayZeroBisectCategoryEnabled(id);
        lines.push(`§8· §f${DAY0_BISECT_LABELS[id] ?? id}: ${on ? "§aRUN" : "§7sleep"}`);
    }
    return lines;
}
