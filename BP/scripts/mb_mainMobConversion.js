// Mob → Maple Bear / infected livestock conversion (bear kills, storm kills, pressure scaling)

import { system, world } from "@minecraft/server";
import { getCurrentDay } from "./mb_dayTracker.js";
import {
    MB_CONVERSION_NEARBY_PRESSURE_START,
    MB_CONVERSION_NEARBY_PRESSURE_END,
    MB_CONVERSION_NEARBY_MULT_MIN,
    MB_CONVERSION_WORLD_PRESSURE_START,
    MB_CONVERSION_WORLD_PRESSURE_END,
    MB_CONVERSION_WORLD_MULT_MIN,
    getInfectionRate
} from "./mb_balance.js";
import { isBuffBearSpawnBlocked, isBuffBearTypeId as isBuffBearTypeIdCap } from "./mb_buffCap.js";
import { refreshSpawnLoadMetrics, getSpawnLoadDebugSnapshot } from "./mb_spawnLoadMetrics.js";
import { shouldSleepDayZeroWorldWork } from "./mb_dayZeroPerfBisect.js";
import { queryEntitiesSpread } from "./mb_workSpread.js";
import {
    MAPLE_BEAR_ID,
    MAPLE_BEAR_DAY4_ID,
    MAPLE_BEAR_DAY8_ID,
    MAPLE_BEAR_DAY13_ID,
    MAPLE_BEAR_DAY20_ID,
    INFECTED_BEAR_ID,
    INFECTED_BEAR_DAY8_ID,
    INFECTED_BEAR_DAY13_ID,
    INFECTED_BEAR_DAY20_ID,
    BUFF_BEAR_ID,
    BUFF_BEAR_DAY13_ID,
    BUFF_BEAR_DAY20_ID,
    FLYING_BEAR_ID,
    FLYING_BEAR_DAY15_ID,
    FLYING_BEAR_DAY20_ID,
    MINING_BEAR_ID,
    MINING_BEAR_DAY20_ID,
    TORPEDO_BEAR_ID,
    TORPEDO_BEAR_DAY20_ID,
    INFECTED_PIG_ID,
    INFECTED_COW_ID
} from "./mb_spawnEntityIds.js";

const SNOW_LAYER_BLOCK = "minecraft:snow_layer";

/** Buff AI skips death burst + stuck fuse until this tag is cleared (first AI tick). */
export const BUFF_CONVERSION_SPAWN_TAG = "mb_conversion_spawn";

const BUFF_BEAR_TYPE_IDS = new Set([BUFF_BEAR_ID, BUFF_BEAR_DAY13_ID, BUFF_BEAR_DAY20_ID]);

/** Killers that use handleMobConversion (storm conversion must not duplicate these). */
const MAPLE_BEAR_KILLER_TYPE_IDS = new Set([
    MAPLE_BEAR_ID, MAPLE_BEAR_DAY4_ID, MAPLE_BEAR_DAY8_ID, MAPLE_BEAR_DAY13_ID, MAPLE_BEAR_DAY20_ID,
    INFECTED_BEAR_ID, INFECTED_BEAR_DAY8_ID, INFECTED_BEAR_DAY13_ID, INFECTED_BEAR_DAY20_ID,
    BUFF_BEAR_ID, BUFF_BEAR_DAY13_ID, BUFF_BEAR_DAY20_ID,
    FLYING_BEAR_ID, FLYING_BEAR_DAY15_ID, FLYING_BEAR_DAY20_ID,
    MINING_BEAR_ID, MINING_BEAR_DAY20_ID,
    TORPEDO_BEAR_ID, TORPEDO_BEAR_DAY20_ID,
    INFECTED_PIG_ID, INFECTED_COW_ID
]);

/** @param {string | undefined} typeId */
export function isMapleBearKillerType(typeId) {
    return !!typeId && MAPLE_BEAR_KILLER_TYPE_IDS.has(typeId);
}

/** Death events often omit damagingEntity; track recent bear hits (storm kills in particular). */
const LAST_MB_KILLER_BY_VICTIM = new Map();
const LAST_MB_KILLER_TTL_TICKS = 200;

