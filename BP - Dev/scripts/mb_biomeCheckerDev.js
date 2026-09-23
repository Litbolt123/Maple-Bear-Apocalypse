/**
 * Dev-only UI: check biome at feet vs infected replace_biomes targets.
 * Journal → Developer Tools → Systems → Biome checker.
 *
 * Stays in the Dev pack. `INCLUDE_FULL_DEVELOPER_TOOLS` must be true (BP - Dev).
 * Do not add to public Host tools or `pinInReleaseAdmin`. The file may exist in
 * public `BP/scripts/` for script parity; the menu and HUD never show there.
 */

import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { INCLUDE_FULL_DEVELOPER_TOOLS } from "./mb_buildConfig.js";
import { CHAT_INFO, CHAT_SUCCESS, CHAT_WARNING } from "./mb_chatColors.js";
import { DEV_BTN_BACK, devBtnParen } from "./mb_devFormUi.js";
import { getPlayerProperty, setPlayerProperty, saveAllProperties, flushPlayerPropertyToDisk } from "./mb_dynamicPropertyHandler.js";
import {
    ACTION_BAR_SLOT,
    setHudActionBarSegment,
    clearHudActionBarSegment,
    getHudActiveSegmentCount
} from "./mb_actionBarHud.js";
import {
    REPLACEMENT_GROUPS,
    INFECTED_BIOME_COMPONENT_IDS,
    INFECTED_VANILLA_BIOME_IDS,
    getBiomeCheckAtLocation,
    formatBiomeCheckLines,
    formatBiomeCheckHudSegment,
    getMissingVanillaOverworldBiomes,
    getAllReplaceTargets,
    getCatalogGapsOverworld,
    isIntentionalSafeOverworld,
} from "./mb_biomeReplaceRegistry.js";

const MB_DEV_HUD_BIOME_CHECKER_PLAYER = "mb_dev_hud_biome_checker";

const SAMPLE_OFFSETS = [
    { label: "Here", dx: 0, dz: 0 },
    { label: "N+32", dx: 0, dz: 32 },
    { label: "S-32", dx: 0, dz: -32 },
    { label: "E+32", dx: 32, dz: 0 },
    { label: "W-32", dx: -32, dz: 0 }
];

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
export function isBiomeCheckerHudPersonalEnabled(player) {
    return readPlayerHudBool(player, MB_DEV_HUD_BIOME_CHECKER_PLAYER);
}

/** @param {import("@minecraft/server").Player} player */
export function isBiomeCheckerHudEnabledForPlayer(player) {
    if (!INCLUDE_FULL_DEVELOPER_TOOLS || !player?.isValid) return false;
    return isBiomeCheckerHudPersonalEnabled(player);
}

/**
 * @param {boolean} enabled
 * @param {import("@minecraft/server").Player} togglingPlayer
 */
export function setBiomeCheckerHudPersonalEnabled(enabled, togglingPlayer) {
    if (!togglingPlayer?.isValid) return;
    try {
        setPlayerProperty(togglingPlayer, MB_DEV_HUD_BIOME_CHECKER_PLAYER, enabled ? 1 : 0);
        flushPlayerPropertyToDisk(togglingPlayer, MB_DEV_HUD_BIOME_CHECKER_PLAYER);
    } catch { /* ignore */ }
    if (!enabled) {
        try {
            clearHudActionBarSegment(togglingPlayer, ACTION_BAR_SLOT.BIOME_CHECKER);
        } catch { /* ignore */ }
    }
}

