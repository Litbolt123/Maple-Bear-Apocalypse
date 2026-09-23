/**
 * Shared snow-layer placement for storms, bear trails, mining breaks, etc.
 * Script setType does not fire custom onPlace — notifySnowLayerPlaced infects
 * under the powder and remembers the cell for neighbor orifice rolls
 * (player place, bear trails, death/conversion snow, storms).
 */
import { SNOW_REPLACEABLE_BLOCKS, SNOW_TWO_BLOCK_PLANTS, isWaterColumnSnowBlock } from "./mb_blockLists.js";
import { convertGrassCell, handlePlayerPlacedInfectionBlock } from "./mb_grassInfection.js";

const SNOW_LAYER_BLOCK = "minecraft:snow_layer";
const MB_SNOW_LAYER = "mb:snow_layer";

/**
 * Horizontal falloff for explosion snow spray.
 * Inner powder, mid dusted dirt, rim left green to creep later.
 * @param {number} dist
 * @param {number} radius
 * @returns {"snow"|"dust"|"skip"}
 */
export function blastGroundBand(dist, radius) {
    if (!(radius > 0)) return "snow";
    const t = dist / radius;
    if (t <= 0.38) return "snow";
    if (t <= 0.72) return "dust";
    return "skip";
}

/**
 * Mid-band explosion ground: grass → dusted dirt, no white cap.
 * @param {import("@minecraft/server").Block} [block]
 * @returns {boolean}
 */
export function applyBlastDustedGround(block) {
    if (!block?.isValid) return false;
    if (block.typeId !== "minecraft:grass_block") return false;
    return convertGrassCell(block);
}

/** @type {null | ((block: import("@minecraft/server").Block) => void)} */
let snowInfectHandler = null;

/**
 * Wire from main.js to tryInfectUnderSnow (avoids snowStorm ↔ leafInfection cycles).
 * @param {(block: import("@minecraft/server").Block) => void} handler
 */
export function registerSnowLayerInfectHandler(handler) {
    snowInfectHandler = typeof handler === "function" ? handler : null;
}

/** @type {null | ((dimId: string, loc: { x: number, y: number, z: number }) => boolean)} */
let infectionDetoxGuard = null;

/**
 * Wire from spawnController so powder is not placed inside an active emulsifier dome
 * (avoids a snowPlacement ↔ spawnController import cycle).
 * @param {(dimId: string, loc: { x: number, y: number, z: number }) => boolean} fn
 */
export function registerInfectionDetoxGuard(fn) {
    infectionDetoxGuard = typeof fn === "function" ? fn : null;
}

function isInEmulsifierDetox(block) {
    if (!block?.location || !infectionDetoxGuard) return false;
    try {
        const dimId = block.dimension?.id;
        if (!dimId) return false;
        return infectionDetoxGuard(dimId, block.location) === true;
    } catch {
        return false;
    }
}

/**
 * Powder is the infection. After any script-placed mb:snow_layer, convert
 * leaves / grass / wood under it and remember the cell so it keeps rolling
 * neighboring faces (setType does not fire onPlace).
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
export function notifySnowLayerPlaced(dimension, x, y, z) {
    if (!dimension) return;
    try {
        const block = dimension.getBlock({
            x: Math.floor(x),
            y: Math.floor(y),
            z: Math.floor(z)
        });
        if (!block) return;
        if (snowInfectHandler) {
            try {
                snowInfectHandler(block);
            } catch {
                /* leaf/wood under snow optional */
            }
        }
        handlePlayerPlacedInfectionBlock(block);
    } catch {
        /* ignore */
    }
}

/**
 * @param {import("@minecraft/server").Block} block
 * @returns {boolean}
 */
export function applyInfectionSnowLayer(block) {
    if (!block) return false;
    if (isInEmulsifierDetox(block)) return false;
    if (isWaterColumnSnowBlock(block)) return false;
    try {
        block.setType(MB_SNOW_LAYER);
    } catch {
        try {
            block.setType(SNOW_LAYER_BLOCK);
        } catch {
            return false;
        }
    }
    try {
        notifySnowLayerPlaced(
            block.dimension,
            block.location.x,
            block.location.y,
            block.location.z
        );
    } catch {
        /* infect is optional */
    }
    return true;
}

function isSolidBlock(block) {
    return block && block.isAir !== undefined && !block.isAir && block.isLiquid !== undefined && !block.isLiquid;
}

