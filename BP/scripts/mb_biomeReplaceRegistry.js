/**
 * Infected biome replace_biomes targets (from BP - Dev/biomes/mb_infected_biome_*.json).
 * Regenerate: node tools/syncBiomeReplaceRegistry.cjs
 */

export const INFECTED_BIOME_COMPONENT_IDS = [
    "mb:infected_biome_small",
    "mb:infected_biome_medium",
    "mb:infected_biome_large"
];

/** Reference catalog of vanilla biome ids (dev/biomes stuff) for "missing from replace list". */
export const VANILLA_BIOME_REFERENCE_CATALOG = [
    "minecraft:bamboo_jungle",
    "minecraft:bamboo_jungle_hills",
    "minecraft:basalt_deltas",
    "minecraft:beach",
    "minecraft:birch_forest",
    "minecraft:birch_forest_hills",
    "minecraft:birch_forest_hills_mutated",
    "minecraft:birch_forest_mutated",
    "minecraft:cherry_grove",
    "minecraft:cold_beach",
    "minecraft:cold_ocean",
    "minecraft:cold_taiga",
    "minecraft:cold_taiga_hills",
    "minecraft:cold_taiga_mutated",
    "minecraft:crimson_forest",
    "minecraft:deep_cold_ocean",
    "minecraft:deep_dark",
    "minecraft:deep_frozen_ocean",
    "minecraft:deep_lukewarm_ocean",
    "minecraft:deep_ocean",
    "minecraft:deep_warm_ocean",
    "minecraft:desert",
    "minecraft:desert_hills",
    "minecraft:desert_mutated",
    "minecraft:dripstone_caves",
    "minecraft:extreme_hills",
    "minecraft:extreme_hills_edge",
    "minecraft:extreme_hills_mutated",
    "minecraft:extreme_hills_plus_trees",
    "minecraft:extreme_hills_plus_trees_mutated",
    "minecraft:flower_forest",
    "minecraft:forest",
    "minecraft:forest_hills",
    "minecraft:frozen_ocean",
    "minecraft:frozen_peaks",
    "minecraft:frozen_river",
    "minecraft:grove",
    "minecraft:hell",
    "minecraft:ice_mountains",
    "minecraft:ice_plains",
    "minecraft:ice_plains_spikes",
    "minecraft:jagged_peaks",
    "minecraft:jungle",
    "minecraft:jungle_edge",
    "minecraft:jungle_edge_mutated",
    "minecraft:jungle_hills",
    "minecraft:jungle_mutated",
    "minecraft:legacy_frozen_ocean",
    "minecraft:lukewarm_ocean",
    "minecraft:lush_caves",
    "minecraft:mangrove_swamp",
    "minecraft:meadow",
    "minecraft:mega_taiga",
    "minecraft:mega_taiga_hills",
    "minecraft:mesa",
    "minecraft:mesa_bryce",
    "minecraft:mesa_plateau",
    "minecraft:mesa_plateau_mutated",
    "minecraft:mesa_plateau_stone",
    "minecraft:mesa_plateau_stone_mutated",
    "minecraft:mushroom_island",
    "minecraft:mushroom_island_shore",
    "minecraft:ocean",
    "minecraft:pale_garden",
    "minecraft:plains",
    "minecraft:redwood_taiga_hills_mutated",
    "minecraft:redwood_taiga_mutated",
    "minecraft:river",
    "minecraft:roofed_forest",
    "minecraft:roofed_forest_mutated",
    "minecraft:savanna",
    "minecraft:savanna_mutated",
    "minecraft:savanna_plateau",
    "minecraft:savanna_plateau_mutated",
    "minecraft:snowy_slopes",
    "minecraft:soulsand_valley",
    "minecraft:stone_beach",
    "minecraft:stony_peaks",
    "minecraft:sunflower_plains",
    "minecraft:swampland",
    "minecraft:swampland_mutated",
    "minecraft:taiga",
    "minecraft:taiga_hills",
    "minecraft:taiga_mutated",
    "minecraft:the_end",
    "minecraft:warm_ocean",
    "minecraft:warped_forest"
];

/** Overworld safe zones by design — not in replace_biomes on purpose (see docs/design/SAFE_BIOMES.md). */
export const INTENTIONAL_SAFE_OVERWORLD_BIOMES = [
    "minecraft:mushroom_island",
    "minecraft:mushroom_island_shore",
    "minecraft:mega_taiga",
    "minecraft:mega_taiga_hills",
    "minecraft:ice_mountains",
    "minecraft:redwood_taiga_mutated",
    "minecraft:redwood_taiga_hills_mutated"
];

