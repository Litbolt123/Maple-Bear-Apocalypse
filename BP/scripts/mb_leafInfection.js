/**
 * Infected leaves: vanilla cutout + oak render, then spread.
 *
 * Worldgen / script setType powder does not fire onPlace. Sample nearby
 * mb:snow_layer cells and convert what is under them (leaves, grass).
 * Day 0–1: powder sits. From day 2, convert/spread use getBlockSpreadProgress / getLeaf*Chance.
 * Each species has four stages (0–2 default_foliage, 3 snow-layer cream).
 * Birch/spruce/cherry/azalea/pale oak ignore biome hex — convert in
 * infected biomes so they pick up dusty VAN tint. Convert also runs
 * outside VAN (LIST forest, river overflow). Any infected leaf species
 * can convert or advance any other leaf species. Dusty logs and dirt
 * can infect neighboring leaves too.
 *
 * Do not minecraft:tick every infected leaf (same class as dusted_dirt).
 * Canopy hops use a capped player-centric front scan. Downward rays stop
 * on the first solid leaf, so each hit expands the whole trunk/canopy.
 * Climb is one new vanilla block per column per pass: up from dusty dirt,
 * down from powder on the lid. Do not convert the whole oak in one drain.
 * Any dust stage can convert healthy neighbors. Reaching max dust always
 * checks the six faces. Cream leaves stay remembered while a face is still
 * vanilla — dropping them at max left green holes beside a cream canopy.
 */

import { BlockPermutation, BlockVolume, system, world } from "@minecraft/server";
import { isScriptEnabled, SCRIPT_IDS } from "./mb_scriptToggles.js";
import { shouldPauseDayZeroAddonLoops, shouldSleepDayZeroWorldWork } from "./mb_dayZeroPerfBisect.js";
import {
    claimSpreadSlice,
    getMetricsSpreadLoad01,
    shouldDeferVillageBurst,
    spreadPlayersForVegetationWork,
    getOnlinePlayerCount
} from "./mb_workSpread.js";
import { getCurrentDay } from "./mb_dayTracker.js";
import { getLeafNeighborSpreadChance, getLeafSnowConvertChance } from "./mb_balance.js";
import { scaleWorldInfectionChance } from "./mb_infectionDirector.js";
import { isInfectedComponentBiomeAt } from "./mb_biomeReplaceRegistry.js";
import {
    scanAroundPlayerForGrassInfection,
    tryInfectGrassUnderSnow,
    tryInfectGrassAround,
    convertGrassCell,
    drainKnownGroundSources,
    isDustedGroundId
} from "./mb_grassInfection.js";
import {
    scanAroundPlayerForWoodInfection,
    tryInfectWoodAround,
    tryInfectWoodUnderSnow,
    convertWoodToInfected,
    registerInfectLeavesAround,
    registerInfectImmediateLeafFaces,
    expandTreeColumnY,
    inferTreeClimbDir,
    drainKnownWoodSources
} from "./mb_woodInfection.js";
import { isInfectionSpreadBlockedAt } from "./mb_spawnController.js";
import {
    BIOME_CONVERT_VANILLA,
    INFECTED_OAK_LEAVES_ID,
    LEAF_DUST_MAX,
    infectedLeafStageId,
    isConvertibleVanillaLeaf,
    isConvertibleVanillaWood,
    isInfectedLeafId,
    isInfectedWoodId,
    leafMetaFromInfectedId,
    speciesFromVanillaLeaf
} from "./mb_infectedVegetation.js";
import { TORPEDO_BLAST_RADIUS } from "./mb_torpedoBlastEffects.js";

export { INFECTED_OAK_LEAVES_ID, LEAF_DUST_MAX };
export const MB_SNOW_LAYER_ID = "mb:snow_layer";

const FACE_OFFSETS = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
];
/** Faces plus edge-diagonals so a canopy one cell off still infects. No ±2–4 Y skips. */
const NEIGHBOR_OFFSETS = [
    ...FACE_OFFSETS,
    [1, 1, 0],
    [1, -1, 0],
    [-1, 1, 0],
    [-1, -1, 0],
    [1, 0, 1],
    [1, 0, -1],
    [-1, 0, 1],
    [-1, 0, -1],
    [0, 1, 1],
    [0, 1, -1],
    [0, -1, 1],
    [0, -1, -1]
];
const TREE_COLUMN_PACE = 1;

const DECAY_RANGE = 6;
const DECAY_VISIT_CAP = 80;
const SNOW_SCAN_INTERVAL_TICKS = 40;
const SNOW_SCAN_POLL_TICKS = 8;
const SNOW_SAMPLE_COLUMNS = 10;
const SNOW_SAMPLE_RADIUS = 16;
const SNOW_SAMPLE_Y_UP = 28;
const SNOW_SAMPLE_Y_DOWN = 12;
const SNOW_SAMPLE_CAP = 8;
const SNOW_VOLUME_RADIUS = 5;
const BIOME_TINT_COLUMNS = 8;
const BIOME_TINT_RADIUS = 16;
const BIOME_TINT_CAP = 4;
const TORPEDO_LEAF_CAP = 96;
/** Player-centric canopy front — do not minecraft:tick every infected leaf. */
const LEAF_FRONT_RADIUS = 16;
const LEAF_FRONT_COLUMNS = 6;
const LEAF_FRONT_CONVERT_CAP_SOLO = 10;
const LEAF_FRONT_CONVERT_CAP_MP = 6;
const LEAF_FRONT_RAY_UP = 28;
const LEAF_FRONT_RAY_DISTANCE = 40;
const LEAF_DECAY_CHECKS = 1;
/** Extra scans (wood / powder-on-leaves / biome tint) rotate when spawn-load is high. Leaf + grass always run. */
const VEG_EXTRA_SCANS = ["wood", "snow", "tint"];
const VEG_LOAD_ROTATE_SOFT = 0.3;
const VEG_LOAD_ROTATE_HARD = 0.55;
const BIOME_TINT_Y_WINDOW = 6;
const KNOWN_LEAF_MAX = 256;
const KNOWN_LEAF_RETRY_TICKS = 16;
const KNOWN_LEAF_VISIT_SOLO = 12;
const KNOWN_LEAF_VISIT_MP = 6;
const KNOWN_LEAF_STEPS_SOLO = 12;
const KNOWN_LEAF_STEPS_MP = 6;
const TREE_DUST_COLUMN_CAP = 18;

