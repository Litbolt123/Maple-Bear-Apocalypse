# Infected vanilla biomes (test)

Compoohter wants **both**:

| Track | What it looks like | Current IDs |
|-------|--------------------|-------------|
| **Snow infected** (existing) | Dusted-dirt carpet, pale fog, no vanilla trees (no `forest` / `plains` tags) | `mb:infected_biome_small` / `_medium` / `_large` |
| **Infected vanilla** (new) | Same biome *shape* as the host (oak forest, later plains, etc.) plus infection fog / sickly grass | `mb:infected_vanilla_forest` **(test only)** |

Vanilla vegetation is driven by **biome tags**, not by “this used to be a forest chunk.” Snow infected biomes only tag `infected_biome` + size, so they stay barren. Infected vanilla **keeps** the host tags (`forest`, `plains`, …) and **keeps grass** as the surface.

Do **not** name vanilla-infected IDs `mb:infected_biome_*`. Village / lamp scripts treat that prefix as snow infected.

---

## Test biome: infected forest

**ID:** `mb:infected_vanilla_forest`  
**Replaces:** `minecraft:forest` only, amount **0.12**, `noise_frequency_scale` **3.5**  
**Surface:** `minecraft:grass_block` (not `mb:dusted_dirt`)  
**Climate:** vanilla forest (temp 0.7 — not a snow carpet)  
**Tags:** `forest` + `overworld` + `animal` + `monster` + `bee_habitat` + `infected_biome` + `infected_vanilla`  
**Not tagged:** `infected_biome_small/medium/large` (no snowy village lamps)

Client: sickly dusty grass (`#A8B090`) and **dusted-dirt foliage tint** (`#C4C0B4` — vanilla oak leaves pick this up). Not pure white (`#F0F2F4` washed the forest out). Reused `mb:infected_biome` fog.