function recordMapleBearDamageToVictim(victim, killer) {
    if (!victim?.id || !killer?.id || !isMapleBearKillerType(killer.typeId)) return;
    LAST_MB_KILLER_BY_VICTIM.set(victim.id, { killerId: killer.id, tick: system.currentTick });
}

function clearMapleBearDamageRecord(victimId) {
    if (victimId) LAST_MB_KILLER_BY_VICTIM.delete(victimId);
}

/** Call before resolveMapleBearKillerForConversion (reads map without clearing). */
export function wasMapleBearInvolvedInKill(victim, damageSourceEntity) {
    if (damageSourceEntity?.typeId && isMapleBearKillerType(damageSourceEntity.typeId)) {
        return true;
    }
    if (!victim?.id) return false;
    const rec = LAST_MB_KILLER_BY_VICTIM.get(victim.id);
    if (!rec) return false;
    return system.currentTick - rec.tick <= LAST_MB_KILLER_TTL_TICKS;
}

/**
 * @returns {import("@minecraft/server").Entity | null}
 */
export function resolveMapleBearKillerForConversion(victim, damageSourceEntity) {
    if (!victim?.id) return null;

    if (damageSourceEntity?.isValid && isMapleBearKillerType(damageSourceEntity.typeId)) {
        clearMapleBearDamageRecord(victim.id);
        return damageSourceEntity;
    }

    const rec = LAST_MB_KILLER_BY_VICTIM.get(victim.id);
    clearMapleBearDamageRecord(victim.id);
    if (!rec || system.currentTick - rec.tick > LAST_MB_KILLER_TTL_TICKS) {
        return null;
    }

    try {
        const killer = world.getEntity(rec.killerId);
        if (killer?.isValid && isMapleBearKillerType(killer.typeId)) {
            return killer;
        }
    } catch {
        /* ignore */
    }
    return null;
}

let mobConversionHurtTrackingStarted = false;
function ensureMobConversionHurtTracking() {
    if (mobConversionHurtTrackingStarted) return;
    mobConversionHurtTrackingStarted = true;
    world.afterEvents.entityHurt.subscribe((event) => {
        try {
            if (shouldSleepDayZeroWorldWork("entity_hurt")) return;
            recordMapleBearDamageToVictim(event.hurtEntity, event.damageSource?.damagingEntity);
        } catch {
            /* ignore */
        }
    });
}
ensureMobConversionHurtTracking();

function isBuffBearTypeId(typeId) {
    return isBuffBearTypeIdCap(typeId);
}

function infectedBearTypeForDay(currentDay) {
    if (currentDay >= 20) return INFECTED_BEAR_DAY20_ID;
    if (currentDay >= 13) return INFECTED_BEAR_DAY13_ID;
    if (currentDay >= 8) return INFECTED_BEAR_DAY8_ID;
    return INFECTED_BEAR_ID;
}

/** Conversions reserved this tick (not yet visible to getEntities). Per dimension. */
const pendingBuffConversionByDimension = new Map();

function normalizeDimensionId(id) {
    if (!id) return "";
    return id.replace(/^minecraft:/, "");
}

function reserveBuffConversionSlot(dimension) {
    const dimKey = normalizeDimensionId(dimension?.id);
    pendingBuffConversionByDimension.set(dimKey, (pendingBuffConversionByDimension.get(dimKey) ?? 0) + 1);
}

function releaseBuffConversionSlot(dimension) {
    const dimKey = normalizeDimensionId(dimension?.id);
    const pending = pendingBuffConversionByDimension.get(dimKey) ?? 0;
    if (pending <= 1) pendingBuffConversionByDimension.delete(dimKey);
    else pendingBuffConversionByDimension.set(dimKey, pending - 1);
}

/**
 * Single gate for every conversion spawn: never buff if at/above the spawn-controller buff cap.
 * @returns {string} typeId to spawn (buff or infected fallback)
 */
function clampSpawnTypeForBuffCap(dimension, location, proposedTypeId) {
    if (!isBuffBearTypeId(proposedTypeId)) return proposedTypeId;

    const currentDay = getCurrentDay();
    const dimKey = normalizeDimensionId(dimension?.id);
    const pending = pendingBuffConversionByDimension.get(dimKey) ?? 0;
    if (
        isBuffBearSpawnBlocked({
            dimension,
            nearCenter: location,
            extraPending: pending
        })
    ) {
        return infectedBearTypeForDay(currentDay);
    }

    reserveBuffConversionSlot(dimension);
    return proposedTypeId;
}

