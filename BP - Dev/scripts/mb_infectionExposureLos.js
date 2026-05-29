/**
 * Line-of-sight for infection-adjacent mechanics: cough / breath audio to other players,
 * and counting nearby corrupted blocks for ambient pressure.
 * Solid walls block; liquids and foliage/plants (shared lists) do not.
 */

import { SNOW_REPLACEABLE_BLOCKS, STORM_PARTICLE_PASS_THROUGH } from "./mb_blockLists.js";
import { getCachedBlockInfo } from "./mb_blockCache.js";

/** Blocks exposure can pass through (not "walls"). */
const INFECTION_EXPOSURE_PASSTHROUGH = new Set([
    "minecraft:air",
    "minecraft:cave_air",
    "minecraft:void_air",
    "minecraft:water",
    "minecraft:flowing_water",
    "minecraft:lava",
    "minecraft:flowing_lava",
    "minecraft:snow_layer",
    "mb:snow_layer",
    "minecraft:string",
    "minecraft:tripwire",
    "minecraft:tripwire_hook",
    "minecraft:redstone_wire",
    "minecraft:web"
]);

for (const id of SNOW_REPLACEABLE_BLOCKS) INFECTION_EXPOSURE_PASSTHROUGH.add(id);
for (const id of STORM_PARTICLE_PASS_THROUGH) INFECTION_EXPOSURE_PASSTHROUGH.add(id);

/**
 * @param {{ typeId: string | null, isLiquid: boolean, isAir: boolean }} info
 * @returns {boolean} true if this block **blocks** airborne exposure (wall-like)
 */
function blockInfoOccludesInfectionExposure(info) {
    if (!info) return false;
    if (info.isAir) return false;
    if (info.isLiquid) return false;
    const id = info.typeId;
    if (!id) return false;
    if (INFECTION_EXPOSURE_PASSTHROUGH.has(id)) return false;
    return true;
}

/**
 * Cap per-ray block samples so LOS cost doesn't explode in multiplayer (every
 * infected cough / breath runs this between the emitter and every nearby other
 * player). Compensation: we always include the midpoint so chest-high walls —
 * the common occluder — still break LOS even with an 18-sample cap.
 *
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {{ x: number, y: number, z: number }} from - world coords (e.g. mouth / eye)
 * @param {{ x: number, y: number, z: number }} to - world coords (e.g. other player's eye)
 */
export function hasInfectionExposureLineOfSight(dimension, from, to) {
    if (!dimension || !from || !to) return false;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.35) return true;

    // Phase 4: previously min(56, ceil(len*3)). Drop to min(18, ceil(len*1.3))
    // which still samples every ~0.77 blocks at typical 16-block voice ranges.
    const steps = Math.max(2, Math.min(18, Math.ceil(len * 1.3)));
    // Sample the midpoint first: cheapest way to catch chest-high walls that would
    // be missed by a sparse 18-step ray.
    try {
        const mx = Math.floor((from.x + to.x) / 2);
        const my = Math.floor((from.y + to.y) / 2);
        const mz = Math.floor((from.z + to.z) / 2);
        const midInfo = getCachedBlockInfo(dimension, { x: mx, y: my, z: mz }, 10);
        if (blockInfoOccludesInfectionExposure(midInfo)) return false;
    } catch {
        return false;
    }

    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const px = from.x + dx * t;
        const py = from.y + dy * t;
        const pz = from.z + dz * t;
        try {
            const info = getCachedBlockInfo(dimension, {
                x: Math.floor(px),
                y: Math.floor(py),
                z: Math.floor(pz)
            }, 10);
            if (blockInfoOccludesInfectionExposure(info)) return false;
        } catch {
            return false;
        }
    }
    return true;
}
