/**
 * Generate infected leaf / wood block JSON, loot, lang, terrain, and
 * BP - Dev/scripts/mb_infectedVegetation.js from one species table.
 *
 * Do not emit minecraft:tick on infected leaves/wood — hops are player-centric
 * (mb_leafInfection.js / mb_woodInfection.js). Ticking every converted cell
 * stalls when a forest is already dusty. Do not register custom-component
 * onTick either: the engine errors if onTick is subscribed without minecraft:tick.
 *
 *   node tools/generateInfectedVegetationPack.js
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const LEAF_DUST_MAX = 3;
const STAGE_LABELS = ["", " (Dusted)", " (Faded)", " (Snow)"];

const LEAF_SPECIES = [
    {
        id: "oak",
        title: "Oak",
        vanilla: ["minecraft:oak_leaves", "minecraft:leaves"],
        sapling: "minecraft:oak_sapling",
        apple: true,
        needsBiomeConvert: false
    },
    {
        id: "birch",
        title: "Birch",
        vanilla: ["minecraft:birch_leaves"],
        sapling: "minecraft:birch_sapling",
        apple: false,
        needsBiomeConvert: true
    },
    {
        id: "spruce",
        title: "Spruce",
        vanilla: ["minecraft:spruce_leaves"],
        sapling: "minecraft:spruce_sapling",
        apple: false,
        needsBiomeConvert: true
    },
    {
        id: "jungle",
        title: "Jungle",
        vanilla: ["minecraft:jungle_leaves"],
        sapling: "minecraft:jungle_sapling",
        apple: false,
        needsBiomeConvert: false
    },
    {
        id: "acacia",
        title: "Acacia",
        vanilla: ["minecraft:acacia_leaves"],
        sapling: "minecraft:acacia_sapling",
        apple: false,
        needsBiomeConvert: false
    },
    {
        id: "dark_oak",
        title: "Dark Oak",
        vanilla: ["minecraft:dark_oak_leaves", "minecraft:leaves2"],
        sapling: "minecraft:dark_oak_sapling",
        apple: true,
        needsBiomeConvert: false
    },
    {
        id: "mangrove",
        title: "Mangrove",
        vanilla: ["minecraft:mangrove_leaves"],
        sapling: "minecraft:mangrove_propagule",
        apple: false,
        needsBiomeConvert: false
    },
    {
        id: "cherry",
        title: "Cherry",
        vanilla: ["minecraft:cherry_leaves"],
        sapling: "minecraft:cherry_sapling",
        apple: false,
        needsBiomeConvert: true
    },
    {
        id: "azalea",
        title: "Azalea",
        vanilla: ["minecraft:azalea_leaves"],
        sapling: "minecraft:azalea",
        apple: false,
        needsBiomeConvert: true
    },
    {
        id: "flowering_azalea",
        title: "Flowering Azalea",
        vanilla: ["minecraft:azalea_leaves_flowered"],
        sapling: "minecraft:flowering_azalea",
        apple: false,
        needsBiomeConvert: true
    },
    {
        id: "pale_oak",
        title: "Pale Oak",
        vanilla: ["minecraft:pale_oak_leaves"],
        sapling: "minecraft:pale_oak_sapling",
        apple: false,
        needsBiomeConvert: true
    },
    {
        id: "red_poplar",
        title: "Red Poplar",
        vanilla: ["minecraft:red_poplar_leaves"],
        sapling: "minecraft:poplar_sapling",
        apple: false,
        needsBiomeConvert: true
    },
    {
        id: "orange_poplar",
        title: "Orange Poplar",
        vanilla: ["minecraft:orange_poplar_leaves"],
        sapling: "minecraft:poplar_sapling",
        apple: false,
        needsBiomeConvert: true
    },
    {
        id: "yellow_poplar",
        title: "Yellow Poplar",
        vanilla: ["minecraft:yellow_poplar_leaves"],
        sapling: "minecraft:poplar_sapling",
        apple: false,
        needsBiomeConvert: true
    }
];

const WOOD_SPECIES = [
    { id: "oak", title: "Oak" },
    { id: "birch", title: "Birch" },
    { id: "spruce", title: "Spruce" },
    { id: "jungle", title: "Jungle" },
    { id: "acacia", title: "Acacia" },
    { id: "dark_oak", title: "Dark Oak" },
    { id: "mangrove", title: "Mangrove" },
    { id: "cherry", title: "Cherry" },
    { id: "pale_oak", title: "Pale Oak" },
    { id: "poplar", title: "Poplar" },
    {
        id: "crimson",
        title: "Crimson",
        flammable: false,
        kinds: [
            { id: "log", title: "Stem", vanilla: "minecraft:crimson_stem" },
            { id: "wood", title: "Hyphae", vanilla: "minecraft:crimson_hyphae" },
            { id: "stripped_log", title: "Stripped Stem", vanilla: "minecraft:stripped_crimson_stem" },
            { id: "stripped_wood", title: "Stripped Hyphae", vanilla: "minecraft:stripped_crimson_hyphae" }
        ]
    },
    {
        id: "warped",
        title: "Warped",
        flammable: false,
        kinds: [
            { id: "log", title: "Stem", vanilla: "minecraft:warped_stem" },
            { id: "wood", title: "Hyphae", vanilla: "minecraft:warped_hyphae" },
            { id: "stripped_log", title: "Stripped Stem", vanilla: "minecraft:stripped_warped_stem" },
            { id: "stripped_wood", title: "Stripped Hyphae", vanilla: "minecraft:stripped_warped_hyphae" }
        ]
    },
    {
        id: "nether_wart",
        title: "Nether Wart",
        flammable: false,
        noAxis: true,
        kinds: [
            { id: "block", title: "Block", vanilla: "minecraft:nether_wart_block", textureGroup: "block" }
        ]
    },
    {
        id: "warped_wart",
        title: "Warped Wart",
        flammable: false,
        noAxis: true,
        kinds: [
            { id: "block", title: "Block", vanilla: "minecraft:warped_wart_block", textureGroup: "block" }
        ]
    }
];

const WOOD_KINDS = [
    { id: "log", title: "Log", vanilla: (s) => `minecraft:${s}_log` },
    { id: "wood", title: "Wood", vanilla: (s) => `minecraft:${s}_wood` },
    { id: "stripped_log", title: "Stripped Log", vanilla: (s) => `minecraft:stripped_${s}_log` },
    { id: "stripped_wood", title: "Stripped Wood", vanilla: (s) => `minecraft:stripped_${s}_wood` }
];

function leafSuffix(species) {
    return species.suffix || "leaves";
}

function leafNoun(species) {
    return species.displayNoun || "Leaves";
}

function leafStageId(species, stage) {
    const suffix = leafSuffix(species);
    return stage === 0
        ? `mb:infected_${species.id}_${suffix}`
        : `mb:infected_${species.id}_${suffix}_${stage}`;
}

function leafTexture(species, stage) {
    if (species.opaque) return `infected_${species.id}_${leafSuffix(species)}_${stage}`;
    if (species.id === "birch" && stage === 0) return "infected_birch_leaves";
    return `infected_${species.id}_leaves_${stage}`;
}

function resolvedKinds(species) {
    if (species.kinds) {
        return species.kinds.map((k) => ({
            id: k.id,
            title: k.title,
            vanilla: typeof k.vanilla === "function" ? k.vanilla(species.id) : k.vanilla,
            textureGroup: k.textureGroup
        }));
    }
    return WOOD_KINDS.map((k) => ({
        id: k.id,
        title: k.title,
        vanilla: k.vanilla(species.id)
    }));
}

/** Same weights as dusted_dirt (15%). Leaves use 30% (twice as often). */
function snowDropPool(percent) {
    const snow = Math.max(1, Math.min(99, percent | 0));
    return {
        rolls: 1,
        entries: [
            {
                type: "item",
                name: "mb:snow",
                weight: snow,
                functions: [{ function: "set_count", count: { min: 1, max: 1 } }]
            },
            { type: "empty", weight: 100 - snow }
        ]
    };
}