let snowScanStarted = false;
let vegetationExtraPhase = 0;

/** @type {Map<string, { dimId: string, x: number, y: number, z: number, added: number, lastTry: number }>} */
const knownLeafSources = new Map();
let knownLeafDrainCursor = 0;

/**
 * Keep the visible infection front every slice. Rotate the heavier extras when
 * the world is already busy. Solo / quiet worlds still run every extra each
 * slice. Two-plus players always rotate extras so guests are not flooded.
 * @returns {Set<string>}
 */
function extraVegetationScansThisSlice() {
    const extras = VEG_EXTRA_SCANS;
    const load = getMetricsSpreadLoad01();
    const mp = getOnlinePlayerCount() >= 2;
    let extraCount = extras.length;
    // Solo + quiet: all extras. Two-plus players: always rotate so guests
    // are not hit with wood+powder+tint block updates every slice.
    if (mp) extraCount = load >= VEG_LOAD_ROTATE_SOFT ? 1 : 2;
    else if (load >= VEG_LOAD_ROTATE_HARD) extraCount = 1;
    else if (load >= VEG_LOAD_ROTATE_SOFT) extraCount = 2;
    const set = new Set();
    for (let i = 0; i < extraCount; i++) {
        set.add(extras[(vegetationExtraPhase + i) % extras.length]);
    }
    vegetationExtraPhase = (vegetationExtraPhase + extraCount) % extras.length;
    return set;
}

function leafInfectionEnabled() {
    return isScriptEnabled(SCRIPT_IDS.leafInfection);
}

function currentWorldDay() {
    try {
        return getCurrentDay();
    } catch {
        return 0;
    }
}

function isSnowLayerId(typeId) {
    return typeId === MB_SNOW_LAYER_ID || typeId === "minecraft:snow_layer";
}

function infectedLeafPermutation(speciesId, persistent, dust = 0) {
    const d = Math.max(0, Math.min(LEAF_DUST_MAX, dust | 0));
    const id = infectedLeafStageId(speciesId, d);
    return BlockPermutation.resolve(id, {
        "mb:persistent": persistent === true
    });
}

function getLeafDust(block) {
    const meta = leafMetaFromInfectedId(block.typeId);
    if (meta && meta.stage > 0) return meta.stage;
    try {
        const n = Number(block.permutation.getState("mb:dust"));
        if (Number.isFinite(n) && n > 0) return Math.max(0, Math.min(LEAF_DUST_MAX, n | 0));
    } catch {
        /* missing state = just converted */
    }
    return meta ? meta.stage : 0;
}

function setInfectedLeaf(block, speciesId, persistent, dust) {
    try {
        block.setPermutation(infectedLeafPermutation(speciesId, persistent, dust));
        rememberKnownLeafSource(block);
        return true;
    } catch {
        try {
            block.setType(infectedLeafStageId(speciesId, dust));
            rememberKnownLeafSource(block);
            return true;
        } catch {
            return false;
        }
    }
}

function advanceLeafDust(block) {
    if (!block?.isValid || !isInfectedLeafId(block.typeId)) return false;
    const meta = leafMetaFromInfectedId(block.typeId);
    if (!meta) return false;
    const dust = getLeafDust(block);
    if (dust >= LEAF_DUST_MAX) return false;
    const next = dust + 1;
    const ok = setInfectedLeaf(block, meta.spec.id, isCustomLeafPersistent(block), next);
    if (ok && next >= LEAF_DUST_MAX) {
        infectImmediateVanillaFaces(block, 1);
        rememberKnownLeafSource(block);
    }
    return ok;
}

function migrateLegacyDustState(block) {
    if (!block?.isValid || block.typeId !== INFECTED_OAK_LEAVES_ID) return false;
    const dust = getLeafDust(block);
    if (dust <= 0) return false;
    return setInfectedLeaf(block, "oak", isCustomLeafPersistent(block), dust);
}

function isAnyLeaf(typeId) {
    if (!typeId) return false;
    if (isInfectedLeafId(typeId)) return true;
    if (isConvertibleVanillaLeaf(typeId)) return true;
    return typeId.includes("leaves");
}

function isDecaySupportLog(typeId) {
    if (!typeId || typeof typeId !== "string") return false;
    if (typeId.includes("leaves")) return false;
    return typeId.includes("_log")
        || typeId.includes("_wood")
        || typeId.includes("stripped_")
        || typeId.includes("_stem")
        || typeId.includes("_hyphae");
}

function isPlayerPlacedVanillaLeaf(block) {
    try {
        return block.permutation.getState("persistent_bit") === true;
    } catch {
        return false;
    }
}

function isCustomLeafPersistent(block) {
    try {
        return block.permutation.getState("mb:persistent") === true;
    } catch {
        return false;
    }
}

/**
 * @param {{ forceSnow?: boolean, forceDust?: number }} opts
 * @returns {number | null}
 */