/**
 * Place or upgrade a snow layer on top of solid block at (x, y, z). y is the floor block.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {number} x
 * @param {number} y Floor block Y
 * @param {number} z
 * @param {boolean} requireNearbyBlocks Skip placement in open void when true
 */
export function tryPlaceSnowLayerAtColumn(dimension, x, y, z, requireNearbyBlocks = true) {
    try {
        const blockLoc = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
        const aboveLoc = { x: blockLoc.x, y: blockLoc.y + 1, z: blockLoc.z };
        const below = dimension.getBlock(blockLoc);
        const above = dimension.getBlock(aboveLoc);
        if (!below || !above) return;
        if (isWaterColumnSnowBlock(below) || isWaterColumnSnowBlock(above)) return;

        if (requireNearbyBlocks) {
            let hasNearbyBlocks = false;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dz === 0) continue;
                    try {
                        const nearbyBlock = dimension.getBlock({ x: blockLoc.x + dx, y: blockLoc.y, z: blockLoc.z + dz });
                        if (isSolidBlock(nearbyBlock)) {
                            hasNearbyBlocks = true;
                            break;
                        }
                    } catch { /* ignore */ }
                }
                if (hasNearbyBlocks) break;
            }
            if (!hasNearbyBlocks) return;
        }

        if (below.isLiquid || below.isAir || below.isAir === undefined) return;

        const belowType = below.typeId;
        if (belowType === MB_SNOW_LAYER) return;
        if (belowType === SNOW_LAYER_BLOCK) {
            applyInfectionSnowLayer(below);
            return;
        }
        if (SNOW_REPLACEABLE_BLOCKS.has(belowType)) {
            const aboveType = above.typeId;
            if (aboveType === MB_SNOW_LAYER || aboveType === SNOW_LAYER_BLOCK) return;
            if (SNOW_TWO_BLOCK_PLANTS.has(belowType) && above && SNOW_TWO_BLOCK_PLANTS.has(aboveType)) {
                applyInfectionSnowLayer(below);
                try { above.setType("minecraft:air"); } catch { /* ignore */ }
            } else {
                applyInfectionSnowLayer(below);
            }
        } else {
            const aboveType = above.typeId;
            if (aboveType === MB_SNOW_LAYER || aboveType === SNOW_LAYER_BLOCK) return;
            if (SNOW_REPLACEABLE_BLOCKS.has(aboveType)) {
                if (SNOW_TWO_BLOCK_PLANTS.has(aboveType)) {
                    const blockAboveAbove = dimension.getBlock({ x: blockLoc.x, y: blockLoc.y + 2, z: blockLoc.z });
                    if (blockAboveAbove && SNOW_TWO_BLOCK_PLANTS.has(blockAboveAbove.typeId)) {
                        applyInfectionSnowLayer(above);
                        try { blockAboveAbove.setType("minecraft:air"); } catch { /* ignore */ }
                    } else if (SNOW_TWO_BLOCK_PLANTS.has(belowType)) {
                        applyInfectionSnowLayer(below);
                        try { above.setType("minecraft:air"); } catch { /* ignore */ }
                    } else {
                        applyInfectionSnowLayer(above);
                    }
                } else {
                    applyInfectionSnowLayer(above);
                }
            } else if (above.isAir !== undefined && above.isAir && !below.isAir && !below.isLiquid) {
                applyInfectionSnowLayer(above);
            }
        }
    } catch {
        /* ignore */
    }
}

/** Snow under entity feet (general bear trail). */
export function tryPlaceSnowLayerUnder(entity) {
    if (!entity?.dimension) return;
    tryPlaceSnowLayerAtColumn(
        entity.dimension,
        Math.floor(entity.location.x),
        Math.floor(entity.location.y - 0.5),
        Math.floor(entity.location.z),
        true
    );
}

/** Snow on the floor below / at a mined block column. */
export function tryPlaceSnowLayerNearBreak(dimension, breakX, breakY, breakZ) {
    if (!dimension) return;
    const x = Math.floor(breakX);
    const z = Math.floor(breakZ);
    const startY = Math.floor(breakY);
    for (let y = startY; y >= startY - 4; y--) {
        try {
            const block = dimension.getBlock({ x, y, z });
            if (!isSolidBlock(block)) continue;
            tryPlaceSnowLayerAtColumn(dimension, x, y, z, true);
            return;
        } catch {
            /* ignore */
        }
    }
}
