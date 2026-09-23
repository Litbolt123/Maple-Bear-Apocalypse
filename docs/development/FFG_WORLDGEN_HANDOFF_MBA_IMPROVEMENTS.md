# FFG worldgen handoff — MBA improvement reference

**Source:** Food and Farming Galore (`ffg:`) Bridge project — structures, jigsaws, features/foliage patterns proven on Bedrock **1.26.0+**.  
**Purpose:** Capture what MBA can **copy**, **avoid**, and **adapt** when improving worldgen (abandoned villages, lore bunkers, infected scatter, journal props, etc.).  
**Not a ship spec** — use alongside [ABANDONED_VILLAGE_STRUCTURES.md](./ABANDONED_VILLAGE_STRUCTURES.md), [VILLAGE_STRUCTURE_COLLAB_GUIDE.md](./VILLAGE_STRUCTURE_COLLAB_GUIDE.md), and [WORLD_SETUP.md](./WORLD_SETUP.md).

**MBA structure art:** hand-built pieces that look good and make sense will come from the pack owner **later**. Until those `.mcstructure` files exist, do not invent a visual standard. This doc is the **engineering** loop (jigsaw stack, scatter, fingerprints, generators). The first owner-authored buildings become the look-and-feel baseline going forward.

**Drop zone (not live pack):** [`structures-inbox/`](../../structures-inbox/README.md) — `villages/`, `camps/`, `bunkers/`, `other/`. Do not copy into `BP/structures/` until wiring.

---

## Mental model: two parallel systems

Do **not** mix structure placement with foliage placement. FFG runs both; MBA already has pieces of each (village markers + script builder vs feature rules for markers/ruins).

| | **Structures (camps / villages)** | **Foliage (wild plants / scatter props)** |
|---|-----------------------------------|-------------------------------------------|
| **Goal** | Rare homestead, forage stall, abandoned hamlet | Flower-like wild blocks, dust patches, small props |
| **Driver** | Jigsaw + `structure_set` | `feature_rules` → `scatter_feature` → `single_block_feature` |
| **When** | `surface_structures` | Mostly `surface_pass` |
| **Spacing** | Structure set (tens of chunks apart) | Per-chunk scatter + rule chance |
| **Locate** | `/locate structure mb:*` | No locate — explore biomes |
| **Script** | Staff NPCs / zombies if jigsaw strips entities | None for placement (avoid tick pop-in) |

**MBA today**

| FFG pattern | MBA status |
|-------------|------------|
| Jigsaw + structure set for locateable camps | **POC archived** — `BP - Dev/_archived/av_plains_export_worldgen_test/`; full multi-piece villages planned ([VILLAGE_STRUCTURE_COLLAB_GUIDE.md](./VILLAGE_STRUCTURE_COLLAB_GUIDE.md)) |
| Feature rules for world scatter | **Active** — `village_marker_*` feature rules place lamp markers; older `abandoned_settlement_*` rules archived |
| Script backup for structure entities | **Active** — `mb_abandonedSettlementBuilder.js`, `mb_abandonedVillageWorldgen.js` |
| Script-placed foliage every tick | **Avoid** — FFG removed this; MBA should not reintroduce for “infected dust” or similar |

---

## Engine versions & formats

| Asset type | FFG format | MBA note |
|------------|------------|----------|
| Jigsaw / structure set / pools | `1.21.100` (FFG) | Dev pack jigsaw POC used **`1.26.10`** — align with [ABANDONED_VILLAGE_STRUCTURES.md](./ABANDONED_VILLAGE_STRUCTURES.md) |
| Features / feature rules | `1.21.10` | Same family; verify against [MINECRAFT_1.26_COMPATIBILITY.md](./guides/MINECRAFT_1.26_COMPATIBILITY.md) |
| Min engine | `1.26.0` | Matches MBA [WORLD_SETUP.md](./WORLD_SETUP.md) — no extra experiments on 1.26.2+ |

**Experiments:** Older clients may need **Data-Driven Jigsaw Structures**; newer Bedrock often has it on by default. MBA does not declare experiments in manifest.

---