function forcedDustFromOpts(opts) {
    if (opts.forceSnow) return LEAF_DUST_MAX;
    if (Number.isFinite(opts.forceDust)) {
        return Math.max(0, Math.min(LEAF_DUST_MAX, opts.forceDust | 0));
    }
    return null;
}

/**
 * @param {import("@minecraft/server").Block} leafBlock
 * @param {{ convertOnly?: boolean, forceSnow?: boolean, forceDust?: number }} [opts]
 */
function convertLeafToInfected(leafBlock, opts = {}) {
    if (!leafBlock?.isValid) return false;
    if (isInfectionSpreadBlockedAt(leafBlock)) return false;
    const forced = forcedDustFromOpts(opts);
    if (isInfectedLeafId(leafBlock.typeId)) {
        if (forced != null) {
            if (getLeafDust(leafBlock) >= forced) return false;
            const meta = leafMetaFromInfectedId(leafBlock.typeId);
            if (!meta) return false;
            const before = getLeafDust(leafBlock);
            const ok = setInfectedLeaf(leafBlock, meta.spec.id, isCustomLeafPersistent(leafBlock), forced);
            if (ok && forced >= LEAF_DUST_MAX && before < LEAF_DUST_MAX) {
                infectImmediateVanillaFaces(leafBlock, 1);
                rememberKnownLeafSource(leafBlock);
            }
            return ok;
        }
        if (opts.convertOnly) return false;
        return advanceLeafDust(leafBlock);
    }
    const spec = speciesFromVanillaLeaf(leafBlock.typeId);
    if (!spec) return false;
    const dust = forced != null ? forced : 0;
    const ok = setInfectedLeaf(leafBlock, spec.id, isPlayerPlacedVanillaLeaf(leafBlock), dust);
    if (ok && dust >= LEAF_DUST_MAX) {
        infectImmediateVanillaFaces(leafBlock, 1);
        rememberKnownLeafSource(leafBlock);
    }
    return ok;
}

/**
 * Convert any vanilla leaf species, or advance any infected leaf.
 * Oak may infect birch; a dusty log or dirt patch may infect leaves beside it.
 * @param {import("@minecraft/server").Block} source
 * @returns {boolean}
 */
export function tryInfectLeavesAround(source) {
    if (!leafInfectionEnabled()) return false;
    if (!source?.isValid) return false;
    if (isInfectionSpreadBlockedAt(source)) return false;
    const day = currentWorldDay();
    const loc = source.location;
    const chance = scaleWorldInfectionChance(
        getLeafNeighborSpreadChance(day),
        day,
        source.dimension,
        loc?.x,
        loc?.z
    );
    if (chance <= 0) return false;
    if (Math.random() > chance) return false;
    return infectLeafNeighbors(source);
}

/**
 * @param {import("@minecraft/server").Block} source
 * @returns {boolean}
 */
function infectLeafNeighbors(source) {
    const loc = source.location;
    const dim = source.dimension;
    // Any dust stage can infect healthy blocks. Faces first so a cream leaf
    // next to a green hole does not spend the hop four blocks away.
    if (infectImmediateVanillaFaces(source, 1)) return true;
    const sourceIsLeaf = isInfectedLeafId(source.typeId);
    const myDust = sourceIsLeaf ? getLeafDust(source) : 0;
    for (const [dx, dy, dz] of shuffleOffsets(FACE_OFFSETS)) {
        let neighbor;
        try {
            neighbor = dim.getBlock({ x: loc.x + dx, y: loc.y + dy, z: loc.z + dz });
        } catch {
            continue;
        }
        if (!neighbor || !isInfectedLeafId(neighbor.typeId)) continue;
        if (sourceIsLeaf && getLeafDust(neighbor) >= myDust) continue;
        if (advanceLeafDust(neighbor)) return true;
    }
    for (const [dx, dy, dz] of shuffledNeighborOffsets()) {
        if (isFaceOffset(dx, dy, dz)) continue;
        let neighbor;
        try {
            neighbor = dim.getBlock({ x: loc.x + dx, y: loc.y + dy, z: loc.z + dz });
        } catch {
            continue;
        }
        if (!neighbor) continue;
        if (tryConvertVanillaLeafCell(neighbor)) return true;
        if (isInfectedLeafId(neighbor.typeId)) {
            if (sourceIsLeaf && getLeafDust(neighbor) >= myDust) continue;
            if (advanceLeafDust(neighbor)) return true;
        }
    }
    return false;
}

/**
 * Powder sitting on a leaf infects that leaf. Snow stays.
 * @param {import("@minecraft/server").Block} snowBlock
 * @param {{ force?: boolean, convertOnly?: boolean }} [opts]
 */
export function tryInfectLeafUnderSnow(snowBlock, opts = {}) {
    if (!leafInfectionEnabled()) return false;
    if (!snowBlock?.isValid) return false;
    if (isInfectionSpreadBlockedAt(snowBlock)) return false;
    if (!isSnowLayerId(snowBlock.typeId)) return false;
    const day = currentWorldDay();
    const loc = snowBlock.location;
    const chance = scaleWorldInfectionChance(
        getLeafSnowConvertChance(day),
        day,
        snowBlock.dimension,
        loc?.x,
        loc?.z
    );
    if (chance <= 0) return false;
    if (!opts.force && Math.random() > chance) return false;
    let below;
    try {
        below = snowBlock.dimension.getBlock({ x: loc.x, y: loc.y - 1, z: loc.z });
    } catch {
        return false;
    }
    return convertLeafToInfected(below, opts);
}

