/**
 * Dev-only: village / entity-query perf diagnostics (zero-bear standdown, villager defer).
 * Journal → Debug → Entity query / village perf.
 */

import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { INCLUDE_FULL_DEVELOPER_TOOLS } from "./mb_buildConfig.js";
import { CHAT_INFO, CHAT_SUCCESS, CHAT_WARNING } from "./mb_chatColors.js";
import { getPlayerProperty, setPlayerProperty, saveAllProperties } from "./mb_dynamicPropertyHandler.js";
import { getCurrentDay } from "./mb_dayTracker.js";
import {
    buildDayZeroBisectStatusLines,
    getDayZeroBisectDebugOneLiner,
    DAY0_BISECT_MENU_ORDER,
    DAY0_BISECT_SHORT,
    isDayZeroBisectCategoryEnabled,
    isDayZeroBisectEligible,
    isDayZeroBisectModeActive,
    setAllDayZeroBisectCategories,
    setDayZeroBisectCategoryEnabled,
    setDayZeroBisectModeActive,
    shouldSleepDayZeroWorldWork
} from "./mb_dayZeroPerfBisect.js";
import { getEntityQueryGateDebugSnapshot } from "./mb_entityQueryGate.js";
import {
    isVillagerSuppressionEnabled,
    toggleVillagerSuppressionEnabled
} from "./mb_villagerSpawnPolicy.js";
import { getBearSnapshotDebug } from "./mb_bearSnapshot.js";
import {
    ACTION_BAR_SLOT,
    setHudActionBarSegment,
    clearHudActionBarSegment
} from "./mb_actionBarHud.js";
import {
    getVillagerBurstDeferTicksRemaining,
    getVillagerPressureTicksRemaining,
    getVillagerSpawnSpreadTicksRemaining,
    getRecentVillagerSpawnCount,
    getVillagerSpawnsThisTick,
    isAnyChunkEdgeDeferActive,
    isEntityQuerySpreadActive,
    isSpreadThrottleActive,
    isVillagerBurstDeferActive,
    isVillageEntitySpreadActive,
    shouldDeferVillageBurst
} from "./mb_workSpread.js";
import { getPlayerThriftTier } from "./mb_performanceProfile.js";
import {
    registerEntityQueryTraceLogChecker,
    buildEntityQueryTraceReportLines,
    flushEntityQueryTraceToLog,
    resetEntityQueryTraceStats
} from "./mb_entityQueryTraceDev.js";

registerEntityQueryTraceLogChecker(() => isAnyEntityQueryLogEnabled());

const MB_DEV_HUD_ENTITY_QUERY_PLAYER = "mb_dev_hud_entity_query";
const MB_DEV_LOG_ENTITY_QUERY_PLAYER = "mb_dev_log_entity_query";

const LOG_INTERVAL_TICKS = 40;
/** Still log during villager defer, but less often (defer would otherwise silence all lines). */
const LOG_INTERVAL_TICKS_DURING_DEFER = 80;

/** @type {Map<string, number>} */
const lastLogTickByPlayer = new Map();

/** @returns {boolean} Any player has entity-query Content Log enabled. */
export function isAnyEntityQueryLogEnabled() {
    try {
        for (const pl of world.getAllPlayers()) {
            if (pl?.isValid && isEntityQueryLogPersonalEnabled(pl)) return true;
        }
    } catch {
        /* ignore */
    }
    return false;
}

function readPlayerHudBool(player, key) {
    try {
        if (!player?.isValid) return false;
        const v = getPlayerProperty(player, key);
        return v === 1 || v === true || v === "1";
    } catch {
        return false;
    }
}

/** @param {import("@minecraft/server").Player} player */
export function isEntityQueryHudPersonalEnabled(player) {
    return readPlayerHudBool(player, MB_DEV_HUD_ENTITY_QUERY_PLAYER);
}

/** @param {import("@minecraft/server").Player} player */
export function isEntityQueryLogPersonalEnabled(player) {
    return readPlayerHudBool(player, MB_DEV_LOG_ENTITY_QUERY_PLAYER);
}

/** @param {import("@minecraft/server").Player} player */
export function isEntityQueryHudEnabledForPlayer(player) {
    if (!INCLUDE_FULL_DEVELOPER_TOOLS || !player?.isValid) return false;
    return isEntityQueryHudPersonalEnabled(player);
}

/**
 * @param {boolean} enabled
 * @param {import("@minecraft/server").Player} togglingPlayer
 */