## Pack facts (FFG source of truth)

Worldgen JSON is **generated, not hand-authored**. Edit the Python, rebuild, then re-export BP+RP from Bridge.

| Role | Path |
|------|------|
| Namespace | `ffg:` |
| Root | Bridge project **Food and Farming Galore** |
| Buildings / jigsaws | `tools/gen_jigsaw_camps.py` |
| Wild plants / forage scatter | `tools/generate_content.py` |
| Custom counties + extra vegetation | `tools/gen_biomes.py` |
| Herds | `tools/gen_mobs.py` → `BP/spawn_rules/*.json` (**not** scripts) |
| Staffing traders | `BP/scripts/ffg_campTraders.js` |
| Rebuild | `python tools/build_all.py` from pack root, then Bridge export |

**Hard rules**

- New structures and forage only appear in **new chunks** (or a new world).
- Do **not** re-enable `ffg_naturalSpawn` or script camp placement. Those were removed on purpose.
- Scripts staff traders from unique block fingerprints. They do **not** place buildings or plants.
- Growing crop blocks (`ffg:tomato_crop`, `menu_category: none`) are **not** scattered as wild plants. Wild forage is `ffg:wild_<name>` (bamboo shoot wild block is `ffg:wild_bamboo_shoot`).

---

## Build pipeline (FFG reference → MBA ideas)

FFG automates worldgen with Python scripts. MBA has no equivalent yet; this is a **future tooling** improvement.

| FFG script | Role | MBA analogue |
|------------|------|--------------|
| `tools/build_all.py` | Orchestrates rebuild + worldgen verify | Could add `npm run verify:worldgen` (JSON schema + path lint) |
| `tools/gen_jigsaw_camps.py` | `.mcstructure` + `BP/worldgen/*` + template features + chest loot | Manual today; consider generator for lore bunkers / single-piece camps |
| `tools/generate_content.py` | Wild blocks + features + feature_rules | N/A unless MBA adds procedural scatter blocks |
| `tools/gen_biomes.py` | Custom county biomes + extra vegetation | MBA already has `mb:infected_biome`; extra counties optional |
| `tools/gen_mobs.py` | Herd `spawn_rules` | Do **not** spawn animals from worldgen scripts |
| `tools/fix_scatter_features.py` | Ensures scatter fields live under `distribution` | One-off fixer pattern — useful if we bulk-migrate features |

**Recommended order (worldgen-relevant)**

1. Features / feature_rules / blocks (foliage layer)
2. Structures + jigsaw stack (camps / villages)
3. `verify_runtime()` — fail if pieces missing, scatter schema wrong, or deprecated script camps still imported

**After any rebuild:** re-export BP+RP from Bridge. **Already-generated chunks never get new scatter** — test in new chunks or a fresh world.

`write_camp_worldgen()` / `write_cave_worldgen()` / `write_sky_worldgen()` / `write_ocean_worldgen()` in `gen_jigsaw_camps.py` emit the JSON. `structure_template_feature` JSON is still written as leftover; **placement that ships is the jigsaw + structure set**. Do not invent a fifth placement path.

---

## Structures & jigsaws

### Architecture nuance (FFG camps)

FFG camps are **single-piece** jigsaw structures, not multi-room village graphs:

- `max_depth: 1`
- One `minecraft:single_pool_element` in the template pool
- No jigsaw connector blocks inside the `.mcstructure`
- Jigsaw is used for: registration, biome filters, terrain adaptation, structure-set spacing, `/locate` / `/place`

MBA’s **full abandoned villages** are the opposite — multi-piece graphs with jigsaw connectors ([VILLAGE_STRUCTURE_COLLAB_GUIDE.md](./VILLAGE_STRUCTURE_COLLAB_GUIDE.md)). Use **single-piece** pattern for: lore bunkers, storm shelters, one-off infected shrines, trader outposts.

### Worldgen stack (per camp key)

Example key `mill` / MBA analogue `mb_<id>`:

| File | Role |
|------|------|
| `BP/structures/ffg/<file>.mcstructure` | The actual blocks |
| `BP/worldgen/processors/ffg_<key>.json` | Chest loot (`append_loot`) |
| `BP/worldgen/template_pools/ffg_<key>.json` | Points at `ffg/<file>` + processor, `projection: rigid` |
| `BP/worldgen/structures/ffg_<key>.json` | `minecraft:jigsaw` — start pool, biomes, height, `terrain_adaptation` |
| `BP/worldgen/structure_sets/ffg_<key>.json` | `random_spread` — unique salt, spacing, separation |
| `BP/loot_tables/chests/ffg_<key>_chest.json` | What the processor injects |

MBA equivalent:

```
BP/structures/mb/<file>.mcstructure
BP/worldgen/structures/mb_<id>.json      → minecraft:jigsaw
BP/worldgen/structure_sets/mb_<id>.json  → spacing / salt
BP/worldgen/template_pools/mb_<id>.json  → points at .mcstructure + processors
BP/worldgen/processors/mb_<id>.json      → chest loot, block randomize, moss
BP/loot_tables/chests/mb_<id>_chest.json
```

Format versions: jigsaw JSON **1.21.100**, features **1.21.10**. Palette version **18168865** so doors/gates stay valid.

**Naming (FFG → MBA)**

| Asset | FFG example | MBA convention |
|-------|-------------|----------------|
| Jigsaw ID | `ffg:homestead` | `mb:abandoned_village_plains`, `mb:lore_bunker_cold`, etc. |
| JSON files | `BP/worldgen/.../ffg_homestead.json` | `BP/worldgen/.../mb_<id>.json` |
| Structure path | `ffg/homestead_garden` | `mb/av_plains/well_center` (slash in pool `location`) |
| On disk | `BP/structures/ffg/homestead_garden.mcstructure` | `BP/structures/mb/av_plains/*.mcstructure` |

### Example — jigsaw definition

```json
{
  "format_version": "1.21.100",
  "minecraft:jigsaw": {
    "description": { "identifier": "mb:homestead_example" },
    "step": "surface_structures",
    "terrain_adaptation": "beard_thin",
    "start_pool": "mb:homestead_example",
    "max_depth": 1,
    "heightmap_projection": "world_surface",
    "liquid_settings": "apply_waterlogging",
    "biome_filters": [{
      "any_of": [
        { "test": "has_biome_tag", "operator": "==", "value": "plains" },
        { "test": "has_biome_tag", "operator": "==", "value": "meadow" }
      ]
    }],
    "max_distance_from_center": 48
  }
}
```

**MBA biome filters:** use `has_biome_tag` only — not biome names like `sunflower_plains`. Tag buckets from FFG map cleanly to MBA rulesets (plains, cold, desert, savanna, infected).

### Example — structure set

```json
{
  "format_version": "1.21.100",
  "minecraft:structure_set": {
    "description": { "identifier": "mb:homestead_example" },
    "placement": {
      "type": "minecraft:random_spread",
      "salt": 48151623,
      "spacing": 40,
      "separation": 14,
      "spread_type": "triangular"
    },
    "structures": [{ "structure": "mb:homestead_example", "weight": 1 }]
  }
}
```

Tune `spacing` / `separation` / `salt` per structure rarity. Each structure set needs a **unique salt**. Typical plains camps: spacing **~36–48**, separation **~12–20**, `spread_type: triangular`. FFG forage camp used spacing **36**, separation **12**.

### Example — template pool

```json
{
  "element_type": "minecraft:single_pool_element",
  "location": "mb/av_plains/well_center",
  "processors": "mb:av_empty",
  "projection": "rigid"
}
```

### Processors (high value for MBA)

- **Chest** → `append_loot` pointing at `loot_tables/chests/mb_*.json`
- **Crop / decay randomize** → wheat → carrots, mossy cobble mix, cracked stonebrick
- **Force block states** → chest facing, door half alignment

Template features (`structure_template_feature` JSON) can exist as alternate wiring; FFG’s live placement is jigsaw + structure_set only.

### Commands

```
/locate structure mb:abandoned_village_plains
/place structure mb:abandoned_village_plains
```