function placeConversionSnowAndVfx(dimension, location) {
    dimension.spawnParticle("mb:white_dust_particle", location);
    try {
        const spawnY = Math.floor(location.y - 1);
        const snowLoc = { x: Math.floor(location.x), y: spawnY, z: Math.floor(location.z) };
        const snowBlock = dimension.getBlock(snowLoc);
        const aboveBlock = dimension.getBlock({ x: snowLoc.x, y: spawnY + 1, z: snowLoc.z });
        const belowType = snowBlock?.typeId;
        if (belowType === "minecraft:snow_layer") {
            try { snowBlock.setType("mb:snow_layer"); } catch { snowBlock.setType(SNOW_LAYER_BLOCK); }
        } else if (belowType !== "mb:snow_layer" && snowBlock && aboveBlock &&
            snowBlock.isAir !== undefined && !snowBlock.isAir &&
            snowBlock.isLiquid !== undefined && !snowBlock.isLiquid &&
            aboveBlock.isAir !== undefined && aboveBlock.isAir) {
            try { aboveBlock.setType("mb:snow_layer"); } catch { aboveBlock.setType(SNOW_LAYER_BLOCK); }
        }
    } catch {
        /* ignore snow */
    }
}

/**
 * All mob→bear conversion spawns go through here so the buff cap cannot be bypassed.
 * @returns {import("@minecraft/server").Entity | null}
 */
function spawnConversionEntity(dimension, location, targetEntityId) {
    if (!dimension || !location) return null;

    const spawnTypeId = clampSpawnTypeForBuffCap(dimension, location, targetEntityId);
    const reservedBuff = isBuffBearTypeId(spawnTypeId);

    try {
        const newEntity = dimension.spawnEntity(spawnTypeId, location);
        if (newEntity?.isValid && isBuffBearTypeId(spawnTypeId)) {
            try {
                newEntity.addTag(BUFF_CONVERSION_SPAWN_TAG);
            } catch {
                /* ignore */
            }
        }
        placeConversionSnowAndVfx(dimension, location);
        if (reservedBuff) {
            // Keep reservation through this tick so batched storm/bear conversions see prior spawns.
            system.run(() => releaseBuffConversionSlot(dimension));
        }
        return newEntity;
    } catch {
        if (reservedBuff) releaseBuffConversionSlot(dimension);
        return null;
    }
}

function convertEntity(deadEntity, killer, targetEntityId, conversionName) {
    if (!deadEntity || !deadEntity.isValid) {
        return null;
    }
    if (killer && !killer.isValid) {
        return null;
    }

    const location = deadEntity.location;
    const dimension = deadEntity.dimension;

    try {
        dimension.getBlock({
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z)
        });
    } catch {
        return null;
    }

    return spawnConversionEntity(dimension, location, targetEntityId);
}

function convertEntityAtLocation(deadEntityOrLoc, killer, targetEntityId, conversionName) {
    const location = deadEntityOrLoc?.location ?? deadEntityOrLoc;
    const dimension = deadEntityOrLoc?.dimension ?? deadEntityOrLoc?.dimension;
    if (!location || !dimension) return null;
    if (killer && !killer.isValid) return null;

    try {
        dimension.getBlock({ x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) });
    } catch {
        return null;
    }

    return spawnConversionEntity(dimension, location, targetEntityId);
}

function convertPigToInfectedPig(deadPig, killer) {
    try {
        convertEntity(deadPig, killer, INFECTED_PIG_ID, "PIG CONVERSION");
    } catch {
        // ignore
    }
}

function convertCowToInfectedCow(deadCow, killer) {
    try {
        convertEntity(deadCow, killer, INFECTED_COW_ID, "COW CONVERSION");
    } catch {
        // ignore
    }
}