export function setEntityQueryHudPersonalEnabled(enabled, togglingPlayer) {
    if (!togglingPlayer?.isValid) return;
    try {
        setPlayerProperty(togglingPlayer, MB_DEV_HUD_ENTITY_QUERY_PLAYER, enabled ? 1 : 0);
    } catch { /* ignore */ }
    if (!enabled) {
        try {
            clearHudActionBarSegment(togglingPlayer, ACTION_BAR_SLOT.ENTITY_QUERY);
        } catch { /* ignore */ }
    }
}

/**
 * @param {boolean} enabled
 * @param {import("@minecraft/server").Player} togglingPlayer
 */
export function setEntityQueryLogPersonalEnabled(enabled, togglingPlayer) {
    if (!togglingPlayer?.isValid) return;
    try {
        setPlayerProperty(togglingPlayer, MB_DEV_LOG_ENTITY_QUERY_PLAYER, enabled ? 1 : 0);
    } catch { /* ignore */ }
    if (enabled) {
        lastLogTickByPlayer.set(togglingPlayer.id, -999999);
        emitEntityQueryLog(togglingPlayer.name, ["periodic log enabled — Content Log only"]);
        resetEntityQueryTraceStats();
        try {
            togglingPlayer.sendMessage(
                CHAT_INFO +
                    "Entity-query log on. Content Log: [ENTITY QUERY] ~2s, [ENTITY TRACE] per query (budgeted), [VILLAGER SPAWN] on eggs."
            );
        } catch { /* ignore */ }
    }
}

/** Ultra-short action bar line (fits narrow screens). */
export function formatEntityQueryHudSegment(gate) {
    let s = `§8Q§r§f${gate.bears}`;
    if (gate.standdown) s += ` §aS${gate.standdownTicks}`;
    const vil = getVillagerBurstDeferTicksRemaining();
    if (vil > 0) s += ` §eV${vil}`;
    const burst = getVillagerSpawnsThisTick();
    if (burst > 0) s += ` §c+${burst}`;
    if (gate.dormant) s += " §bd";
    if (isAnyChunkEdgeDeferActive()) s += " §8C";
    return s;
}

/** @returns {string[]} */
export function buildEntityQueryDebugReportLines() {
    const gate = getEntityQueryGateDebugSnapshot();
    const snaps = getBearSnapshotDebug();
    let day = "?";
    try {
        day = String(getCurrentDay());
    } catch { /* ignore */ }

    const spread = [];
    if (isSpreadThrottleActive()) spread.push("d0-1");
    if (isVillageEntitySpreadActive()) spread.push("vilSpr");
    if (isEntityQuerySpreadActive()) spread.push("grid");
    if (!spread.length) spread.push("norm");

    const lines = [
        getDayZeroBisectDebugOneLiner(),
        `d${day} thr${getPlayerThriftTier()} [${spread.join(",")}]`,
        `b${gate.bears} SD=${gate.standdown ? gate.standdownTicks + "t" : "off"} mobSkip=${gate.mobCacheSkip} early=${gate.earlyZeroBear ? 1 : 0} dorm=${gate.dormant} sk=${gate.snapshotSkips}/${gate.mobSkips}/${gate.querySkips ?? 0}/${gate.dormantSkips}`,
        `vil=${getVillagerBurstDeferTicksRemaining()}t entityQuiet=${gate.villagerMuteTicks}t M=${gate.miningBears} P=${getVillagerPressureTicksRemaining()}t S=${getVillagerSpawnSpreadTicksRemaining()}t r${getRecentVillagerSpawnCount()} ` +
            `chunk=${isAnyChunkEdgeDeferActive()} defer=${shouldDeferVillageBurst("r")} batch=${getVillagerSpawnsThisTick()}`
    ];
    for (const row of snaps) {
        lines.push(`snap ${row.dim}: ${row.total} bears age ${system.currentTick - row.tick}t`);
    }
    if (!snaps.length) lines.push("snap: none");
    for (const tline of buildEntityQueryTraceReportLines()) {
        lines.push(`tr ${tline}`);
    }
    return lines;
}

function emitEntityQueryLog(playerLabel, lines) {
    const who = playerLabel ? `${playerLabel}: ` : "";
    for (const line of lines) {
        console.warn(`[ENTITY QUERY] ${who}${line}`);
    }
}