/** Nether/End ids in catalog but not present in infected biome JSON yet. */
export const OTHER_DIMENSION_CATALOG_IDS = [
    "minecraft:basalt_deltas",
    "minecraft:crimson_forest",
    "minecraft:hell",
    "minecraft:soulsand_valley",
    "minecraft:the_end",
    "minecraft:warped_forest"
];

/** Merged replacement rows (same targets/amount across patch sizes). */
export const REPLACEMENT_GROUPS = [
    {
        "dimension": "minecraft:overworld",
        "amount": 0.15,
        "noiseScale": 60,
        "targets": [
            "minecraft:bamboo_jungle",
            "minecraft:bamboo_jungle_hills",
            "minecraft:birch_forest",
            "minecraft:birch_forest_hills",
            "minecraft:birch_forest_hills_mutated",
            "minecraft:birch_forest_mutated",
            "minecraft:cherry_grove",
            "minecraft:flower_forest",
            "minecraft:forest",
            "minecraft:forest_hills",
            "minecraft:jungle",
            "minecraft:jungle_edge",
            "minecraft:jungle_edge_mutated",
            "minecraft:jungle_hills",
            "minecraft:jungle_mutated",
            "minecraft:mangrove_swamp",
            "minecraft:meadow",
            "minecraft:pale_garden",
            "minecraft:plains",
            "minecraft:roofed_forest",
            "minecraft:roofed_forest_mutated",
            "minecraft:savanna",
            "minecraft:savanna_mutated",
            "minecraft:savanna_plateau",
            "minecraft:savanna_plateau_mutated",
            "minecraft:sunflower_plains",
            "minecraft:swampland",
            "minecraft:swampland_mutated",
            "minecraft:taiga",
            "minecraft:taiga_hills",
            "minecraft:taiga_mutated"
        ],
        "sizes": [
            "small"
        ],
        "label": "OW 15% · 31 biomes · e.g. bamboo_jungle"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.15,
        "noiseScale": 60,
        "targets": [
            "minecraft:deep_dark",
            "minecraft:dripstone_caves",
            "minecraft:lush_caves"
        ],
        "sizes": [
            "small"
        ],
        "label": "OW 15% · 3 biomes · e.g. deep_dark"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.1,
        "noiseScale": 60,
        "targets": [
            "minecraft:beach",
            "minecraft:cold_beach",
            "minecraft:cold_ocean",
            "minecraft:deep_cold_ocean",
            "minecraft:deep_frozen_ocean",
            "minecraft:deep_lukewarm_ocean",
            "minecraft:deep_ocean",
            "minecraft:deep_warm_ocean",
            "minecraft:frozen_ocean",
            "minecraft:frozen_river",
            "minecraft:legacy_frozen_ocean",
            "minecraft:lukewarm_ocean",
            "minecraft:ocean",
            "minecraft:river",
            "minecraft:stone_beach",
            "minecraft:warm_ocean"
        ],
        "sizes": [
            "small"
        ],
        "label": "OW 10% · 16 biomes · e.g. beach"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.08,
        "noiseScale": 3.5,
        "targets": [
            "minecraft:bamboo_jungle",
            "minecraft:bamboo_jungle_hills",
            "minecraft:birch_forest",
            "minecraft:birch_forest_hills",
            "minecraft:birch_forest_hills_mutated",
            "minecraft:birch_forest_mutated",
            "minecraft:cherry_grove",
            "minecraft:flower_forest",
            "minecraft:forest",
            "minecraft:forest_hills",
            "minecraft:jungle",
            "minecraft:jungle_edge",
            "minecraft:jungle_edge_mutated",
            "minecraft:jungle_hills",
            "minecraft:jungle_mutated",
            "minecraft:mangrove_swamp",
            "minecraft:meadow",
            "minecraft:pale_garden",
            "minecraft:plains",
            "minecraft:roofed_forest",
            "minecraft:roofed_forest_mutated",
            "minecraft:savanna",
            "minecraft:savanna_mutated",
            "minecraft:savanna_plateau",
            "minecraft:savanna_plateau_mutated",
            "minecraft:sunflower_plains",
            "minecraft:swampland",
            "minecraft:swampland_mutated",
            "minecraft:taiga",
            "minecraft:taiga_hills",
            "minecraft:taiga_mutated"
        ],
        "sizes": [
            "medium"
        ],
        "label": "OW 8% · 31 biomes · e.g. bamboo_jungle"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.08,
        "noiseScale": 3.5,
        "targets": [
            "minecraft:deep_dark",
            "minecraft:dripstone_caves",
            "minecraft:lush_caves"
        ],
        "sizes": [
            "medium"
        ],
        "label": "OW 8% · 3 biomes · e.g. deep_dark"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.08,
        "noiseScale": 0.08,
        "targets": [
            "minecraft:bamboo_jungle",
            "minecraft:bamboo_jungle_hills",
            "minecraft:birch_forest",
            "minecraft:birch_forest_hills",
            "minecraft:birch_forest_hills_mutated",
            "minecraft:birch_forest_mutated",
            "minecraft:cherry_grove",
            "minecraft:flower_forest",
            "minecraft:forest",
            "minecraft:forest_hills",
            "minecraft:jungle",
            "minecraft:jungle_edge",
            "minecraft:jungle_edge_mutated",
            "minecraft:jungle_hills",
            "minecraft:jungle_mutated",
            "minecraft:mangrove_swamp",
            "minecraft:meadow",
            "minecraft:pale_garden",
            "minecraft:plains",
            "minecraft:roofed_forest",
            "minecraft:roofed_forest_mutated",
            "minecraft:savanna",
            "minecraft:savanna_mutated",
            "minecraft:savanna_plateau",
            "minecraft:savanna_plateau_mutated",
            "minecraft:sunflower_plains",
            "minecraft:swampland",
            "minecraft:swampland_mutated",
            "minecraft:taiga",
            "minecraft:taiga_hills",
            "minecraft:taiga_mutated"
        ],
        "sizes": [
            "large"
        ],
        "label": "OW 8% · 31 biomes · e.g. bamboo_jungle"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.08,
        "noiseScale": 0.08,
        "targets": [
            "minecraft:deep_dark",
            "minecraft:dripstone_caves",
            "minecraft:lush_caves"
        ],
        "sizes": [
            "large"
        ],
        "label": "OW 8% · 3 biomes · e.g. deep_dark"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.06,
        "noiseScale": 3.5,
        "targets": [
            "minecraft:beach",
            "minecraft:cold_beach",
            "minecraft:cold_ocean",
            "minecraft:deep_cold_ocean",
            "minecraft:deep_frozen_ocean",
            "minecraft:deep_lukewarm_ocean",
            "minecraft:deep_ocean",
            "minecraft:deep_warm_ocean",
            "minecraft:frozen_ocean",
            "minecraft:frozen_river",
            "minecraft:legacy_frozen_ocean",
            "minecraft:lukewarm_ocean",
            "minecraft:ocean",
            "minecraft:river",
            "minecraft:stone_beach",
            "minecraft:warm_ocean"
        ],
        "sizes": [
            "medium"
        ],
        "label": "OW 6% · 16 biomes · e.g. beach"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.06,
        "noiseScale": 0.08,
        "targets": [
            "minecraft:beach",
            "minecraft:cold_beach",
            "minecraft:cold_ocean",
            "minecraft:deep_cold_ocean",
            "minecraft:deep_frozen_ocean",
            "minecraft:deep_lukewarm_ocean",
            "minecraft:deep_ocean",
            "minecraft:deep_warm_ocean",
            "minecraft:frozen_ocean",
            "minecraft:frozen_river",
            "minecraft:legacy_frozen_ocean",
            "minecraft:lukewarm_ocean",
            "minecraft:ocean",
            "minecraft:river",
            "minecraft:stone_beach",
            "minecraft:warm_ocean"
        ],
        "sizes": [
            "large"
        ],
        "label": "OW 6% · 16 biomes · e.g. beach"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.05,
        "noiseScale": 60,
        "targets": [
            "minecraft:desert",
            "minecraft:desert_hills",
            "minecraft:desert_mutated",
            "minecraft:extreme_hills",
            "minecraft:extreme_hills_edge",
            "minecraft:extreme_hills_mutated",
            "minecraft:extreme_hills_plus_trees",
            "minecraft:extreme_hills_plus_trees_mutated",
            "minecraft:frozen_peaks",
            "minecraft:jagged_peaks",
            "minecraft:mesa",
            "minecraft:mesa_bryce",
            "minecraft:mesa_plateau",
            "minecraft:mesa_plateau_mutated",
            "minecraft:mesa_plateau_stone",
            "minecraft:mesa_plateau_stone_mutated",
            "minecraft:stony_peaks"
        ],
        "sizes": [
            "small"
        ],
        "label": "OW 5% · 17 biomes · e.g. desert"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.03,
        "noiseScale": 3.5,
        "targets": [
            "minecraft:desert",
            "minecraft:desert_hills",
            "minecraft:desert_mutated",
            "minecraft:extreme_hills",
            "minecraft:extreme_hills_edge",
            "minecraft:extreme_hills_mutated",
            "minecraft:extreme_hills_plus_trees",
            "minecraft:extreme_hills_plus_trees_mutated",
            "minecraft:frozen_peaks",
            "minecraft:jagged_peaks",
            "minecraft:mesa",
            "minecraft:mesa_bryce",
            "minecraft:mesa_plateau",
            "minecraft:mesa_plateau_mutated",
            "minecraft:mesa_plateau_stone",
            "minecraft:mesa_plateau_stone_mutated",
            "minecraft:stony_peaks"
        ],
        "sizes": [
            "medium"
        ],
        "label": "OW 3% · 17 biomes · e.g. desert"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.03,
        "noiseScale": 0.08,
        "targets": [
            "minecraft:desert",
            "minecraft:desert_hills",
            "minecraft:desert_mutated",
            "minecraft:extreme_hills",
            "minecraft:extreme_hills_edge",
            "minecraft:extreme_hills_mutated",
            "minecraft:extreme_hills_plus_trees",
            "minecraft:extreme_hills_plus_trees_mutated",
            "minecraft:frozen_peaks",
            "minecraft:jagged_peaks",
            "minecraft:mesa",
            "minecraft:mesa_bryce",
            "minecraft:mesa_plateau",
            "minecraft:mesa_plateau_mutated",
            "minecraft:mesa_plateau_stone",
            "minecraft:mesa_plateau_stone_mutated",
            "minecraft:stony_peaks"
        ],
        "sizes": [
            "large"
        ],
        "label": "OW 3% · 17 biomes · e.g. desert"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.02,
        "noiseScale": 60,
        "targets": [
            "minecraft:cold_taiga",
            "minecraft:cold_taiga_hills",
            "minecraft:cold_taiga_mutated",
            "minecraft:grove",
            "minecraft:ice_plains",
            "minecraft:ice_plains_spikes",
            "minecraft:snowy_slopes"
        ],
        "sizes": [
            "small"
        ],
        "label": "OW 2% · 7 biomes · e.g. cold_taiga"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.02,
        "noiseScale": 0.08,
        "targets": [
            "minecraft:cold_taiga",
            "minecraft:cold_taiga_hills",
            "minecraft:cold_taiga_mutated",
            "minecraft:grove",
            "minecraft:ice_plains",
            "minecraft:ice_plains_spikes",
            "minecraft:snowy_slopes"
        ],
        "sizes": [
            "large"
        ],
        "label": "OW 2% · 7 biomes · e.g. cold_taiga"
    },
    {
        "dimension": "minecraft:overworld",
        "amount": 0.01,
        "noiseScale": 3.5,
        "targets": [
            "minecraft:cold_taiga",
            "minecraft:cold_taiga_hills",
            "minecraft:cold_taiga_mutated",
            "minecraft:grove",
            "minecraft:ice_plains",
            "minecraft:ice_plains_spikes",
            "minecraft:snowy_slopes"
        ],
        "sizes": [
            "medium"
        ],
        "label": "OW 1% · 7 biomes · e.g. cold_taiga"
    }
];

