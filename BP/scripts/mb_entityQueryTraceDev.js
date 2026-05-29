/**
 * Dev: per-query trace for dimension.getEntities and gated skips.
 * Enabled when Journal → Entity query → Content log is ON (same as [ENTITY QUERY] / [VILLAGER SPAWN]).
 */

import { system } from "@minecraft/server";
import { INCLUDE_FULL_DEVELOPER_TOOLS } from "./mb_buildConfig.js";

const TRACE_RING_MAX = 64;
const IMMEDIATE_LOG_BUDGET_PER_TICK = 16;
/** Skip reasons that flood Content Log while polls are intentionally off. */
const QUIET_SKIP_IMMEDIATE_REASONS = new Set([
    "earlyZeroBear",
    "villagerMute",
    "villagerDefer",
    "zeroBearStanddown",
    "villageDefer"
]);

/** @type {Array<{ tick: number, kind: string, category: string, detail: string }>} */
const traceRing = [];
/** @type {Map<string, number>} */
const runCountByCategory = new Map();
/** @type {Map<string, number>} */
const skipCountByKey = new Map();

let traceLogEnabledFn = () => false;
let immediateLogBudgetTick = -1;
let immediateLogBudgetUsed = 0;

/**
 * @param {() => boolean} fn
 */
export function registerEntityQueryTraceLogChecker(fn) {
    if (typeof fn === "function") traceLogEnabledFn = fn;
}

export function isEntityQueryTraceActive() {
    if (!INCLUDE_FULL_DEVELOPER_TOOLS) return false;
    try {
        return !!traceLogEnabledFn();
    } catch {
        return false;
    }
}

function bumpMap(map, key, add = 1) {
    const k = String(key || "?");
    map.set(k, (map.get(k) ?? 0) + add);
}

/**
 * @param {string} kind
 * @param {string} category
 * @param {string} detail
 */
function pushTrace(kind, category, detail) {
    traceRing.push({
        tick: system.currentTick,
        kind,
        category: String(category || "?"),
        detail: String(detail || "")
    });
    if (traceRing.length > TRACE_RING_MAX) {
        traceRing.splice(0, traceRing.length - TRACE_RING_MAX);
    }
}

/**
 * @param {string} kind
 * @param {string} category
 * @param {string} detail
 */
function maybeImmediateLog(kind, category, detail) {
    const tick = system.currentTick;
    if (tick !== immediateLogBudgetTick) {
        immediateLogBudgetTick = tick;
        immediateLogBudgetUsed = 0;
    }
    if (immediateLogBudgetUsed >= IMMEDIATE_LOG_BUDGET_PER_TICK) return;
    immediateLogBudgetUsed++;
    const line = `[ENTITY TRACE] ${kind} ${category}${detail ? ` ${detail}` : ""}`;
    console.warn(line);
}

/**
 * @param {string} category
 * @param {string} [detail]
 */
export function traceEntityQueryRun(category, detail = "") {
    if (!isEntityQueryTraceActive()) return;
    bumpMap(runCountByCategory, category);
    pushTrace("RUN", category, detail);
    maybeImmediateLog("RUN", category, detail);
}

/**
 * @param {string} category
 * @param {string} reason
 * @param {string} [detail]
 */
export function traceEntityQuerySkip(category, reason, detail = "") {
    if (!isEntityQueryTraceActive()) return;
    const key = `${category}:${reason}`;
    bumpMap(skipCountByKey, key);
    const d = detail ? `${reason} ${detail}` : reason;
    pushTrace("SKIP", category, d);
    if (QUIET_SKIP_IMMEDIATE_REASONS.has(reason)) return;
    maybeImmediateLog("SKIP", category, d);
}

export function resetEntityQueryTraceStats() {
    traceRing.length = 0;
    runCountByCategory.clear();
    skipCountByKey.clear();
    immediateLogBudgetTick = -1;
    immediateLogBudgetUsed = 0;
}

/** @returns {string[]} */
export function buildEntityQueryTraceReportLines() {
    if (!isEntityQueryTraceActive()) {
        return ["trace off — turn on Content log in Entity query / village menu"];
    }

    const lines = [];
    const topRun = [...runCountByCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topSkip = [...skipCountByKey.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (topRun.length) {
        lines.push(`runs: ${topRun.map(([k, v]) => `${k}=${v}`).join(" ")}`);
    }
    if (topSkip.length) {
        lines.push(`skips: ${topSkip.map(([k, v]) => `${k}=${v}`).join(" ")}`);
    }
    const recent = traceRing.slice(-8);
    if (recent.length) {
        lines.push("recent:");
        for (const e of recent) {
            lines.push(`  ${e.tick} ${e.kind} ${e.category} ${e.detail}`);
        }
    }
    if (!lines.length) lines.push("(no RUN/SKIP events yet)");
    return lines;
}

/** Dump full trace stats + recent ring to Content Log. */
export function flushEntityQueryTraceToLog(playerLabel = "") {
    if (!INCLUDE_FULL_DEVELOPER_TOOLS) return;
    const who = playerLabel ? `${playerLabel}: ` : "";
    for (const line of buildEntityQueryTraceReportLines()) {
        console.warn(`[ENTITY TRACE] ${who}${line}`);
    }
}