/**
 * Powder on leaves or grass. Worldgen never fires onPlace — callers must scan.
 * @param {import("@minecraft/server").Block} snowBlock
 * @param {{ force?: boolean, convertOnly?: boolean }} [opts]
 */
export function tryInfectUnderSnow(snowBlock, opts = {}) {
    if (!snowBlock?.isValid) return false;
    if (isInfectionSpreadBlockedAt(snowBlock)) return false;
    const leaf = tryInfectLeafUnderSnow(snowBlock, opts);
    const grass = tryInfectGrassUnderSnow(snowBlock, opts);
    const wood = tryInfectWoodUnderSnow(snowBlock, opts);
    return leaf || grass || wood;
}

/**
 * Distance → dust 0–3. Center is Snow; the rim is just converted.
 * @param {number} dist
 * @param {number} radius
 * @returns {number}
 */
export function blastDustStage(dist, radius) {
    if (!(radius > 0)) return LEAF_DUST_MAX;
    const t = dist / radius;
    if (t <= 0.28) return 3;
    if (t <= 0.52) return 2;
    if (t <= 0.76) return 1;
    return 0;
}

/**
 * Bear explosion: convert remaining leaves, wood, and grass with a distance gradient.
 * Instant. Skip the day-2 roll. Duds must not call this. Never lowers existing dust.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {{ x: number, y: number, z: number }} center
 * @param {number} [radius]
 */
export function infectVegetationInBlast(dimension, center, radius = TORPEDO_BLAST_RADIUS) {
    if (!dimension || !center) return 0;
    const r = Math.max(1, radius | 0);
    const r2 = r * r;
    const cx = Math.floor(center.x);
    const cy = Math.floor(center.y);
    const cz = Math.floor(center.z);
    let converted = 0;
    for (let dx = -r; dx <= r && converted < TORPEDO_LEAF_CAP; dx++) {
        for (let dy = -r; dy <= r && converted < TORPEDO_LEAF_CAP; dy++) {
            for (let dz = -r; dz <= r && converted < TORPEDO_LEAF_CAP; dz++) {
                const distSq = dx * dx + dy * dy + dz * dz;
                if (distSq > r2) continue;
                let block;
                try {
                    block = dimension.getBlock({ x: cx + dx, y: cy + dy, z: cz + dz });
                } catch {
                    continue;
                }
                if (!block) continue;
                const id = block.typeId;
                const dust = blastDustStage(Math.sqrt(distSq), r);
                if (isInfectedLeafId(id) || isConvertibleVanillaLeaf(id)) {
                    if (convertLeafToInfected(block, { forceDust: dust })) converted++;
                    continue;
                }
                if (isInfectedWoodId(id) || isConvertibleVanillaWood(id)) {
                    if (convertWoodToInfected(block, { forceDust: dust })) converted++;
                    continue;
                }
                if (id === "minecraft:grass_block" && dust >= 1) {
                    if (convertGrassCell(block)) converted++;
                }
            }
        }
    }
    return converted;
}

/** @deprecated use {@link infectVegetationInBlast} */
export function infectLeavesInTorpedoBlast(dimension, center, radius = TORPEDO_BLAST_RADIUS) {
    return infectVegetationInBlast(dimension, center, radius);
}

function shuffleOffsets(offsets) {
    const copy = offsets.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
    }
    return copy;
}

function shuffledNeighborOffsets() {
    return shuffleOffsets(NEIGHBOR_OFFSETS);
}

function isFaceOffset(dx, dy, dz) {
    return (Math.abs(dx) + Math.abs(dy) + Math.abs(dz)) === 1;
}

function tryConvertVanillaLeafCell(neighbor) {
    if (!neighbor?.isValid) return false;
    if (!isConvertibleVanillaLeaf(neighbor.typeId)) return false;
    if (isPlayerPlacedVanillaLeaf(neighbor)) return false;
    return convertLeafToInfected(neighbor, { convertOnly: true });
}

function leafHasUninfectedFace(block) {
    if (!block?.isValid) return false;
    const loc = block.location;
    const dim = block.dimension;
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
        let n;
        try {
            n = dim.getBlock({ x: loc.x + dx, y: loc.y + dy, z: loc.z + dz });
        } catch {
            continue;
        }
        if (!n) continue;
        if (isConvertibleVanillaLeaf(n.typeId) && !isPlayerPlacedVanillaLeaf(n)) return true;
        if (isConvertibleVanillaWood(n.typeId)) return true;
    }
    return false;
}

/**
 * Faces plus canopy edge-diagonals. Any dust stage can convert healthy neighbors.
 * Fully infected leaves call this with no extra chance so holes in the canopy fill.
 * @param {import("@minecraft/server").Block} source
 * @param {number} [cap]
 * @returns {boolean}
 */
function infectImmediateVanillaFaces(source, cap = 6) {
    if (!source?.isValid || cap <= 0) return false;
    const loc = source.location;
    const dim = source.dimension;
    let n = 0;
    for (const [dx, dy, dz] of shuffleOffsets(NEIGHBOR_OFFSETS)) {
        let neighbor;
        try {
            neighbor = dim.getBlock({ x: loc.x + dx, y: loc.y + dy, z: loc.z + dz });
        } catch {
            continue;
        }
        if (!neighbor) continue;
        if (tryConvertVanillaLeafCell(neighbor)) {
            n++;
            if (n >= cap) break;
            continue;
        }
        if (isConvertibleVanillaWood(neighbor.typeId)) {
            if (convertWoodToInfected(neighbor, { convertOnly: true })) {
                n++;
                if (n >= cap) break;
            }
        }
    }
    return n > 0;
}