**Caveat:** `/place structure` defaults `includeEntities` to **false** — NPCs and zombie villagers often missing even when embedded in `.mcstructure`. Always test natural gen and script backup.

### How a building is made (FFG Python)

Python `mcstructure` (`Block`, `Structure`):

1. Allocate a box, `_fill_air`, usually `_ground`
2. Place vanilla + `ffg:` blocks with **Bedrock state names** (`minecraft:cardinal_direction`, `weirdo_direction` on stairs, `ffg:growth` on crops)
3. `_save_struct(name, s, entities=...)` writes `BP/structures/ffg/<name>.mcstructure`
4. `finalize_mcstructure` sets `structure_world_origin [0,0,0]` and sanitizes the palette

**Helpers that already exist — reuse them:** `_gabled_roof`, `_chimney` (uses `brick_block`, not Java `bricks`), `_stair_run` (clears 3 air in front of and above the bottom tread), `_place_chest` (clears feet + head air), `_air_column`, `_oak_room`, `_water_trough`, `_sl` / `_st` for slabs/stairs.

**Never** `structure_void`. Avoid vanilla 2-block tiles in jigsaws (beds, doors unless grafted from a known-good ref). No cauldron troughs except the fishing-dock fisher fingerprint. No composter in the hamlet.

**Palette sanitize** remaps Java leftovers: `fence_gate` → `oak_fence_gate`, `bricks` → `brick_block`, `terracotta` → concrete / sandstone / hardened clay. It also strips `minecraft:*` states on `ffg:` blocks unless that block actually declares the trait (keep `minecraft:cardinal_direction` only if `placement_direction` exists). Unknown states become `?` dirt.

Homestead door graft: `DOOR_HOME = (3, 2, 6)`; verify skips `homestead_with_door.mcstructure` / `homestead_door_ref.mcstructure`.

### Terrain adaptation (this bit people)

| Mode | Use |
|------|-----|
| `none` | Flat stamps (crop field, orchard, herb garden, rice paddy, cranberry bog, tea garden, tide pool, homestead) |
| `beard_thin` | Cottages / sheds that need a dirt skirt. Also the vanilla pillager-outpost carve |
| `bury` | Underground rooms (`underground_structures`, heightmap none, Y uniform about **-40..40**) |
| Sky | Offset above the heightmap, no grounded constraint — `write_sky_worldgen` |
| Ocean rafts / kelp | Own helper (waterlogging / seafloor) — `write_ocean_worldgen` |

Surface jigsaws: `step: surface_structures`, `heightmap_projection: world_surface`, `start_height` absolute **0**.

Caves → `write_cave_worldgen`. Sky → `write_sky_worldgen`. Do not invent a third (or fifth) placement path.

---

## Hard-won structure / jigsaw lessons

These apply directly to MBA village and bunker work.

| Lesson | Detail |
|--------|--------|
| **`structure_world_origin` required** | Must exist in `.mcstructure` NBT. Missing → blocks place, entities drop. Math: `world_pos = Pos - structure_world_origin + load_origin`. |
| **Embedded entities unreliable** | Natural jigsaw gen often strips entities. FFG uses `ffg_campTraders.js` (fingerprint camp blocks → `spawnEntity`). MBA: keep `mb_abandonedSettlementBuilder.js` zombie staffing after placement. |
| **`spawn_overrides` ≠ custom NPCs** | Only overrides ongoing biome mob spawning in the structure box — does **not** place custom entities at gen time. |
| **Never `structure_void` on Bedrock** | Reads as barrier-like solid. |
| **Doors are fragile** | Use valid Bedrock id (`minecraft:wooden_door`), byte boolean states, air lintel above upper half (stairs above break doors). FFG grafts door from Structure Block export (`homestead_door_ref`). MBA abandoned villages: **no working doors** by design — still avoid broken half-door states. |
| **Palette version / boolean states** | Matter when procedurally writing `.mcstructure`. |
| **Pool `location` vs feature path** | Pool uses **slashes** (`mb/av_plains/well`); scatter features may use **colons** (`mb:av_plains/well`) — see [ABANDONED_VILLAGE_STRUCTURES.md](./ABANDONED_VILLAGE_STRUCTURES.md). |

