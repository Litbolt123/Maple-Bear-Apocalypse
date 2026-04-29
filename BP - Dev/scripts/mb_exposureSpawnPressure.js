/**
 * Storm-touch spawn pressure (Phase 1 infection evolution).
 * Bridges ground exposure `stormSeconds` (owned by main.js) into mb_spawnController without a circular import.
 */

import { getStormExposureRates } from "./mb_snowStorm.js";

/** @type {((playerId: string) => number) | null} */
let stormSecondsAccessor = null;

/**
 * Called once from main.js after `getGroundExposureState` exists.
 * @param {(playerId: string) => number} fn returns accumulated storm exposure seconds
 */
export function registerStormSecondsForSpawnPressure(fn) {
    stormSecondsAccessor = typeof fn === "function" ? fn : null;
}

/**
 * Multiplier for natural Maple Bear spawn **chance** when the player has storm exposure building.
 * Ramps using thresholds aligned with getStormExposureRates().
 * @param {string} playerId
 * @returns {number} >= 1
 */
export function getStormTouchSpawnChanceMult(playerId) {
    if (!stormSecondsAccessor || !playerId) return 1;
    let sec = 0;
    try {
        sec = Number(stormSecondsAccessor(playerId));
    } catch {
        return 1;
    }
    if (!Number.isFinite(sec) || sec <= 0) return 1;

    const rates = getStormExposureRates();
    const minorWarn = Number(rates.minorWarningSeconds);
    const infectionSec = Number(rates.infectionSeconds);
    const startRamp = Math.max(10, minorWarn * 0.4);
    const endRamp = Math.max(startRamp + 1, infectionSec);
    if (sec < startRamp) return 1;

    const maxBump = 1.15;
    const t = Math.min(1, (sec - startRamp) / Math.max(1e-6, endRamp - startRamp));
    return 1 + (maxBump - 1) * t;
}