const _intentionalSafeOw = new Set(INTENTIONAL_SAFE_OVERWORLD_BIOMES);
const _otherDimCatalog = new Set(OTHER_DIMENSION_CATALOG_IDS);

const _targetIndex = new Map();
for (const group of REPLACEMENT_GROUPS) {
    for (const id of group.targets) {
        if (!_targetIndex.has(id)) _targetIndex.set(id, []);
        _targetIndex.get(id).push(group);
    }
}

export function normalizeBiomeId(biome) {
    if (!biome) return null;
    if (typeof biome === "string") return biome;
    return biome.id ?? null;
}

export function isInfectedComponentBiome(biomeId) {
    if (!biomeId) return false;
    return INFECTED_BIOME_COMPONENT_IDS.includes(biomeId) || biomeId.includes("infected_biome");
}

export function getReplacementGroupsForTarget(biomeId) {
    return _targetIndex.get(biomeId) ?? [];
}

export function isBiomeInReplaceList(biomeId, dimensionId = "minecraft:overworld") {
    if (!biomeId) return false;
    const groups = _targetIndex.get(biomeId);
    if (!groups?.length) return false;
    return groups.some((g) => g.dimension === dimensionId);
}

export function getAllReplaceTargets(dimensionId = "minecraft:overworld") {
    const out = new Set();
    for (const g of REPLACEMENT_GROUPS) {
        if (g.dimension === dimensionId) {
            for (const t of g.targets) out.add(t);
        }
    }
    return [...out].sort();
}