---

## Features / foliage (wild plants & scatter)

Used for wild forage, crop-adjacent plants, moss patches, county trees. **Not for buildings.**

Typical chain:

1. `minecraft:single_block_feature` — places one block (`ffg:wild_morel`, etc.)
2. Optional `snap_to_surface_feature` / `search_feature` for caves or logs
3. `minecraft:scatter_feature` — several attempts per chunk, `project_input_to_floor: true`
4. `minecraft:feature_rules` — when it runs (`surface_pass` or underground), biome tags, rarity

Biome filters use **tags** (`plains`, `forest`, `jungle`, `ffg_orchard_vale`), not biome IDs like `sunflower_plains`.

MBA use: infected dust patches, journal clue props, rare surface loot markers, small ambient blocks — **not** for full buildings.

### Typical stack (non-mushroom)

```
feature_rule (biome tags + heightmap + chance)
  → scatter_feature (uniform across chunk, y: 1, project_input_to_floor)
      → single_block_feature (places mb:*, enforce_* = false)
+ optional pocket_rule
  → scatter_*_pocket (gaussian, smaller)
```

### Example — single block feature

```json
{
  "format_version": "1.21.10",
  "minecraft:single_block_feature": {
    "description": { "identifier": "mb:wild_example_block" },
    "places_block": "mb:wild_example",
    "enforce_placement_rules": false,
    "enforce_survivability_rules": false,
    "may_replace": ["minecraft:air", "minecraft:short_grass"],
    "may_attach_to": {
      "bottom": ["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol"]
    }
  }
}
```

**Critical:** `enforce_placement_rules: false` — `true` blocks many custom plants on Bedrock.

### Example — scatter feature (schema that works)

```json
{
  "format_version": "1.21.10",
  "minecraft:scatter_feature": {
    "description": { "identifier": "mb:scatter_wild_example" },
    "places_feature": "mb:wild_example_block",
    "project_input_to_floor": true,
    "distribution": {
      "iterations": 11,
      "scatter_chance": 40.0,
      "coordinate_eval_order": "xzy",
      "x": { "distribution": "uniform", "extent": [0, 15] },
      "y": 1,
      "z": { "distribution": "uniform", "extent": [0, 15] }
    }
  }
}
```

**Critical bugs FFG hit (MBA must avoid)**

| Bug | Fix |
|-----|-----|
| `iterations` / `x` / `y` / `z` at top level | Must live under **`distribution`** |
| `y: 0` | Buries plants in soil — use **`y: 1`** |
| Features in subfolders | Files must be flat: `BP/features/<name>.json` — `BP/features/mb/` **never loads** |
| Java block ids | Use Bedrock ids (`dirt_with_roots`, not `rooted_dirt`) |

### Example — feature rule

```json
{
  "format_version": "1.21.10",
  "minecraft:feature_rules": {
    "description": {
      "identifier": "mb:wild_example_rule",
      "places_feature": "mb:scatter_wild_example"
    },
    "conditions": {
      "placement_pass": "surface_pass",
      "minecraft:biome_filter": {
        "any_of": [
          { "test": "has_biome_tag", "operator": "==", "value": "plains" }
        ]
      }
    },
    "distribution": {
      "iterations": 2,
      "x": { "distribution": "uniform", "extent": [0, 16] },
      "y": "q.heightmap(v.worldx, v.worldz)",
      "z": { "distribution": "uniform", "extent": [0, 16] },
      "scatter_chance": { "numerator": 1, "denominator": 3 }
    }
  }
}
```

### Biome tag buckets (conceptual — map to MBA rulesets)

| Bucket | Tags |
|--------|------|
| Forest | `forest`, `taiga`, `birch`, `roofed`, `flower_forest`, `grove`, `extreme_hills` |
| Plains | `plains`, `meadow`, `savanna`, `cherry_grove` |
| Wet | `swamp`, `river` |
| Warm / cold | As needed per MBA `mb_abandonedVillageConstants.js` rulesets |
| Sand attach | Only for desert specials |
| Infected | MBA custom — filter `mb:infected_biome` or tag if exposed |