function hasNearbyLogSupport(start) {
    const dim = start.dimension;
    const origin = start.location;
    const seen = new Set();
    const queue = [{ x: origin.x, y: origin.y, z: origin.z, d: 0 }];
    seen.add(`${origin.x},${origin.y},${origin.z}`);
    let visits = 0;
    while (queue.length && visits < DECAY_VISIT_CAP) {
        const cur = queue.shift();
        visits++;
        let block;
        try {
            block = dim.getBlock(cur);
        } catch {
            continue;
        }
        if (!block) continue;
        const id = block.typeId;
        if (isDecaySupportLog(id)) return true;
        if (cur.d >= DECAY_RANGE) continue;
        if (!isAnyLeaf(id) && !(cur.x === origin.x && cur.y === origin.y && cur.z === origin.z)) continue;
        for (const [dx, dy, dz] of FACE_OFFSETS) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            const nz = cur.z + dz;
            const key = `${nx},${ny},${nz}`;
            if (seen.has(key)) continue;
            seen.add(key);
            queue.push({ x: nx, y: ny, z: nz, d: cur.d + 1 });
        }
    }
    return false;
}

function snowAboveLeaf(block) {
    try {
        const loc = block.location;
        const above = block.dimension.getBlock({ x: loc.x, y: loc.y + 1, z: loc.z });
        return !!(above && isSnowLayerId(above.typeId));
    } catch {
        return false;
    }
}

/**
 * One infected leaf: optional decay, snow-stage, optional neighbor hop.
 * Used by the player front scan. Block minecraft:tick is off (scale lag).
 * @param {import("@minecraft/server").Block} block
 * @param {{ allowDecay?: boolean, skipSpread?: boolean }} [opts]
 * @returns {boolean} true if a convert, stage, or decay happened
 */
function processInfectedLeafFront(block, opts = {}) {
    if (!leafInfectionEnabled()) return false;
    if (!block?.isValid) return false;
    if (!isInfectedLeafId(block.typeId)) return false;

    if (block.typeId === INFECTED_OAK_LEAVES_ID && migrateLegacyDustState(block)) return true;

    if (opts.allowDecay && !isCustomLeafPersistent(block) && Math.random() < 0.18) {
        if (!hasNearbyLogSupport(block)) {
            try {
                block.setType("minecraft:air");
                return true;
            } catch {
                /* ignore */
            }
        }
    }

    if (isInfectionSpreadBlockedAt(block)) return false;

    const day = currentWorldDay();
    const loc = block.location;
    const chance = scaleWorldInfectionChance(
        getLeafNeighborSpreadChance(day),
        day,
        block.dimension,
        loc?.x,
        loc?.z
    );
    let did = false;
    let dusted = false;
    const dustNow = getLeafDust(block);
    if (dustNow >= LEAF_DUST_MAX && leafHasUninfectedFace(block)) {
        if (infectImmediateVanillaFaces(block, 1)) did = true;
    }
    if (
        snowAboveLeaf(block)
        && getLeafSnowConvertChance(day) > 0
        && Math.random() < 0.78
    ) {
        if (advanceLeafDust(block)) {
            did = true;
            dusted = true;
        }
    }
    if (!opts.skipSpread && chance > 0 && Math.random() <= chance) {
        if (infectLeafNeighbors(block)) did = true;
        if (tryInfectWoodAround(block)) did = true;
        if (tryInfectGrassAround(block)) did = true;
    }
    if (
        !dusted
        && getLeafDust(block) < LEAF_DUST_MAX
        && (opts.skipSpread || (chance > 0 && Math.random() <= chance))
    ) {
        if (advanceLeafDust(block)) did = true;
    }
    return did;
}

function leafTouchesInfection(leafBlock) {
    const loc = leafBlock.location;
    const dim = leafBlock.dimension;
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
        let n;
        try {
            n = dim.getBlock({ x: loc.x + dx, y: loc.y + dy, z: loc.z + dz });
        } catch {
            continue;
        }
        if (!n) continue;
        const id = n.typeId;
        if (isInfectedLeafId(id) || isInfectedWoodId(id) || isSnowLayerId(id) || isDustedGroundId(id)) {
            return true;
        }
    }
    return false;
}

function isTreeColumnId(typeId) {
    return isInfectedLeafId(typeId)
        || isConvertibleVanillaLeaf(typeId)
        || isInfectedWoodId(typeId)
        || isConvertibleVanillaWood(typeId)
        || isDustedGroundId(typeId);
}

function getColumnBlock(dim, x, y, z) {
    try {
        return dim.getBlock({ x, y, z });
    } catch {
        return undefined;
    }
}

function leafSourceKey(block) {
    const loc = block.location;
    return `${block.dimension?.id ?? ""}|${loc.x}|${loc.y}|${loc.z}`;
}

function rememberKnownLeafSource(block) {
    if (!block?.isValid || !isInfectedLeafId(block.typeId)) return;
    const loc = block.location;
    const key = leafSourceKey(block);
    const dust = getLeafDust(block);
    // Cream leaves next to green holes must keep hopping. Drop only when
    // every face is already infected (or not a convertible neighbor).
    if (dust >= LEAF_DUST_MAX && !leafHasUninfectedFace(block)) {
        knownLeafSources.delete(key);
        return;
    }
    const now = system.currentTick;
    if (knownLeafSources.size >= KNOWN_LEAF_MAX && !knownLeafSources.has(key)) {
        let evict = null;
        for (const [k, rec] of knownLeafSources) {
            if ((rec.dust ?? 0) >= LEAF_DUST_MAX) {
                evict = k;
                break;
            }
        }
        // Never drop a mid-dust leaf to make room. Skip this source instead.
        if (!evict) return;
        knownLeafSources.delete(evict);
    }
    const prev = knownLeafSources.get(key);
    knownLeafSources.set(key, {
        dimId: block.dimension.id,
        x: loc.x,
        y: loc.y,
        z: loc.z,
        dust,
        added: prev?.added ?? now,
        lastTry: prev?.lastTry ?? -999999
    });
}

