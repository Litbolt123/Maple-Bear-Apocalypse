/**
 * Regenerate BP - Dev/scripts/mb_biomeReplaceRegistry.js from infected biome JSON.
 * Run: node tools/syncBiomeReplaceRegistry.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BIOME_DIR = path.join(ROOT, "BP - Dev", "biomes");
const OUT_DEV = path.join(ROOT, "BP - Dev", "scripts", "mb_biomeReplaceRegistry.js");
const OUT_BP = path.join(ROOT, "BP", "scripts", "mb_biomeReplaceRegistry.js");
const REF_DIR = path.join(ROOT, "dev", "biomes stuff", "biomes");

function loadReplaceGroups(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const reps = raw?.["minecraft:biome"]?.components?.["minecraft:replace_biomes"]?.replacements;
    if (!Array.isArray(reps)) return [];
    return reps.map((r) => ({
        dimension: r.dimension || "minecraft:overworld",
        amount: r.amount ?? 0,
        noiseScale: r.noise_frequency_scale ?? 0,
        targets: [...(r.targets || [])].sort()
    }));
}

function mergeGroups(bySize) {
    const map = new Map();
    for (const [size, groups] of Object.entries(bySize)) {
        for (const g of groups) {
            const key = `${g.dimension}|${g.amount}|${g.noiseScale}|${g.targets.join(",")}`;
            if (!map.has(key)) {
                map.set(key, { ...g, sizes: [size], label: "" });
            } else {
                map.get(key).sizes.push(size);
            }
        }
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function labelForGroup(g) {
    const pct = `${(g.amount * 100).toFixed(0)}%`;
    const n = g.targets.length;
    const first = g.targets[0]?.replace("minecraft:", "") ?? "?";
    return `OW ${pct} · ${n} biomes · e.g. ${first}`;
}

function collectVanillaCatalog() {
    const ids = new Set();
    if (fs.existsSync(REF_DIR)) {
        for (const name of fs.readdirSync(REF_DIR)) {
            if (!name.endsWith(".biome.json")) continue;
            ids.add(`minecraft:${name.replace(/\.biome\.json$/, "")}`);
        }
    }
    return [...ids].sort();
}

const sizes = ["small", "medium", "large"];
const bySize = {};
for (const size of sizes) {
    const fp = path.join(BIOME_DIR, `mb_infected_biome_${size}.json`);
    if (!fs.existsSync(fp)) {
        console.warn("Missing", fp);
        continue;
    }
    bySize[size] = loadReplaceGroups(fp);
}

const merged = mergeGroups(bySize);
merged.forEach((g) => {
    g.label = labelForGroup(g);
});

/** Overworld biomes deliberately excluded from replace_biomes (safer zones). Edit here + re-run sync. */
const INTENTIONAL_SAFE_OVERWORLD_BIOMES = [
    "minecraft:mushroom_island",
    "minecraft:mushroom_island_shore",
    "minecraft:mega_taiga",
    "minecraft:mega_taiga_hills",
    "minecraft:ice_mountains",
    "minecraft:redwood_taiga_mutated",
    "minecraft:redwood_taiga_hills_mutated"
];

/** In reference catalog but not in mb_infected_biome_*.json yet (Nether/End). */
const OTHER_DIMENSION_CATALOG_IDS = [
    "minecraft:basalt_deltas",
    "minecraft:crimson_forest",
    "minecraft:hell",
    "minecraft:soulsand_valley",
    "minecraft:the_end",
    "minecraft:warped_forest"
];

const catalog = collectVanillaCatalog();
const owTargets = new Set(getAllReplaceTargetsFromMerged(merged, "minecraft:overworld"));
const missingFromCatalog = catalog.filter(
    (id) => !owTargets.has(id) && !OTHER_DIMENSION_CATALOG_IDS.includes(id)
);

function getAllReplaceTargetsFromMerged(groups, dimensionId) {
    const out = new Set();
    for (const g of groups) {
        if (g.dimension === dimensionId) {
            for (const t of g.targets) out.add(t);
        }
    }
    return [...out];
}