### Advanced scene features (optional)

- `weighted_random` meadow mix
- `vegetation_patch_feature` — moss clearings + mushroom vegetation
- `aggregate_feature` — patch + scatter (`after_surface_pass`)

**Density philosophy:** prefer uniform scatter across chunk + light optional gaussian pockets. Heavy clumps felt too strong in dark oak forests for FFG.

---

## NPCs / entities in structures

| FFG approach | MBA application |
|--------------|-----------------|
| Custom entities with trade tables | Zombie villagers, future lore NPCs |
| `minecraft:persistent` on entities | Use for any structure-spawned mob that must survive reload |
| No `spawn_rules` for structure NPCs | Same — spawn from script after fingerprint |
| Herds via `BP/spawn_rules` from `gen_mobs.py` | Do **not** spawn animals from worldgen scripts |
| Script backup after gen | **Keep** — do not rely on embedded entities alone |
| Do not reintroduce old script camp builders in `main.js` | MBA: keep village layout in jigsaw/worldgen; script only loot/zombies/processors |

### NPCs do not come from the `.mcstructure`

Custom NPCs embedded in `.mcstructure` often fail to load. Buildings still get a **unique fingerprint** (marker block + nearby chest). `ffg_campTraders.js` scans loaded chunks, matches the fingerprint, and summons the trader on standable air.

Newer camps use `matchMarkerKeeperAt(dim, x, y, z, marker, key, trader, name)` = custom marker + chest within **6**.

If you add a new keeper camp: new unique `ffg:` (or `mb:`) marker block, place it + a chest, wire `matchMarkerKeeperAt`, **do not put that marker in the hamlet**.

NPC client entities: `geometry.humanoid.custom`, `deals_damage` as strings `"yes"`/`"no"`, `variable.tcos0` in `pre_animation` for `animation.humanoid.move`.

### Fingerprint uniqueness (do not copy blindly)

Fingerprint blocks must stay unique. Do not reuse, and do not put these in the hamlet (or they staff the wrong place): `harvest_lantern`, `cider_press`, `harvest_basket`, `cooling_crock`, `winter_post`, `lumen_jar`, the six v1.1.99 markers, the seven v1.1.100 markers, `composter`, `cauldron`.

Do **not** fingerprint player stations: `ffg:rain_barrel`, `ffg:icebox`, `ffg:oak_crate`, `ffg:scarecrow`, `ffg:pickle_crock`.

**Known fingerprints (do not copy into MBA without a new unique marker):** sprinkler+glass, beehive, loom, flower pot, pie_safe+stove, white/orange wool, barrel, cauldron, brewing_stand, grindstone (except vineyard), cheese_press (except dairy), mycelium, salt_crystal, weather_vane, clam_basket, sea_buoy, stonecutter, crafting_table, plus the marker+chest pairs above.

**Special cases still in FFG code:**

| Camp | Match |
|------|--------|
| Homestead farmer | chest + composter |
| Barn | `minecraft:barrel` + hay + spruce planks (`matchBarnAt`) — Homestead Farmer also staffs the barn |
| Cave forager | mycelium + chest + ≥3 mushroom-like blocks |
| Dairy | `oak_fence` (not cheese_press as the only mark) |
| Vineyard | `oak_fence` + grindstone + ≥8 `grape_crop` |

MBA should pick **new unique markers** (e.g. a dedicated abandoned-village lamp variant or lore block) rather than reuse FFG fingerprints.

---

## Identifier / file naming conventions

| Asset | ID pattern | File |
|-------|----------|------|
| Jigsaw / set / pool / processor | `mb:homestead` | `BP/worldgen/.../mb_homestead.json` |
| Structure piece | path `mb/homestead_garden` | `BP/structures/mb/homestead_garden.mcstructure` |
| Feature | `mb:scatter_wild_garlic` | `BP/features/scatter_wild_garlic.json` |
| Rule | `mb:wild_garlic_rule` | `BP/feature_rules/wild_garlic_rule.json` |
| Wild block | `mb:wild_garlic` | Watch for `wild_` prefix doubling in filenames |

