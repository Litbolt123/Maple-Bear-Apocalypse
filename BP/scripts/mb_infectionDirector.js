/**
 * Infection "director" (Phase 3): few named stages tied to day + spawn-load snapshot.
 * Gameplay: modest spawn chance multiplier + extra spawn attempts at higher tiers (not only raw rates).
 */

import { world, system } from "@minecraft/server";
import { getSpawnLoadDebugSnapshot } from "./mb_spawnLoadMetrics.js";
import { getCurrentDay } from "./mb_dayTracker.js";
import { shouldSleepDayZeroWorldWork } from "./mb_dayZeroPerfBisect.js";
import { isScriptEnabled, SCRIPT_IDS } from "./mb_scriptToggles.js";
import { pushHudActionBarToast } from "./mb_actionBarHud.js";
import {
    INFECTION_DIRECTOR_DAY_SCOUT_MAX,
    INFECTION_DIRECTOR_DAY_PRESSURE_MAX,
    INFECTION_DIRECTOR_DAY_SURGE_MAX,
    INFECTION_DIRECTOR_LOAD_ESCALATE,
    INFECTION_DIRECTOR_CHANCE_MULT,
    INFECTION_DIRECTOR_ATTEMPT_BONUS
} from "./mb_balance.js";

const STAGE_IDS = /** @type {const} */ (["scout", "pressure", "surge", "stormfront"]);

/** HUD toast line per stage index (scout stays silent). */
const STAGE_TOAST = ["", "§7Bear activity: §ewatching", "§7Bear activity: §6pressing", "§7Bear activity: §cstormfront"];

/**
 * @param {number} day
 * @returns {number} 0–3
 */
export function getInfectionDirectorBaseStageFromDay(day) {
    const d = Math.floor(Number(day));
    if (!Number.isFinite(d)) return 0;
    if (d > INFECTION_DIRECTOR_DAY_SURGE_MAX) return 3;
    if (d > INFECTION_DIRECTOR_DAY_PRESSURE_MAX) return 2;
    if (d > INFECTION_DIRECTOR_DAY_SCOUT_MAX) return 1;
    return 0;
}

/**
 * @param {number} day
 * @returns {{ stageIndex: number, stageId: string, chanceMult: number, attemptBonus: number, loadEscalated: boolean }}
 */
export function getInfectionDirectorSpawnModifiers(day) {
    const base = getInfectionDirectorBaseStageFromDay(day);
    let load01 = 0;
    try {
        const snap = getSpawnLoadDebugSnapshot();
        load01 = Number(snap?.load01);
    } catch {
        load01 = 0;
    }
    const escalated = Number.isFinite(load01) && load01 >= INFECTION_DIRECTOR_LOAD_ESCALATE ? 1 : 0;
    const stage = Math.min(3, base + escalated);
    return {
        stageIndex: stage,
        stageId: STAGE_IDS[stage] ?? "scout",
        chanceMult: INFECTION_DIRECTOR_CHANCE_MULT[stage] ?? 1,
        attemptBonus: INFECTION_DIRECTOR_ATTEMPT_BONUS[stage] ?? 0,
        loadEscalated: escalated === 1
    };
}

let watchStarted = false;
let directorWatchPrimed = false;
let lastToastStageBand = -1;
let lastToastTick = -9999999;

const TOAST_COOLDOWN_TICKS = 5200;
const WATCH_INTERVAL_TICKS = 88;

/**
 * Brief action-bar toasts when the **day band** tier changes (stable legibility).
 * Load-only bumps affect spawn math but do not spam HUD.
 */
export function initializeInfectionDirectorWatch() {
    if (watchStarted) return;
    watchStarted = true;
    try {
        system.runInterval(() => {
            try {
                if (!isScriptEnabled(SCRIPT_IDS.infectionDirector)) return;
                if (shouldSleepDayZeroWorldWork("infection_director")) return;
                const day = getCurrentDay();
                const base = getInfectionDirectorBaseStageFromDay(day);
                if (!directorWatchPrimed) {
                    directorWatchPrimed = true;
                    lastToastStageBand = base;
                    return;
                }
                if (base === lastToastStageBand) return;
                const now = system.currentTick;
                if (now - lastToastTick < TOAST_COOLDOWN_TICKS) {
                    lastToastStageBand = base;
                    return;
                }
                const msg = STAGE_TOAST[base];
                lastToastStageBand = base;
                lastToastTick = now;
                if (!msg) return;
                const players = world.getPlayers();
                for (const p of players) {
                    pushHudActionBarToast(p, msg, 100);
                }
            } catch {
                /* ignore */
            }
        }, WATCH_INTERVAL_TICKS);
    } catch {
        /* ignore */
    }
}
