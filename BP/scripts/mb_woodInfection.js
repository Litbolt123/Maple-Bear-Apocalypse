/**
 * Infect logs / wood / stripped from Samples textures.
 *
 * Do not tick every vanilla log. Do not minecraft:tick every infected wood
 * either (a converted forest would stall the sim). Player scan is the hop.
 * Converted wood also dusts neighboring grass_block / dirt (same helper as leaves).
 * Climb is one log per column per drain: up from dusty dirt, down from the
 * canopy. Do not convert the whole trunk in one pass (day 100 chance is ~100%).
 * Day 0–1: nothing. Player scan is a backup, same leaf_infection slice.
 */

import { BlockPermutation, system, world } from "@minecraft/server";
import { isScriptEnabled, SCRIPT_IDS } from "./mb_scriptToggles.js";
import { getCurrentDay } from "./mb_dayTracker.js";
import { getWoodNeighborSpreadChance } from "./mb_balance.js";
import { scaleWorldInfectionChance } from "./mb_infectionDirector.js";
import { isInfectionSpreadBlockedAt } from "./mb_spawnController.js";
import { getOnlinePlayerCount } from "./mb_workSpread.js";
import { isDustedGroundId } from "./mb_grassInfection.js";
import {
    LEAF_DUST_MAX,
    infectedWoodIdForVanilla,
    isConvertibleVanillaLeaf,
    isConvertibleVanillaWood,
    isInfectedLeafId,
    isInfectedWoodId
} from "./mb_infectedVegetation.js";

const MB_SNOW_LAYER_ID = "mb:snow_layer";
const WOOD_SCAN_RADIUS = 12;
const WOOD_SCAN_COLUMNS = 6;
const WOOD_RAY_UP = 28;
const WOOD_RAY_DISTANCE = 40;
const WOOD_CONVERT_CAP_SOLO = 12;
const WOOD_CONVERT_CAP_MP = 8;
/** One new log/leaf per column per drain so day 100 cannot paint a whole trunk. */
const TREE_COLUMN_PACE = 1;
/** Full tree height from the hit — not ±3 around the base or canopy lid. */
const TREE_COLUMN_MAX_SPAN = 48;
const KNOWN_WOOD_MAX = 96;
const KNOWN_WOOD_RETRY_TICKS = 16;
const KNOWN_WOOD_MAX_AGE = 2400;
const KNOWN_WOOD_VISIT_SOLO = 8;
const KNOWN_WOOD_VISIT_MP = 4;
const KNOWN_WOOD_STEPS_SOLO = 10;
const KNOWN_WOOD_STEPS_MP = 5;

/** @type {null | ((block: import("@minecraft/server").Block) => boolean)} */
let infectLeavesAroundFn = null;
/** @type {null | ((block: import("@minecraft/server").Block, cap?: number) => boolean)} */
let infectImmediateLeafFacesFn = null;

/** @type {Map<string, { dimId: string, x: number, y: number, z: number, added: number, lastTry: number }>} */
const knownWoodSources = new Map();
let knownWoodDrainCursor = 0;

const FACE_OFFSETS = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
];

/**
 * Wire from leaf infection so dusty logs can convert neighboring leaves
 * without a wood ↔ leaf import cycle.
 * @param {(block: import("@minecraft/server").Block) => boolean} fn
 */
export function registerInfectLeavesAround(fn) {
    infectLeavesAroundFn = typeof fn === "function" ? fn : null;
}

/**
 * Chance-free 6-face leaf convert. Call when a log reaches max dust.
 * @param {(block: import("@minecraft/server").Block, cap?: number) => boolean} fn
 */
export function registerInfectImmediateLeafFaces(fn) {
    infectImmediateLeafFacesFn = typeof fn === "function" ? fn : null;
}

