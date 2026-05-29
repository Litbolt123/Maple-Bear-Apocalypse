/**
 * Dev-only: periodic bear counts by type → content log when Spawn → Bear telemetry is ON.
 */

import { system, world } from "@minecraft/server";
import { INCLUDE_FULL_DEVELOPER_TOOLS } from "./mb_buildConfig.js";
import { isDebugEnabled } from "./mb_codex.js";
import { getBearSnapshotsForDimensions } from "./mb_bearSnapshot.js";
import { ALL_MB_MOB_TYPES } from "./mb_spawnLoadMetrics.js";
import { shouldSkipExpensiveEntityQueries } from "./mb_entityQueryGate.js";

const TICK_INTERVAL = 20;
const LOG_EVERY_TICKS = 100;

let telemetryStarted = false;

function countByType() {
    if (shouldSkipExpensiveEntityQueries("bearTelemetry")) return {};
    /** @type {Record<string, number>} */
    const counts = {};
    const allowed = new Set(ALL_MB_MOB_TYPES);
    const snaps = getBearSnapshotsForDimensions(["overworld", "nether", "the_end"]);
    for (const snap of snaps.values()) {
        for (const [typeId, bucket] of snap.byType) {
            if (!allowed.has(typeId) || !bucket?.length) continue;
            counts[typeId] = (counts[typeId] || 0) + bucket.length;
        }
    }
    return counts;
}

export function registerBearTelemetryTick() {
    if (telemetryStarted) return;
    if (!INCLUDE_FULL_DEVELOPER_TOOLS) return;
    telemetryStarted = true;

    let tickAcc = 0;
    system.runInterval(() => {
        try {
            if (!isDebugEnabled("spawn", "bearTelemetry")) return;
            tickAcc += TICK_INTERVAL;
            if (tickAcc < LOG_EVERY_TICKS) return;
            tickAcc = 0;
            const counts = countByType();
            const parts = Object.keys(counts)
                .sort()
                .map((id) => `${id.split(":")[1] ?? id}:${counts[id]}`);
            console.warn(`[BEAR TELEMETRY] ${parts.join(" | ") || "(none)"}`);
        } catch {
            /* ignore */
        }
    }, TICK_INTERVAL);
}