function plankIdForSpecies(species) {
    if (species.noAxis) return null;
    if (species.id === "crimson") return "minecraft:crimson_planks";
    if (species.id === "warped") return "minecraft:warped_planks";
    return `minecraft:${species.id}_planks`;
}

function kindCraftsToPlanks(kind) {
    return kind.id === "log"
        || kind.id === "wood"
        || kind.id === "stripped_log"
        || kind.id === "stripped_wood";
}

function woodId(speciesId, kindId) {
    if (kindId === "stripped_log") return `mb:infected_stripped_${speciesId}_log`;
    if (kindId === "stripped_wood") return `mb:infected_stripped_${speciesId}_wood`;
    return `mb:infected_${speciesId}_${kindId}`;
}

function writeJson(path, data) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`);
}

function leafBlockJson(species, stage) {
    const id = leafStageId(species, stage);
    const tex = leafTexture(species, stage);
    const snow = stage === 3;
    const display = `Infected ${species.title} Leaves${STAGE_LABELS[stage]}`;
    const material = {
        texture: tex,
        // Single-sided cutout (no same-plane z-fight). Far wall comes from
        // inward planes on geometry.infected_oak_leaves, not two-sided alpha.
        // Do not cull leaf-against-leaf — that hides the next cube's near face.
        render_method: "alpha_test_single_sided_to_opaque",
        ambient_occlusion: false,
        face_dimming: true
    };
    if (!snow) material.tint_method = "default_foliage";
    const mapColor = snow
        ? { color: "#E8E0D4" }
        : { color: stage === 0 ? "#7A6E5C" : stage === 1 ? "#C4C0B4" : "#D8D4C8", tint_method: "default_foliage" };
    const particles = snow ? { texture: tex } : { texture: tex, tint_method: "default_foliage" };
    const states = stage === 0 && species.id === "oak"
        ? { "mb:persistent": [false, true], "mb:dust": [0, 1, 2, 3] }
        : { "mb:persistent": [false, true] };
    return {
        format_version: "1.26.10",
        "minecraft:block": {
            description: {
                identifier: id,
                menu_category: { category: "nature" },
                states
            },
            components: {
                "minecraft:geometry": "geometry.infected_oak_leaves",
                "minecraft:material_instances": { "*": material },
                "minecraft:display_name": display,
                "minecraft:map_color": mapColor,
                "minecraft:destruction_particles": particles,
                "minecraft:destructible_by_mining": { seconds_to_destroy: 0.2, use_efficiency: true },
                "minecraft:destructible_by_explosion": { explosion_resistance: 0.2 },
                "minecraft:light_dampening": 1,
                "minecraft:collision_box": true,
                "minecraft:flammable": { catch_chance_modifier: 30, destroy_chance_modifier: 60 },
                "minecraft:loot": `loot_tables/blocks/${id.slice(3)}.json`,
                "mb:infected_oak_leaf": {},
                "tag:minecraft:is_shears_item_destructible": {},
                "tag:minecraft:is_hoe_item_destructible": {}
            }
        }
    };
}

function leafLootJson(species, stage) {
    const id = leafStageId(species, stage);
    const pools = [
        {
            rolls: 1,
            conditions: [{ condition: "match_tool", item: "minecraft:shears" }],
            entries: [{ type: "item", name: id }]
        }
    ];
    if (species.sapling) {
        pools.push({
            rolls: 1,
            conditions: [{ condition: "random_chance", chance: 0.05 }],
            entries: [{ type: "item", name: species.sapling }]
        });
    }
    pools.push({
        rolls: 1,
        conditions: [{ condition: "random_chance", chance: 0.02 }],
        entries: [
            {
                type: "item",
                name: "minecraft:stick",
                functions: [{ function: "set_count", count: { min: 1, max: 2 } }]
            }
        ]
    });
    if (species.apple) {
        pools.push({
            rolls: 1,
            conditions: [{ condition: "random_chance", chance: 0.005 }],
            entries: [{ type: "item", name: "minecraft:apple" }]
        });
    }
    pools.push(snowDropPool(30));
    return { pools };
}

function woodSideTex(species, kind, stage) {
    const group = kind.textureGroup
        || (kind.id.startsWith("stripped") ? "stripped_side" : "log_side");
    return `infected_${species.id}_${group}_${stage}`;
}

function woodTopTex(species, kind, stage) {
    if (kind.textureGroup || kind.id === "wood" || kind.id === "stripped_wood") {
        return woodSideTex(species, kind, stage);
    }
    const group = kind.id.startsWith("stripped") ? "stripped_top" : "log_top";
    return `infected_${species.id}_${group}_${stage}`;
}

function woodBlockJson(species, kind) {
    const id = woodId(species.id, kind.id);
    const noAxis = species.noAxis === true;
    const flammable = species.flammable === false
        ? { catch_chance_modifier: 0, destroy_chance_modifier: 0 }
        : { catch_chance_modifier: 5, destroy_chance_modifier: 5 };
    const permutations = [];
    for (let d = 0; d <= LEAF_DUST_MAX; d++) {
        const side = woodSideTex(species, kind, d);
        const top = woodTopTex(species, kind, d);
        permutations.push({
            condition: `q.block_state('mb:dust') == ${d}`,
            components: {
                "minecraft:material_instances": {
                    "*": { texture: side, render_method: "opaque" },
                    up: { texture: top, render_method: "opaque" },
                    down: { texture: top, render_method: "opaque" }
                },
                "minecraft:destruction_particles": { texture: side }
            }
        });
    }
    if (!noAxis) {
        permutations.push({
            condition: "q.block_state('mb:axis') == 'x'",
            components: { "minecraft:transformation": { rotation: [0, 0, 90] } }
        });
        permutations.push({
            condition: "q.block_state('mb:axis') == 'z'",
            components: { "minecraft:transformation": { rotation: [90, 0, 0] } }
        });
    }
    const side0 = woodSideTex(species, kind, 0);
    const top0 = woodTopTex(species, kind, 0);
    const states = noAxis
        ? { "mb:dust": [0, 1, 2, 3] }
        : { "mb:dust": [0, 1, 2, 3], "mb:axis": ["y", "x", "z"] };
    return {
        format_version: "1.26.10",
        "minecraft:block": {
            description: {
                identifier: id,
                menu_category: { category: "nature" },
                states
            },
            components: {
                "minecraft:geometry": "minecraft:geometry.full_block",
                "minecraft:material_instances": {
                    "*": { texture: side0, render_method: "opaque" },
                    up: { texture: top0, render_method: "opaque" },
                    down: { texture: top0, render_method: "opaque" }
                },
                "minecraft:display_name": `Infected ${species.title} ${kind.title}`,
                "minecraft:map_color": { color: "#C8C0B0" },
                "minecraft:destructible_by_mining": { seconds_to_destroy: noAxis ? 1 : 2, use_efficiency: true },
                "minecraft:destructible_by_explosion": { explosion_resistance: 1 },
                "minecraft:light_dampening": 15,
                "minecraft:collision_box": true,
                "minecraft:flammable": flammable,
                "minecraft:loot": `loot_tables/blocks/${id.slice(3)}.json`,
                "mb:infected_wood": {},
                "tag:minecraft:is_axe_item_destructible": {},
                "tag:minecraft:is_hoe_item_destructible": {}
            },
            permutations
        }
    };
}

function woodLootJson(species, kind) {
    const drop = plankIdForSpecies(species) && kindCraftsToPlanks(kind)
        ? woodId(species.id, kind.id)
        : kind.vanilla;
    return {
        pools: [
            {
                rolls: 1,
                entries: [{ type: "item", name: drop }]
            },
            snowDropPool(15)
        ]
    };
}

function woodPlankRecipeJson(species, kind) {
    const id = woodId(species.id, kind.id);
    const plank = plankIdForSpecies(species);
    return {
        format_version: "1.21.80",
        "minecraft:recipe_shapeless": {
            description: { identifier: `${id}_to_planks` },
            tags: ["crafting_table"],
            group: "planks",
            unlock: [{ item: id }],
            ingredients: [{ item: id }],
            result: { item: plank, count: 2 }
        }
    };
}

function allLeafIds() {
    const ids = [];
    for (const s of LEAF_SPECIES) {
        for (let d = 0; d <= LEAF_DUST_MAX; d++) ids.push(leafStageId(s, d));
    }
    return ids;
}

function allWoodIds() {
    const ids = [];
    for (const s of WOOD_SPECIES) {
        for (const k of resolvedKinds(s)) ids.push(woodId(s.id, k.id));
    }
    return ids;
}

function allVanillaLeaves() {
    const catalog = JSON.parse(readFileSync(join(root, "data", "bedrock_blocks.json"), "utf8")).blocks;
    const known = new Set(catalog);
    const ids = LEAF_SPECIES.flatMap((s) => s.vanilla);
    const skipped = ids.filter((id) => !known.has(id));
    if (skipped.length) {
        throw new Error(`non-Bedrock vanilla leaf ids (check data/bedrock_blocks.json): ${skipped.join(", ")}`);
    }
    return ids;
}

function mergeTerrain(path) {
    const json = JSON.parse(readFileSync(path, "utf8"));
    const data = json.texture_data;
    for (const s of LEAF_SPECIES) {
        for (let d = 0; d <= LEAF_DUST_MAX; d++) {
            const key = leafTexture(s, d);
            data[key] = { textures: `textures/blocks/${key}` };
        }
        if (s.id === "oak") {
            data.infected_oak_leaves = { textures: "textures/blocks/infected_oak_leaves" };
            data.infected_oak_leaves_oak = { textures: "textures/blocks/infected_oak_leaves_oak" };
        }
    }
    for (const s of WOOD_SPECIES) {
        const groups = new Set();
        for (const k of resolvedKinds(s)) {
            const side = woodSideTex(s, k, 0).replace(/_\d+$/, "").replace(`infected_${s.id}_`, "");
            const top = woodTopTex(s, k, 0).replace(/_\d+$/, "").replace(`infected_${s.id}_`, "");
            groups.add(side);
            groups.add(top);
        }
        for (const group of groups) {
            for (let d = 0; d <= LEAF_DUST_MAX; d++) {
                const key = `infected_${s.id}_${group}_${d}`;
                data[key] = { textures: `textures/blocks/${key}` };
            }
        }
    }
    writeFileSync(path, `${JSON.stringify(json, null, "\t")}\n`);
}

function mergeBlocksJson(path) {
    const json = JSON.parse(readFileSync(path, "utf8"));
    for (const id of allLeafIds()) {
        json[id] = { sound: "grass" };
    }
    for (const s of WOOD_SPECIES) {
        const sound = s.noAxis ? "nether_wart" : s.flammable === false ? "stem" : "wood";
        for (const k of resolvedKinds(s)) {
            json[woodId(s.id, k.id)] = { sound };
        }
    }
    writeFileSync(path, `${JSON.stringify(json, null, "\t")}\n`);
}

function mergeLang(path) {
    let text = readFileSync(path, "utf8");
    const lines = [];
    for (const s of LEAF_SPECIES) {
        for (let d = 0; d <= LEAF_DUST_MAX; d++) {
            const id = leafStageId(s, d);
            const name = `Infected ${s.title} Leaves${STAGE_LABELS[d]}`;
            lines.push(`tile.${id}.name=${name}`);
            lines.push(`item.${id}=${name}`);
        }
    }
    for (const s of WOOD_SPECIES) {
        for (const k of resolvedKinds(s)) {
            const id = woodId(s.id, k.id);
            const name = `Infected ${s.title} ${k.title}`;
            lines.push(`tile.${id}.name=${name}`);
            lines.push(`item.${id}=${name}`);
        }
    }
    const startMark = "## BEGIN infected vegetation";
    const endMark = "## END infected vegetation";
    const start = text.indexOf(startMark);
    const end = text.indexOf(endMark);
    if (start < 0 || end < 0 || end <= start) {
        throw new Error(`lang sentinels missing in ${path}`);
    }
    let from = start + startMark.length;
    if (text[from] === "\r") from++;
    if (text[from] === "\n") from++;
    text = `${text.slice(0, from)}${lines.join("\n")}\n${text.slice(end)}`;
    writeFileSync(path, text);
}

function writeRuntimeModule() {
    const speciesLit = JSON.stringify(LEAF_SPECIES, null, 4);
    const woodLit = JSON.stringify(
        WOOD_SPECIES.map((s) => ({
            id: s.id,
            title: s.title,
            kinds: resolvedKinds(s).map((k) => ({
                id: k.id,
                title: k.title,
                vanilla: k.vanilla,
                infected: woodId(s.id, k.id)
            }))
        })),
        null,
        4
    );
    const src = `/**
 * Infected leaf + wood identifiers. Generated by tools/generateInfectedVegetationPack.js.
 * Do not edit by hand — change the generator and re-run it.
 */

