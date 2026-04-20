/**
 * In-game script diagnostics (Developer Tools only).
 * Runs lightweight read-only checks that only exist inside the Minecraft Script API.
 * Does not replace `npm run check` (JSON / syntax / ESLint on your PC).
 */

import { world, system } from "@minecraft/server";
import { getAddonDifficultyState } from "./mb_dynamicPropertyHandler.js";
import { getInfectionRate, ENTITY_TYPE_CAPS } from "./mb_balance.js";
import { isScriptEnabled, SCRIPT_IDS } from "./mb_scriptToggles.js";
import { refreshSpawnLoadMetrics, getSpawnLoadDebugSnapshot } from "./mb_spawnLoadMetrics.js";
import { getCurrentDay } from "./mb_dayTracker.js";
import { getActiveStormCount } from "./mb_snowStorm.js";
import { SPAWN_CONFIGS } from "./mb_spawnConfigs.js";

/**
 * Every `mb_*.js` under `BP/scripts/` (same order as `npm run test:scripts` / filesystem).
 * `main.js` is the pack entry — do not dynamic-import it (avoid redundant circular load).
 * When you add a new script file, append it here (keep sorted).
 */
const SELF_TEST_MODULE_IMPORTS = [
    "./mb_actionBarHud.js",
    "./mb_balance.js",
    "./mb_bearTelemetry.js",
    "./mb_biomeAmbience.js",
    "./mb_blockLists.js",
    "./mb_buffAI.js",
    "./mb_buildConfig.js",
    "./mb_chatColors.js",
    "./mb_codex.js",
    "./mb_dayTracker.js",
    "./mb_devScriptSelfTest.js",
    "./mb_devSoundCatalog.js",
    "./mb_dimensionAdaptation.js",
    "./mb_dynamicPropertyHandler.js",
    "./mb_flyingAI.js",
    "./mb_infectedAI.js",
    "./mb_infectionAudio.js",
    "./mb_infectionExposureLos.js",
    "./mb_itemFinder.js",
    "./mb_itemRegistry.js",
    "./mb_journalWhatsNew.js",
    "./mb_mainMobConversion.js",
    "./mb_miningAI.js",
    "./mb_miningBlockList.js",
    "./mb_miningConstants.js",
    "./mb_performanceProfile.js",
    "./mb_playerChangelog.js",
    "./mb_propertyMigration.js",
    "./mb_scriptToggles.js",
    "./mb_sharedCache.js",
    "./mb_snowStorm.js",
    "./mb_spawnConfigs.js",
    "./mb_spawnController.js",
    "./mb_spawnEntityIds.js",
    "./mb_spawnLoadMetrics.js",
    "./mb_spawnMobilityCamp.js",
    "./mb_torpedoAI.js",
    "./mb_utilities.js"
];

/**
 * Try `import()` on each pack script module. Catches evaluation / resolution errors that
 * `npm run check` might miss vs in-game engine.
 * @returns {Promise<{ ok: number, fail: number, failures: { spec: string, message: string }[] }>}
 */
async function runAllMbModuleImportChecks() {
    const failures = [];
    let ok = 0;
    for (const spec of SELF_TEST_MODULE_IMPORTS) {
        try {
            await import(spec);
            ok++;
        } catch (e) {
            failures.push({
                spec,
                message: e?.message != null ? String(e.message) : String(e)
            });
        }
    }
    return { ok, fail: failures.length, failures };
}

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {Promise<string>} Multi-line report (with § color codes for ActionForm body)
 */
export async function runInGameScriptSelfTest(player) {
    const lines = [];
    const push = (s) => lines.push(s);

    try {
        push(`§7§oMaple Bear in-game script self-test §r§8(tick §7${system.currentTick}§8)`);
        push(`§7Day §f${getCurrentDay()} §7→ infection rate §f${getInfectionRate(getCurrentDay()).toFixed(4)}`);

        try {
            const diff = getAddonDifficultyState();
            push(`§7Addon difficulty §f${diff?.hitsBase ?? "?"} §7hits base §8(${typeof diff?.hitsBase})`);
        } catch (e) {
            push(`§cAddon difficulty: §f${e?.message || e}`);
        }

        try {
            refreshSpawnLoadMetrics(system.currentTick);
            const snap = getSpawnLoadDebugSnapshot();
            push(
                `§7Spawn load §fbears=${snap.bears} §7itemsOW=§f${snap.itemsOw} §7storms=§f${snap.storms} §7load§f${snap.load01.toFixed(3)} §7int×§f${snap.intervalMult.toFixed(2)} §7blk×§f${snap.blockScale.toFixed(2)}`
            );
        } catch (e) {
            push(`§cSpawn load snapshot: §f${e?.message || e}`);
        }

        try {
            push(`§7Active dust storms §f${getActiveStormCount()}`);
        } catch (e) {
            push(`§cStorm count: §f${e?.message || e}`);
        }

        const ids = Object.values(SCRIPT_IDS);
        const off = ids.filter((id) => !isScriptEnabled(id));
        push(`§7Script toggles OFF §8(${off.length})§7: §f${off.length ? off.join(", ") : "none"}`);

        push(`§7§oSPAWN_CONFIGS §7entries: §f${SPAWN_CONFIGS.length} §7· §oENTITY_TYPE_CAPS §7families: §f${Object.keys(ENTITY_TYPE_CAPS).length}`);

        for (const id of ["overworld", "nether", "the_end"]) {
            try {
                const d = world.getDimension(id);
                push(`§7Dimension §f${id}§7: ${d ? "§aok" : "§cmissing"}`);
            } catch (e) {
                push(`§7Dimension §f${id}§7: §c${e?.message || e}`);
            }
        }

        try {
            const loc = player.location;
            const dim = player.dimension;
            const b = dim.getBlock({
                x: Math.floor(loc.x),
                y: Math.floor(loc.y) - 1,
                z: Math.floor(loc.z)
            });
            push(`§7Block below feet: §f${b?.typeId ?? "?"}`);
        } catch (e) {
            push(`§cBlock below feet: §f${e?.message || e}`);
        }

        try {
            const pl = world.getPlayers();
            push(`§7Players in world: §f${pl.length}`);
        } catch (e) {
            push(`§cgetPlayers: §f${e?.message || e}`);
        }

        push(`§7§oBP script modules §8(dynamic import, §7${SELF_TEST_MODULE_IMPORTS.length}§8 files, §7main.js§8=entry)`);
        try {
            const modRes = await runAllMbModuleImportChecks();
            const total = SELF_TEST_MODULE_IMPORTS.length;
            if (modRes.fail === 0) {
                push(`§aAll §f${total} §amodules import OK §8(no errors)`);
            } else {
                push(`§c§l${modRes.fail} §r§cimport failure(s) §7/ §f${total}`);
                for (const f of modRes.failures) {
                    const short = f.spec.replace(/^\.\//, "");
                    const msg = f.message.length > 120 ? f.message.slice(0, 117) + "..." : f.message;
                    push(`§c${short}§8: §f${msg}`);
                }
            }
        } catch (e) {
            push(`§cModule import sweep: §f${e?.message || e}`);
        }

        push(`§a§lChecks complete §r§8(read-only; see PC for npm run check)`);
    } catch (e) {
        push(`§c§lSelf-test error: §r§f${e?.message || e}`);
    }

    return lines.join("\n");
}

/**
 * Plain text for Content Log / console (strip § codes).
 * @param {string} formatted
 */
export function stripFormattingForLog(formatted) {
    return String(formatted).replace(/§./g, "");
}