export function isIntentionalSafeOverworld(biomeId) {
    return !!biomeId && _intentionalSafeOw.has(biomeId);
}

export function isOtherDimensionCatalogId(biomeId) {
    return !!biomeId && _otherDimCatalog.has(biomeId);
}

/** Split catalog gaps: intentional safe OW, unlisted OW (review), Nether/End not in pack JSON. */
export function getCatalogGapsOverworld() {
    const listed = new Set(getAllReplaceTargets("minecraft:overworld"));
    const owGaps = VANILLA_BIOME_REFERENCE_CATALOG.filter(
        (id) => !_otherDimCatalog.has(id) && !listed.has(id)
    );
    return {
        intentionalSafe: owGaps.filter((id) => _intentionalSafeOw.has(id)),
        unlisted: owGaps.filter((id) => !_intentionalSafeOw.has(id)),
        otherDimensionInCatalog: [...OTHER_DIMENSION_CATALOG_IDS]
    };
}

/** Overworld catalog ids not on replace list and not marked intentional safe. */
export function getMissingVanillaOverworldBiomes() {
    return getCatalogGapsOverworld().unlisted;
}

export function getBiomeCheckAtLocation(dimension, location) {
    let biomeId = null;
    let error = null;
    try {
        const b = dimension?.getBiome?.(location);
        biomeId = normalizeBiomeId(b);
    } catch (e) {
        error = String(e?.message || e);
    }
    const dimId = dimension?.id ?? "";
    const infected = isInfectedComponentBiome(biomeId);
    const inList = isBiomeInReplaceList(biomeId, dimId);
    const groups = getReplacementGroupsForTarget(biomeId);
    return {
        biomeId,
        dimensionId: dimId,
        infected,
        inReplaceList: inList,
        groups,
        error
    };
}

