/**
 * Delay bear AI runIntervals until day 2+ or the first Maple Bear spawn.
 * Vanilla villager tests on day 0 have no addon script overhead; without this,
 * mining/flying/buff/torpedo/infected intervals still wake every 2–6 ticks even
 * when dormant gates skip work.
 */

import { system, world } from "@minecraft/server";
import { getCurrentDay } from "./mb_dayTracker.js";
import { shouldPauseDayZeroAddonLoops, shouldSleepDayZeroWorldWork } from "./mb_dayZeroPerfBisect.js";
import { getLastGlobalBearCount, noteMiningBearPresent, wakeFromZeroBearStanddown } from "./mb_entityQueryGate.js";
import { ALL_MB_BEAR_TYPES } from "./mb_bearSnapshot.js";
import { MINING_BEAR_TYPES } from "./mb_miningConstants.js";

const MINING_BEAR_TYPE_IDS = new Set(MINING_BEAR_TYPES.map((t) => t.id));

/** Spawn controller starts at day 2 — match that for eager AI startup. */
export const BEAR_AI_EAGER_DAY = 2;

const BEAR_AI_TYPES = new Set(ALL_MB_BEAR_TYPES);

let bearAiBootstrapComplete = false;
/** @type {Array<() => void>} */
const startCallbacks = [];

/**
 * Register a callback that starts one bear AI subsystem (interval + handlers).
 * If bootstrap already ran, the callback runs immediately.
 * @param {() => void} fn
 */
export function registerBearAiStartCallback(fn) {
    if (typeof fn !== "function") return;
    if (bearAiBootstrapComplete) {
        try {
            fn();
        } catch {
            /* ignore */
        }
        return;
    }
    startCallbacks.push(fn);
}

/**
 * @returns {boolean} True while day 0–1 and no MB bears exist — AI intervals should not be registered.
 */
export function isBearAiBootstrapDeferred() {
    if (bearAiBootstrapComplete) return false;
    if (getLastGlobalBearCount() > 0) return false;
    try {
        return getCurrentDay() < BEAR_AI_EAGER_DAY;
    } catch {
        return false;
    }
}

function runBearAiBootstrap() {
    if (bearAiBootstrapComplete) return;
    bearAiBootstrapComplete = true;
    const pending = startCallbacks.splice(0, startCallbacks.length);
    for (const fn of pending) {
        try {
            fn();
        } catch {
            /* ignore */
        }
    }
}

/** Start all registered bear AI systems (idempotent). */
export function ensureBearAiSystemsStarted() {
    runBearAiBootstrap();
}

function maybeBootstrapFromWorldState() {
    if (!isBearAiBootstrapDeferred()) {
        ensureBearAiSystemsStarted();
    }
}

try {
    if (typeof world !== "undefined" && world?.afterEvents?.entitySpawn) {
        world.afterEvents.entitySpawn.subscribe((event) => {
            try {
                if (shouldSleepDayZeroWorldWork("bear_entity_spawn")) return;
                const typeId = event?.entity?.typeId;
                if (!typeId || !BEAR_AI_TYPES.has(typeId)) return;
                wakeFromZeroBearStanddown();
                if (MINING_BEAR_TYPE_IDS.has(typeId)) noteMiningBearPresent();
                ensureBearAiSystemsStarted();
            } catch {
                /* ignore */
            }
        });
    }
    system.run(() => {
        try {
            maybeBootstrapFromWorldState();
        } catch {
            /* ignore */
        }
    });
    system.runInterval(() => {
        try {
            if (shouldPauseDayZeroAddonLoops()) return;
            maybeBootstrapFromWorldState();
        } catch {
            /* ignore */
        }
    }, 200);
} catch {
    /* world not ready at import */
}