/** Faces plus short diagonals. Do not hop ±2–4 Y — that skips the trunk in one tick. */
const NEIGHBOR_OFFSETS = [
    ...FACE_OFFSETS,
    [1, 0, 1],
    [1, 0, -1],
    [-1, 0, 1],
    [-1, 0, -1],
    [1, 1, 0],
    [1, -1, 0],
    [-1, 1, 0],
    [-1, -1, 0],
    [0, 1, 1],
    [0, 1, -1],
    [0, -1, 1],
    [0, -1, -1]
];

function woodInfectionEnabled() {
    return isScriptEnabled(SCRIPT_IDS.leafInfection);
}

function currentWorldDay() {
    try {
        return getCurrentDay();
    } catch {
        return 0;
    }
}

function getAxis(block) {
    try {
        const a = block.permutation.getState("pillar_axis");
        if (a === "x" || a === "y" || a === "z") return a;
    } catch {
        /* vanilla state missing */
    }
    try {
        const a = block.permutation.getState("mb:axis");
        if (a === "x" || a === "y" || a === "z") return a;
    } catch {
        /* custom state missing */
    }
    return "y";
}

function getWoodDust(block) {
    try {
        const n = Number(block.permutation.getState("mb:dust"));
        if (Number.isFinite(n)) return Math.max(0, Math.min(LEAF_DUST_MAX, n | 0));
    } catch {
        /* missing */
    }
    return 0;
}

function setInfectedWood(block, typeId, dust, axis) {
    const d = Math.max(0, Math.min(LEAF_DUST_MAX, dust | 0));
    const ax = axis === "x" || axis === "z" ? axis : "y";
    try {
        block.setPermutation(BlockPermutation.resolve(typeId, {
            "mb:dust": d,
            "mb:axis": ax
        }));
        return true;
    } catch {
        try {
            block.setPermutation(BlockPermutation.resolve(typeId, { "mb:dust": d }));
            return true;
        } catch {
            try {
                block.setType(typeId);
                return true;
            } catch {
                return false;
            }
        }
    }
}

function isInfectionTouchId(typeId) {
    if (!typeId) return false;
    return isDustedGroundId(typeId)
        || typeId === MB_SNOW_LAYER_ID
        || isInfectedLeafId(typeId)
        || isInfectedWoodId(typeId);
}

function shuffleFaceOffsets() {
    const copy = FACE_OFFSETS.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
    }
    return copy;
}

function woodHasUninfectedFace(block) {
    if (!block?.isValid) return false;
    const loc = block.location;
    const dim = block.dimension;
    for (const [dx, dy, dz] of FACE_OFFSETS) {
        const n = getBlockAt(dim, loc.x + dx, loc.y + dy, loc.z + dz);
        if (!n) continue;
        if (isConvertibleVanillaWood(n.typeId) || isConvertibleVanillaLeaf(n.typeId)) return true;
    }
    return false;
}

/**
 * Immediate 6 faces, no extra chance. Any dust stage can still hop via
 * tryInfectWoodAround; this is the "just became fully infected" check.
 * @param {import("@minecraft/server").Block} source
 * @param {number} [cap]
 * @returns {boolean}
 */
function infectImmediateWoodFaces(source, cap = 6, opts = {}) {
    if (!source?.isValid || cap <= 0) return false;
    const loc = source.location;
    const dim = source.dimension;
    let n = 0;
    for (const [dx, dy, dz] of shuffleFaceOffsets()) {
        if (opts.horizontalOnly && dy !== 0) continue;
        const neighbor = getBlockAt(dim, loc.x + dx, loc.y + dy, loc.z + dz);
        if (!neighbor) continue;
        if (isConvertibleVanillaWood(neighbor.typeId)) {
            if (convertWoodToInfected(neighbor, { convertOnly: true })) {
                n++;
                if (n >= cap) break;
            }
        }
    }
    return n > 0;
}

function notifyWoodReachedMaxDust(block) {
    infectImmediateWoodFaces(block, 1, { horizontalOnly: true });
    infectImmediateLeafFacesFn?.(block, 1);
}