export function refreshBiomeCheckerHudOverlay() {
    try {
        const allPlayers = world.getAllPlayers();
        if (!allPlayers?.length) return;
        if (!INCLUDE_FULL_DEVELOPER_TOOLS) {
            for (const pl of allPlayers) {
                if (pl?.isValid) clearHudActionBarSegment(pl, ACTION_BAR_SLOT.BIOME_CHECKER);
            }
            return;
        }
        let anyOn = false;
        for (const pl of allPlayers) {
            if (pl?.isValid && isBiomeCheckerHudEnabledForPlayer(pl)) {
                anyOn = true;
                break;
            }
        }
        if (!anyOn) {
            for (const pl of allPlayers) {
                if (pl?.isValid) clearHudActionBarSegment(pl, ACTION_BAR_SLOT.BIOME_CHECKER);
            }
            return;
        }
        for (const pl of allPlayers) {
            if (!pl?.isValid) continue;
            if (!isBiomeCheckerHudEnabledForPlayer(pl)) {
                clearHudActionBarSegment(pl, ACTION_BAR_SLOT.BIOME_CHECKER);
                continue;
            }
            try {
                const check = getBiomeCheckAtLocation(pl.dimension, pl.location);
                const compact = getHudActiveSegmentCount(pl) >= 4;
                setHudActionBarSegment(
                    pl,
                    ACTION_BAR_SLOT.BIOME_CHECKER,
                    formatBiomeCheckHudSegment(check, compact)
                );
            } catch {
                clearHudActionBarSegment(pl, ACTION_BAR_SLOT.BIOME_CHECKER);
            }
        }
    } catch { /* ignore */ }
}

let biomeCheckerHudWatchStarted = false;

export function initializeBiomeCheckerHudWatch() {
    if (biomeCheckerHudWatchStarted) return;
    biomeCheckerHudWatchStarted = true;
    system.runInterval(() => {
        try {
            refreshBiomeCheckerHudOverlay();
        } catch { /* ignore */ }
    }, 10);
}

function logLines(player, title, lines) {
    console.warn(`[BIOME CHECKER] ${title}`);
    for (const line of lines) {
        console.warn(`[BIOME CHECKER] ${line.replace(/§./g, "")}`);
    }
    try {
        player.sendMessage(`${CHAT_INFO}[Biome checker] ${title} — see Content Log`);
    } catch { /* ignore */ }
}

function formatIdList(ids, max = 12) {
    const preview = ids
        .slice(0, max)
        .map((id) => `§7• §f${id.replace("minecraft:", "")}`)
        .join("\n");
    const more = ids.length > max ? `\n§8…and ${ids.length - max} more` : "";
    return (preview || "§8(none)") + more;
}

function biomeHudToggleLabel(on) {
    return on
        ? `§cTurn off §2§lmy§r §fbiome HUD${devBtnParen("action bar")}`
        : `§aTurn on §2§lmy§r §fbiome HUD${devBtnParen("action bar")}`;
}

/** Expanding XZ boxes — same idea as `/locate biome`, one-shot, not per-tick. */
const BIOME_TELEPORT_SEARCH_SIZES = [256, 512, 1024, 2048, 4096, 8192];

function isOverworldDimension(dim) {
    const id = dim?.id ?? "";
    return id === "overworld" || id === "minecraft:overworld";
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} pos
 * @param {string} biomeId
 * @param {{ x: number, y: number, z: number }} boundingSize
 * @returns {import("@minecraft/server").Vector3 | undefined}
 */
function closestBiomeLocation(dimension, pos, biomeId, boundingSize) {
    const opts = { boundingSize };
    /** @type {Array<() => import("@minecraft/server").Vector3 | undefined>} */
    const tries = [];
    // `/locate biome` uses the seed search. Prefer it so TP matches what August runs in chat.
    if (typeof dimension.calculateClosestBiomeFromSeed === "function") {
        tries.push(() => dimension.calculateClosestBiomeFromSeed(pos, biomeId, opts));
    }
    if (typeof dimension.findClosestBiome === "function") {
        tries.push(() => dimension.findClosestBiome(pos, biomeId, opts));
    }
    for (const fn of tries) {
        try {
            const loc = fn();
            if (loc) return loc;
        } catch {
            /* next method */
        }
    }
    return undefined;
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} from
 * @param {string} biomeId
 */
function findNearestBiomeLocation(dimension, from, biomeId) {
    for (const s of BIOME_TELEPORT_SEARCH_SIZES) {
        const loc = closestBiomeLocation(dimension, from, biomeId, { x: s, y: 384, z: s });
        if (loc) return loc;
    }
    return undefined;
}

/**
 * @param {import("@minecraft/server").Dimension} dim
 * @param {number} x
 * @param {number} z
 * @param {number} [hintY]
 */