export function formatBiomeCheckLines(check) {
    const lines = [];
    lines.push(`Dimension: ${check.dimensionId || "?"}`);
    lines.push(`Biome: ${check.biomeId || "§8(unknown)"}`);
    if (check.error) lines.push(`§cError: ${check.error}`);
    if (check.infected) {
        lines.push("§dStatus: §fInfected component biome §8(mb:…)");
    } else if (check.inReplaceList) {
        const g = check.groups[0];
        const pct = g ? `${(g.amount * 100).toFixed(0)}% replace` : "";
        lines.push(`§aStatus: §fOn replace list §8(${pct})`);
        if (check.groups.length > 1) {
            lines.push(`§8Groups: ${check.groups.map((x) => x.label).join("; ")}`);
        }
    } else if (check.dimensionId === "minecraft:overworld" && isIntentionalSafeOverworld(check.biomeId)) {
        lines.push("§bStatus: §fSafe by design §8(not in replace list on purpose)");
    } else if (isOtherDimensionCatalogId(check.biomeId)) {
        lines.push("§7Status: §fOther-dim id §8(not in infected biome JSON yet)");
    } else {
        lines.push("§eStatus: §fNOT on replace list §8(review — add to JSON or safe list)");
    }
    return lines.join("\n");
}

/** Action-bar segment for dev biome HUD (full biome id, no truncation). */
export function formatBiomeCheckHudSegment(check, compact = false) {
    const name = (check.biomeId || "?").replace("minecraft:", "");
    let status;
    if (check.error) status = "§cERR§r";
    else if (check.infected) status = "§dINF§r";
    else if (check.inReplaceList) {
        const g = check.groups[0];
        const pct = g?.amount != null ? `${Math.round(g.amount * 100)}` : "";
        status = pct ? `§aLIST§8${pct}§r` : "§aLIST§r";
    } else if (check.dimensionId === "minecraft:overworld" && isIntentionalSafeOverworld(check.biomeId)) {
        status = "§bSAFE§r";
    } else if (
        isOtherDimensionCatalogId(check.biomeId) ||
        check.dimensionId === "minecraft:the_nether" ||
        check.dimensionId === "minecraft:the_end"
    ) {
        status = "§cNDIM§r";
    } else {
        status = "§eGAP§r";
    }
    const dim = (check.dimensionId || "?").replace("minecraft:", "");
    const dimTag =
        dim === "overworld" ? "OW" : dim === "the_nether" ? "N" : dim === "the_end" ? "E" : dim.slice(0, 4);
    const tag = compact ? "§2B§r" : "§2Bio§r";
    return `${tag} §8${dimTag}§f ${name} ${status}`;
}