function tickEntityQueryLogs() {
    const now = system.currentTick;
    const interval = shouldDeferVillageBurst("entityQueryLog")
        ? LOG_INTERVAL_TICKS_DURING_DEFER
        : LOG_INTERVAL_TICKS;
    for (const pl of world.getAllPlayers()) {
        if (!pl?.isValid || !isEntityQueryLogPersonalEnabled(pl)) continue;
        const last = lastLogTickByPlayer.get(pl.id) ?? -999999;
        if (now - last < interval) continue;
        lastLogTickByPlayer.set(pl.id, now);
        emitEntityQueryLog(pl.name, buildEntityQueryDebugReportLines());
    }
}

export function refreshEntityQueryHudOverlay() {
    try {
        if (shouldSleepDayZeroWorldWork("entity_query_hud")) return;
        const allPlayers = world.getAllPlayers();
        if (!allPlayers?.length) return;
        if (!INCLUDE_FULL_DEVELOPER_TOOLS) {
            for (const pl of allPlayers) {
                if (pl?.isValid) clearHudActionBarSegment(pl, ACTION_BAR_SLOT.ENTITY_QUERY);
            }
            return;
        }
        const gate = getEntityQueryGateDebugSnapshot();
        let anyHud = false;
        for (const pl of allPlayers) {
            if (!pl?.isValid) continue;
            if (isEntityQueryHudEnabledForPlayer(pl)) anyHud = true;
        }
        if (!anyHud) {
            for (const pl of allPlayers) {
                if (pl?.isValid) clearHudActionBarSegment(pl, ACTION_BAR_SLOT.ENTITY_QUERY);
            }
        } else {
            const line = formatEntityQueryHudSegment(gate);
            for (const pl of allPlayers) {
                if (!pl?.isValid) continue;
                if (!isEntityQueryHudEnabledForPlayer(pl)) {
                    clearHudActionBarSegment(pl, ACTION_BAR_SLOT.ENTITY_QUERY);
                    continue;
                }
                try {
                    setHudActionBarSegment(pl, ACTION_BAR_SLOT.ENTITY_QUERY, line);
                } catch {
                    clearHudActionBarSegment(pl, ACTION_BAR_SLOT.ENTITY_QUERY);
                }
            }
        }
        tickEntityQueryLogs();
    } catch { /* ignore */ }
}

let entityQueryHudWatchStarted = false;

export function initializeEntityQueryDebugHudWatch() {
    if (entityQueryHudWatchStarted) return;
    entityQueryHudWatchStarted = true;
    system.runInterval(() => {
        try {
            refreshEntityQueryHudOverlay();
        } catch { /* ignore */ }
    }, 10);
}

function hudToggleLabel(on) {
    return on
        ? "§cTurn off §2§lmy§r §7entity-query HUD §8(action bar)"
        : "§aTurn on §2§lmy§r §7entity-query HUD §8(action bar)";
}