/**
 * @param {import("@minecraft/server").Block} block
 * @param {{ convertOnly?: boolean, forceSnow?: boolean, forceDust?: number }} [opts]
 */
export function convertWoodToInfected(block, opts = {}) {
    if (!block?.isValid) return false;
    if (isInfectionSpreadBlockedAt(block)) return false;
    const forced = opts.forceSnow
        ? LEAF_DUST_MAX
        : Number.isFinite(opts.forceDust)
            ? Math.max(0, Math.min(LEAF_DUST_MAX, opts.forceDust | 0))
            : null;
    if (isInfectedWoodId(block.typeId)) {
        if (forced != null) {
            if (getWoodDust(block) >= forced) return false;
            const before = getWoodDust(block);
            const ok = setInfectedWood(block, block.typeId, forced, getAxis(block));
            if (ok) rememberKnownWoodSource(block);
            if (ok && forced >= LEAF_DUST_MAX && before < LEAF_DUST_MAX) notifyWoodReachedMaxDust(block);
            return ok;
        }
        if (opts.convertOnly) return false;
        const d = getWoodDust(block);
        if (d >= LEAF_DUST_MAX) return false;
        const ok = setInfectedWood(block, block.typeId, d + 1, getAxis(block));
        if (ok) rememberKnownWoodSource(block);
        if (ok && d + 1 >= LEAF_DUST_MAX) notifyWoodReachedMaxDust(block);
        return ok;
    }
    if (!isConvertibleVanillaWood(block.typeId)) return false;
    const id = infectedWoodIdForVanilla(block.typeId);
    if (!id) return false;
    const dust = forced != null ? forced : 0;
    const ok = setInfectedWood(block, id, dust, getAxis(block));
    if (ok) rememberKnownWoodSource(block);
    if (ok && dust >= LEAF_DUST_MAX) notifyWoodReachedMaxDust(block);
    return ok;
}

function getBlockAt(dim, x, y, z) {
    try {
        return dim.getBlock({ x, y, z });
    } catch {
        return undefined;
    }
}

function isWoodColumnId(typeId) {
    return isInfectedWoodId(typeId)
        || isConvertibleVanillaWood(typeId)
        || isInfectedLeafId(typeId)
        || isConvertibleVanillaLeaf(typeId)
        || isDustedGroundId(typeId);
}

function woodSourceKey(block) {
    const loc = block.location;
    return `${block.dimension?.id ?? ""}|${loc.x}|${loc.y}|${loc.z}`;
}

function rememberKnownWoodSource(block) {
    if (!block?.isValid) return;
    const id = block.typeId;
    if (!isInfectedWoodId(id) && !isDustedGroundId(id)) return;
    const loc = block.location;
    const key = woodSourceKey(block);
    const now = system.currentTick;
    if (knownWoodSources.size >= KNOWN_WOOD_MAX && !knownWoodSources.has(key)) {
        const oldest = knownWoodSources.keys().next().value;
        if (oldest) knownWoodSources.delete(oldest);
    }
    const prev = knownWoodSources.get(key);
    knownWoodSources.set(key, {
        dimId: block.dimension.id,
        x: loc.x,
        y: loc.y,
        z: loc.z,
        added: prev?.added ?? now,
        lastTry: prev?.lastTry ?? -999999
    });
}

/**
 * Walk the whole trunk/canopy from a ray hit. Downward rays stop on the first
 * solid leaf; the base of the tree is often 10–30 blocks below that lid.
 * Allow one air gap so a leaf column can still reach the log under it.
 * @param {import("@minecraft/server").Dimension} dim
 * @param {number} x
 * @param {number} z
 * @param {number} hitY
 * @param {(typeId: string) => boolean} isColumnId
 * @returns {{ yLo: number, yHi: number }}
 */