**Rule:** feature JSON **filename** should match the identifier suffix (flat `BP/features/` and `BP/feature_rules/`).

---

## Custom biomes (FFG counties)

`tools/gen_biomes.py` writes four counties: orchard vale, herb heath, cider hollow, lean fallow. Tags look like `ffg_orchard_vale`. Camps and forage rules can list those tags next to vanilla ones.

MBA already has `mb:infected_biome` ([BIOME_GENERATION_VARIABLE_SIZES.md](./systems/BIOME_GENERATION_VARIABLE_SIZES.md)). Extra “counties” are optional; if added, expose a **biome tag** so jigsaws and feature rules can filter without biome IDs.

---

## Recipe: add a new surface camp (FFG)

1. `build_<name>()` in `gen_jigsaw_camps.py` using the helpers. Include a **new marker + chest**. No stolen fingerprints. Valid Bedrock block ids only.
2. Call it from `main()`, `write_simple_processor`, then `write_camp_worldgen("key", "structure_file", biome_tags, unique_salt, spacing, sep, "ffg:key", terrain_adaptation=...)`.
3. Add chest loot in `write_extra_loot` / the loot JSON the processor names.
4. Add `matchMarkerKeeperAt` (or a dedicated matcher) in `ffg_campTraders.js` and register it in the scan list.
5. If the NPC is new: entity JSON via existing NPC writer (`geometry.humanoid.custom`, `tcos0`, spawn egg lang).
6. Rebuild + re-export BP. Test in **new chunks**. `/locate structure ffg:<key>`.

Caves → `write_cave_worldgen`. Sky → `write_sky_worldgen`. Do not invent a third placement path.

**MBA analogue (when owner structures arrive):** wire the `.mcstructure` into the four JSON types + loot + unique fingerprint + staffing script. Do not procedurally invent the look.

---

## Recipe: add a new wild plant (FFG)

1. Add to `FORAGE` (or `CROPS`) in `generate_content.py` with biome tags.
2. The generator already emits wild block, item, scatter feature, and feature rule. Tune `_RARE_FORAGE` / meadow mix so it does not carpet the world.
3. Caves/ocean have separate helpers (`write_underground_scatter`, ocean rules). Do **not** put beach plants on a generic `_COMMON` tag list (too broad).

---

## Constraints that have already burned FFG

- No OP hunger
- No new hamlet fingerprint blocks
- Stations stay vanilla `crafting_table` + tags
- `bamboo_shoot` wild block is `ffg:wild_bamboo_shoot`
- Homestead door graft: `DOOR_HOME = (3, 2, 6)`; verify skips `homestead_with_door.mcstructure` / `homestead_door_ref.mcstructure`
- Scripting `[verbose]` / `[inform]` is not an error
- Catalog titles: `§2Farmers Catalog` (no apostrophe) for JSON-UI matching

**The whole loop:** Python builds the `.mcstructure` and the jigsaw JSON; feature rules scatter plants; scripts only staff traders from unique block fingerprints.

---

## Copy vs avoid (MBA checklist)

### Copy

- [ ] Dual system: jigsaws for rare locateable structures; `feature_rules` for foliage / markers
- [ ] Scatter fields under `distribution`; `y: 1`; `enforce_*: false`
- [ ] Flat feature files; biome **tags** not biome names
- [ ] Processor `append_loot` for structure chests
- [ ] Script backup for structure entities (zombies, future traders) via **unique** fingerprints
- [ ] `verify_runtime()`-style CI lint before ship
- [ ] Terrain adaptation chosen per building type (`none` / `beard_thin` / `bury` / sky / ocean)
- [ ] Herds via `spawn_rules`, not worldgen scripts

### Avoid