function drainKnownLeafSources() {
    if (!leafInfectionEnabled() || knownLeafSources.size === 0) return;
    const now = system.currentTick;
    const mp = getOnlinePlayerCount() >= 2;
    const keys = Array.from(knownLeafSources.keys());
    if (keys.length === 0) return;
    const start = ((knownLeafDrainCursor % keys.length) + keys.length) % keys.length;
    const visitCap = Math.min(keys.length, mp ? KNOWN_LEAF_VISIT_MP : KNOWN_LEAF_VISIT_SOLO);
    const stepCap = mp ? KNOWN_LEAF_STEPS_MP : KNOWN_LEAF_STEPS_SOLO;
    const decayState = { left: 0 };
    const pacedColumns = new Set();
    let steps = 0;
    let walked = 0;
    for (; walked < visitCap && steps < stepCap; walked++) {
        const key = keys[(start + walked) % keys.length];
        const rec = knownLeafSources.get(key);
        if (!rec) continue;
        if (now - rec.lastTry < KNOWN_LEAF_RETRY_TICKS) continue;
        rec.lastTry = now;
        let dim;
        try {
            dim = world.getDimension(rec.dimId);
        } catch {
            knownLeafSources.delete(key);
            continue;
        }
        const block = getColumnBlock(dim, rec.x, rec.y, rec.z);
        if (!block || !isInfectedLeafId(block.typeId)) {
            knownLeafSources.delete(key);
            continue;
        }
        rec.dust = getLeafDust(block);
        if (rec.dust >= LEAF_DUST_MAX) {
            if (!leafHasUninfectedFace(block)) {
                knownLeafSources.delete(key);
                continue;
            }
            if (infectImmediateVanillaFaces(block, 1)) {
                steps++;
                rememberKnownLeafSource(block);
                continue;
            }
            rememberKnownLeafSource(block);
            if (!knownLeafSources.has(key)) continue;
        }
        const colKey = `${rec.dimId}|${rec.x}|${rec.z}`;
        if (pacedColumns.has(colKey)) {
            if (processInfectedLeafFront(block, { skipSpread: true })) steps++;
            continue;
        }
        pacedColumns.add(colKey);
        steps += processCanopyColumn(dim, rec.x, rec.z, rec.y, TREE_COLUMN_PACE, decayState);
    }
    knownLeafDrainCursor = start + walked;
}

/**
 * Grass plants are passable, so the lawn ray hits dirt. Leaves are solid, so
 * the same downward ray stops on the healthy canopy lid. Expand the whole
 * tree. Convert one frontier vanilla cell: up from dusty dirt, down from
 * powder on the lid.
 * @param {import("@minecraft/server").Dimension} dim
 * @param {number} x
 * @param {number} z
 * @param {number} hitY
 * @param {number} budget
 * @param {{ left: number }} decayState
 * @returns {number}
 */
function processCanopyColumn(dim, x, z, hitY, budget, decayState) {
    if (budget <= 0) return 0;
    let converted = 0;
    const { yLo, yHi } = expandTreeColumnY(dim, x, z, hitY, isTreeColumnId);
    const hitBlock = getColumnBlock(dim, x, hitY, z);
    if (hitBlock && isInfectedLeafId(hitBlock.typeId)) {
        processInfectedLeafFront(hitBlock, { skipSpread: true });
    }
    let dusted = 0;
    for (let y = yLo; y <= yHi && dusted < TREE_DUST_COLUMN_CAP; y++) {
        const block = getColumnBlock(dim, x, y, z);
        if (!block || !isInfectedLeafId(block.typeId)) continue;
        if (hitBlock && y === hitY) continue;
        if (getLeafDust(block) >= LEAF_DUST_MAX) continue;
        if (advanceLeafDust(block)) dusted++;
    }
    const dir = inferTreeClimbDir(dim, x, z, yLo, yHi);
    const pace = Math.min(TREE_COLUMN_PACE, budget);
    const yStart = dir === "down" ? yHi : yLo;
    const yEnd = dir === "down" ? yLo : yHi;
    const yStep = dir === "down" ? -1 : 1;
    for (let y = yStart; yStep > 0 ? y <= yEnd : y >= yEnd; y += yStep) {
        if (converted >= pace) break;
        const block = getColumnBlock(dim, x, y, z);
        if (!block) continue;
        const id = block.typeId;
        if (isConvertibleVanillaLeaf(id) && leafTouchesInfection(block)) {
            if (convertLeafToInfected(block, { convertOnly: true })) converted++;
            continue;
        }
        if (isConvertibleVanillaWood(id) && leafTouchesInfection(block)) {
            if (convertWoodToInfected(block, { convertOnly: true })) converted++;
        }
    }
    return converted;
}

/**
 * Capped canopy hops around the player. Replaces per-leaf minecraft:tick.
 * @param {import("@minecraft/server").Player} player
 */
