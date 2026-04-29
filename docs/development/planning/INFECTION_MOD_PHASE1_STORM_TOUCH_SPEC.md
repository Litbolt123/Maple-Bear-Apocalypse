# Phase 1 implementation — storm-touch spawn coordination (spec)

**Status:** implemented in `BP/scripts/` + `BP - Dev/scripts/` (2026-04-29).

**Slice:** Option 1 from [INFECTION_MOD_GAME_PLAN_2026-04-29.md](INFECTION_MOD_GAME_PLAN_2026-04-29.md) — **marked/storm-touched coordination light**: natural spawn **chance** scales up slightly while **storm exposure seconds** accumulate (same meter as infection-from-storm), capped modestly (+15% max) so Bedrock perf stays sane.

## Behavior

- Uses existing `groundExposureState(playerId).stormSeconds` (see [main.js](../../BP/scripts/main.js)).
- Multiplier `getStormTouchSpawnChanceMult(playerId)` ramps from **1.0** after `startRamp = max(10, minorWarningSeconds * 0.4)` until **`endRamp = infectionSeconds`** from [getStormExposureRates](../../BP/scripts/mb_snowStorm.js) (`minorWarningSeconds` / `infectionSeconds` stay aligned if balance changes).
- At full ramp: **×1.15** spawn chance contribution (multiplicative with existing cluster/ideal/weather multipliers).
- **Circular import avoided:** new module registers an accessor from `main.js`; [mb_spawnController.js](../../BP/scripts/mb_spawnController.js) imports only the bridge module.

## Files to add

### `BP/scripts/mb_exposureSpawnPressure.js`

Create new file with the contents below (mirror to `BP - Dev/scripts/`).

```javascript
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
```

## Edits

### `BP/scripts/main.js`

1. After other `./mb_*.js` imports (e.g. near `mb_bearPopulationCull`), add:

`import { registerStormSecondsForSpawnPressure } from "./mb_exposureSpawnPressure.js";`

2. Immediately after the closing `}` of `getGroundExposureState` (before `applyProximityAmbientFromInfectedPlayer`), add:

```javascript
registerStormSecondsForSpawnPressure((playerId) => {
    try {
        return getGroundExposureState(playerId).stormSeconds ?? 0;
    } catch {
        return 0;
    }
});
```

### `BP/scripts/mb_spawnController.js`

1. Extend the `mb_simPlayers.js` import line to add on a **new line**:

`import { getStormTouchSpawnChanceMult } from "./mb_exposureSpawnPressure.js";`

2. After `chanceMultiplier *= getClusterSpawnPressureMult(...)`, add:

```javascript
        const stormTouchMult = getStormTouchSpawnChanceMult(player.id);
        chanceMultiplier *= stormTouchMult;
        if (stormTouchMult > 1.005) {
            debugLog('spawn', `${player.name}: storm-touch spawn chance ×${stormTouchMult.toFixed(3)} (storm exposure)`);
        }
```

### `BP/scripts/mb_devScriptSelfTest.js`

In `SELF_TEST_MODULE_IMPORTS` (sorted), insert `"./mb_exposureSpawnPressure.js",` between `"./mb_dynamicPropertyHandler.js",` and `"./mb_flyingAI.js",`.

## Verification

- `npm run check` (or `npm run validate:syntax`).
- In-game: Developer Tools spawn debug — stand in storm until exposure ramps; expect occasional `storm-touch spawn chance ×…` when spawn debug is on.
- Update [INFECTION_SYSTEM.md](../systems/INFECTION_SYSTEM.md) one short bullet under environment/storms if desired.

## Mirror

Copy changed/new files to `BP - Dev/scripts/` to match repo convention.