function convertMobToMapleBear(deadMob, killer) {
    try {
        const mobType = deadMob.typeId;

        if (mobType === "minecraft:pig") {
            return;
        }
        if (mobType === "minecraft:cow") {
            return;
        }

        const killerType = killer.typeId;
        const currentDay = getCurrentDay();

        let newBearType;

        const isBuffKiller = killerType === BUFF_BEAR_ID || killerType === BUFF_BEAR_DAY13_ID || killerType === BUFF_BEAR_DAY20_ID;
        const isTinyMapleKiller = killerType === MAPLE_BEAR_ID || killerType === MAPLE_BEAR_DAY4_ID ||
            killerType === MAPLE_BEAR_DAY8_ID || killerType === MAPLE_BEAR_DAY13_ID || killerType === MAPLE_BEAR_DAY20_ID;

        if (isBuffKiller) {
            ({ newBearType } = resolveSizedMobKillConversion(mobType, currentDay));
        } else if (isTinyMapleKiller && currentDay < 4) {
            newBearType = MAPLE_BEAR_ID;
        } else if (isTinyMapleKiller) {
            ({ newBearType } = resolveSizedMobKillConversion(mobType, currentDay));
        } else {
            ({ newBearType } = resolveSizedMobKillConversion(mobType, currentDay));
        }

        convertEntity(deadMob, killer, newBearType, "MOB CONVERSION");
    } catch {
        // ignore
    }
}

/**
 * Victim size + world day → converted bear (tiny / infected / buff tier).
 * Used for buff kills and other Maple Bear mob conversions (day 4+).
 * @returns {{ newBearType: string, bearSize: string }}
 */
function resolveSizedMobKillConversion(mobType, currentDay) {
    const mobSize = getMobSize(mobType);

    if (currentDay < 4) {
        if (mobSize === "tiny") return { newBearType: MAPLE_BEAR_ID, bearSize: "tiny" };
        return { newBearType: INFECTED_BEAR_ID, bearSize: "normal" };
    }
    if (currentDay < 8) {
        if (mobSize === "tiny") return { newBearType: MAPLE_BEAR_DAY4_ID, bearSize: "tiny" };
        return { newBearType: INFECTED_BEAR_ID, bearSize: "normal" };
    }
    if (currentDay < 13) {
        if (mobSize === "tiny") return { newBearType: MAPLE_BEAR_DAY8_ID, bearSize: "tiny" };
        if (mobSize === "large") return { newBearType: BUFF_BEAR_ID, bearSize: "buff" };
        return { newBearType: INFECTED_BEAR_DAY8_ID, bearSize: "normal" };
    }
    if (currentDay < 20) {
        if (mobSize === "tiny") return { newBearType: MAPLE_BEAR_DAY13_ID, bearSize: "tiny" };
        if (mobSize === "large") return { newBearType: BUFF_BEAR_DAY13_ID, bearSize: "buff" };
        return { newBearType: INFECTED_BEAR_DAY13_ID, bearSize: "normal" };
    }
    if (mobSize === "tiny") return { newBearType: MAPLE_BEAR_DAY20_ID, bearSize: "tiny" };
    if (mobSize === "large") return { newBearType: BUFF_BEAR_DAY20_ID, bearSize: "buff" };
    return { newBearType: INFECTED_BEAR_DAY20_ID, bearSize: "normal" };
}

