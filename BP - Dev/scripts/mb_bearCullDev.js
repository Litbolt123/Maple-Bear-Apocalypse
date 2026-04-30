/**
 * Dev-only world overrides for bear population cull (`mb_bearPopulationCull.js`).
 * Unset numeric keys → use pack defaults from `mb_balance.js`.
 * Unset `enabledTypes` → pack default type list (tiny + infected); otherwise JSON array of typeIds.
 */

import { getWorldProperty, setWorldProperty } from "./mb_dynamicPropertyHandler.js";
import { ALL_MB_BEAR_TYPES } from "./mb_bearSnapshot.js";
import {
    TINY_BEAR_ID,
    DAY4_BEAR_ID,
    DAY8_BEAR_ID,
    DAY13_BEAR_ID,
    DAY20_BEAR_ID,
    INFECTED_BEAR_ID,
    INFECTED_BEAR_DAY8_ID,
    INFECTED_BEAR_DAY13_ID,
    INFECTED_BEAR_DAY20_ID,
    INFECTED_PIG_ID,
    INFECTED_COW_ID,
    BUFF_BEAR_ID,
    BUFF_BEAR_DAY13_ID,
    BUFF_BEAR_DAY20_ID,
    FLYING_BEAR_ID,
    FLYING_BEAR_DAY15_ID,
    FLYING_BEAR_DAY20_ID,
    MINING_BEAR_ID,
    MINING_BEAR_DAY20_ID,
    TORPEDO_BEAR_ID,
    TORPEDO_BEAR_DAY20_ID
} from "./mb_spawnEntityIds.js";
import {
    MB_BEAR_CULL_WHEN_GLOBAL_ABOVE,
    MB_BEAR_CULL_TARGET_GLOBAL,
    MB_BEAR_CULL_MAX_REMOVED_PER_PASS,
    MB_BEAR_CULL_MIN_NEAREST_PLAYER_BLOCKS,
    MB_BEAR_CULL_URGENT_WHEN_GLOBAL_ABOVE,
    MB_BEAR_CULL_URGENT_MIN_NEAREST_PLAYER_BLOCKS,
    MB_BEAR_CULL_INTERVAL_TICKS
} from "./mb_balance.js";

/** Pack default: tiny + infected (+ pig/cow). Dev UI can enable any `ALL_MB_BEAR_TYPES` entry. */
export const DEFAULT_PACK_BEAR_CULL_TYPE_IDS = Object.freeze([
    TINY_BEAR_ID,
    DAY4_BEAR_ID,
    DAY8_BEAR_ID,
    DAY13_BEAR_ID,
    DAY20_BEAR_ID,
    INFECTED_BEAR_ID,
    INFECTED_BEAR_DAY8_ID,
    INFECTED_BEAR_DAY13_ID,
    INFECTED_BEAR_DAY20_ID,
    INFECTED_PIG_ID,
    INFECTED_COW_ID
]);

const ALL_MB_BEAR_TYPES_SET = new Set(ALL_MB_BEAR_TYPES);

/** Journal UI: grouped toggles (union = `ALL_MB_BEAR_TYPES`). */
export const BEAR_CULL_TYPE_GROUPS = Object.freeze([
    {
        id: "tiny",
        label: "Tiny (day tiers)",
        typeIds: Object.freeze([TINY_BEAR_ID, DAY4_BEAR_ID, DAY8_BEAR_ID, DAY13_BEAR_ID, DAY20_BEAR_ID])
    },
    {
        id: "infected",
        label: "Infected + pig/cow",
        typeIds: Object.freeze([
            INFECTED_BEAR_ID,
            INFECTED_BEAR_DAY8_ID,
            INFECTED_BEAR_DAY13_ID,
            INFECTED_BEAR_DAY20_ID,
            INFECTED_PIG_ID,
            INFECTED_COW_ID
        ])
    },
    {
        id: "buff",
        label: "Buff bears",
        typeIds: Object.freeze([BUFF_BEAR_ID, BUFF_BEAR_DAY13_ID, BUFF_BEAR_DAY20_ID])
    },
    {
        id: "flying",
        label: "Flying bears",
        typeIds: Object.freeze([FLYING_BEAR_ID, FLYING_BEAR_DAY15_ID, FLYING_BEAR_DAY20_ID])
    },
    {
        id: "mining",
        label: "Mining bears",
        typeIds: Object.freeze([MINING_BEAR_ID, MINING_BEAR_DAY20_ID])
    },
    {
        id: "torpedo",
        label: "Torpedo bears",
        typeIds: Object.freeze([TORPEDO_BEAR_ID, TORPEDO_BEAR_DAY20_ID])
    }
]);

/** Poll cadence for cull checks (effective interval is still `intervalTicks` between passes). */
export const BEAR_CULL_POLL_INTERVAL_TICKS = 20;

