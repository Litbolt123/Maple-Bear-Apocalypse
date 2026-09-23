/**
 * Infected floor/wall foliage: grass, ferns, firefly bush, mushrooms,
 * mushroom blocks, leaf litter, vines. No minecraft:tick — convert is
 * player-centric (mb_grassInfection.js). Worldgen scatter uses these IDs.
 * Two-block plants (tall grass, large fern) use minecraft:multi_block
 * (format 1.26.40) + minecraft:multi_block_feature for floor scatter.
 *
 *   node tools/generateInfectedFoliagePack.js
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** One dusty look (stage-3 cream), not four leaf stages. */
const FOLIAGE = [
    {
        id: "short_grass",
        title: "Grass",
        vanilla: ["minecraft:short_grass", "minecraft:grass"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        worldgenWeight: 12
    },
    {
        id: "tall_grass",
        title: "Tall Grass",
        vanilla: ["minecraft:tall_grass"],
        aliases: ["minecraft:double_tall_grass", "minecraft:tallgrass"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        tall: true,
        worldgenWeight: 4
    },
    {
        id: "fern",
        title: "Fern",
        vanilla: ["minecraft:fern"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        worldgenWeight: 4
    },
    {
        id: "large_fern",
        title: "Large Fern",
        vanilla: ["minecraft:large_fern"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        tall: true,
        worldgenWeight: 2
    },
    {
        id: "firefly_bush",
        title: "Firefly Bush",
        vanilla: ["minecraft:firefly_bush"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        worldgenWeight: 0,
        light: 4
    },
    {
        id: "brown_mushroom",
        title: "Brown Mushroom",
        vanilla: ["minecraft:brown_mushroom"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        worldgenWeight: 2
    },
    {
        id: "red_mushroom",
        title: "Red Mushroom",
        vanilla: ["minecraft:red_mushroom"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        worldgenWeight: 1
    },
    {
        id: "red_shrub",
        title: "Red Shrub",
        vanilla: ["minecraft:red_shrub"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        worldgenWeight: 1
    },
    {
        id: "leaf_litter",
        title: "Leaf Litter",
        vanilla: ["minecraft:leaf_litter"],
        kind: "litter",
        sound: "grass",
        walkable: true,
        worldgenWeight: 3
    },
    {
        id: "vine",
        title: "Vines",
        vanilla: ["minecraft:vine"],
        kind: "vine",
        sound: "grass",
        walkable: true,
        worldgenWeight: 0
    },
    {
        id: "brown_mushroom_block",
        title: "Brown Mushroom Block",
        vanilla: ["minecraft:brown_mushroom_block"],
        kind: "cube",
        sound: "wood",
        walkable: false,
        worldgenWeight: 0
    },
    {
        id: "red_mushroom_block",
        title: "Red Mushroom Block",
        vanilla: ["minecraft:red_mushroom_block"],
        kind: "cube",
        sound: "wood",
        walkable: false,
        worldgenWeight: 0
    },
    {
        id: "mushroom_stem",
        title: "Mushroom Stem",
        vanilla: ["minecraft:mushroom_stem"],
        kind: "cube",
        sound: "wood",
        walkable: false,
        worldgenWeight: 0
    },
    {
        id: "warped_roots",
        title: "Warped Roots",
        vanilla: ["minecraft:warped_roots"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        nether: true,
        worldgenWeight: 0
    },
    {
        id: "crimson_roots",
        title: "Crimson Roots",
        vanilla: ["minecraft:crimson_roots"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        nether: true,
        worldgenWeight: 0
    },
    {
        id: "nether_sprouts",
        title: "Nether Sprouts",
        vanilla: ["minecraft:nether_sprouts"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        nether: true,
        worldgenWeight: 0
    },
    {
        id: "warped_fungus",
        title: "Warped Fungus",
        vanilla: ["minecraft:warped_fungus"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        nether: true,
        worldgenWeight: 0
    },
    {
        id: "crimson_fungus",
        title: "Crimson Fungus",
        vanilla: ["minecraft:crimson_fungus"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        nether: true,
        worldgenWeight: 0
    },
    {
        id: "twisting_vines",
        title: "Twisting Vines",
        vanilla: ["minecraft:twisting_vines"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        nether: true,
        worldgenWeight: 0
    },
    {
        id: "weeping_vines",
        title: "Weeping Vines",
        vanilla: ["minecraft:weeping_vines"],
        kind: "cross",
        sound: "grass",
        walkable: true,
        nether: true,
        worldgenWeight: 0
    }
];

function infectedId(spec) {
    return `mb:infected_${spec.id}`;
}

function textureKey(spec) {
    return `infected_${spec.id}`;
}

function writeJson(path, data) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`);
}

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

function placementFilter(spec) {
    if (spec.kind === "vine") return undefined;
    if (spec.kind === "cube") return undefined;
    const blockFilter = [
        "minecraft:grass_block",
        "minecraft:dirt",
        "minecraft:coarse_dirt",
        "minecraft:podzol",
        "minecraft:mycelium",
        "mb:dusted_dirt",
        "mb:dusted_podzol"
    ];
    if (spec.tall) {
        blockFilter.push(infectedId(spec));
    }
    if (spec.nether) {
        blockFilter.push(
            "minecraft:crimson_nylium",
            "minecraft:warped_nylium",
            "minecraft:netherrack"
        );
    }
    return {
        conditions: [
            {
                allowed_faces: ["up"],
                block_filter: blockFilter
            }
        ]
    };
}

function foliageBlockJson(spec) {
    const id = infectedId(spec);
    const tex = textureKey(spec);
    const display = `Infected ${spec.title}`;
    const placement = placementFilter(spec);
    const formatVersion = spec.tall ? "1.26.40" : "1.26.10";
    // 1.26.20+ rejects boolean ambient_occlusion (must be 0.0–10.0). 1.26.10 still accepts false.
    const occlusion = spec.tall ? 0 : false;
    let geometry;
    let material;
    let collision;
    let selection;
    if (spec.kind === "cross") {
        geometry = "minecraft:geometry.cross";
        // Wiki: geometry.cross + alpha_test (no backface cull) flickers.
        // Vanilla plants are single-sided cutout; no face dimming.
        material = {
            texture: tex,
            render_method: "alpha_test_single_sided",
            ambient_occlusion: occlusion,
            face_dimming: false
        };
        collision = false;
        selection = { origin: [-6, 0, -6], size: [12, 13, 12] };
    } else if (spec.kind === "vine") {
        geometry = {
            identifier: "geometry.infected_vine",
            bone_visibility: {
                north: "q.block_state('mb:north') == 1",
                east: "q.block_state('mb:east') == 1",
                south: "q.block_state('mb:south') == 1",
                west: "q.block_state('mb:west') == 1"
            }
        };
        material = {
            texture: tex,
            render_method: "alpha_test_single_sided",
            ambient_occlusion: occlusion,
            face_dimming: false
        };
        collision = false;
        selection = { origin: [-8, 0, -8], size: [16, 16, 16] };
    } else if (spec.kind === "litter") {
        // Vanilla litter is a 16x16 dry-foliage cutout on a thin plane.
        // snow_layer geo is 32x32 — a 16x16 texture UVs as a torn plate.
        geometry = "geometry.infected_leaf_litter";
        material = {
            texture: tex,
            render_method: "alpha_test_single_sided",
            ambient_occlusion: occlusion,
            face_dimming: false
        };
        collision = false;
        selection = { origin: [-8, 0, -8], size: [16, 1, 16] };
    } else if (spec.kind === "layer") {
        geometry = "geometry.'snow'_layer";
        material = { texture: tex, render_method: "alpha_test", ambient_occlusion: occlusion, face_dimming: true };
        collision = { origin: [-8, 0, -8], size: [16, 1, 16] };
        selection = { origin: [-8, 0, -8], size: [16, 1, 16] };
    } else {
        geometry = "minecraft:geometry.full_block";
        material = { texture: tex, render_method: "opaque" };
        collision = true;
        selection = true;
    }
    const components = {
        "minecraft:geometry": geometry,
        "minecraft:material_instances": { "*": material },
        "minecraft:display_name": display,
        "minecraft:map_color": { color: spec.kind === "litter" ? "#C4B49A" : "#E8E0D4" },
        "minecraft:destruction_particles": { texture: tex },
        "minecraft:destructible_by_mining": spec.tall
            ? { seconds_to_destroy: spec.kind === "cube" ? 0.4 : 0.05 }
            : {
                seconds_to_destroy: spec.kind === "cube" ? 0.4 : 0.05,
                use_efficiency: true
            },
        "minecraft:destructible_by_explosion": { explosion_resistance: spec.kind === "cube" ? 0.2 : 0.05 },
        "minecraft:light_dampening": spec.kind === "cube" ? 15 : 0,
        "minecraft:collision_box": collision,
        "minecraft:selection_box": selection,
        "minecraft:loot": `loot_tables/blocks/${id.slice(3)}.json`,
        "mb:infected_foliage": {}
    };
    if (spec.tall) {
        components["minecraft:tags"] = ["minecraft:is_shears_item_destructible"];
    } else {
        components["tag:minecraft:is_shears_item_destructible"] = {};
    }
    if (placement) components["minecraft:placement_filter"] = placement;
    if (spec.light) components["minecraft:light_emission"] = spec.light;
    if (spec.kind !== "cube") {
        components["minecraft:flammable"] = { catch_chance_modifier: 30, destroy_chance_modifier: 60 };
    }
    if (spec.tall) {
        components["minecraft:movable"] = { movement_type: "popped" };
    }
    // format 1.26.40 (needed for minecraft:multi_block) rejects:
    // description.is_experimental, boolean ambient_occlusion, use_efficiency on
    // destructible_by_mining, and tag:* (use minecraft:tags). Do not put those back.
    const description = {
        identifier: id,
        menu_category: { category: "nature" }
    };
    if (spec.tall) {
        description.traits = {
            "minecraft:multi_block": {
                enabled_states: ["minecraft:multi_block_part"],
                direction: "up",
                parts: 2
            }
        };
    }
    if (spec.kind === "vine") {
        description.states = {
            "mb:north": [1, 0],
            "mb:east": [1, 0],
            "mb:south": [1, 0],
            "mb:west": [1, 0]
        };
    }
    const block = {
        format_version: formatVersion,
        "minecraft:block": {
            description,
            components
        }
    };
    if (spec.tall) {
        const topTex = `${tex}_top`;
        block["minecraft:block"].permutations = [
            {
                condition: "q.block_state('minecraft:multi_block_part') == 1",
                components: {
                    "minecraft:material_instances": {
                        "*": { ...material, texture: topTex }
                    },
                    "minecraft:destruction_particles": { texture: topTex }
                }
            }
        ];
    }
    return block;
}

function foliageLootJson(spec) {
    const id = infectedId(spec);
    const pools = [
        {
            rolls: 1,
            conditions: [{ condition: "match_tool", item: "minecraft:shears" }],
            entries: [{ type: "item", name: id }]
        },
        snowDropPool(spec.kind === "cube" ? 15 : 20)
    ];
    return { pools };
}

function mayReplacePlants() {
    return [
        "minecraft:air",
        "minecraft:short_grass",
        "minecraft:grass",
        "minecraft:tall_grass",
        "minecraft:fern",
        "minecraft:large_fern",
        "minecraft:deadbush",
        "minecraft:firefly_bush",
        "minecraft:brown_mushroom",
        "minecraft:red_mushroom",
        "minecraft:red_shrub",
        "minecraft:leaf_litter"
    ];
}

function placeFeatureJson(spec) {
    if (spec.tall) {
        return {
            format_version: "1.26.50",
            "minecraft:multi_block_feature": {
                description: { identifier: `mb:place_infected_${spec.id}` },
                places_block: infectedId(spec),
                enforce_placement_rules: true,
                may_replace: mayReplacePlants()
            }
        };
    }
    return {
        format_version: "1.21.10",
        "minecraft:single_block_feature": {
            description: { identifier: `mb:place_infected_${spec.id}` },
            places_block: infectedId(spec),
            enforce_placement_rules: false,
            enforce_survivability_rules: false,
            may_replace: mayReplacePlants(),
            may_attach_to: {
                bottom: [
                    "minecraft:grass_block",
                    "minecraft:dirt",
                    "minecraft:podzol",
                    "minecraft:mycelium",
                    "mb:dusted_dirt",
                    "mb:dusted_podzol"
                ]
            }
        }
    };
}

function weightedFloorJson() {
    const features = FOLIAGE
        .filter((s) => s.worldgenWeight > 0)
        .map((s) => [`mb:place_infected_${s.id}`, s.worldgenWeight]);
    return {
        format_version: "1.21.10",
        "minecraft:weighted_random_feature": {
            description: { identifier: "mb:weighted_infected_floor_plants" },
            features
        }
    };
}

function searchFloorJson() {
    return {
        format_version: "1.13.0",
        "minecraft:search_feature": {
            description: { identifier: "mb:search_infected_floor_plants" },
            places_feature: "mb:weighted_infected_floor_plants",
            search_volume: {
                min: [0, -20, 0],
                max: [0, 0, 0]
            },
            search_axis: "-y",
            required_successes: 1
        }
    };
}

function scatterFloorJson() {
    return {
        format_version: "1.21.10",
        "minecraft:scatter_feature": {
            description: { identifier: "mb:scatter_infected_floor_plants" },
            places_feature: "mb:search_infected_floor_plants",
            project_input_to_floor: true,
            distribution: {
                iterations: 12,
                scatter_chance: 60.0,
                coordinate_eval_order: "xzy",
                x: { distribution: "uniform", extent: [0, 15] },
                y: 1,
                z: { distribution: "uniform", extent: [0, 15] }
            }
        }
    };
}

function floorRuleJson() {
    return {
        format_version: "1.21.10",
        "minecraft:feature_rules": {
            description: {
                identifier: "mb:infected_floor_plants",
                places_feature: "mb:scatter_infected_floor_plants"
            },
            conditions: {
                placement_pass: "after_surface_pass",
                "minecraft:biome_filter": {
                    all_of: [
                        { test: "has_biome_tag", operator: "==", value: "infected_biome" },
                        { test: "has_biome_tag", operator: "!=", value: "ocean" }
                    ]
                }
            },
            distribution: {
                iterations: 1,
                x: { distribution: "uniform", extent: [0, 16] },
                y: "q.heightmap(v.worldx, v.worldz)",
                z: { distribution: "uniform", extent: [0, 16] },
                scatter_chance: { numerator: 3, denominator: 4 }
            }
        }
    };
}

function mergeTerrain(path) {
    const json = JSON.parse(readFileSync(path, "utf8"));
    const data = json.texture_data;
    for (const spec of FOLIAGE) {
        data[textureKey(spec)] = { textures: `textures/blocks/${textureKey(spec)}` };
        if (spec.tall) {
            data[`${textureKey(spec)}_top`] = { textures: `textures/blocks/${textureKey(spec)}_top` };
        }
    }
    writeFileSync(path, `${JSON.stringify(json, null, "\t")}\n`);
}

function mergeBlocksJson(path) {
    const json = JSON.parse(readFileSync(path, "utf8"));
    for (const spec of FOLIAGE) {
        json[infectedId(spec)] = { sound: spec.sound };
    }
    writeFileSync(path, `${JSON.stringify(json, null, "\t")}\n`);
}

function mergeLang(path) {
    let text = readFileSync(path, "utf8");
    const startMark = "## BEGIN infected foliage";
    const endMark = "## END infected foliage";
    if (!text.includes(startMark)) {
        const vegEnd = "## END infected vegetation";
        const at = text.indexOf(vegEnd);
        const block = `${startMark}\n${endMark}\n`;
        if (at >= 0) {
            const after = at + vegEnd.length;
            text = `${text.slice(0, after)}\n${block}${text.slice(after)}`;
        } else {
            text += `\n${block}`;
        }
    }
    const lines = FOLIAGE.map((s) => {
        const id = infectedId(s);
        const name = `Infected ${s.title}`;
        return `tile.${id}.name=${name}\nitem.${id}=${name}`;
    });
    const start = text.indexOf(startMark);
    const end = text.indexOf(endMark);
    let from = start + startMark.length;
    if (text[from] === "\r") from++;
    if (text[from] === "\n") from++;
    text = `${text.slice(0, from)}${lines.join("\n")}\n${text.slice(end)}`;
    writeFileSync(path, text);
}

function writeRuntimeModule() {
    const lit = JSON.stringify(FOLIAGE, null, 4);
    const src = `/**
 * Infected foliage identifiers. Generated by tools/generateInfectedFoliagePack.js.
 * Do not edit by hand.
 */

export const FOLIAGE_SPECIES = ${lit};

export const ALL_INFECTED_FOLIAGE_IDS = [];
export const ALL_INFECTED_FOLIAGE_WALKABLE_IDS = [];
export const DOUBLE_INFECTED_FOLIAGE_IDS = [];
export const CONVERTIBLE_FOLIAGE = new Set();

const vanillaToInfected = new Map();
const infectedToVanilla = new Map();
const infectedSet = new Set();

for (const spec of FOLIAGE_SPECIES) {
    const id = \`mb:infected_\${spec.id}\`;
    ALL_INFECTED_FOLIAGE_IDS.push(id);
    infectedSet.add(id);
    infectedToVanilla.set(id, spec.vanilla[0]);
    if (spec.walkable) ALL_INFECTED_FOLIAGE_WALKABLE_IDS.push(id);
    if (spec.tall) DOUBLE_INFECTED_FOLIAGE_IDS.push(id);
    for (const v of spec.vanilla) {
        vanillaToInfected.set(v, id);
        CONVERTIBLE_FOLIAGE.add(v);
    }
    for (const v of spec.aliases || []) {
        vanillaToInfected.set(v, id);
        CONVERTIBLE_FOLIAGE.add(v);
    }
}

export function isInfectedFoliageId(typeId) {
    return infectedSet.has(typeId);
}

export function isConvertibleVanillaFoliage(typeId) {
    return CONVERTIBLE_FOLIAGE.has(typeId);
}

export function infectedFoliageIdForVanilla(typeId) {
    return vanillaToInfected.get(typeId);
}

export function vanillaFoliageIdForInfected(typeId) {
    return infectedToVanilla.get(typeId);
}

export function isInfectedFoliageWalkable(typeId) {
    return ALL_INFECTED_FOLIAGE_WALKABLE_IDS.includes(typeId);
}
`;
    for (const dest of [
        join(root, "BP - Dev", "scripts", "mb_infectedFoliage.js"),
        join(root, "BP", "scripts", "mb_infectedFoliage.js")
    ]) {
        writeFileSync(dest, src);
    }
}

function writePackFiles() {
    const bpRoots = [join(root, "BP - Dev"), join(root, "BP")];
    for (const spec of FOLIAGE) {
        const file = infectedId(spec).slice(3);
        const block = foliageBlockJson(spec);
        const loot = foliageLootJson(spec);
        for (const bp of bpRoots) {
            writeJson(join(bp, "blocks", `${file}.json`), block);
            writeJson(join(bp, "loot_tables", "blocks", `${file}.json`), loot);
        }
        if (spec.worldgenWeight > 0) {
            const place = placeFeatureJson(spec);
            for (const bp of bpRoots) {
                writeJson(join(bp, "features", `place_infected_${spec.id}.json`), place);
            }
        }
    }
    const weighted = weightedFloorJson();
    const search = searchFloorJson();
    const scatter = scatterFloorJson();
    const rule = floorRuleJson();
    for (const bp of bpRoots) {
        writeJson(join(bp, "features", "weighted_infected_floor_plants.json"), weighted);
        writeJson(join(bp, "features", "search_infected_floor_plants.json"), search);
        writeJson(join(bp, "features", "scatter_infected_floor_plants.json"), scatter);
        writeJson(join(bp, "feature_rules", "infected_floor_plants.json"), rule);
    }
}

function main() {
    const catalog = JSON.parse(readFileSync(join(root, "data", "bedrock_blocks.json"), "utf8")).blocks;
    const known = new Set(catalog);
    const skipped = FOLIAGE.flatMap((s) => s.vanilla).filter((id) => !known.has(id));
    if (skipped.length) {
        throw new Error(`unknown vanilla foliage ids: ${skipped.join(", ")}`);
    }
    writePackFiles();
    writeRuntimeModule();
    mergeTerrain(join(root, "RP - Dev", "textures", "terrain_texture.json"));
    mergeTerrain(join(root, "RP", "textures", "terrain_texture.json"));
    mergeBlocksJson(join(root, "RP - Dev", "blocks.json"));
    mergeBlocksJson(join(root, "RP", "blocks.json"));
    mergeLang(join(root, "RP - Dev", "texts", "en_US.lang"));
    mergeLang(join(root, "RP", "texts", "en_US.lang"));
    console.log(`generated ${FOLIAGE.length} infected foliage blocks + floor-plant features`);
}

main();