export function expandTreeColumnY(dim, x, z, hitY, isColumnId) {
    const minY = dim.heightRange?.min ?? -64;
    const maxY = (dim.heightRange?.max ?? 320) - 1;
    const yMinBound = Math.max(minY, hitY - TREE_COLUMN_MAX_SPAN);
    const yMaxBound = Math.min(maxY, hitY + TREE_COLUMN_MAX_SPAN);
    let yLo = hitY;
    let yHi = hitY;
    let gap = 0;
    for (let y = hitY - 1; y >= yMinBound; y--) {
        const block = getBlockAt(dim, x, y, z);
        const id = block?.typeId;
        if (id && isColumnId(id)) {
            yLo = y;
            gap = 0;
            continue;
        }
        gap++;
        if (gap > 1) break;
    }
    gap = 0;
    for (let y = hitY + 1; y <= yMaxBound; y++) {
        const block = getBlockAt(dim, x, y, z);
        const id = block?.typeId;
        if (id && isColumnId(id)) {
            yHi = y;
            gap = 0;
            continue;
        }
        gap++;
        if (gap > 1) break;
    }
    return { yLo, yHi };
}

/**
 * Ground / stump infection climbs up. Canopy / powder on the lid climbs down.
 * @param {import("@minecraft/server").Dimension} dim
 * @param {number} x
 * @param {number} z
 * @param {number} yLo
 * @param {number} yHi
 * @returns {"up" | "down"}
 */
export function inferTreeClimbDir(dim, x, z, yLo, yHi) {
    const under = getBlockAt(dim, x, yLo - 1, z);
    if (under && isInfectionTouchId(under.typeId)) return "up";
    const over = getBlockAt(dim, x, yHi + 1, z);
    if (over && isInfectionTouchId(over.typeId)) return "down";
    let low = null;
    let high = null;
    for (let y = yLo; y <= yHi; y++) {
        const id = getBlockAt(dim, x, y, z)?.typeId;
        if (id && isInfectionTouchId(id)) {
            if (low == null) low = y;
            high = y;
        }
    }
    if (low == null) return "up";
    if (low - yLo <= yHi - high) return "up";
    return "down";
}

function processWoodColumn(dim, x, z, hitY, budget) {
    if (budget <= 0) return 0;
    const { yLo, yHi } = expandTreeColumnY(dim, x, z, hitY, isWoodColumnId);
    const dir = inferTreeClimbDir(dim, x, z, yLo, yHi);
    const pace = Math.min(TREE_COLUMN_PACE, budget);
    let converted = 0;
    const yStart = dir === "down" ? yHi : yLo;
    const yEnd = dir === "down" ? yLo : yHi;
    const yStep = dir === "down" ? -1 : 1;
    for (let y = yStart; yStep > 0 ? y <= yEnd : y >= yEnd; y += yStep) {
        if (converted >= pace) break;
        const block = getBlockAt(dim, x, y, z);
        if (!block) continue;
        const id = block.typeId;
        if (isConvertibleVanillaWood(id) && woodTouchesInfection(block)) {
            if (convertWoodToInfected(block, { convertOnly: true })) converted++;
            continue;
        }
        if (isConvertibleVanillaLeaf(id) && woodTouchesInfection(block) && infectLeavesAroundFn?.(block)) {
            converted++;
        }
    }
    return converted;
}

/**
 * Keep climbing the same trunks even when random rays miss.
 * @returns {number} converts this drain
 */