export const BEAR_CULL_DEV_KEYS = {
    whenAbove: "mb_dev_bear_cull_when_above",
    targetGlobal: "mb_dev_bear_cull_target_global",
    maxRemovedPerPass: "mb_dev_bear_cull_max_per_pass",
    urgentWhenAbove: "mb_dev_bear_cull_urgent_when_above",
    minNearestBlocks: "mb_dev_bear_cull_min_dist",
    urgentMinNearestBlocks: "mb_dev_bear_cull_urgent_min_dist",
    intervalTicks: "mb_dev_bear_cull_interval_ticks",
    /** JSON array of typeIds (subset of `ALL_MB_BEAR_TYPES`). Unset = pack default list. */
    enabledTypes: "mb_dev_bear_cull_enabled_types"
};

/**
 * Which Maple Bear typeIds may be culled when distant (still requires global threshold + mb_bear_cull on).
 * @returns {Set<string>}
 */
export function getBearCullEligibleTypeSet() {
    const raw = getWorldProperty(BEAR_CULL_DEV_KEYS.enabledTypes);
    if (raw === undefined || raw === null || raw === "") {
        return new Set(DEFAULT_PACK_BEAR_CULL_TYPE_IDS);
    }
    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!Array.isArray(parsed)) {
            return new Set(DEFAULT_PACK_BEAR_CULL_TYPE_IDS);
        }
        const out = new Set();
        for (const id of parsed) {
            if (typeof id === "string" && ALL_MB_BEAR_TYPES_SET.has(id)) {
                out.add(id);
            }
        }
        return out.size > 0 ? out : new Set(DEFAULT_PACK_BEAR_CULL_TYPE_IDS);
    } catch {
        return new Set(DEFAULT_PACK_BEAR_CULL_TYPE_IDS);
    }
}

/**
 * @param {string} key
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 */
function readOverrideInt(key, fallback, min, max) {
    const raw = getWorldProperty(key);
    if (raw === undefined || raw === null || raw === "") return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
}

/** @returns {boolean} */
export function hasBearCullDevOverrides() {
    for (const key of Object.values(BEAR_CULL_DEV_KEYS)) {
        const v = getWorldProperty(key);
        if (v !== undefined && v !== null && v !== "") return true;
    }
    return false;
}

export function clearBearCullDevOverrides() {
    for (const key of Object.values(BEAR_CULL_DEV_KEYS)) {
        try {
            setWorldProperty(key, undefined);
        } catch { /* ignore */ }
    }
}

/**
 * Resolved cull tuning (pack defaults + optional world overrides).
 * @returns {{
 *   whenAbove: number,
 *   targetGlobal: number,
 *   maxRemovedPerPass: number,
 *   urgentWhenAbove: number,
 *   minNearestBlocks: number,
 *   urgentMinNearestBlocks: number,
 *   intervalTicks: number
 * }}
 */
export function getBearCullEffectiveParams() {
    let whenAbove = readOverrideInt(
        BEAR_CULL_DEV_KEYS.whenAbove,
        MB_BEAR_CULL_WHEN_GLOBAL_ABOVE,
        15,
        600
    );
    let targetGlobal = readOverrideInt(
        BEAR_CULL_DEV_KEYS.targetGlobal,
        MB_BEAR_CULL_TARGET_GLOBAL,
        5,
        whenAbove - 1
    );
    if (targetGlobal >= whenAbove) targetGlobal = Math.max(1, whenAbove - 1);

    const maxRemovedPerPass = readOverrideInt(
        BEAR_CULL_DEV_KEYS.maxRemovedPerPass,
        MB_BEAR_CULL_MAX_REMOVED_PER_PASS,
        1,
        32
    );

    let urgentWhenAbove = readOverrideInt(
        BEAR_CULL_DEV_KEYS.urgentWhenAbove,
        MB_BEAR_CULL_URGENT_WHEN_GLOBAL_ABOVE,
        whenAbove + 1,
        900
    );
    if (urgentWhenAbove <= whenAbove) urgentWhenAbove = whenAbove + 1;

    const minNearestBlocks = readOverrideInt(
        BEAR_CULL_DEV_KEYS.minNearestBlocks,
        MB_BEAR_CULL_MIN_NEAREST_PLAYER_BLOCKS,
        8,
        160
    );

    let urgentMinNearestBlocks = readOverrideInt(
        BEAR_CULL_DEV_KEYS.urgentMinNearestBlocks,
        MB_BEAR_CULL_URGENT_MIN_NEAREST_PLAYER_BLOCKS,
        4,
        minNearestBlocks
    );
    if (urgentMinNearestBlocks > minNearestBlocks) urgentMinNearestBlocks = minNearestBlocks;

    const intervalTicks = readOverrideInt(
        BEAR_CULL_DEV_KEYS.intervalTicks,
        MB_BEAR_CULL_INTERVAL_TICKS,
        BEAR_CULL_POLL_INTERVAL_TICKS,
        600
    );

    return {
        whenAbove,
        targetGlobal,
        maxRemovedPerPass,
        urgentWhenAbove,
        minNearestBlocks,
        urgentMinNearestBlocks,
        intervalTicks
    };
}