function getMobSize(mobType) {
    const tinyMobs = [
        "minecraft:bat", "minecraft:chicken", "minecraft:parrot", "minecraft:rabbit",
        "minecraft:silverfish", "minecraft:endermite", "minecraft:bee", "minecraft:cod",
        "minecraft:salmon", "minecraft:tropical_fish", "minecraft:pufferfish", "minecraft:tadpole",
        "minecraft:axolotl", "minecraft:armadillo", "minecraft:fox", "minecraft:cat", "minecraft:ocelot",
        "minecraft:allay", "minecraft:frog", "minecraft:squid"
    ];

    const largeMobs = [
        "minecraft:warden", "minecraft:sniffer", "minecraft:ravager", "minecraft:iron_golem",
        "minecraft:elder_guardian", "minecraft:ender_dragon", "minecraft:wither", "minecraft:ghast",
        "minecraft:giant"
    ];

    const normalMobs = [
        "minecraft:horse", "minecraft:cow", "minecraft:mooshroom", "minecraft:llama",
        "minecraft:donkey", "minecraft:mule", "minecraft:sheep",
        "minecraft:goat", "minecraft:zombie", "minecraft:skeleton", "minecraft:creeper",
        "minecraft:spider", "minecraft:cave_spider", "minecraft:zombie_villager", "minecraft:husk",
        "minecraft:stray", "minecraft:drowned", "minecraft:witch", "minecraft:pillager",
        "minecraft:vindicator", "minecraft:evoker", "minecraft:vex", "minecraft:zombified_piglin",
        "minecraft:piglin", "minecraft:piglin_brute", "minecraft:hoglin", "minecraft:zoglin",
        "minecraft:blaze", "minecraft:magma_cube", "minecraft:slime", "minecraft:phantom",
        "minecraft:enderman", "minecraft:villager", "minecraft:villager_v2", "minecraft:wandering_trader",
        "minecraft:zombie_pigman", "minecraft:zombie_horse", "minecraft:skeleton_horse","minecraft:glow_squid", , "minecraft:turtle",
        "minecraft:strider", "minecraft:guardian", "minecraft:wolf", "minecraft:panda", "minecraft:polar_bear", "minecraft:shulker",
        "minecraft:snow_golem"
    ];

    if (tinyMobs.includes(mobType)) {
        return "tiny";
    } else if (largeMobs.includes(mobType)) {
        return "large";
    } else if (mobType === "minecraft:pig") {
        return "pig";
    } else if (normalMobs.includes(mobType)) {
        return "normal";
    } else {
        return "normal";
    }
}

const MB_TYPE_PREFIXES_FOR_CONVERSION = ["mb:mb_day00", "mb:infected", "mb:buff_mb", "mb:flying_mb", "mb:mining_mb", "mb:torpedo_mb"];

function countNearbyAddonBears(dimension, location, maxDistance = 64) {
    let total = 0;
    let buff = 0;
    try {
        const nearbyEntities = queryEntitiesSpread(dimension, "mobConvert", location, maxDistance, {
            families: ["maple_bear", "infected"]
        });
        for (const nearby of nearbyEntities) {
            const typeId = nearby.typeId;
            if (!MB_TYPE_PREFIXES_FOR_CONVERSION.some((prefix) => typeId.startsWith(prefix))) continue;
            total++;
            if (typeId === BUFF_BEAR_ID || typeId === BUFF_BEAR_DAY13_ID || typeId === BUFF_BEAR_DAY20_ID) {
                buff++;
            }
        }
    } catch { /* ignore */ }
    return { total, buff };
}

function rampMultiplierFromCount(count, start, end, multMin) {
    if (count <= start) return 1;
    if (count >= end) return multMin;
    const t = (count - start) / (end - start);
    return multMin + (1 - multMin) * (1 - t);
}

function getConversionWorldBearPressureMultiplier() {
    try {
        refreshSpawnLoadMetrics(system.currentTick);
        const n = Math.max(0, getSpawnLoadDebugSnapshot().bears | 0);
        return rampMultiplierFromCount(n, MB_CONVERSION_WORLD_PRESSURE_START, MB_CONVERSION_WORLD_PRESSURE_END, MB_CONVERSION_WORLD_MULT_MIN);
    } catch {
        return 1;
    }
}

function getConversionNearbyPressureMultiplier(nearbyTotal) {
    return rampMultiplierFromCount(nearbyTotal, MB_CONVERSION_NEARBY_PRESSURE_START, MB_CONVERSION_NEARBY_PRESSURE_END, MB_CONVERSION_NEARBY_MULT_MIN);
}

function wouldSpawnBuffBearFromMobKill(mobType, killerType, currentDay) {
    const mobSize = getMobSize(mobType);
    if (mobSize === "tiny" || mobSize === "pig") return false;
    const buffKillers = [BUFF_BEAR_ID, BUFF_BEAR_DAY13_ID, BUFF_BEAR_DAY20_ID];
    if (buffKillers.includes(killerType)) return false;
    const tinyKillers = [MAPLE_BEAR_ID, MAPLE_BEAR_DAY4_ID, MAPLE_BEAR_DAY8_ID, MAPLE_BEAR_DAY13_ID, MAPLE_BEAR_DAY20_ID];
    if (tinyKillers.includes(killerType)) {
        return mobSize === "large" && currentDay >= 8;
    }
    return mobSize === "large" && currentDay >= 8;
}

function wouldSpawnBuffBearFromStorm(mobType, currentDay) {
    return getMobSize(mobType) === "large" && currentDay >= 8;
}

