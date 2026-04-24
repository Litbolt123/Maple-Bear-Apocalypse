/**
 * In-game script diagnostics (Developer Tools only).
 * Runs lightweight read-only checks that only exist inside the Minecraft Script API.
 * Does not replace `npm run check` (JSON / syntax / ESLint on your PC).
 */

import { world, system } from "@minecraft/server";
import { getAddonDifficultyState } from "./mb_dynamicPropertyHandler.js";
import { getInfectionRate, ENTITY_TYPE_CAPS } from "./mb_balance.js";
import { isScriptEnabled, SCRIPT_IDS, isDustStormsEnabled } from "./mb_scriptToggles.js";
import { refreshSpawnLoadMetrics, getSpawnLoadDebugSnapshot } from "./mb_spawnLoadMetrics.js";
import { getCurrentDay } from "./mb_dayTracker.js";
import { getActiveStormCount, summonStorm, endStorm } from "./mb_snowStorm.js";
import { SPAWN_CONFIGS } from "./mb_spawnConfigs.js";
import { getBearSnapshot, invalidateBearSnapshots, ALL_MB_BEAR_TYPES } from "./mb_bearSnapshot.js";
import { isEntityValid } from "./mb_sharedCache.js";

/**
 * Every `mb_*.js` under `BP/scripts/` (same order as `npm run test:scripts` / filesystem).
 * `main.js` is the pack entry ��� do not dynamic-import it (avoid redundant circular load).
 * When you add a new script file, append it here (keep sorted).
 */
