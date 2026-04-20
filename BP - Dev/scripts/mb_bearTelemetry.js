/**
 * Dev-only: periodic bear counts by type → content log when Spawn → Bear telemetry is ON.
 */

import { system, world } from "@minecraft/server";
import { INCLUDE_FULL_DEVELOPER_TOOLS } from "./mb_buildConfig.js";
import { isDebugEnabled } from "./mb_codex.js";
import { ALL_MB_MOB_TYPES } from "./mb_spawnLoadMetrics.js";

const TICK_INTERVAL = 20;
const LOG_EVERY_TICKS = 100;

let telemetryStarted = false;

function countByType() {
    /** @type {Record<string, number>} */
    const counts = {};
    const dims = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
    for (const dimId of dims) {
        let dim;
        try {
            dim = world.getDimension(dimId);
        } catch {
            continue;
        }
        if (!dim) continue;
        for (const typeId of ALL_MB_MOB_TYPES) {
            try {
                const ents = dim.getEntities({ type: typeId });
                const n = ents?.length || 0;
                if (n === 0) continue;
                counts[typeId] = (counts[typeId] || 0) + n;
            } catch {
                /* ignore */
            }
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