function surfaceTeleportY(dim, x, z, hintY) {
    const fx = Math.floor(x) + 0.5;
    const fz = Math.floor(z) + 0.5;
    const maxY = dim.heightRange?.max ?? 320;
    const minY = dim.heightRange?.min ?? -64;
    try {
        const hit = dim.getBlockFromRay(
            { x: fx, y: maxY - 2, z: fz },
            { x: 0, y: -1, z: 0 },
            {
                maxDistance: Math.max(32, maxY - minY),
                includeLiquidBlocks: false,
                includePassableBlocks: false
            }
        );
        if (hit?.block) return hit.block.location.y + 1;
    } catch { /* ignore */ }
    return Math.floor(hintY ?? 80) + 1;
}

function overworldSearchOrigin(player) {
    if (isOverworldDimension(player.dimension)) return player.location;
    return { x: 0, y: 80, z: 0 };
}

/** @param {import("@minecraft/server").Player} player @param {string} biomeId */
function runLocateBiomeCommand(player, biomeId) {
    try {
        player.runCommand(`locate biome ${biomeId}`);
        return true;
    } catch {
        return false;
    }
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} loc
 */
function isChunkTickingAt(dimension, loc) {
    try {
        return !!dimension.getBlock({
            x: Math.floor(loc.x),
            y: Math.floor(loc.y),
            z: Math.floor(loc.z)
        });
    } catch {
        return false;
    }
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} loc
 * @param {number} attempt
 * @param {number} maxAttempts
 * @param {() => void} onReady
 * @param {() => void} onFail
 */
function waitUntilChunkTicking(dimension, loc, attempt, maxAttempts, onReady, onFail) {
    system.runTimeout(() => {
        if (isChunkTickingAt(dimension, loc)) {
            onReady();
            return;
        }
        if (attempt >= maxAttempts) {
            onFail();
            return;
        }
        waitUntilChunkTicking(dimension, loc, attempt + 1, maxAttempts, onReady, onFail);
    }, 5);
}

/**
 * Locate like `/locate biome`, teleport, wait until the destination chunk is ticking, then surface-snap.
 * @param {import("@minecraft/server").Player} player
 * @param {string} biomeId
 * @param {() => void} onDone
 */
function teleportPlayerToNearestBiome(player, biomeId, onDone) {
    let overworld;
    try {
        overworld = world.getDimension("overworld");
    } catch {
        overworld = undefined;
    }
    if (!overworld) {
        try {
            player.sendMessage(CHAT_WARNING + "No overworld dimension.");
        } catch { /* ignore */ }
        onDone();
        return;
    }

    const from = overworldSearchOrigin(player);
    try {
        player.sendMessage(`${CHAT_INFO}Locating §f${biomeId}§7 (same as §f/locate biome§7)…`);
    } catch { /* ignore */ }

    system.run(() => {
        try {
            if (!player?.isValid) {
                onDone();
                return;
            }
            runLocateBiomeCommand(player, biomeId);
            const found = findNearestBiomeLocation(overworld, from, biomeId);
            if (!found) {
                player.sendMessage(
                    CHAT_WARNING +
                        `No §f${biomeId} §ewithin ~8192 of your overworld XZ. New chunks / new world, or try §f/locate biome ${biomeId}`
                );
                onDone();
                return;
            }
            const px = player.location.x;
            const pz = player.location.z;
            const dist = isOverworldDimension(player.dimension)
                ? Math.hypot(found.x - px, found.z - pz)
                : Math.hypot(found.x, found.z);
            if (isOverworldDimension(player.dimension) && dist < 16) {
                const here = getBiomeCheckAtLocation(player.dimension, player.location);
                if (!here.error && here.biomeId === biomeId) {
                    player.sendMessage(CHAT_SUCCESS + `Already standing in §f${biomeId}§a (${dist.toFixed(0)} blocks).`);
                    onDone();
                    return;
                }
            }
            const hover = {
                x: Math.floor(found.x) + 0.5,
                y: 180,
                z: Math.floor(found.z) + 0.5
            };
            player.teleport(hover, { dimension: overworld });
            player.sendMessage(
                `${CHAT_INFO}Found §f${biomeId} §8at ${Math.floor(hover.x)} ~ ${Math.floor(hover.z)} · ${dist.toFixed(0)} blocks. Waiting for the chunk…`
            );
            waitUntilChunkTicking(
                overworld,
                hover,
                0,
                40,
                () => {
                    if (!player?.isValid) {
                        onDone();
                        return;
                    }
                    try {
                        const y = surfaceTeleportY(overworld, hover.x, hover.z, found.y);
                        player.teleport(
                            { x: hover.x, y, z: hover.z },
                            { dimension: overworld }
                        );
                        player.sendMessage(
                            `${CHAT_SUCCESS}Teleported to §f${biomeId} §8(${Math.floor(hover.x)} ${Math.floor(y)} ${Math.floor(hover.z)})`
                        );
                    } catch (err) {
                        try {
                            player.sendMessage(CHAT_WARNING + `Surface land failed: ${err}`);
                        } catch { /* ignore */ }
                    }
                    system.runTimeout(() => onDone(), 8);
                },
                () => {
                    try {
                        player.sendMessage(
                            CHAT_WARNING +
                                `Chunk did not load in time. Wait a second, then Refresh — or §f/locate biome ${biomeId}`
                        );
                    } catch { /* ignore */ }
                    onDone();
                }
            );
        } catch (err) {
            try {
                player.sendMessage(CHAT_WARNING + `Teleport failed: ${err}`);
            } catch { /* ignore */ }
            onDone();
        }
    });
}