function scanAroundPlayerForLeafFront(player) {
    if (!player?.isValid) return;
    const dim = player.dimension;
    if (dim.id !== "minecraft:overworld" && dim.id !== "minecraft:nether") return;
    const day = currentWorldDay();
    if (getLeafNeighborSpreadChance(day) <= 0 && getLeafSnowConvertChance(day) <= 0) return;
    const loc = player.location;
    const ox = Math.floor(loc.x);
    const oy = Math.floor(loc.y);
    const oz = Math.floor(loc.z);
    const maxY = dim.heightRange?.max ?? 320;
    const startY = Math.min(maxY - 2, oy + LEAF_FRONT_RAY_UP);
    const convertCap = getOnlinePlayerCount() >= 2 ? LEAF_FRONT_CONVERT_CAP_MP : LEAF_FRONT_CONVERT_CAP_SOLO;
    const pacedColumns = new Set();
    let converted = 0;
    const decayState = { left: LEAF_DECAY_CHECKS };

    try {
        const hit = player.getBlockFromViewDirection?.({
            maxDistance: 16,
            includePassableBlocks: true
        });
        const looked = hit?.block;
        if (looked && isTreeColumnId(looked.typeId)) {
            const cx = Math.floor(looked.location.x);
            const cz = Math.floor(looked.location.z);
            pacedColumns.add(`${cx}|${cz}`);
            converted += processCanopyColumn(
                dim,
                cx,
                cz,
                Math.floor(looked.location.y),
                TREE_COLUMN_PACE,
                decayState
            );
        }
    } catch {
        /* view ray optional */
    }

    for (let i = 0; i < LEAF_FRONT_COLUMNS && converted < convertCap; i++) {
        const x = ox + Math.floor(Math.random() * (LEAF_FRONT_RADIUS * 2 + 1)) - LEAF_FRONT_RADIUS;
        const z = oz + Math.floor(Math.random() * (LEAF_FRONT_RADIUS * 2 + 1)) - LEAF_FRONT_RADIUS;
        let hit;
        try {
            hit = dim.getBlockFromRay(
                { x: x + 0.5, y: startY, z: z + 0.5 },
                { x: 0, y: -1, z: 0 },
                {
                    maxDistance: LEAF_FRONT_RAY_DISTANCE,
                    includeLiquidBlocks: false,
                    includePassableBlocks: false
                }
            );
        } catch {
            continue;
        }
        const block = hit?.block;
        if (!block || !isTreeColumnId(block.typeId)) continue;
        const cx = Math.floor(block.location.x);
        const cz = Math.floor(block.location.z);
        const colKey = `${cx}|${cz}`;
        if (pacedColumns.has(colKey)) continue;
        pacedColumns.add(colKey);
        converted += processCanopyColumn(
            dim,
            cx,
            cz,
            Math.floor(block.location.y),
            TREE_COLUMN_PACE,
            decayState
        );
    }
}

function collectSnowInColumn(dimension, x, z, yTop, yBottom, into, columnCap) {
    let n = 0;
    for (let y = yTop; y >= yBottom && n < columnCap; y--) {
        let block;
        try {
            block = dimension.getBlock({ x, y, z });
        } catch {
            continue;
        }
        if (!block || !isSnowLayerId(block.typeId)) continue;
        const key = `${x},${y},${z}`;
        if (into.has(key)) continue;
        into.set(key, block);
        n++;
    }
}

function collectSnowInVolume(dimension, ox, oy, oz, yTop, yBottom, into) {
    if (typeof dimension.getBlocks !== "function" || typeof BlockVolume !== "function") return;
    try {
        const volume = new BlockVolume(
            { x: ox - SNOW_VOLUME_RADIUS, y: yBottom, z: oz - SNOW_VOLUME_RADIUS },
            { x: ox + SNOW_VOLUME_RADIUS, y: yTop, z: oz + SNOW_VOLUME_RADIUS }
        );
        const hits = dimension.getBlocks(
            volume,
            { includeTypes: [MB_SNOW_LAYER_ID, "minecraft:snow_layer"] },
            false
        );
        const iterator = hits?.getBlockLocationIterator?.();
        if (!iterator) return;
        for (const pos of iterator) {
            const key = `${pos.x},${pos.y},${pos.z}`;
            if (into.has(key)) continue;
            let block;
            try {
                block = dimension.getBlock(pos);
            } catch {
                continue;
            }
            if (block && isSnowLayerId(block.typeId)) into.set(key, block);
            if (into.size >= SNOW_SAMPLE_CAP * 3) break;
        }
    } catch {
        /* getBlocks missing or volume invalid — column samples still run */
    }
}

function scanAroundPlayerForSnowOnLeaves(player) {
    if (!player?.isValid) return;
    const dim = player.dimension;
    if (dim.id !== "minecraft:overworld" && dim.id !== "minecraft:nether") return;
    const day = currentWorldDay();
    if (getLeafSnowConvertChance(day) <= 0) return;
    const loc = player.location;
    const ox = Math.floor(loc.x);
    const oy = Math.floor(loc.y);
    const oz = Math.floor(loc.z);
    const maxY = dim.heightRange?.max ?? 320;
    const minY = dim.heightRange?.min ?? -64;
    const yTop = Math.min(maxY - 2, oy + SNOW_SAMPLE_Y_UP);
    const yBottom = Math.max(minY, oy - SNOW_SAMPLE_Y_DOWN);
    const found = new Map();
    collectSnowInVolume(dim, ox, oy, oz, yTop, yBottom, found);
    collectSnowInColumn(dim, ox, oz, yTop, yBottom, found, 3);
    // Empty forests: do not walk eight extra columns looking for powder that is not there.
    if (found.size > 0) {
        const extras = [
            [8, 0], [-8, 0], [0, 8], [0, -8], [6, 6], [-6, 6], [6, -6], [-6, -6]
        ];
        for (const [dx, dz] of extras) {
            collectSnowInColumn(dim, ox + dx, oz + dz, yTop, yBottom, found, 2);
        }
        for (let i = 0; i < SNOW_SAMPLE_COLUMNS && found.size < SNOW_SAMPLE_CAP * 2; i++) {
            const x = ox + Math.floor(Math.random() * (SNOW_SAMPLE_RADIUS * 2 + 1)) - SNOW_SAMPLE_RADIUS;
            const z = oz + Math.floor(Math.random() * (SNOW_SAMPLE_RADIUS * 2 + 1)) - SNOW_SAMPLE_RADIUS;
            collectSnowInColumn(dim, x, z, yTop, yBottom, found, 2);
        }
    }
    const samples = Array.from(found.values());
    for (let i = samples.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = samples[i];
        samples[i] = samples[j];
        samples[j] = tmp;
    }
    let converted = 0;
    for (const snow of samples) {
        if (converted >= SNOW_SAMPLE_CAP) break;
        if (tryInfectUnderSnow(snow, { force: true, convertOnly: true })) converted++;
    }
}