- [ ] Script-placing foliage every tick (pop-in; FFG removed)
- [ ] `structure_void`
- [ ] Features in nested folders
- [ ] Assuming `/place` includes entities
- [ ] Assuming embedded entities survive natural jigsaw gen
- [ ] Doors under stairs / missing upper half
- [ ] Top-level scatter fields in `scatter_feature` JSON
- [ ] Mixing structure-set placement with feature-rule “building” logic
- [ ] Re-enabling script camp / foliage placement (`ffg_naturalSpawn` equivalent)
- [ ] Reusing another pack’s fingerprint blocks (hamlet will staff the wrong NPC)
- [ ] Inventing MBA structure art before owner-authored `.mcstructure` files exist
- [ ] Spawning herds from scripts instead of `spawn_rules`

---

## Minimal MBA replication checklist

Use when adding a **new** worldgen surface (bunker, camp, scatter block, marker tier).

### Structures

1. [ ] Write `.mcstructure` (Structure Block or procedural) with `structure_world_origin` + **Include Entities** if needed
2. [ ] Add `template_pool` → `jigsaw` → `structure_set` (+ `processors` for loot/decay)
3. [ ] Confirm `/locate structure mb:<id>` and natural gen in **new chunks**
4. [ ] Add entity staffing script if zombies/NPCs don’t appear naturally
5. [ ] Document spacing/salt/biome tags in [ABANDONED_VILLAGE_STRUCTURES.md](./ABANDONED_VILLAGE_STRUCTURES.md) or a child doc

### Foliage / scatter

1. [ ] Custom block (if needed) with survivability-friendly geometry
2. [ ] `single_block_feature` → `scatter_feature` → `feature_rules`
3. [ ] Flat paths under `BP/features/` and `BP/feature_rules/`
4. [ ] Test in new chunks after Bridge export
5. [ ] No script tick placement for the same blocks

---

## MBA improvement ideas (derived from FFG)

| Idea | Effort | Impact |
|------|--------|--------|
| **`npm run verify:worldgen`** — lint scatter schema, flat feature paths, missing `.mcstructure` | Medium | Catches silent “features never load” bugs |
| **Single-piece lore bunkers** via jigsaw (max_depth 1) before full multi-piece villages ship | Low–medium | Player discovery + `/locate` without waiting for full village graph |
| **Processor-driven decay** on abandoned village chests / crops | Low | Richer ruins without script block replacement |
| **Infected surface scatter** via feature rules (dusted dirt patches) instead of script | Medium | Performance + no pop-in |
| **Door graft reference** `.mcstructure` for any structure that needs a working door in dev tools | Low | Avoids half-door jigsaw bugs |
| **Restore jigsaw plains POC** from `_archived/` when Maple Bear exports are ready | Medium | Unblocks script-off village path |
| **Python or Node generators** for repetitive feature_rules (per-biome marker slots) | Medium | FFG-scale content without hand-copy errors |
| **Unique fingerprint + staffing script** for any locateable building with mobs | Low | Matches FFG; avoids missing entities |
| **Terrain adaptation per type** (`none` / `beard_thin` / `bury` / sky / ocean helpers) | Low | Stops buried cottages and floating fields |
| **Wait for owner structures** before locking a visual village/bunker standard | — | First good pieces become the going-forward look |

---

## Related MBA docs

- [ABANDONED_VILLAGE_STRUCTURES.md](./ABANDONED_VILLAGE_STRUCTURES.md) — current jigsaw POC status, export workflow
- [VILLAGE_STRUCTURE_COLLAB_GUIDE.md](./VILLAGE_STRUCTURE_COLLAB_GUIDE.md) — Maple Bear multi-piece jigsaw villages
- [ABANDONED_SETTLEMENTS.md](./ABANDONED_SETTLEMENTS.md) — legacy script villages (tiers, loot)
- [WORLD_SETUP.md](./WORLD_SETUP.md) — Bedrock 1.26+, experiments
- [BIOME_GENERATION_VARIABLE_SIZES.md](./systems/BIOME_GENERATION_VARIABLE_SIZES.md) — infected biome sizing
- [Microsoft: Introduction to Jigsaw Structures](https://learn.microsoft.com/en-us/minecraft/creator/documents/structures/introductiontojigsawstructures)

---

*Last updated: 2026-08-14 — FFG generator/fingerprint/terrain notes merged; MBA structure art deferred until owner exports.*