export function drainKnownWoodSources() {
    if (!woodInfectionEnabled() || knownWoodSources.size === 0) return 0;
    const now = system.currentTick;
    const mp = getOnlinePlayerCount() >= 2;
    const keys = Array.from(knownWoodSources.keys());
    if (keys.length === 0) return 0;
    const start = ((knownWoodDrainCursor % keys.length) + keys.length) % keys.length;
    const visitCap = Math.min(keys.length, mp ? KNOWN_WOOD_VISIT_MP : KNOWN_WOOD_VISIT_SOLO);
    const stepCap = mp ? KNOWN_WOOD_STEPS_MP : KNOWN_WOOD_STEPS_SOLO;
    const pacedColumns = new Set();
    let steps = 0;
    let walked = 0;
    for (; walked < visitCap && steps < stepCap; walked++) {
        const key = keys[(start + walked) % keys.length];
        const rec = knownWoodSources.get(key);
        if (!rec) continue;
        let dim;
        try {
            dim = world.getDimension(rec.dimId);
        } catch {
            knownWoodSources.delete(key);
            continue;
        }
        const block = getBlockAt(dim, rec.x, rec.y, rec.z);
        if (!block || (!isInfectedWoodId(block.typeId) && !isDustedGroundId(block.typeId))) {
            knownWoodSources.delete(key);
            continue;
        }
        if (isInfectedWoodId(block.typeId) && getWoodDust(block) >= LEAF_DUST_MAX && !woodHasUninfectedFace(block)) {
            knownWoodSources.delete(key);
            continue;
        }
        if (now - rec.added > KNOWN_WOOD_MAX_AGE && !woodHasUninfectedFace(block)) {
            knownWoodSources.delete(key);
            continue;
        }
        if (now - rec.lastTry < KNOWN_WOOD_RETRY_TICKS) continue;
        rec.lastTry = now;
        if (isInfectedWoodId(block.typeId) && getWoodDust(block) < LEAF_DUST_MAX) {
            convertWoodToInfected(block);
        }
        if (isInfectedWoodId(block.typeId) && getWoodDust(block) >= LEAF_DUST_MAX && woodHasUninfectedFace(block)) {
            if (infectImmediateWoodFaces(block, 1, { horizontalOnly: true })) steps++;
            infectImmediateLeafFacesFn?.(block, 1);
        }
        const colKey = `${rec.dimId}|${rec.x}|${rec.z}`;
        if (pacedColumns.has(colKey)) continue;
        pacedColumns.add(colKey);
        const budget = Math.min(TREE_COLUMN_PACE, stepCap - steps);
        steps += processWoodColumn(dim, rec.x, rec.z, rec.y, budget);
    }
    knownWoodDrainCursor = start + walked;
    return steps;
}

function woodTouchesInfection(block) {
    const loc = block.location;
    const dim = block.dimension;
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
        const n = getBlockAt(dim, loc.x + dx, loc.y + dy, loc.z + dz);
        if (n && isInfectionTouchId(n.typeId)) return true;
    }
    return false;
}

/**
 * Infected leaf / wood / powder / dusted dirt tries adjacent logs.
 * One face hop. Do not chain newly converted logs in the same call.
 * @param {import("@minecraft/server").Block} source
 * @returns {boolean}
 */
export function tryInfectWoodAround(source) {
    if (!woodInfectionEnabled()) return false;
    if (!source?.isValid) return false;
    if (isInfectionSpreadBlockedAt(source)) return false;
    const day = currentWorldDay();
    const chance = scaleWorldInfectionChance(
        getWoodNeighborSpreadChance(day),
        day,
        source.dimension,
        source.location?.x,
        source.location?.z
    );
    if (chance <= 0) return false;
    const loc = source.location;
    const dim = source.dimension;
    for (const [dx, dy, dz] of shuffleFaceOffsets()) {
        const n = getBlockAt(dim, loc.x + dx, loc.y + dy, loc.z + dz);
        if (!n) continue;
        if (isConvertibleVanillaWood(n.typeId)) {
            if (Math.random() > chance) continue;
            if (convertWoodToInfected(n, { convertOnly: true })) return true;
            continue;
        }
        if (isInfectedWoodId(n.typeId)) {
            if (Math.random() > chance) continue;
            if (convertWoodToInfected(n)) return true;
        }
    }
    return false;
}