/**
 * Leaves whose vanilla tint is not default_foliage ignore biome foliage_appearance.
 * In infected biomes, swap them to the custom default_foliage block.
 */
function scanAroundPlayerForBiomeTint(player) {
    if (!player?.isValid) return;
    const dim = player.dimension;
    if (dim.id !== "minecraft:overworld") return;
    const loc = player.location;
    const ox = Math.floor(loc.x);
    const oy = Math.floor(loc.y);
    const oz = Math.floor(loc.z);
    const maxY = dim.heightRange?.max ?? 320;
    const minY = dim.heightRange?.min ?? -64;
    const yTop = Math.min(maxY - 2, oy + SNOW_SAMPLE_Y_UP);
    const yBottom = Math.max(minY, oy - SNOW_SAMPLE_Y_DOWN);
    const rayDist = Math.max(8, yTop - yBottom + 4);
    let converted = 0;
    const columns = [[ox, oz]];
    for (let i = 0; i < BIOME_TINT_COLUMNS && converted < BIOME_TINT_CAP; i++) {
        columns.push([
            ox + Math.floor(Math.random() * (BIOME_TINT_RADIUS * 2 + 1)) - BIOME_TINT_RADIUS,
            oz + Math.floor(Math.random() * (BIOME_TINT_RADIUS * 2 + 1)) - BIOME_TINT_RADIUS
        ]);
    }
    for (const [x, z] of columns) {
        if (converted >= BIOME_TINT_CAP) break;
        let hitBlock;
        try {
            hitBlock = dim.getBlockFromRay(
                { x: x + 0.5, y: yTop, z: z + 0.5 },
                { x: 0, y: -1, z: 0 },
                {
                    maxDistance: rayDist,
                    includeLiquidBlocks: false,
                    includePassableBlocks: true
                }
            )?.block;
        } catch {
            continue;
        }
        if (!hitBlock) continue;
        const hy = hitBlock.y;
        const yLo = Math.max(yBottom, hy - BIOME_TINT_Y_WINDOW);
        const yHi = Math.min(yTop, hy + BIOME_TINT_Y_WINDOW);
        for (let y = yHi; y >= yLo; y--) {
            let block;
            try {
                block = y === hy ? hitBlock : dim.getBlock({ x, y, z });
            } catch {
                continue;
            }
            if (!block || !BIOME_CONVERT_VANILLA.has(block.typeId)) continue;
            if (!isInfectedComponentBiomeAt(dim, block.location)) continue;
            if (convertLeafToInfected(block, { convertOnly: true })) {
                converted++;
                break;
            }
        }
    }
}

export function initializeLeafInfectionWatch() {
    if (snowScanStarted) return;
    snowScanStarted = true;
    registerInfectLeavesAround(tryInfectLeavesAround);
    registerInfectImmediateLeafFaces(infectImmediateVanillaFaces);
    system.runInterval(() => {
        try {
            if (!leafInfectionEnabled()) return;
            if (shouldPauseDayZeroAddonLoops() || shouldSleepDayZeroWorldWork("leaf_infection")) return;
            drainKnownGroundSources((src) => {
                tryInfectWoodAround(src);
                tryInfectLeavesAround(src);
            });
            drainKnownWoodSources();
            drainKnownLeafSources();
            if (shouldDeferVillageBurst("leaf_infection")) return;
            if (!claimSpreadSlice("leaf_infection", SNOW_SCAN_INTERVAL_TICKS)) return;
            const players = spreadPlayersForVegetationWork(world.getAllPlayers(), "leaf_infection");
            const extras = extraVegetationScansThisSlice();
            for (const player of players) {
                scanAroundPlayerForLeafFront(player);
                scanAroundPlayerForGrassInfection(player, (dirt) => {
                    tryInfectWoodAround(dirt);
                    tryInfectLeavesAround(dirt);
                });
                if (extras.has("snow")) scanAroundPlayerForSnowOnLeaves(player);
                if (extras.has("tint")) scanAroundPlayerForBiomeTint(player);
                if (extras.has("wood")) scanAroundPlayerForWoodInfection(player);
            }
        } catch {
            /* ignore */
        }
    }, SNOW_SCAN_POLL_TICKS);
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mb:infected_oak_leaf", {
        beforeOnPlayerPlace(ev) {
            try {
                ev.permutationToPlace = ev.permutationToPlace
                    .withState("mb:persistent", true);
            } catch {
                /* ignore */
            }
        }
    });
    event.blockComponentRegistry.registerCustomComponent("mb:snow_infects_leaves", {
        onPlace(ev) {
            try {
                tryInfectUnderSnow(ev.block, { force: true });
            } catch {
                /* ignore */
            }
        }
    });
});