**Infected leaves:** Same oak recipe for every species — Samples/preview cutout + `geometry.infected_oak_leaves` + stages 0–2 `default_foliage` + stage 3 snow-layer cream (no tint). Rebuild: `python tools/buildInfectedVegetationTextures.py` then `node tools/generateInfectedVegetationPack.js`. Birch/spruce/cherry/azalea/flowering azalea/pale oak/**red·orange·yellow poplar** convert in infected biomes so they pick up VAN dusty tint. Oak/jungle/acacia/dark oak/mangrove already use `default_foliage`. Creative inventory (Nature). Do not invent a new renderer.

There **are** four per-leaf infection stages (four blocks). Convert starts at stage 0 for that species. Powder, neighbor spread, and the infected-leaf tick move it to `_1` then `_2` then `_3`. Same Samples **cutout holes** per species.

**Loot (vanilla oak rules):** Silk Touch always drops the block (engine ignores the loot table). Shears drop the block. Otherwise: ~5% oak sapling, ~2% sticks, ~0.5% apple. No free infected-leaf drop.

**Spread:** Worldgen powder on canopy does **not** fire block `onPlace`. The script **samples nearby `mb:snow_layer` cells** (small volume around the player plus canopy columns) and converts what is under them — same as player-placed powder, still day-gated. Days 0–1: powder sits. From day 2, snow-on-leaf convert and neighbor spread follow `getBlockSpreadProgress` in `mb_balance.js` (ramps 2→20, 20→25, then slower 25→50→75, cap day 100; chances ×2 so day-2 canopy convert is ~4%; much slower than the testing table; Dev Tools → Infection & players can scale that with `mb_block_spread_speed_mult`), then the **world infection stack**. Convert **runs outside VAN** too. VAN foliage tint stays dusty/white on stages 0–2; outside VAN those same blocks use that biome’s foliage tint (so LIST stays green until stage 3). Stage 3 is cream powder in every biome. Extra worldgen trees are mostly vanilla oaks (`mb:infected_oak_tree_partial`). Other host biomes (plains, etc.) wait until August says so.

**Wood:** Logs / wood / stripped convert from adjacent infected leaves, powder, or infected wood. Samples textures, cream lift 0–2, stage 3 snow remap. **No** tick on every vanilla log. Mined infected logs/wood/stripped drop **themselves** and craft into **2** matching vanilla planks (decayed; vanilla is 4). Wart still drops vanilla wart.

**Torpedo Maple Bear explosions** instantly set leaves in the blast to the Snow stage (radius 5, skip duds).

**Grass (same days):** `grass_block` becomes `mb:dusted_dirt`. Short grass / ferns on that cell become powder (`mb:snow_layer`). Nothing before day 2. Dusted dirt spreads into **adjacent grass** like infected leaves spread into neighboring leaves (`getGreeneryNeighborSpreadChance`) — still **no** `minecraft:tick` on every dusted_dirt (snow biomes are a full carpet). Random lawn hits stay on the slower `getGreenerySpreadChance` table. Must already touch powder, dusted dirt, or infected leaves — no spontaneous lawn infection. Flowers/crops not in this pass. Toggle `leaf_infection`.

**26.50 Dappled Forest:** Poplar leaves/logs infect via the vegetation scripts anywhere those blocks exist. Snow infected `replace_biomes` **does** include `minecraft:dappled_forest` (same land group as cherry/pale). There is **no** `mb:infected_vanilla_dappled_forest` overlay — VAN stays `minecraft:forest` only until August clones the test.

Trees: vanilla-shaped oak (`trunk` + `canopy`). Custom leaves (August playtest ~1636, 82, 23 **keep**): `alpha_test_single_sided_to_opaque` on `geometry.infected_oak_leaves` — inset outer cube plus six inner slabs (both faces, 180° UV). Doubled inner texture is wanted. No leaf-vs-leaf cull. **`opaque` is a fail.** **`alpha_test_to_opaque` z-fights.** **`alpha_test_single_sided` alone is hollow.** Negative-size inner cube is a fail. **Do not** put `mb:snow_layer` in `leaf_blocks`. Worldgen `leaf_block` is **`minecraft:oak_leaves`** so a tree that starts still finishes over rivers (vanilla `may_replace` includes water; custom leaf blocks do not overflow biomes). Conversion can follow those overflow leaves. Dust on top: `search_feature` from above (`-y`) onto leaf tops (`mb:scatter_infected_canopy_dust`).

| Variant | ID | Look |
|---------|----|------|
| Normal (weight 7) | `mb:infected_oak_tree_partial` | Oak log + oak leaves (biome-tinted; infection starts from snow on top) |
| Extra oak (weight 2) | `mb:infected_oak_tree` | Same oak shape + oak leaves (converts via script, not a custom canopy at gen) |
| Bare / eaten (weight 1) | `mb:infected_oak_tree_bare` | Stripped oak, thinner oak-leaf canopy |

Ground (same `infected_vanilla` tag): light `mb:snow_layer` scatter + `minecraft:deadbush`. Custom snow uses `enforce_placement_rules: false` so the block’s placement_filter does not block worldgen. Canopy dust uses `may_attach_to.bottom` = leaves.

**Worldgen schema (Test #98 FeatureRegistry):** `feature_rules` identifier suffix = filename (no `_rule`). Do not use `scatter_chance` 1/1 — omit the field. Every `acacia_trunk` needs `trunk_lean` or the tree feature does not register. Tree `may_replace` must use **Bedrock engine IDs** (`minecraft:reeds`, not Java `minecraft:sugar_cane`) — unknown IDs log `Deferred BlockDescriptor resolution` and the feature may not register cleanly. Check `data/bedrock_blocks.json`.

Snow infected still replaces forest at ~8% (medium). In a new world you should see three forest flavors:

1. Normal oak forest  
2. Snow infected patch (dusted dirt, fog, few/no trees)  
3. This test (oak-shaped trees, dusty leaf tint, powder **on top** of canopies)

---

## How to test (required: new chunks)

Already-generated terrain will **not** pick this up. New world, or fly to unexplored forest.

1. Load **BP - Dev** + **RP - Dev**. The biome checker is Dev-only (not on public Host tools).
2. Journal → Developer Tools → Systems → **Biome checker** (action-bar HUD on). **Teleport to biome** runs `/locate biome` first, TPs, then waits until the chunk is ticking before reading biome. Do not treat a “(loading…) / chunk not loaded” hub as a miss — Refresh after a second.
3. Fly oak forest, or `/locate biome mb:infected_vanilla_forest` (Bedrock, cheats on). Watch the HUD:
   - `§dVAN` = standing in `mb:infected_vanilla_forest` (success)
   - `§dSNW` = existing snow infected
   - `§aLIST` = still vanilla forest, on the replace list
4. **Pass:** oak-shaped trees on grass, canopies that **whiten in stages** (dust 0 oak-like → 3 paler dusty, not pure-white ghosts), thin `mb:snow_layer` on **tops** of leaves only, infection fog, biome id `mb:infected_vanilla_forest`. Snow-capped oak/birch leaves should turn into infected leaves at dust 0, then neighbors and later dust stages over time — **including LIST forest and river overflow** next to VAN. Breaking infected leaves without Silk Touch / shears should not drop the leaf block (sapling/sticks like oak). **Grass:** journal day 0–1 the floor stays grass. Day 2+ powder/dirt edges creep one cell at a time (not the whole meadow). Use journal/dev day, not only `/time set`.
5. **Fail:** white plates sticking out of trunks / leaf sides (snow in the canopy); harsh black-and-white custom leaves; dark olive oaks. Tree density should match a normal forest — do not crank scatter iterations. Converted leaves that look like **solid painted cubes** (`opaque`) are a fail — they must keep vanilla oak **cutout holes**, just dustier. **Stopping convert outside VAN is a fail** (August: conversion should run outside VAN). Custom dusty/bare oaks need **new chunks**. Grass converting with no infected neighbor, or the lawn going dusty in a couple seconds on day 2, is also a fail.
6. Creative: search **Infected Oak Leaves** and place a block to check the texture even in an old world.

`/locate biome` works on current Bedrock (cheats). Command:

`/locate biome mb:infected_vanilla_forest`

Or Journal → Developer Tools → Systems → **Biome checker** → **Teleport to biome**.

Maple Bear **tile spawn** still prefers `mb:dusted_dirt`. This test **starts** on grass, so early bear density may be lower than snow infected patches. As grass converts over days, that ground becomes dusted dirt and spawn can pick up. That is expected.

---

## If the test works (later, not this PR)

Clone the same pattern per host: plains, taiga, desert, jungle, … each with host tags + grass/sand/stone surface, unique `mb:infected_vanilla_<name>`, unique salt/amount. Keep snow infected as the “all the way” carpet. Do not steal village fingerprint tags.

Reference vanilla JSON: `C:\Users\Augus\Desktop\Maple Bear Addon\Biome Idea Examples\biomes` (also `dev/biomes stuff/biomes` in-repo).