export const LEAF_DUST_MAX = ${LEAF_DUST_MAX};

export const LEAF_SPECIES = ${speciesLit};

export const WOOD_SPECIES = ${woodLit};

export function infectedLeafStageId(speciesId, stage) {
    const d = Math.max(0, Math.min(LEAF_DUST_MAX, stage | 0));
    return d === 0 ? \`mb:infected_\${speciesId}_leaves\` : \`mb:infected_\${speciesId}_leaves_\${d}\`;
}

export const INFECTED_OAK_LEAF_STAGE_IDS = [0, 1, 2, 3].map((d) => infectedLeafStageId("oak", d));
export const INFECTED_OAK_LEAVES_ID = INFECTED_OAK_LEAF_STAGE_IDS[0];
export const INFECTED_BIRCH_LEAVES_ID = infectedLeafStageId("birch", 0);

const vanillaToSpecies = new Map();
const infectedToMeta = new Map();
export const ALL_INFECTED_LEAF_IDS = [];
export const CONVERTIBLE_LEAVES = new Set();
export const BIOME_CONVERT_VANILLA = new Set();

for (const spec of LEAF_SPECIES) {
    const stages = [0, 1, 2, 3].map((d) => infectedLeafStageId(spec.id, d));
    spec.stages = stages;
    for (const v of spec.vanilla) {
        vanillaToSpecies.set(v, spec);
        CONVERTIBLE_LEAVES.add(v);
        if (spec.needsBiomeConvert) BIOME_CONVERT_VANILLA.add(v);
    }
    stages.forEach((id, stage) => {
        ALL_INFECTED_LEAF_IDS.push(id);
        infectedToMeta.set(id, { spec, stage });
    });
}

const woodVanillaToInfected = new Map();
export const ALL_INFECTED_WOOD_IDS = [];
export const CONVERTIBLE_WOOD = new Set();

for (const spec of WOOD_SPECIES) {
    for (const kind of spec.kinds) {
        woodVanillaToInfected.set(kind.vanilla, kind.infected);
        CONVERTIBLE_WOOD.add(kind.vanilla);
        ALL_INFECTED_WOOD_IDS.push(kind.infected);
    }
}

export function isInfectedLeafId(typeId) {
    return infectedToMeta.has(typeId);
}

export function isConvertibleVanillaLeaf(typeId) {
    return CONVERTIBLE_LEAVES.has(typeId);
}

export function leafMetaFromInfectedId(typeId) {
    return infectedToMeta.get(typeId);
}

export function vanillaLeafIdForInfected(typeId) {
    const meta = infectedToMeta.get(typeId);
    if (!meta?.spec?.vanilla?.length) return undefined;
    return meta.spec.vanilla[0];
}

export function speciesFromVanillaLeaf(typeId) {
    return vanillaToSpecies.get(typeId);
}

export function infectedLeafIdForVanilla(typeId, stage = 0) {
    const spec = vanillaToSpecies.get(typeId);
    if (!spec) return undefined;
    return infectedLeafStageId(spec.id, stage);
}

export function snowStageIdForInfected(typeId) {
    const meta = infectedToMeta.get(typeId);
    if (!meta) return undefined;
    return infectedLeafStageId(meta.spec.id, LEAF_DUST_MAX);
}

export function snowStageIdForVanillaLeaf(typeId) {
    const spec = vanillaToSpecies.get(typeId);
    if (!spec) return undefined;
    return infectedLeafStageId(spec.id, LEAF_DUST_MAX);
}

const infectedWoodSet = new Set(ALL_INFECTED_WOOD_IDS);

export function isInfectedWoodId(typeId) {
    return infectedWoodSet.has(typeId);
}

export function isConvertibleVanillaWood(typeId) {
    return CONVERTIBLE_WOOD.has(typeId);
}

export function infectedWoodIdForVanilla(typeId) {
    return woodVanillaToInfected.get(typeId);
}

export function vanillaWoodIdForInfected(typeId) {
    for (const spec of WOOD_SPECIES) {
        for (const kind of spec.kinds) {
            if (kind.infected === typeId) return kind.vanilla;
        }
    }
    return undefined;
}
`;
    for (const dest of [
        join(root, "BP - Dev", "scripts", "mb_infectedVegetation.js"),
        join(root, "BP", "scripts", "mb_infectedVegetation.js")
    ]) {
        writeFileSync(dest, src);
    }
}