function mbaTeleportChoices() {
    const out = [];
    for (const id of INFECTED_VANILLA_BIOME_IDS) {
        out.push({ id, button: `§d${id.replace("mb:", "")}${devBtnParen("VAN")}` });
    }
    for (const id of INFECTED_BIOME_COMPONENT_IDS) {
        out.push({ id, button: `§d${id.replace("mb:", "")}${devBtnParen("SNW")}` });
    }
    out.push({ id: "minecraft:forest", button: `§aforest${devBtnParen("vanilla host")}` });
    return out;
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 */
export function openBiomeCheckerHub(player, onBack) {
    if (!INCLUDE_FULL_DEVELOPER_TOOLS) {
        try {
            player.sendMessage(CHAT_WARNING + "Biome checker is only in the dev behavior pack.");
        } catch { /* ignore */ }
        if (typeof onBack === "function") onBack();
        return;
    }
    if (!player?.isValid) return;

    const check = getBiomeCheckAtLocation(player.dimension, player.location);
    const gaps = getCatalogGapsOverworld();
    const listed = getAllReplaceTargets("minecraft:overworld");
    const biomeHudOn = isBiomeCheckerHudPersonalEnabled(player);

    const form = new ActionFormData()
        .title("§2Biome checker")
        .body(
            "§7Compare §fgetBiome §7at your feet with §fminecraft:replace_biomes §7targets in infected biome JSON.\n\n" +
                formatBiomeCheckLines(check) +
                `\n\n§8Replace list: §7${listed.length} overworld ids` +
                `\n§bSafe by design: §7${gaps.intentionalSafe.length}` +
                ` §8· §eReview gaps: §7${gaps.unlisted.length}` +
                ` §8· §cNether/End not in JSON: §f${gaps.otherDimensionInCatalog.length}` +
                `\n§8Biome HUD: §7${biomeHudOn ? "§aON §8(merged action bar)" : "§7OFF"}` +
                "\n§8Regenerate: §7node tools/syncBiomeReplaceRegistry.cjs" +
                "\n§8Locate: §f/locate biome mb:infected_vanilla_forest"
        );

    /** @type {Array<() => void>} */
    const actions = [];
    const addBtn = (label, fn) => {
        form.button(label);
        actions.push(fn);
    };

    addBtn(`§aRefresh${devBtnParen("at feet")}`, () => openBiomeCheckerHub(player, onBack));
    addBtn(biomeHudToggleLabel(biomeHudOn), () => {
        setBiomeCheckerHudPersonalEnabled(!biomeHudOn, player);
        try { saveAllProperties(); } catch { /* ignore */ }
        try {
            player.sendMessage(
                CHAT_SUCCESS + (biomeHudOn ? "Biome checker HUD off." : "Biome checker HUD on — watch the action bar.")
            );
        } catch { /* ignore */ }
        openBiomeCheckerHub(player, onBack);
    });
    addBtn(`§dTeleport to biome${devBtnParen("nearest")}`, () => openBiomeTeleportMenu(player, onBack));
    addBtn(`§bSafe by design${devBtnParen(String(gaps.intentionalSafe.length))}`, () =>
        openBiomeIdListMenu(player, onBack, {
            title: "§bSafe by design",
            intro:
                "§7These overworld biomes are §ointentionally§7 excluded from §freplace_biomes§7 (see docs/design/SAFE_BIOMES.md).\n\n",
            ids: gaps.intentionalSafe,
            logTitle: "Intentional safe overworld"
        })
    );
    addBtn(`§eReview gaps${devBtnParen(String(gaps.unlisted.length))}`, () =>
        openBiomeIdListMenu(player, onBack, {
            title: "§eReview gaps",
            intro:
                "§7In the reference catalog but §not§7 on the replace list and §not§7 marked safe-by-design — add to JSON or the safe list in sync script.\n\n",
            ids: gaps.unlisted,
            logTitle: "Unexpected overworld catalog gaps"
        })
    );
    addBtn(`§cNether/End${devBtnParen(String(gaps.otherDimensionInCatalog.length))}`, () =>
        openBiomeIdListMenu(player, onBack, {
            title: "§cNether / End",
            intro:
                "§7Ids in the dev reference catalog but §not§7 in §fmb_infected_biome_*.json§7 yet. Other dimensions are fine gameplay-wise; add §freplace_biomes§7 groups when you want infection there.\n\n",
            ids: gaps.otherDimensionInCatalog,
            logTitle: "Other dimension catalog (not in pack JSON)"
        })
    );
    addBtn("§fBrowse replace groups", () => openBiomeReplaceGroupsMenu(player, onBack));
    addBtn(`§bSample 5 spots${devBtnParen("NSEW")}`, () => runBiomeSampleGrid(player, onBack));
    addBtn(`§dLog all targets${devBtnParen("Content Log")}`, () => {
        logLines(player, "All replace targets", listed.map((id) => id.replace("minecraft:", "")));
        openBiomeCheckerHub(player, onBack);
    });
    form.button(DEV_BTN_BACK);

    form.show(player).then((res) => {
        if (!res || res.canceled || res.selection === actions.length) {
            if (typeof onBack === "function") onBack();
            return;
        }
        const fn = actions[res.selection];
        if (typeof fn === "function") fn();
        else if (typeof onBack === "function") onBack();
    }).catch(() => {
        if (typeof onBack === "function") onBack();
    });
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 * @param {{ title: string, intro: string, ids: string[], logTitle: string }} opts
 */
function openBiomeIdListMenu(player, onBack, opts) {
    const form = new ActionFormData()
        .title(opts.title)
        .body(opts.intro + formatIdList(opts.ids));
    form.button("§dLog full list");
    form.button(DEV_BTN_BACK);
    form.show(player).then((res) => {
        if (!res || res.canceled || res.selection === 1) return openBiomeCheckerHub(player, onBack);
        logLines(player, opts.logTitle, opts.ids);
        openBiomeIdListMenu(player, onBack, opts);
    }).catch(() => openBiomeCheckerHub(player, onBack));
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 */
function openBiomeReplaceGroupsMenu(player, onBack) {
    const form = new ActionFormData()
        .title("§fReplace groups")
        .body("§7Pick a group to list target biome ids (content log + chat hint).");
    for (const g of REPLACEMENT_GROUPS) {
        form.button(`§f${g.label}`);
    }
    form.button(DEV_BTN_BACK);
    form.show(player).then((res) => {
        if (!res || res.canceled || res.selection === REPLACEMENT_GROUPS.length) {
            return openBiomeCheckerHub(player, onBack);
        }
        const g = REPLACEMENT_GROUPS[res.selection];
        if (g) {
            logLines(
                player,
                g.label,
                g.targets.map((id) => `${id.replace("minecraft:", "")} (${(g.amount * 100).toFixed(0)}%)`)
            );
        }
        openBiomeReplaceGroupsMenu(player, onBack);
    }).catch(() => openBiomeCheckerHub(player, onBack));
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 */
function runBiomeSampleGrid(player, onBack) {
    const dim = player.dimension;
    const loc = player.location;
    const lines = [];
    for (const s of SAMPLE_OFFSETS) {
        const at = { x: loc.x + s.dx, y: loc.y, z: loc.z + s.dz };
        const c = getBiomeCheckAtLocation(dim, at);
        const short = c.biomeId?.replace("minecraft:", "") ?? "?";
        let tag = "§e?";
        if (c.infected) tag = "§dINF";
        else if (c.inReplaceList) tag = "§aLIST";
        else if (isIntentionalSafeOverworld(c.biomeId)) tag = "§bSAFE";
        else tag = "§7OTHER";
        lines.push(`${s.label}: ${tag} §f${short}`);
    }
    try {
        player.sendMessage(`${CHAT_SUCCESS}[Biome checker] Sample grid:\n${lines.join("\n")}`);
    } catch { /* ignore */ }
    logLines(player, "Sample grid", lines);
    openBiomeCheckerHub(player, onBack);
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 */
function openBiomeTeleportMenu(player, onBack) {
    const choices = mbaTeleportChoices();
    const form = new ActionFormData()
        .title("§dTeleport to biome")
        .body(
            "§7Runs §f/locate biome§7 first (chat shows the vanilla result), then TPs you there and §owaits until the chunk is ticking§7 before reading biome / landing on the surface.\n\n" +
                "§8Test forest: §fmb:infected_vanilla_forest\n" +
                "§8Needs overworld — Nether/End searches from 0,80,0. Cheats on for the locate command."
        );
    for (const c of choices) {
        form.button(c.button);
    }
    form.button(`§fMore vanilla${devBtnParen("replace list")}`);
    form.button(DEV_BTN_BACK);

    form.show(player).then((res) => {
        if (!res || res.canceled || res.selection === choices.length + 1) {
            return openBiomeCheckerHub(player, onBack);
        }
        if (res.selection === choices.length) {
            return openBiomeTeleportGroupsMenu(player, onBack);
        }
        const pick = choices[res.selection];
        if (!pick) return openBiomeCheckerHub(player, onBack);
        teleportPlayerToNearestBiome(player, pick.id, () => openBiomeCheckerHub(player, onBack));
    }).catch(() => openBiomeCheckerHub(player, onBack));
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 */
function openBiomeTeleportGroupsMenu(player, onBack) {
    const form = new ActionFormData()
        .title("§fVanilla replace list")
        .body("§7Pick a group, then a biome to teleport to.");
    for (const g of REPLACEMENT_GROUPS) {
        form.button(`§f${g.label}`);
    }
    form.button(DEV_BTN_BACK);
    form.show(player).then((res) => {
        if (!res || res.canceled || res.selection === REPLACEMENT_GROUPS.length) {
            return openBiomeTeleportMenu(player, onBack);
        }
        const g = REPLACEMENT_GROUPS[res.selection];
        if (!g) return openBiomeTeleportMenu(player, onBack);
        return openBiomeTeleportTargetsMenu(player, onBack, g);
    }).catch(() => openBiomeTeleportMenu(player, onBack));
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 * @param {{ label: string, targets: string[] }} group
 */
function openBiomeTeleportTargetsMenu(player, onBack, group) {
    const ids = group.targets || [];
    const form = new ActionFormData()
        .title("§fTeleport")
        .body(`§7${group.label}\n§8Tap a biome.`);
    for (const id of ids) {
        form.button(`§f${id.replace("minecraft:", "")}`);
    }
    form.button(DEV_BTN_BACK);
    form.show(player).then((res) => {
        if (!res || res.canceled || res.selection === ids.length) {
            return openBiomeTeleportGroupsMenu(player, onBack);
        }
        const id = ids[res.selection];
        if (!id) return openBiomeTeleportGroupsMenu(player, onBack);
        teleportPlayerToNearestBiome(player, id, () => openBiomeCheckerHub(player, onBack));
    }).catch(() => openBiomeTeleportGroupsMenu(player, onBack));
}

export { getMissingVanillaOverworldBiomes };