/**
 * Powder sitting on a log / stem / wart block infects it. Snow stays.
 * @param {import("@minecraft/server").Block} snowBlock
 * @param {{ force?: boolean, convertOnly?: boolean, forceSnow?: boolean }} [opts]
 */
export function tryInfectWoodUnderSnow(snowBlock, opts = {}) {
    if (!woodInfectionEnabled()) return false;
    if (!snowBlock?.isValid) return false;
    if (isInfectionSpreadBlockedAt(snowBlock)) return false;
    if (snowBlock.typeId !== MB_SNOW_LAYER_ID && snowBlock.typeId !== "minecraft:snow_layer") return false;
    const day = currentWorldDay();
    const loc = snowBlock.location;
    const chance = scaleWorldInfectionChance(
        getWoodNeighborSpreadChance(day),
        day,
        snowBlock.dimension,
        loc?.x,
        loc?.z
    );
    if (chance <= 0) return false;
    if (!opts.force && Math.random() > chance) return false;
    const below = getBlockAt(snowBlock.dimension, loc.x, loc.y - 1, loc.z);
    if (!below) return false;
    if (!isConvertibleVanillaWood(below.typeId) && !isInfectedWoodId(below.typeId)) return false;
    return convertWoodToInfected(below, {
        convertOnly: opts.convertOnly,
        forceSnow: opts.forceSnow
    });
}

/**
 * Player-centric wood hops. Does not tick vanilla or infected logs.
 * @param {import("@minecraft/server").Player} player
 */
export function scanAroundPlayerForWoodInfection(player) {
    if (!player?.isValid) return;
    if (!woodInfectionEnabled()) return;
    const dim = player.dimension;
    if (dim.id !== "minecraft:overworld" && dim.id !== "minecraft:nether") return;
    const day = currentWorldDay();
    if (getWoodNeighborSpreadChance(day) <= 0) return;
    const loc = player.location;
    const ox = Math.floor(loc.x);
    const oy = Math.floor(loc.y);
    const oz = Math.floor(loc.z);
    const maxY = dim.heightRange?.max ?? 320;
    const startY = Math.min(maxY - 2, oy + WOOD_RAY_UP);
    const convertCap = getOnlinePlayerCount() >= 2 ? WOOD_CONVERT_CAP_MP : WOOD_CONVERT_CAP_SOLO;
    const pacedColumns = new Set();
    let converted = 0;
    for (let i = 0; i < WOOD_SCAN_COLUMNS && converted < convertCap; i++) {
        const x = ox + Math.floor(Math.random() * (WOOD_SCAN_RADIUS * 2 + 1)) - WOOD_SCAN_RADIUS;
        const z = oz + Math.floor(Math.random() * (WOOD_SCAN_RADIUS * 2 + 1)) - WOOD_SCAN_RADIUS;
        let hit;
        try {
            hit = dim.getBlockFromRay(
                { x: x + 0.5, y: startY, z: z + 0.5 },
                { x: 0, y: -1, z: 0 },
                {
                    maxDistance: WOOD_RAY_DISTANCE,
                    includeLiquidBlocks: false,
                    includePassableBlocks: false
                }
            );
        } catch {
            continue;
        }
        const block = hit?.block;
        if (!block || !isWoodColumnId(block.typeId)) continue;
        const cx = Math.floor(block.location.x);
        const cz = Math.floor(block.location.z);
        const colKey = `${cx}|${cz}`;
        if (pacedColumns.has(colKey)) continue;
        pacedColumns.add(colKey);
        converted += processWoodColumn(
            dim,
            cx,
            cz,
            Math.floor(block.location.y),
            TREE_COLUMN_PACE
        );
    }
}

system.beforeEvents.startup.subscribe((event) => {
    // Tag only — hops are player-centric. Do not subscribe onTick without minecraft:tick
    // (content log error on world load; ticking every dusty cell also hitches).
    event.blockComponentRegistry.registerCustomComponent("mb:infected_wood", {});
});