const SELF_TEST_MODULE_IMPORTS = [
    "./mb_actionBarHud.js",
    "./mb_balance.js",
    "./mb_bearPopulationCull.js",
    "./mb_bearSnapshot.js",
    "./mb_bearTelemetry.js",
    "./mb_biomeAmbience.js",
    "./mb_blockCache.js",
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
        push(`§7Day §f${getCurrentDay()} §7��� infection rate §f${getInfectionRate(getCurrentDay()).toFixed(4)}`);

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
                `§7Spawn load §fbears=${snap.bears} §7itemsOW=§f${snap.itemsOw} §7storms=§f${snap.storms} §7load§f${snap.load01.toFixed(3)} §7int��§f${snap.intervalMult.toFixed(2)} §7blk��§f${snap.blockScale.toFixed(2)}`
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

        // Live bear snapshot: proves per-type `getEntities` can see mobs the AIs use (unrelated to ES module import).
        try {
            invalidateBearSnapshots();
            const snap = getBearSnapshot(player.dimension);
            const t01 = (snap.byType.get("mb:torpedo_mb") || []).length;
            const t20 = (snap.byType.get("mb:torpedo_mb_day20") || []).length;
            const m0 = (snap.byType.get("mb:mining_mb") || []).length;
            const m20 = (snap.byType.get("mb:mining_mb_day20") || []).length;
            push(
                `§7Bear snapshot §8(in §f${player.dimension.id}§8)§7: torpedo §f${t01 + t20} §7· mining §f${m0 + m20} §7· allMB §f${snap.all.length}`
            );
        } catch (e) {
            push(`§cBear snapshot: §f${e?.message || e}`);
        }

        push(
            "§6§lNote: §r§7Quick = read-only. For §6one of each bear §7+ §6dust storm §7see §6Full self-test §7in the same menu. PC: §7npm run check"
        );

        push(`§7§oBP script modules §8(dynamic import, §7${SELF_TEST_MODULE_IMPORTS.length}§8 files, §7main.js§8=entry)`);
        try {
            const modRes = await runAllMbModuleImportChecks();
            const total = SELF_TEST_MODULE_IMPORTS.length;
            if (modRes.fail === 0) {
                push(`§aAll §f${total} §a§omodules import §7OK §8(§7ES module / syntax only§8; §6not §7all-good gameplay§8)`);
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

        push(`§7§lBasic in-game checks complete §r§8(read-only · see PC: §7npm run check§8)`);
    } catch (e) {
        push(`§c§lSelf-test error: §r§f${e?.message || e}`);
    }

    return lines.join("\n");
}

/**
 * @param {number} n game ticks
 * @returns {Promise<void>}
 */
function waitTicks(n) {
    return new Promise((resolve) => {
        try {
            system.runTimeout(() => resolve(), n);
        } catch {
            resolve();
        }
    });
}

/**
 * Spawns one of each `ALL_MB_BEAR_TYPES` near the player, waits for AI ticks, removes mobs, then
 * summons a minor dust storm and ends it (overworld; dust must be on).
 * @param {import("@minecraft/server").Player} player
 * @returns {Promise<string>}
 */
export async function runInGameScriptFullSelfTest(player) {
    const a = await runInGameScriptSelfTest(player);
    const b = await runSpawnAndStormHarness(player);
    return `${a}\n\n${b}`;
}

/**
 * @param {import("@minecraft/server").Player} player
 */
async function runSpawnAndStormHarness(player) {
    const lines = [];
    const push = (s) => lines.push(s);
    const spawned = /** @type {import("@minecraft/server").Entity[]} */ ([]);

    push("§5§l--- Full harness: spawns + storm ---");
    push("§7Stand in open air with room above; mobs despawn in a line ahead of you.");

    try {
        if (!isEntityValid(player) || !player?.dimension) {
            push("§cInvalid player or dimension.");
            return lines.join("\n");
        }
        const dim = player.dimension;
        const ploc = player.location;
        const baseX = ploc.x;
        const baseZ = ploc.z;
        const baseY = Math.floor(ploc.y) + 1; // at head level ��� large bears need 3+ blocks; dev assumes open build

        const perRow = 5;
        const step = 2.5;
        const forward = 5;
        const sideStart = -2 * step;

        let ok = 0;
        for (let i = 0; i < ALL_MB_BEAR_TYPES.length; i++) {
            const typeId = ALL_MB_BEAR_TYPES[i];
            const col = i % perRow;
            const row = Math.floor(i / perRow);
            const x = baseX + forward + col * step;
            const z = baseZ + sideStart + row * step;
            const loc = { x, y: baseY, z };
            try {
                const ent = dim.spawnEntity(typeId, loc);
                if (isEntityValid(ent)) {
                    spawned.push(ent);
                    ok++;
                } else {
                    push(`§6${typeId} §7��� no entity returned`);
                }
            } catch (e) {
                push(`§c${typeId} §7��� §c${e?.message != null ? String(e.message) : String(e)}`);
            }
            // Let each AI tick the next tick; catches immediate script errors in loops.
            await waitTicks(1);
        }
        push(`§7Spawns: §a${ok} ok §7/ §f${ALL_MB_BEAR_TYPES.length} types §7· §c${ALL_MB_BEAR_TYPES.length - ok} fails §8(seen as lines above)`);

        await waitTicks(8);
        for (const ent of spawned) {
            try {
                if (isEntityValid(ent) && typeof ent.remove === "function") {
                    ent.remove();
                }
            } catch (e) {
                push(`§cCleanup remove: §f${e?.message || e}`);
            }
        }
        push("§7Test mobs: §aremoved (cleanup)");
    } catch (e) {
        push(`§cSpawn harness: §f${e?.message || e}`);
    }

    await waitTicks(2);

    try {
        if (!isDustStormsEnabled()) {
            push("§6Dust storm: skipped §8(world setting mb_dust_storms off; enable in book / storm hub)");
        } else if (!isScriptEnabled(SCRIPT_IDS.snowStorm)) {
            push("§6Dust storm: §7skipped §8(script snow_storm toggle OFF)");
        } else {
            const inOw =
                String(player?.dimension?.id || "").includes("overworld") || player?.dimension?.id === "minecraft:overworld";
            if (!inOw) {
                push("§6Dust storm: skipped §8(stand in §7Overworld §8��� storms only run there in this test)");
            } else {
                const n0 = getActiveStormCount();
                const summoned = summonStorm("minor", player, 50);
                await waitTicks(4);
                const n1 = getActiveStormCount();
                endStorm(true);
                await waitTicks(1);
                const n2 = getActiveStormCount();
                push(
                    `§7Dust storm: summon §8(${summoned ? "ok" : "false"})§7 · before §f${n0} §7��� after §f${n1} §7· after end §f${n2} §7(expected end 0)`
                );
            }
        }
    } catch (e) {
        push(`§cStorm harness: §f${e?.message || e}`);
    }

    push("§5§l--- Full harness end ---");
    return lines.join("\n");
}

/**
 * Plain text for Content Log / console (strip § codes).
 * @param {string} formatted
 */
export function stripFormattingForLog(formatted) {
    return String(formatted).replace(/§./g, "");
}