function logToggleLabel(on) {
    return on
        ? "§cTurn off §2§lmy§r §7Content log §8(~2s)"
        : "§aTurn on §2§lmy§r §7Content log §8(~2s)";
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 */
export function openDayZeroBisectMenu(player, onBack) {
    if (!INCLUDE_FULL_DEVELOPER_TOOLS || !player?.isValid) {
        if (typeof onBack === "function") onBack();
        return;
    }

    const eligible = isDayZeroBisectEligible();
    const modeOn = isDayZeroBisectModeActive();
    const status = buildDayZeroBisectStatusLines().join("\n");

    const form = new ActionFormData()
        .title("§6Day 0 perf bisect")
        .body(
            "§7Find spawn lag: §e[E]§7 = entity hooks. Tap one row to enable §fonly§7 that row.\n\n" +
                status +
                "\n\n§8Reload not required. Test dispensers after each change."
        );

    form.button(modeOn ? "§cBisect mode OFF (normal addon)" : "§aBisect mode ON");
    form.button("§aAll OFF (entity-blind)");
    form.button("§cAll systems ON (full addon)");
    if (eligible && modeOn) {
        for (const id of DAY0_BISECT_MENU_ORDER) {
            const on = isDayZeroBisectCategoryEnabled(id);
            const short = DAY0_BISECT_SHORT[id] ?? id;
            form.button(`${on ? "§aONLY" : "§7off"} §f${short}`);
        }
    }
    form.button("§8Back");

    const categoryList = eligible && modeOn ? DAY0_BISECT_MENU_ORDER : [];
    const backIndex = 3 + categoryList.length;

    form.show(player).then((res) => {
        if (!res || res.canceled || res.selection === backIndex) {
            if (typeof onBack === "function") onBack();
            return;
        }
        if (res.selection === 0) {
            setDayZeroBisectModeActive(!modeOn);
            try {
                saveAllProperties();
            } catch {
                /* ignore */
            }
            try {
                player.sendMessage(
                    CHAT_SUCCESS + (modeOn ? "Day 0 bisect off — normal addon on day 0." : "Day 0 bisect on.")
                );
            } catch {
                /* ignore */
            }
            return openDayZeroBisectMenu(player, onBack);
        }
        if (res.selection === 1) {
            setDayZeroBisectModeActive(true);
            setAllDayZeroBisectCategories(false);
            try {
                saveAllProperties();
            } catch {
                /* ignore */
            }
            try {
                player.sendMessage(
                    CHAT_SUCCESS +
                        "Entity-blind + all loops off. Tap one [E] or world row to test only that piece."
                );
            } catch {
                /* ignore */
            }
            return openDayZeroBisectMenu(player, onBack);
        }
        if (res.selection === 2) {
            setDayZeroBisectModeActive(true);
            setAllDayZeroBisectCategories(true);
            try {
                saveAllProperties();
            } catch {
                /* ignore */
            }
            try {
                player.sendMessage(CHAT_WARNING + "All day-0 systems ON. Should match full-addon lag.");
            } catch {
                /* ignore */
            }
            return openDayZeroBisectMenu(player, onBack);
        }
        const catIndex = res.selection - 3;
        const catId = categoryList[catIndex];
        if (catId) {
            const wasOn = isDayZeroBisectCategoryEnabled(catId);
            if (!wasOn) {
                for (const id of DAY0_BISECT_MENU_ORDER) {
                    setDayZeroBisectCategoryEnabled(id, id === catId);
                }
                try {
                    player.sendMessage(
                        CHAT_INFO + `Only §f${DAY0_BISECT_SHORT[catId] ?? catId}§7 ON — test spawn, then try the next row.`
                    );
                } catch {
                    /* ignore */
                }
            } else {
                setDayZeroBisectCategoryEnabled(catId, false);
            }
            try {
                saveAllProperties();
            } catch {
                /* ignore */
            }
        }
        return openDayZeroBisectMenu(player, onBack);
    }).catch(() => {
        if (typeof onBack === "function") onBack();
    });
}

/**
 * Script villager suppression (eggs, despawn, purge) — dev/debug journal entry.
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 */
export function openVillagerSuppressionDevMenu(player, onBack) {
    if (!player?.isValid) return;

    const suppressOn = isVillagerSuppressionEnabled();
    const form = new ActionFormData()
        .title("§eVillager suppress")
        .body(
            "§7Controls §fmb_villagerSpawnPolicy§7 on this world.\n\n" +
                `§8Script despawn: §7${suppressOn ? "§aON" : "§cOFF"}\n` +
                "§8• §7ON: block villager eggs, remove adults on spawn, periodic purge\n" +
                "§8• §7OFF: villagers can exist for lag testing\n\n" +
                "§8Does not change: §7spawn rules, biome no-village worldgen, wandering traders.\n" +
                "§8With despawn OFF: §7entity-query / villager work-spread hooks run again."
        );

    form.button(
        suppressOn
            ? "§cTurn OFF §7script despawn"
            : "§aTurn ON §7script despawn"
    );
    if (INCLUDE_FULL_DEVELOPER_TOOLS) {
        form.button("§bEntity query / village §8(perf HUD)");
    }
    form.button("§8Back");

    const backIdx = INCLUDE_FULL_DEVELOPER_TOOLS ? 2 : 1;

    form.show(player).then((res) => {
        if (!res || res.canceled || res.selection === backIdx) {
            if (typeof onBack === "function") onBack();
            return;
        }
        if (res.selection === 0) {
            const on = toggleVillagerSuppressionEnabled();
            try {
                saveAllProperties();
            } catch {
                /* ignore */
            }
            try {
                player.sendMessage(
                    CHAT_SUCCESS +
                        (on
                            ? "Villager script despawn ON — eggs blocked, adults removed on spawn + purge."
                            : "Villager script despawn OFF — villagers can exist (spawn rules still apply).")
                );
            } catch {
                /* ignore */
            }
            return openVillagerSuppressionDevMenu(player, onBack);
        }
        if (INCLUDE_FULL_DEVELOPER_TOOLS && res.selection === 1) {
            return openEntityQueryDebugHub(player, () => openVillagerSuppressionDevMenu(player, onBack));
        }
        if (typeof onBack === "function") onBack();
    }).catch(() => {
        if (typeof onBack === "function") onBack();
    });
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 */
export function openEntityQueryDebugHub(player, onBack) {
    if (!INCLUDE_FULL_DEVELOPER_TOOLS) {
        try {
            player.sendMessage(CHAT_WARNING + "Entity-query debug is only in the dev behavior pack.");
        } catch { /* ignore */ }
        if (typeof onBack === "function") onBack();
        return;
    }
    if (!player?.isValid) return;

    const gate = getEntityQueryGateDebugSnapshot();
    const hudOn = isEntityQueryHudPersonalEnabled(player);
    const logOn = isEntityQueryLogPersonalEnabled(player);
    const villagerSuppressOn = isVillagerSuppressionEnabled();
    const report = buildEntityQueryDebugReportLines().join("\n§8");

    const form = new ActionFormData()
        .title("§bEntity query / village")
        .body(
            "§7HUD: §f" +
                formatEntityQueryHudSegment(gate) +
                " §8(B=bears S=standdown V=villager defer d=dormant C=chunk)\n\n" +
                `§8${report}\n\n` +
                `§8HUD: §7${hudOn ? "§aON" : "OFF"} §8Log: §7${logOn ? "§aON" : "OFF"} §8· trace+query+villager in Content Log` +
                `\n§8Villager despawn: §7${villagerSuppressOn ? "§aON §8(eggs blocked, purge active)" : "§cOFF §8(vanilla villagers allowed)"}` +
                (isDayZeroBisectModeActive() ? "\n§6Day 0 bisect: §aON" : "")
        );

    form.button("§aRefresh");
    form.button(hudToggleLabel(hudOn));
    form.button(logToggleLabel(logOn));
    form.button("§eVillager suppress §8(script despawn)");
    form.button("§dLog snapshot now");
    form.button("§eLog entity trace");
    form.button("§cClear trace stats");
    form.button("§6Day 0 bisect §8(find lag)");
    form.button("§8Back");

    form.show(player).then((res) => {
        if (!res || res.canceled || res.selection === 8) {
            if (typeof onBack === "function") onBack();
            return;
        }
        switch (res.selection) {
            case 0:
                return openEntityQueryDebugHub(player, onBack);
            case 1:
                setEntityQueryHudPersonalEnabled(!hudOn, player);
                try { saveAllProperties(); } catch { /* ignore */ }
                try {
                    player.sendMessage(
                        CHAT_SUCCESS +
                            (hudOn ? "Entity-query HUD off." : "Entity-query HUD on — short line on action bar.")
                    );
                } catch { /* ignore */ }
                return openEntityQueryDebugHub(player, onBack);
            case 2:
                setEntityQueryLogPersonalEnabled(!logOn, player);
                try { saveAllProperties(); } catch { /* ignore */ }
                try {
                    player.sendMessage(
                        CHAT_SUCCESS +
                            (logOn
                                ? "Entity-query log off."
                                : "Entity-query log on — [ENTITY QUERY], [ENTITY TRACE], [VILLAGER SPAWN] in Content Log.")
                    );
                } catch { /* ignore */ }
                return openEntityQueryDebugHub(player, onBack);
            case 3:
                return openVillagerSuppressionDevMenu(player, () => openEntityQueryDebugHub(player, onBack));
            case 4: {
                emitEntityQueryLog(player.name, buildEntityQueryDebugReportLines());
                try {
                    player.sendMessage(CHAT_INFO + "[Entity query] Snapshot sent to Content Log.");
                } catch { /* ignore */ }
                return openEntityQueryDebugHub(player, onBack);
            }
            case 5: {
                flushEntityQueryTraceToLog(player.name);
                try {
                    player.sendMessage(CHAT_INFO + "[Entity trace] RUN/SKIP stats sent to Content Log.");
                } catch { /* ignore */ }
                return openEntityQueryDebugHub(player, onBack);
            }
            case 6:
                resetEntityQueryTraceStats();
                try {
                    player.sendMessage(CHAT_INFO + "Entity trace counters cleared.");
                } catch { /* ignore */ }
                return openEntityQueryDebugHub(player, onBack);
            case 7:
                return openDayZeroBisectMenu(player, () => openEntityQueryDebugHub(player, onBack));
            default:
                return openEntityQueryDebugHub(player, onBack);
        }
    }).catch(() => {
        if (typeof onBack === "function") onBack();
    });
}