function convertMobToMapleBearFromStormAtLocation(location, dimension, mobType) {
    try {
        if (mobType === "minecraft:pig" || mobType === "minecraft:cow") return null;

        const currentDay = getCurrentDay();
        const mobSize = getMobSize(mobType);
        let newBearType;

        if (mobSize === "tiny") {
            if (currentDay >= 20) newBearType = MAPLE_BEAR_DAY20_ID;
            else if (currentDay >= 13) newBearType = MAPLE_BEAR_DAY13_ID;
            else if (currentDay >= 8) newBearType = MAPLE_BEAR_DAY8_ID;
            else if (currentDay >= 4) newBearType = MAPLE_BEAR_DAY4_ID;
            else newBearType = MAPLE_BEAR_ID;
        } else if (mobSize === "large") {
            if (currentDay >= 20) newBearType = BUFF_BEAR_DAY20_ID;
            else if (currentDay >= 13) newBearType = BUFF_BEAR_DAY13_ID;
            else if (currentDay >= 8) newBearType = BUFF_BEAR_ID;
            else newBearType = INFECTED_BEAR_ID;
        } else {
            if (currentDay >= 20) newBearType = INFECTED_BEAR_DAY20_ID;
            else if (currentDay >= 13) newBearType = INFECTED_BEAR_DAY13_ID;
            else if (currentDay >= 8) newBearType = INFECTED_BEAR_DAY8_ID;
            else newBearType = INFECTED_BEAR_ID;
        }

        const spawned = spawnConversionEntity(dimension, location, newBearType);
        return { entity: spawned, typeId: spawned?.typeId ?? newBearType };
    } catch (err) {
        console.warn("[STORM CONVERSION] Mob conversion error:", err);
        return null;
    }
}

export function handleStormMobConversion(entity) {
    if (!entity || !entity.isValid) return;

    const entityType = entity.typeId;

    if (entityType === "minecraft:item" || entityType === "minecraft:xp_orb" || entityType === "minecraft:arrow" ||
        entityType === "minecraft:fireball" || entityType === "minecraft:small_fireball" || entityType === "minecraft:firework_rocket") {
        return;
    }

    const currentDay = getCurrentDay();
    const conversionRate = getInfectionRate(currentDay);

    const allMapleBearTypes = [
        MAPLE_BEAR_ID, MAPLE_BEAR_DAY4_ID, MAPLE_BEAR_DAY8_ID, MAPLE_BEAR_DAY13_ID, MAPLE_BEAR_DAY20_ID,
        INFECTED_BEAR_ID, INFECTED_BEAR_DAY8_ID, INFECTED_BEAR_DAY13_ID, INFECTED_BEAR_DAY20_ID,
        BUFF_BEAR_ID, BUFF_BEAR_DAY13_ID, BUFF_BEAR_DAY20_ID,
        FLYING_BEAR_ID, FLYING_BEAR_DAY15_ID, FLYING_BEAR_DAY20_ID,
        MINING_BEAR_ID, MINING_BEAR_DAY20_ID,
        TORPEDO_BEAR_ID, TORPEDO_BEAR_DAY20_ID
    ];
    if (allMapleBearTypes.includes(entityType) || entityType === INFECTED_PIG_ID || entityType === INFECTED_COW_ID) {
        return;
    }

    let totalBearCount = 0;
    try {
        totalBearCount = countNearbyAddonBears(entity.dimension, entity.location, 64).total;
    } catch { /* ignore */ }

    const nearbyMult = getConversionNearbyPressureMultiplier(totalBearCount);
    const worldMult = getConversionWorldBearPressureMultiplier();
    const pressureMult = Math.max(0, Math.min(1, nearbyMult * worldMult));
    const buffStorm = wouldSpawnBuffBearFromStorm(entityType, currentDay);
    const effectiveRate = buffStorm ? conversionRate : Math.min(1, conversionRate * pressureMult);

    if (Math.random() >= effectiveRate) return;

    const loc = entity.location;
    const dim = entity.dimension;
    const entType = entityType;

    system.run(() => {
        try {
            if (entType === "minecraft:pig") {
                const r = convertEntityAtLocation({ location: loc, dimension: dim }, null, INFECTED_PIG_ID, "STORM PIG CONVERSION");
                if (r) console.warn(`[SNOW STORM] Conversion: pig -> infected_pig at (${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)})`);
            } else if (entType === "minecraft:cow") {
                const r = convertEntityAtLocation({ location: loc, dimension: dim }, null, INFECTED_COW_ID, "STORM COW CONVERSION");
                if (r) console.warn(`[SNOW STORM] Conversion: cow -> infected_cow at (${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)})`);
            } else {
                const r = convertMobToMapleBearFromStormAtLocation(loc, dim, entType);
                if (r?.entity) {
                    console.warn(`[SNOW STORM] Conversion: ${entType} -> ${r.typeId} at (${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)})`);
                }
            }
        } catch (err) {
            console.warn("[STORM CONVERSION] Error:", err);
        }
    });
}

