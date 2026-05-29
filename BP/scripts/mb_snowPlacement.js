/**
 * Shared snow-layer placement for bear trails, mining breaks, etc.
 */
import { SNOW_REPLACEABLE_BLOCKS, SNOW_TWO_BLOCK_PLANTS } from "./mb_blockLists.js";

const SNOW_LAYER_BLOCK = "minecraft:snow_layer";
const MB_SNOW_LAYER = "mb:snow_layer";

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
            try { below.setType(MB_SNOW_LAYER); } catch { below.setType(SNOW_LAYER_BLOCK); }
            return;
        }
        if (SNOW_REPLACEABLE_BLOCKS.has(belowType)) {
            const aboveType = above.typeId;
            if (aboveType === MB_SNOW_LAYER || aboveType === SNOW_LAYER_BLOCK) return;
            if (SNOW_TWO_BLOCK_PLANTS.has(belowType) && above && SNOW_TWO_BLOCK_PLANTS.has(aboveType)) {
                try { below.setType(MB_SNOW_LAYER); } catch { below.setType(SNOW_LAYER_BLOCK); }
                try { above.setType("minecraft:air"); } catch { /* ignore */ }
            } else {
                try { below.setType(MB_SNOW_LAYER); } catch { below.setType(SNOW_LAYER_BLOCK); }
            }
        } else {
            const aboveType = above.typeId;
            if (aboveType === MB_SNOW_LAYER || aboveType === SNOW_LAYER_BLOCK) return;
            if (SNOW_REPLACEABLE_BLOCKS.has(aboveType)) {
                if (SNOW_TWO_BLOCK_PLANTS.has(aboveType)) {
                    const blockAboveAbove = dimension.getBlock({ x: blockLoc.x, y: blockLoc.y + 2, z: blockLoc.z });
                    if (blockAboveAbove && SNOW_TWO_BLOCK_PLANTS.has(blockAboveAbove.typeId)) {
                        try { above.setType(MB_SNOW_LAYER); } catch { above.setType(SNOW_LAYER_BLOCK); }
                        try { blockAboveAbove.setType("minecraft:air"); } catch { /* ignore */ }
                    } else if (SNOW_TWO_BLOCK_PLANTS.has(belowType)) {
                        try { below.setType(MB_SNOW_LAYER); } catch { below.setType(SNOW_LAYER_BLOCK); }
                        try { above.setType("minecraft:air"); } catch { /* ignore */ }
                    } else {
                        try { above.setType(MB_SNOW_LAYER); } catch { above.setType(SNOW_LAYER_BLOCK); }
                    }
                } else {
                    try { above.setType(MB_SNOW_LAYER); } catch { above.setType(SNOW_LAYER_BLOCK); }
                }
            } else if (above.isAir !== undefined && above.isAir && !below.isAir && !below.isLiquid) {
                try {
                    above.setType(MB_SNOW_LAYER);
                } catch {
                    above.setType(SNOW_LAYER_BLOCK);
                }
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