function writePackFiles() {
    const bpRoots = [join(root, "BP - Dev"), join(root, "BP")];
    for (const spec of LEAF_SPECIES) {
        for (let d = 0; d <= LEAF_DUST_MAX; d++) {
            const block = leafBlockJson(spec, d);
            const loot = leafLootJson(spec, d);
            const file = leafStageId(spec, d).slice(3);
            for (const bp of bpRoots) {
                writeJson(join(bp, "blocks", `${file}.json`), block);
                writeJson(join(bp, "loot_tables", "blocks", `${file}.json`), loot);
            }
        }
    }
    for (const spec of WOOD_SPECIES) {
        for (const kind of resolvedKinds(spec)) {
            const block = woodBlockJson(spec, kind);
            const loot = woodLootJson(spec, kind);
            const file = woodId(spec.id, kind.id).slice(3);
            const plankRecipe = plankIdForSpecies(spec) && kindCraftsToPlanks(kind)
                ? woodPlankRecipeJson(spec, kind)
                : null;
            for (const bp of bpRoots) {
                writeJson(join(bp, "blocks", `${file}.json`), block);
                writeJson(join(bp, "loot_tables", "blocks", `${file}.json`), loot);
                if (plankRecipe) {
                    writeJson(join(bp, "recipes", `${file}_to_planks.json`), plankRecipe);
                }
            }
        }
    }
}

function patchCanopyDust() {
    const attach = [...new Set([...allVanillaLeaves(), ...allLeafIds()])];
    for (const rel of ["BP - Dev/features/infected_canopy_dust_block.json", "BP/features/infected_canopy_dust_block.json"]) {
        const path = join(root, rel);
        const json = JSON.parse(readFileSync(path, "utf8"));
        json["minecraft:single_block_feature"].may_attach_to.bottom = attach;
        writeJson(path, json);
    }
}

function main() {
    writePackFiles();
    writeRuntimeModule();
    mergeTerrain(join(root, "RP - Dev", "textures", "terrain_texture.json"));
    mergeTerrain(join(root, "RP", "textures", "terrain_texture.json"));
    mergeBlocksJson(join(root, "RP - Dev", "blocks.json"));
    mergeBlocksJson(join(root, "RP", "blocks.json"));
    mergeLang(join(root, "RP - Dev", "texts", "en_US.lang"));
    mergeLang(join(root, "RP", "texts", "en_US.lang"));
    patchCanopyDust();
    console.log(
        `generated ${LEAF_SPECIES.length * 4} leaf blocks, ${allWoodIds().length} wood blocks`
    );
}

main();