export function handleMobConversion(entity, killer) {
    if (!entity || !entity.isValid || !killer || !killer.isValid) {
        return;
    }

    const killerType = killer.typeId;
    const entityType = entity.typeId;

    if (entityType === "minecraft:item" || entityType === "minecraft:xp_orb" || entityType === "minecraft:arrow" ||
        entityType === "minecraft:fireball" || entityType === "minecraft:small_fireball" || entityType === "minecraft:firework_rocket") {
        return;
    }

    const currentDay = getCurrentDay();
    const conversionRate = getInfectionRate(currentDay);

    if (isMapleBearKillerType(killerType)) {

        const allMapleBearTypes = [
            MAPLE_BEAR_ID, MAPLE_BEAR_DAY4_ID, MAPLE_BEAR_DAY8_ID, MAPLE_BEAR_DAY13_ID, MAPLE_BEAR_DAY20_ID,
            INFECTED_BEAR_ID, INFECTED_BEAR_DAY8_ID, INFECTED_BEAR_DAY13_ID, INFECTED_BEAR_DAY20_ID,
            BUFF_BEAR_ID, BUFF_BEAR_DAY13_ID, BUFF_BEAR_DAY20_ID,
            FLYING_BEAR_ID, FLYING_BEAR_DAY15_ID, FLYING_BEAR_DAY20_ID,
            MINING_BEAR_ID, MINING_BEAR_DAY20_ID,
            TORPEDO_BEAR_ID, TORPEDO_BEAR_DAY20_ID
        ];
        const isVictimABear = allMapleBearTypes.includes(entityType);
        const isVictimInfected = entityType === INFECTED_PIG_ID || entityType === INFECTED_COW_ID;

        if (isVictimABear || isVictimInfected) {
            return;
        }

        let totalBearCount = 0;
        try {
            totalBearCount = countNearbyAddonBears(entity.dimension, entity.location, 64).total;
        } catch { /* ignore */ }

        const nearbyMult = getConversionNearbyPressureMultiplier(totalBearCount);
        const worldMult = getConversionWorldBearPressureMultiplier();
        const pressureMult = Math.max(0, Math.min(1, nearbyMult * worldMult));
        const buffOutcome = wouldSpawnBuffBearFromMobKill(entityType, killerType, currentDay);
        const effectiveRate = buffOutcome ? conversionRate : Math.min(1, conversionRate * pressureMult);

        if (entityType === "minecraft:pig") {
            if (Math.random() < effectiveRate) {
                system.run(() => {
                    convertPigToInfectedPig(entity, killer);
                });
            }
            return;
        }
        if (entityType === "minecraft:cow") {
            if (Math.random() < effectiveRate) {
                system.run(() => {
                    convertCowToInfectedCow(entity, killer);
                });
            }
            return;
        }
        if (Math.random() < effectiveRate) {
            system.run(() => {
                convertMobToMapleBear(entity, killer);
            });
        }
    } else {
        // Non-Maple Bear killer — no conversion
    }
    for (const p of world.getAllPlayers()) {
        if (!p || !p.dimension || p.dimension.id !== killer.dimension.id) continue;
        const dx = p.location.x - killer.location.x;
        const dy = p.location.y - killer.location.y;
        const dz = p.location.z - killer.location.z;
        if (dx * dx + dy * dy + dz * dz <= 64 * 64) {
            // Mob discovery is now handled through proper kill tracking system
        }
    }
}