const out = `/**
 * Infected biome replace_biomes targets (from BP - Dev/biomes/mb_infected_biome_*.json).
 * Regenerate: node tools/syncBiomeReplaceRegistry.cjs
 */

export const INFECTED_BIOME_COMPONENT_IDS = [
    "mb:infected_biome_small",
    "mb:infected_biome_medium",
    "mb:infected_biome_large"
];

/** Reference catalog of vanilla biome ids (dev/biomes stuff) for "missing from replace list". */
export const VANILLA_BIOME_REFERENCE_CATALOG = ${JSON.stringify(catalog, null, 4)};

/** Overworld safe zones by design — not in replace_biomes on purpose (see docs/design/SAFE_BIOMES.md). */
export const INTENTIONAL_SAFE_OVERWORLD_BIOMES = ${JSON.stringify(INTENTIONAL_SAFE_OVERWORLD_BIOMES, null, 4)};

/** Nether/End ids in catalog but not present in infected biome JSON yet. */
export const OTHER_DIMENSION_CATALOG_IDS = ${JSON.stringify(OTHER_DIMENSION_CATALOG_IDS, null, 4)};

/** Merged replacement rows (same targets/amount across patch sizes). */
export const REPLACEMENT_GROUPS = ${JSON.stringify(merged, null, 4)};

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
    lines.push(\`Dimension: \${check.dimensionId || "?"}\`);
    lines.push(\`Biome: \${check.biomeId || "§8(unknown)"}\`);
    if (check.error) lines.push(\`§cError: \${check.error}\`);
    if (check.infected) {
        lines.push("§dStatus: §fInfected component biome §8(mb:…)");
    } else if (check.inReplaceList) {
        const g = check.groups[0];
        const pct = g ? \`\${(g.amount * 100).toFixed(0)}% replace\` : "";
        lines.push(\`§aStatus: §fOn replace list §8(\${pct})\`);
        if (check.groups.length > 1) {
            lines.push(\`§8Groups: \${check.groups.map((x) => x.label).join("; ")}\`);
        }
    } else if (check.dimensionId === "minecraft:overworld" && isIntentionalSafeOverworld(check.biomeId)) {
        lines.push("§bStatus: §fSafe by design §8(not in replace list on purpose)");
    } else if (isOtherDimensionCatalogId(check.biomeId)) {
        lines.push("§7Status: §fOther-dim id §8(not in infected biome JSON yet)");
    } else {
        lines.push("§eStatus: §fNOT on replace list §8(review — add to JSON or safe list)");
    }
    return lines.join("\\n");
}

/** Action-bar segment for dev biome HUD (full biome id, no truncation). */
export function formatBiomeCheckHudSegment(check, compact = false) {
    const name = (check.biomeId || "?").replace("minecraft:", "");
    let status;
    if (check.error) status = "§cERR§r";
    else if (check.infected) status = "§dINF§r";
    else if (check.inReplaceList) {
        const g = check.groups[0];
        const pct = g?.amount != null ? \`\${Math.round(g.amount * 100)}\` : "";
        status = pct ? \`§aLIST§8\${pct}§r\` : "§aLIST§r";
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
    return \`\${tag} §8\${dimTag}§f \${name} \${status}\`;
}
`;

fs.writeFileSync(OUT_DEV, out, "utf8");
fs.writeFileSync(OUT_BP, out, "utf8");
const gaps = {
    intentionalSafe: missingFromCatalog.filter((id) => INTENTIONAL_SAFE_OVERWORLD_BIOMES.includes(id)),
    unlisted: missingFromCatalog.filter((id) => !INTENTIONAL_SAFE_OVERWORLD_BIOMES.includes(id))
};

console.log("Wrote", OUT_DEV, "and", OUT_BP);
console.log("Replace targets (OW):", owTargets.size);
console.log("Safe by design (OW):", gaps.intentionalSafe.length, gaps.intentionalSafe.join(", ") || "(none)");
console.log("Review gaps (OW):", gaps.unlisted.length, gaps.unlisted.join(", ") || "(none)");
console.log("Nether/End not in JSON:", OTHER_DIMENSION_CATALOG_IDS.length, OTHER_DIMENSION_CATALOG_IDS.join(", "));
