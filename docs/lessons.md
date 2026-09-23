# Lessons

What worked and what did not. **Read this before repeating a fix.** After a fix or a failed approach, append a class (not a chat transcript): Symptom · Failed · Worked · Verify · Do not regress.

Vault index: `C:\Users\Augus\OneDrive\Documents\Obsidian Vault\Atlas\Lessons.md`

## 2026-09-23 — Ground fast path round-robin after day 3

- **Symptom:** `spreadPlayersForWork` only rotates players through day 3. At day 100 the infected-ground fast loop still checks every player every pass.
- **Failed:** Turning the day-3 gate off globally would also rotate biome, inventory, and other callers.
- **Worked:** Optional `forceRoundRobin` on `spreadPlayersForWork`, used only by the ground fast path when the world has 2+ players. One on-ground player per pass. Timers stay in seconds.
- **Verify:** Change C in `docs/development/testing/infection-spread-efficiency-check.md`. Two players on infected ground both still infect. Solo cadence unchanged.

## 2026-09-23 — Infection writes must drain, not drop

- **Symptom:** Day-100 hitch from kill `setType` bursts and storm snow waves, plus a full `dustedDirtCache` walk per player on infected ground.
- **Failed:** Clamping storm placement back to the day-40 count. `fillBlocks` on the whole radius is one spike. A custom tick on every infected block gets worse as the area grows.
- **Worked:** One host queue and `system.runJob`. Yield between slices of 24 dust writes and 8 snow attempts. Leave the tail queued. Ambient pressure: one spatial sample per 32-block player cluster.
- **Verify:** `docs/development/testing/infection-spread-efficiency-check.md` with 2+ players on a day-100 world. Self-test should show the write queue return to empty.


## 2026-09-19 — Floor plants attach to soil; do not place grass in the air

**Symptom (August screenshot):** Cream dusty grass floating beside a birch trunk, not sitting on the dusty dirt.

**Failed:** VAN overlay has the `infected_biome` tag, so `infected_floor_plants` runs. `q.heightmap` is the tree top. Scatter `y: 1` + `project_input_to_floor` lands in the canopy. Tall grass / large fern `multi_block_feature` had `enforce_placement_rules: false` and no attach, so they replaced **air**. **Playtest (August):** this was **worldgen**, not script convert.

**Worked:** Tall/large fern worldgen `enforce_placement_rules: true` (block filter is soil + the other half). Scatter searches **-y** from the heightmap until a place feature succeeds on grass/dusted dirt.

**Verify:** Fully exit. **New** VAN / infected-biome chunks: dusty grass on the lawn, not in the trees. Do not restyle KEEP grass.

**Do not regress:** Do not set tall-grass `enforce_placement_rules` false to “make worldgen work.” Do not run the foliage generator in a way that overwrites KEEP grass JSON/textures.

## 2026-09-19 — Firefly bushes are not forest floor scatter

**Symptom (August):** Firefly bushes should not spawn naturally in forests. Only by rivers if they do.

**Failed:** Putting `mb:place_infected_firefly_bush` in the shared `weighted_infected_floor_plants` list (VAN + snow infected land). Infected river chunks use the ocean overlay (`ocean` tag), so a river-only infected-biome rule would not match after replace.

**Worked:** Firefly `worldgenWeight` 0 — dropped from forest floor scatter. Vanilla firefly bushes (water/swamp) still convert when infection reaches them. Unique dusty-podzol convert is parked separately.

**Verify:** Fully exit. New forest chunks should not grow dusty firefly bushes. A vanilla firefly bush next to infection should still convert.

**Do not regress:** Do not add firefly back to the general floor weighted list.

## 2026-09-19 — Podzol converts to dusty dirt for now; unique dusty podzol is parked

**Symptom (August):** Changed mind — podzol should turn into dusty dirt for now (not its own dusty-podzol block).

**Failed:** Shipping unique `mb:dusted_podzol` convert after he asked for it, then leaving that as the only path.

**Worked:** `dustedGroundIdForVanilla` always returns `mb:dusted_dirt`. Craft is podzol + powder → dusty dirt. Keep the `mb:dusted_podzol` block in the pack for existing worlds. Coarse dirt still never infects.

**Verify:** Fully exit. Infect a podzol patch — it should look like dusty dirt. Coarse dirt stays clean.

**Do not regress:** Do not convert coarse dirt. Do not delete the dusty-podzol block until he says to.

## 2026-09-19 — Copy-sync must prune deleted dest files (stale recipes stay loaded)

**Symptom (August content log):** After Beta 5.8 loaded: `Recipe "mb:dusted_podzol_from_podzol" has the same ingredients as mb:dusted_dirt's recipe but outputs mb:dusted_podzol instead.` JOIN retries, `@minecraft/server` 2.6→2.10, `No sound found for block type 'normal'` fly/fizz, Buff AI duplicate skip, abandoned-village LEFT/JOIN remain expected noise.

**Failed:** `cpSync` into Bridge / Minecraft development packs. Deleted git files (`dusted_dirt_from_podzol`, `dusted_dirt_from_coarse_dirt`) stayed on disk. Both snow+podzol recipes loaded. First rejoin after sync still logged What's new **Beta 5.3**; second rejoin logged **Beta 5.8**.

**Worked:** `tools/copyPackTree.js` copies then prunes dest paths missing from source (`_archived` / `.git` / `.bridge` kept). Wired into `sync:bridge` and `sync:dev-to-minecraft`.

**Verify:** Fully exit to title. What's new **Beta 5.8**. No duplicate-ingredient recipe warning. Coarse dirt + powder should not craft dusty dirt.

**Do not regress:** Do not copy-only into Bridge or development packs. Fully exit after sync — one leave/rejoin can still run the old scripts.

## 2026-09-19 — Mycelium/podzol biomes slow spread; mushrooms resist, they do not purify

**Symptom (August):** Spread should take longer in biomes with mycelium and podzol. Mushrooms could be the bane of the infection. Maybe.

**Failed:** Treating mycelium like grass. Slowing only the podzol *block* left grass/dirt in giant taiga and mushroom fields at full speed. Making mushroom island immune (or letting mushrooms purify neighbors) would be a turtle box. Applying the neighbor-chance roll to *all* foliage would stall plains grass that already felt good.

**Worked:** Mycelium uses the same ×0.45 as podzol. Mushroom fields + giant/old-growth taiga apply an extra ×0.55 on ground, foliage, and kill-burst (`dimension.getBiome` once per burst). Vanilla brown/red mushrooms take an extra ×0.4 fail vs grass. Grass in plains stays full neighbor hops. Those biomes stay off infected `replace_biomes`. Stacking podzol × biome is slower, not immune.

**Verify:** Fully exit. Mushroom fields / giant taiga crawl slower than plains. Vanilla mushrooms convert slower than grass. Coarse dirt still never infects. **Playtest (August log 2026-09-19):** second join loaded **Beta 5.8**. First rejoin was still **5.3**. Biome crawl speed not confirmed yet.

**Do not regress:** Do not add mushroom_island / mega_taiga to infected `replace_biomes`. Do not make those biomes immune. Do not implement mushrooms purifying / fighting back until August asks. Do not extra-roll plains grass just to resist mushrooms.

## 2026-09-19 — Wall vines need direction bits; do not cream-box all four faces

**Symptom (August screenshot):** Infected vines under a tree were a cream cage / broken texture, not vanilla vines.

**Failed:** `geometry.infected_vine` always drew all four wall planes. Convert used `setType`, which drops `vine_direction_bits`, so every cell became a box. `bake_powder_stage` full-remapped the opaque vanilla gray vine tile to snow cream, so the cage looked solid. Twisting/weeping reused that wall geo (they are cross plants).

**Worked:** Four named bones + `bone_visibility` from `mb:north/east/south/west`. Convert copies vanilla bits (south=1, west=2, north=4, east=8), infers from solid neighbors if bits are 0. Texture is vanilla `vine.png` with a white lift, pattern kept. Twisting/weeping use `minecraft:geometry.cross`. Same class as dusty grass: vanilla shape, powder color.

**Verify:** Fully exit. VAN vines on a trunk should be white-tinted vine planes on the log faces, not a cream box in the air.

**Do not regress:** Do not `setType` wall vines without copying direction bits. Do not show all four faces by default on convert. Do not full-remap the vine tile to cream.

## 2026-09-19 — Double tall grass: do not air one half first; upper_block_bit may be missing

**Symptom (August playtest):** Infecting tall grass **breaks** the plant. Large ferns convert fine.

**Failed:** `placeInfectedDoublePlant` set the vanilla **top to air** first (pair pops). `isDoublePlantUpper` required `upper_block_bit === true`; ferns return boolean true, tall grass often returns **1**, **"1"**, or **undefined**. Treating the top as a bottom placed the dusty pair too high and popped the plant. Fallback dest **air** also deleted unmapped tall plants. Converting the grass_block under a failed plant convert pops the vanilla pair.

**Worked:** Same tall ID sitting on a matching bottom **is** the top half (do not require the bit). Place `multi_block_part` 0 then 1 onto the existing cells. Never air a tall plant on convert failure. If the plant convert fails, do not convert the ground under it.

**Verify:** Fully exit. VAN double tall grass next to infection should become a 2-block dusty plant, same as large ferns.

**Do not regress:** Do not `setType(air)` on one half of a vanilla double plant. Do not require `=== true` for `upper_block_bit`. Do not convert ground if the plant on it failed to convert.

## 2026-09-19 — Coarse dirt stays clean; unique dusty podzol is parked

**Symptom (August playtest):** Infected podzol looked like dusty dirt. Coarse dirt should not infect at all. Later the same day: podzol should turn into dusty dirt for now.

**Failed:** Vine converted podzol and coarse dirt both to `mb:dusted_dirt`. Then shipping unique `mb:dusted_podzol` convert after he asked, then leaving that as the only path.

**Worked:** Coarse dirt never infects. Podzol converts to `mb:dusted_dirt` for now. Keep the `mb:dusted_podzol` block in the pack for leftover worlds.

**Verify:** Fully exit. Podzol patch becomes dusty dirt. Coarse dirt next to infection stays coarse.

**Do not regress:** Do not convert coarse dirt. Do not delete the dusty-podzol block until he says to.

## 2026-09-19 — Mid-stage leaves must keep dusting; do not evict them for new converts

**Symptom (August screenshot, after paced climb):** Cream canopy with green cubes still in the tree. Some leaves stuck midway instead of the whole tree finishing.

**Failed:** `processCanopyColumn` only dust-advanced the ray-hit leaf (`skipSpread`). New converts filled `KNOWN_LEAF_MAX` (96) and **FIFO-evicted** under-max leaves. Chance-gated dust on skipSpread visits. Paced vanilla convert is correct; starving dust on already-infected leaves is not.

**Worked:** Dust-advance under-max leaves in the column (up to 18). SkipSpread always climbs one dust stage **and** still fills cream holes (1 hop). Cap 256. **Never FIFO-evict mid-dust** — only evict cream to make room, otherwise skip the new source. Hole checks use faces **plus** canopy edge-diagonals (spruce checkerboard). Vanilla still one frontier per column.

**Verify:** Fully exit. Day 100 spruce/oak that started converting should keep going to cream; leftover green should fill, gray-green mid-stage should not freeze. Playtest pending (August).

**Do not regress:** Do not evict under-max sources to make room for new converts. Do not skip dust-advance or cream-hole hops on skipSpread. Do not put `minecraft:tick` back on leaves.

## 2026-09-19 — Podzol vine is slower; giant taiga is not an infected replace

**Symptom (August):** Spread should be slower through podzol (thought of as dirt+gravel). Mutated taiga / giant taiga is not replaced by infected biomes on purpose.

**Failed:** Treating podzol as the same one-shot as dirt/grass in `SNOW_UNDER_CONVERT`. Vanilla **coarse dirt** is the dirt+gravel craft; **podzol** is the giant/old-growth taiga forest floor. Regular `taiga` *is* on `replace_biomes`. Giant tree taiga ids (`mega_taiga`, `redwood_taiga_mutated`, hills variants) are `INTENTIONAL_SAFE_OVERWORLD_BIOMES`.

**Worked:** `PODZOL_GROUND_SPREAD_MULT` 0.45 on the ground vine and kill-burst convert. Coarse dirt unchanged. Safe-biome list still omits mega/redwood taiga from infected replace (plus old_growth aliases). Bears can still walk in.

**Verify:** Fully exit. Stand on a podzol patch next to dusted dirt: it should crawl slower than grass. Mega taiga / giant tree taiga should not become snow infected biomes on new chunks.

**Do not regress:** Do not add mega_taiga / redwood_taiga_mutated to infected `replace_biomes`. Do not treat podzol as uninfectable.

## 2026-09-19 — Format 1.26.20+ ambient_occlusion must be a float, not false

**Symptom (August content log, after dropping `is_experimental`):** `infected_tall_grass` / `infected_large_fern` — `material_instances -> *: invalid string` and `ambient_occlusion: invalid numeric value`. Features then unknown/invalid; RP `blocks.json` texture with no registry. Short dusty grass still worked. **Next load:** `destructible_by_mining: invalid numeric value` and `use_efficiency` not in schema. Same unknown-block / `blocks.json` follow-on. What's new **Beta 5.3**. JOIN retry / fly / 2.6→2.10 still expected.

**Failed:** Copying 1.26.10 plant JSON onto format **1.26.40**. That format rejects: `is_experimental`, boolean `ambient_occlusion` (must be float **0.0–10.0**), `use_efficiency` on `destructible_by_mining` (object is only `seconds_to_destroy` + optional `item_specific_speeds`), and `tag:*` (1.26.20+ uses `minecraft:tags`). Each extra field **rejects the whole block**. `invalid numeric` / `invalid string` are fallback parsers when the object fails.

**Worked:** `ambient_occlusion: 0`. Mining object without `use_efficiency`. `minecraft:tags: ["minecraft:is_shears_item_destructible"]`. Leave 1.26.10 plants on the old fields.

**Verify:** Fully exit. No `material_instances` / `destructible_by_mining` / unknown-block / `blocks.json` lines for those two IDs. VAN double tall grass next to infection should become a 2-block dusty plant.

**Do not regress:** Do not copy 1.26.10 block fields onto 1.26.40. Do not put `is_experimental`, boolean occlusion, `use_efficiency`, or `tag:*` on 1.26.20+ custom blocks.

## 2026-09-19 — Mining/buff chew diamond-slow blocks; only survival-unbreakable stays closed

**Symptom (August):** An obsidian cube (and other diamond-slow walls) was a safe box. Mining and buff Maple Bears should chew those, slower than stone. Bedrock and the ancient city portal stay unbreakable.

**Failed:** Putting obsidian, crying obsidian, ancient debris, netherite, and respawn anchors on `UNBREAKABLE_BLOCKS`. Runtime mining is a **blacklist** (`isBreakableBlock`), so that list is immunity. Shrinking the list without a slow chew made buff **explosions** and **torpedo path bursts** delete a cube in one tick. Entity `minecraft:break_blocks` is not the dig path — do not add obsidian there hoping it “mines slower.” Giving buff smash the same 5s chew timer as mining — August wanted a **lower chance**, not the same clock.

**Worked:** `UNBREAKABLE_BLOCKS` = survival-unbreakable only (bedrock, barrier, commands/structure/jigsaw/light/deny/allow, end portal/frame/gateway, **reinforced_deepslate**, invisible bedrock). Mining `clearBlock` uses `consumeSlowBreakProgress` (**100 ticks ≈ 5s**). Buff smash uses `rollBuffSlowBreak` (**12%** per climbing smash; miss stops the column). Explosions and torpedo bursts use `isInstantDestroyBlocked`. Solo and MP share the same host tick; smash interval already stretches with players.

**Verify:** Fully exit. Mining bear on obsidian: about five seconds per block. Buff smash: stone always, obsidian often fails then sometimes pops. Explode / torpedo leave obsidian. Bedrock and reinforced deepslate never. Playtest pending (August).

**Do not regress:** Do not put obsidian back on `UNBREAKABLE_BLOCKS`. Do not let explode/torpedo skip the slow set. Do not whitelist obsidian onto entity `break_blocks`. Do not put buff smash back on the mining chew timer.

## 2026-09-19 — Player goal is a keep-playing loop, not a turtle box

**Symptom (Aiden → August, UX):** The addon needs a **player goal**. An obsidian cube (or any guarantee) “solves” it because they stopped playing. Help should exist; it must not guarantee survival. One-shot solutions kill replay. Struggle that is too hard or too easy also fails. Keep people playing with a loop they have to keep up with (explore, fight, maintain). Example class: a buff-bear counter gated on a heavy core / trial chamber so you cannot stay home.

**Failed:** Treating *No True Safety* as only “mining vs holes, flying vs sky.” That does not catch the box, the fueled dome you never leave, or a win-button craft. Shipping quarantine / safe beacons as “the answer.” Calling Day 25 victory “you can stop.”

**Worked:** Standing note `docs/design/PLAYER_GOAL_AND_LOOP.md` (checklist while making). Help without a guarantee. Partial counters. Home still rots while you are away. Vanilla exploration when we can. Solo and MP are two levels of the same loop. **Do not implement** the heavy-core example until August asks.

**Verify:** Not an in-game test this turn. Next “this helps you survive” feature must pass that checklist. August + Aiden tune too-hard / too-easy in playtest.

**Do not regress:** Do not add a guaranteed-safe cube, biome, or machine. Do not treat this brainstorm as a ticket to build trial-chamber gear.

## 2026-09-19 — Fully infected blocks must keep a face front; any dust stage can convert vanilla

**Symptom (August screenshot):** Cream oak canopy with green vanilla leaf holes still in the tree. Spec: any infection stage should be able to infect healthy neighbors; when a block **becomes fully infected**, check the six faces.

**Failed:** Dropping known leaf sources at `LEAF_DUST_MAX` so cream leaves stopped hopping. `infectLeafNeighbors` shuffled far offsets (`+4 Y`, diagonals) and returned after the first success — often not the hole next to the cream leaf. `processCanopyColumn` only walks one XZ column, so a green leaf beside cream is a different column. Treating “max dust” as “done spreading.” Do not put `minecraft:tick` back on leaves.

**Worked:** Any dust stage can convert vanilla (faces first). Reaching max always checks the six faces with no extra chance. Cream leaves stay remembered until every face is already infected. Same class for max-dust logs. Solo can convert more faces per drain than two-player.

**Verify:** Fully exit. Stand under a partly cream VAN oak: green holes next to cream should convert; gray leaves should still climb to cream. Playtest pending (August).

**Do not regress:** Do not delete known sources at max dust. Do not spend the only hop four blocks away when a face is still vanilla. Do not add per-block ticks.

## 2026-09-19 — Leaf dust must advance even when a neighbor hop succeeds

**Symptom (August screenshot):** Some canopy leaves stayed gray-green and never reached the cream / max white stage (stage 3). Other patches on the same trees did.

**Failed:** `processInfectedLeafFront` only called `advanceLeafDust` if `infectLeafNeighbors` failed. Neighbor hops look several blocks away (including +4 Y), so a still-healthy leaf almost always ate the success. Column walks also started at dusty dirt and spent the convert budget on the trunk. Known-leaf sources expired after 2 minutes while still under-max. Do not put `minecraft:tick` back on every leaf.

**Worked:** Separate chance roll to climb dust on the scanned leaf. Process that leaf before the rest of the column. Stages 0–2 oak still use foliage tint (they look gray-green on purpose); only stage 3 is snow-layer cream. **Keep cream sources while a face is still vanilla** — dropping them at max left green holes (see the cream-hole lesson the same day).

**Verify:** Fully exit. A partly dusty VAN oak should keep whitening over time, not freeze at gray while the front still converts. Playtest pending (August).

**Do not regress:** Do not gate dust advance on a failed neighbor hop. Do not spend the whole canopy budget on the stump first.

## 2026-09-19 — Dusty leaf litter is a 16×16 leaf cutout, not the snow-layer slab

**Symptom (August screenshot):** Infected leaf litter looked like torn cream plates with black holes. Wanted it brownish like a leaf still, but white like the “snow” (powder).

**Failed:** `kind: "layer"` used `geometry.'snow'_layer` (32×32 UVs, side strips at x=16). Texture was a 16×16 full cream remap of the grayscale litter (`bake_powder_stage`), so UV wrap made black gaps and a solid slab. Vanilla litter is a **dry_foliage** grayscale cutout (`#A37546`), not a snow plate.

**Worked:** Thin 16×16 plane `geometry.infected_leaf_litter`. Bake: keep leaf holes, tint gray×dry-foliage brown, mix powder cream on the highlights. `alpha_test_single_sided`. Same class as dusty grass: vanilla shape, powder color — do not reuse snow-layer geo for a 16×16 plant.

**Verify:** Fully exit. VAN leaf litter next to infection should look like brown leaves with powder on them, grass showing through the holes. **Playtest (August 2026-09-19):** “The dusted leaves look much better.” Screenshot: dusty VAN lawn, pale trunks, brown dusty litter plate on the ground (not torn cream slabs). **KEEP** this brown×powder cutout. Do not keep iterating the litter geo or bake.

**Do not regress:** Do not put leaf litter on `geometry.'snow'_layer`. Do not full-remap litter to cream. Do not fill the cutout holes. Do not restyle the dusty leaves after this KEEP.

## 2026-09-19 — Guest hitch is client block updates, not host chunk count

**Symptom (August playtest):** Friend lagging in the same world; August not at all. Friend on **5 chunks**, August on **32**. Friend loaded an **older MBA** version and it was not laggy.

**Failed:** Treating this as host script lag. **Script lag is shared** — the tick runs on the host, so if scripts stall, *everyone* rubber-bands (host included). August asked this and he is right. Friend-only hitch is not that. Treating 5 chunks as “less work” (render distance does not cut how many `setBlock` packets the host sends in simulation distance). Putting `minecraft:tick` back on leaves to “match old spread.”

**Worked:** Split the two lags. Script/sim hitch = everyone. Friend-only hitch = his client drawing and meshing dusty blocks (he is on a weaker machine; 5 chunks is him trying to help FPS). Grass spreading well in the new pack means many custom-block updates to every client. Older MBA converted less, so weak guests stayed fine. When **two or more players** are in: always rotate vegetation extras; cap dirt-drain extra hops and tree convert budgets. Solo still spends more. Do not starve the lawn.

**Verify:** Both fully exit. Same world, two players. August’s lawn still creeps. Friend’s hitch should ease; 5 vs 32 chunks will not match a beefy host GPU. Playtest pending (August + friend).

**Do not regress:** Do not tune only for August’s PC. Do not make solo as thin as a two-player budget.

## 2026-09-19 — Infection must climb the trunk, paced, not a ±3 window and not the whole oak in one tick

**Symptom (August playtest):** Trunks dusted from the **bottom** and did not climb all the way up. Leaves still weak. Grass still good. **Then (day 100):** trees were almost instantly infected when hit from the ground.

**Failed:** After the canopy-lid fix, column walk was still **3 up / 18 down** from the hit, **top → bottom** (base converts last, upper logs never see it in that pass). Wood hops had **no straight-up** `[0,2,0]` / `[0,3,0]`. Wood scan **skipped vanilla leaves**, so a downward ray that hit the canopy never processed the trunk. Lawn `drainKnownGroundSources` still converted the stump from dusty dirt. **Then** expanding the whole tree and converting **every** touching cell in one pass, plus **±4 Y** neighbor hops and **newly-converted cascade**, at day 100 (~100% chance) painted the oak at once. Remembered logs in the same XZ each added another frontier the same drain.

**Worked:** Expand the whole tree (~48, one air gap). Infer climb **up** from dusty dirt / low infection, **down** from canopy powder. Convert **one** frontier vanilla block per column per drain. Face hops only (no skip-ahead). No newly-cascade. Dedup known sources and player scans by XZ. Cream/max-dust still checks a face over time (holes fill), not six logs in one notify. No `minecraft:tick`.

**Verify:** Fully exit. Day 100 VAN oak next to dusty dirt: stump, then the trunk climbs, then leaves — not the whole tree in a blink. Powder on the lid should crawl down the same way. Lawn should stay as good as before. Playtest pending (August).

**Do not regress:** Do not walk only ±3 from the first solid leaf. Do not convert the whole column in one pass. Do not hop ±2–4 Y to “help it climb.” Do not skip vanilla canopy on the wood scan. Do not put `minecraft:tick` back on leaves/wood.

## 2026-09-19 — Canopy scans must walk the column; the first solid leaf is a lid

**Symptom (August playtest):** Grass spreading still good. Trees and especially leaves were not spreading as expected.

**Failed:** Same downward `getBlockFromRay` as the lawn. Grass plants are passable, so the ray hits dirt. Leaves are solid, so the ray stops on the healthy canopy top — those leaves do not touch dusted dirt or the trunk. The scan then skipped the column. Wood scan did the same. Do not put `minecraft:tick` back on every leaf to “fix” it.

**Worked:** After the first tree hit, walk the rest of the column (later: full tree, **one frontier cell per drain** — see the trunk-climb lesson the same day). No per-leaf ticks.

**Verify:** Fully exit. VAN lawn still creeps. Stand by a tree next to dusty dirt: trunk then leaves. **Playtest (August 2026-09-19):** grass still good; trunks only dusted at the bottom and did not climb — the ±3 window failed; see the trunk-climb lesson.

**Do not regress:** Do not treat the first solid ray hit as the only canopy cell. Do not add `minecraft:tick` on infected leaves/wood.

## 2026-09-19 — Infected double plants are multi-block, not a 1-block stub

**Symptom (August):** Wanted an infected **double** tall grass block. Existing `mb:infected_tall_grass` was a single cross using only the vanilla *bottom* TGA.

**Failed:** `tall: true` in the foliage generator did not change JSON. Convert set the bottom to a 1-block dusty plant and deleted the vanilla top. Copying only `double_plant_grass_bottom`. `setType` on one half of a `minecraft:multi_block` pair can pop the other half (Wiki: states must match; breaking one part breaks all). Putting `is_experimental: false` on format **1.26.40** block description — that member is not in the schema (Wiki removed it). Then `ambient_occlusion: false` on the same format — 1.26.20+ requires a float **0.0–10.0**. Either field **rejects the whole block**, so `mb:infected_tall_grass` / `mb:infected_large_fern` never enter the registry. Then `minecraft:multi_block_feature` says unknown/invalid block, and RP `blocks.json` warns the texture has no registry entry. Older format **1.26.10** foliage still accepts boolean occlusion and ignores extra `is_experimental`.

**Worked:** `minecraft:multi_block` trait, 2 parts up, format 1.26.40 (stable). **No `is_experimental`.** **`ambient_occlusion: 0`** (not `false`). Bottom/top Samples cutouts + powder remap. Worldgen `minecraft:multi_block_feature` (1.26.50). Convert places part 0 + part 1. Emulsifier restores both vanilla `upper_block_bit` halves. Same class for large fern. `movable: popped` required. Placement filter includes the dusty plant so the top half can sit on the bottom half.

**Verify:** Fully exit. Content log should not list `is_experimental` or `ambient_occlusion: invalid numeric` on those two JSON files, and should not say `mb:infected_tall_grass` / `mb:infected_large_fern` are unknown. VAN double tall grass next to infection should become a 2-block dusty plant.

**Do not regress:** Do not put two-sided `alpha_test` on the cross. Do not convert only the bottom. Do not omit `minecraft:movable` popped. Do not use `single_block_feature` for these. **Do not put `is_experimental` on 1.26.40+ custom blocks. Do not use boolean `ambient_occlusion` on 1.26.20+.** JOIN retry / `No sound found for block type 'normal'` / `@minecraft/server` 2.6→2.10 promotion remain expected noise.

## 2026-09-19 — Dusty grass plants are vanilla cutouts, not cream billboards

**Symptom (August screenshot):** Infected grass *plants* looked see-glitchy next to vanilla grass — solid cream X-planes. Wanted vanilla grass shape with powder/“snow” colors, slightly more see-through toward the bottom.

**Failed:** Copying Samples `short_grass.tga` 1:1 then only recoloring. Vanilla fills the bottom rows (y=12–15 are almost solid); green-on-green hides that on a lawn, cream does not. `minecraft:geometry.cross` + `alpha_test` (no backface cull) flickers (Bedrock Wiki vanilla-block-models). `face_dimming: true` on the two planes. Bayer dither on the solid base → checkerboard sparkle. `blend` / partial alpha cannot fade a cutout (`alpha_test` is binary).

**Worked (August playtest 2026-09-19, KEEP):** Cross plants use `alpha_test_single_sided` + `face_dimming: false` (Wiki flowers/crops). Keep the vanilla blade holes; remap opaque pixels to `snow_layer` cream. Thin only the filled clump at the base by keeping stem columns from the upper blades (`fade_plant_base` in `tools/buildInfectedVegetationTextures.py`). Generator: `tools/generateInfectedFoliagePack.js`. August: “That looks a lot better, and fits the feel of the addon.” Powder blades on dusty dirt — keep this look.

**Verify:** August playtest 2026-09-19 close-up on a dusty lawn — **keep**. Spreading already signed off the same day.

**Do not regress:** Do not put two-sided `alpha_test` back on `geometry.cross`. Do not fill grass holes. Do not Bayer-dither the base. Do not use `blend` for a fade.

## 2026-09-19 — MBA work always has a solo level and a multiplayer level

**Symptom (August):** Whenever we change the addon, think single-player **and** multiplayer. They are different. Solo can use more resources (one player, one set of scans). Multiplayer is many of those sets, so it needs more sharing and optimization.

**Failed:** Tuning only the world August is in (usually solo). After day 3, vegetation used to fire a full canopy/grass scan **per player**. Starving solo down to a four-player budget would make the infection feel dead when he playtests alone.

**Worked:** Treat player-count as a design axis on every spawn, spread, storm, emulsifier, and AI change. Solo: keep the visible front rich. MP: cluster / round-robin (`spreadPlayersForVegetationWork`, `spreadPlayersForWork`) so N players are not N full copies. Infection near someone should still creep.

**Verify:** August playtest 2026-09-19 VAN lawn screenshot — **spreading works** (dusted dirt + dusty grass plants on the front). Solo day 2+ creep is alive. Two-plus players after day 3 still untested.

**Do not regress:** Do not ship a hot loop that runs once per player with no cluster. Do not make solo as thin as a full Realm.

## 2026-09-19 — Custom-component onTick requires minecraft:tick on the block

**Symptom (August playtest, new world load):** Content log `[Blocks][error]` for every `mb:infected_*` leaf/log/wood/wart: subscribed to `onTick` but missing `minecraft:tick`.

**Failed:** Dropping `minecraft:tick` from generated JSON (correct for hitch) while leaving `onTick` / `onRandomTick` on `mb:infected_oak_leaf` and `mb:infected_wood`. The previous lesson said the script handler could stay as a no-op. The engine disagrees — a tick *subscription* requires the JSON component. Same presence-class as `fire_immune: false`.

**Worked:** Remove `onTick` / `onRandomTick` from those custom components. Keep player-centric scans. Do not put `minecraft:tick` back.

**Verify:** August playtest 2026-09-19, new/reload world — those `[Blocks][error] onTick` lines are gone. Same session screenshot: **spreading works** (dusted dirt patches across a VAN lawn, dusty grass plants on the front). Player scans hop without `minecraft:tick`.

**Do not regress:** Do not register `onTick` unless the block JSON has `minecraft:tick`. Empty `{}` tag components (wood, foliage) are fine.

## 2026-09-16 — Smooth addon work without freezing the infection

**Symptom (August):** Want things to run smoothly but still be good, work well, not broken or too rigid. Deep research, other people's thoughts, apply where it fits.

**Failed:** Wiki `contents.json` as a perf silver bullet (dedicated Wiki page: optional / Marketplace encrypt). Halving mining A* nodes or wrapping `findPathToTarget` in `system.runJob` without a continuation would make bears look stuck. Turning off climate on snow infected biomes would kill the look. Running every vegetation scan (leaf, grass, wood, powder, tint) every slice in a dusty forest stacks hundreds of `getBlock`s. `/particle` via `runCommand` on each kill-stain convert.

**Worked:** Bedrock Wiki add-on performance + Script API “avoid commands” + Mojang `runJob` *idea* (time slice, keep the visible front). Leaf + grass always run. Wood / powder / tint extras rotate only when spawn-load ≥ 0.3 / 0.55. Biome tint uses a downward ray + ±6 Y, not a 40-high column. Skip extra powder columns when the volume found none. `spawnParticle` instead of `/particle`; cap 4 snowflakes per stain. `textures_list.json` cache (Wiki). Mining A* `runJob` left for a later slice.

**Verify:** Fully exit. Quiet day 2+ VAN: canopy and lawn still creep every few seconds. Busy world (storm + bears + emulsifier): breaking/combat should hitch less; front near you should still move. Playtest pending (August).

**Do not regress:** Do not skip leaf/grass scans on load. Do not `runJob` mining paths until AI can continue across ticks. Do not add `minecraft:tick` back onto dusty plants.

## 2026-09-16 — Player-facing work belongs in the version changelog the same turn

**Symptom (August):** Additions and changes must be in the version changelog for releases and Dev (Journal **What's new**).

**Failed:** Leaving notes only in `docs/context summary.md` / lessons. `UNRELEASED_DRAFT.md` went stale after beta.5 shipped. In-game **What's new** stayed on old camera/death bullets. Dev label was hardcoded `"Beta 5"` so a version bump would not show.

**Worked:** Same turn: `docs/development/releases/UNRELEASED_DRAFT.md` + `docs/PLAYER_CHANGELOG.md` (Unreleased or `## v…`) + `getPlayerChangelogBody()` in `mb_playerChangelog.js`. Bump `PLAYER_CHANGELOG_VERSION` so the journal marks unread. Derive the What's new title from that version (do not hardcode `"Beta 5"`). On tag day copy into `docs/RELEASE_BODY.md`. Public pack semver can stay until the tag; Dev `ADDON_VERSION_PRERELEASE` can lead.

**Verify:** Journal → What's new shows **Beta 5.1** and the new highlights after a full exit. `docs/PLAYER_CHANGELOG.md` Unreleased matches the draft.

**Do not regress:** Do not ship player-facing world/emulsifier/bear/HUD changes without those three files. Do not wait for GitHub tag day to write the bullets.

## 2026-09-16 — fire_immune: false still makes the entity fire-immune

**Symptom (August):** Day 20 infected Maple Bears burn in fire/lava as they should. Day 4 / 8 / 13 (and other older variants) did not burn. All infected entities should take fire and lava.

**Failed:** `"minecraft:fire_immune": false` on the earlier entity JSON. Molang `query.is_fire_immune` is 1 if the **component exists**. Vanilla samples use `"minecraft:fire_immune": {}`. Day 20 infected omitted the component, so it burned.

**Worked:** Remove `minecraft:fire_immune` entirely from Maple Bear / infected / flying / mining / torpedo / buff entity JSON (BP + Dev). Infected cow/pig/sheep already used `hurt_on_condition` lava and had no fire_immune. Nether **adaptation** can still grant fire resistance to later variants after time in the Nether — that is an effect, not this component.

**Verify:** Fully exit to menu. Spawn day 4 / 8 / 13 infected (and a day 4 Maple Bear) in fire or lava in the overworld — they should take damage like day 20 infected. Playtest pending (August).

**Do not regress:** Do not put `minecraft:fire_immune` back with `false`. Omit the component to allow fire. Do not confuse with nether adaptation `fire_resistance`.

## 2026-09-16 — Nylium is nether grass; nether forest plants infect as foliage

**Symptom (August):** Warped nylium and crimson nylium should be infectable — nether version of grass blocks. Also nether foliage (roots, sprouts, fungus, twisting/weeping vines).

**Failed:** Living-ground convert only listed overworld soils. Storms could replace nylium. Purify always made overworld `grass_block`, which would paint grass into the nether.

**Worked:** Nylium → `mb:dusted_dirt` like grass. Dusty `mb:infected_*` for warped/crimson roots, nether sprouts, both fungi, twisting and weeping vines (convert only, no overworld scatter). Nether purify: netherrack, or nearby-matching nylium — never grass. Stems/wart blocks already had the wood/wart path.

**Verify:** Fully exit to menu. Day 2+ in a crimson/warped forest: nylium dusts; roots/fungus next to infection become dusty plants, not powder. Emulsifier in the nether should not plant overworld grass. Playtest pending (August).

**Do not regress:** Do not skip nylium. Do not scatter nether plants in overworld infected biomes. Do not purify nether dusty ground into `grass_block`.

## 2026-09-16 — Emulsifier purify: living tissue can vanish; dusty dirt can become grass

**Symptom (August):** Leaves during purification should have a chance to disappear. Infected dirt should have a chance to turn back into grass blocks. Goal: anything living can be infected.

**Failed:** Always `dusted_dirt` → `minecraft:dirt` and always infected leaves → vanilla leaves. That made purified lawns bald and canopies too whole. Infecting *only* `grass_block` would also fail the living-world goal: forest shade is dirt, mycelium/moss/podzol/farmland are living soil, and infection must cross that to reach trunks.

**Worked:** Keep converting grass **and** dirt-like living soils to `mb:dusted_dirt`. Purify: ~35% of infected leaves and walkable plants become air (logs/mushroom cubes still restore). ~45% of dusted dirt becomes `grass_block` when two cells above are open (lawn/forest floor); caves, floors under solids, and ocean stay dirt. Tunable in `mb_balance.js`.

**Verify:** Fully exit to menu. Fuel an emulsifier on a dusty VAN lawn + canopy. Some leaves/plants should vanish; some dirt should come back as grass. Cave dusty dirt should stay dirt. Playtest pending (August).

**Do not regress:** Do not skip dirt/mycelium/moss (grass-only infection). Do not turn cave/ocean dusted dirt into grass. Do not vanish logs. Powder still purifies to air.

## 2026-09-16 — Infected foliage is dusty plant blocks + biome features, not powder

**Symptom (August):** Need infected vines and other infected foliage (firefly bushes, mushrooms, mushroom blocks, leaf litter). Infected grass plants that spawn on vanilla grass should also generate in infected biomes (worldgen features).

**Failed:** Greenery convert turned plants into powder (`mb:snow_layer`) and left snow biomes plant-empty (dusted_dirt has no vanilla grass features). Putting `minecraft:tick` on every vine/grass would repeat the dusty-forest lag class.

**Worked:** Dedicated `mb:infected_*` plant blocks (cross / vine geo / thin litter / mushroom cubes). No tick. Player-centric convert in `mb_grassInfection.js` (day 2+, neighbor of infection). Floor scatter `mb:infected_floor_plants` on `infected_biome` and not `ocean` (`after_surface_pass`). Generator: `tools/generateInfectedFoliagePack.js`. Emulsifier restores vanilla. Vines/mushroom cubes convert only (no floor scatter).

**Verify:** August playtest 2026-09-19 VAN lawn screenshot — dusty grass plants convert with the dirt front, not powder plates. Snow-biome floor scatter and emulsifier restore still pending.

**Do not regress:** Do not convert greenery to powder. Do not put `minecraft:tick` on every infected plant. Do not scatter floor plants in infected ocean biomes. Regen via the foliage generator, not one-off JSON.

## 2026-09-16 — Emulsifier powder layers purify to air, not vanilla snow

**Symptom (August):** Purifying with the emulsifier was turning `"snow"` layers into vanilla Minecraft snow layers. He wants nothing — empty air.

**Failed:** `neutralizeCorruptedBlock` mapped `mb:snow_layer` → `minecraft:snow_layer` (older “safe winter snow” detox). Quotes around snow in MBA mean infection powder, not a winter biome.

**Worked:** `mb:snow_layer` → `minecraft:air`. Also `unregisterDustedDirtBlock` so that cell is not kept as a spawn tile. Wood still restores vanilla. Dusted dirt and leaves later got chance outcomes (grass / vanish) — see the same-day purify-chance lesson.

**Verify:** Fully exit to menu. Fuel an emulsifier on a dusty patch with powder plates on grass/leaves. After the particle delay the plates should vanish, not become white vanilla snow.

**Do not regress:** Do not put vanilla snow back as the powder purify result. Do not confuse `mb:snow_layer` with `minecraft:snow_layer`.

## 2026-09-16 — Bedrock day banners and action bars must fit on screen

**Symptom (August):** After day 100/101 (and any similarly huge on-screen bar), the day banner / action bar runs off the screen.

**Failed:** Gluing 8–10 bangs plus `Day 100 (+75 past victory)` onto `setTitle`. Sunrise action bar `The infection intensifies... (N days past victory)` plus `Tomorrow: a turning point`. Merged HUD (`mb_actionBarHud.js`) concatenated infection + scan + camp + narrative with no visible-length cap. Welcome lines like “The most dangerous Maple Bears have arrived...” filled the whole bar alone. Chat/journal can keep the long form; the client HUD cannot.

**Worked:** On-screen titles cap at 5 bangs (`!!!!! Day 101`) with subtitle `+N past victory`. Sunrise bar is short (`Intensifies (+N)`). `showPlayerTitle` clips to ~18 / ~28 visible glyphs. Merge drops extra HUD first (keep infection + day), then clips parts to ~48 visible. Welcome action bars are short. Infection cure hint is `Cure ready`. Chat still uses full bangs.

**Verify:** Fully exit to menu. Sync Bridge + Minecraft Dev. Set day 99–101 (or wait sunrise). Title should read `!!!!! Day 100` with `+75 past victory` under it — not a line that leaves the screen. Infection timer + day line together should stay on the hotbar. Chat can still show the long `!!!!!!!!!! Day 100`. Playtest pending (August).

**Do not regress:** Do not put `past victory` back on the title string. Do not skip the merge visible cap. Do not treat chat/journal bangs as the on-screen budget.

## 2026-09-16 — Netherite emulsifier scan must not stall the sim tick

**Symptom (August):** One emulsifier on netherite fuel: lag spikes. Blocks break late. Mobs flail in place then catch up. Classic **server tick stall** (same class as PERFORMANCE_DEBUG).

**Failed:** Netherite radius 30 + `performance` 2.5 built a 1.5k–6k `getBlock` budget. `hasPendingScan` was `(scanRing <= radius)` but the ring **wraps**, so interval was always 1 — every 10t, full budget, forever. Each queued cell scheduled a 20s timeout; a dense canopy queued hundreds in one slice, then hundreds of `setType` fired together. `changed = true` after every fuel tick called `saveEmulsifierZones` → `saveAllProperties` every 10t. Permanent netherite still subtracted elapsed ticks so the JSON kept mutating.

**Worked:** Drop the always-pending interval override (only hurry mid-ring resume). Cap ops at 320, queue 6/slice, 40 pending. Netherite scanIntervalNormal 2. Do not burn netherite tick count. Persist only machine/fuel/active changes; scan cursor rides the existing 50t save. Extra `claimSpreadSlice` only when work-spread throttle is already on.

**Verify:** Fully exit to menu. Sync Bridge + Minecraft Dev. One netherite machine in a dusty forest: breaking/combat should not freeze then catch up. Dome still cleans, just not the whole sphere in one hitch. Purify still ~20s delay.

**Do not regress:** Do not force interval=1 from `scanRing <= radius`. Do not scale ops budget with netherite `performance` without a cap. Do not `saveAllProperties` every emulsifier process tick.

## 2026-09-16 — Infected vegetation must not minecraft:tick every converted cell

**Symptom (August):** When block infection reaches a certain scale, the world gets laggy.

**Failed:** `minecraft:tick` on every infected leaf (100–180t) and infected wood (140–220t). Each tick hops ~30 neighbor `getBlock`s and sometimes an 80-visit decay BFS. Fine on a few trees; a dusty forest is thousands of ticking custom blocks in simulation distance. Player scans were already the grass/dirt path; canopy still used per-block ticks (“leaves hop because they tick”).

**Worked:** Same class as dusted_dirt. Drop `minecraft:tick` from `tools/generateInfectedVegetationPack.js` (regen all leaf/wood JSON). Canopy hops via capped `scanAroundPlayerForLeafFront` (6 rays, convert cap 4). Wood player scan cap 2→4.

**Failed (August playtest 2026-09-19, new world load):** Script still registered `onTick` / `onRandomTick` on `mb:infected_oak_leaf` and `mb:infected_wood`. Content log: every dusty leaf/log *Block custom component subscribed to 'onTick' but the block is missing 'minecraft:tick'*. Engine treats a tick *subscription* as requiring the JSON component — same class as `fire_immune: false` still immunizing.

**Worked (same playtest class):** Remove `onTick` / `onRandomTick` from those custom components. Leaves keep `beforeOnPlayerPlace` (persistent). Wood registers `{}` like foliage. Player-centric scans still hop.

**Verify:** August playtest 2026-09-19, reload world — `[Blocks][error] onTick` lines gone. Same session screenshot: **spreading works** (VAN lawn dirt + dusty plants). Do not put ticks back.

**Do not regress:** Do not put `minecraft:tick` back on generated infected leaves/wood. Do not subscribe `onTick` on a custom component unless the block JSON also has `minecraft:tick`. Do not tick every dusted_dirt. New species go through the generator.

## 2026-09-15 — Powdery Journal UI uses MBA snow palette; clean book is basic journal

**Symptom (August):** First Book-and-Quill mockups looked good, but Powdery Journal needed a lot more “snow” powder/dust. Palette should come from the dusted journal icon, snow item, and snow layer.

**Failed:** Restyling vanilla book screens with only dusty cream paper and brown leather. That reads as **basic journal**, not infection powder.

**Worked:** Keep the clean trio as `docs/design/journal-ui/basic-journal-*.png`. Powdery screens (`powdery-journal-*.png`) copy `snow_book.png` leather + piled cream, `mb_snow.png` (`#f2ede7` `#e7e6e3` `#e5d2c2` `#dfcbbb`), and `'snow'_layer.png` mottled grain. Warm cream/tan powder, never ice-blue vanilla snow.

**Failed (second pass):** Photoreal fluffy snow + Minecraft landscape behind the book. August: too hyperrealistic; needs blocky pixels like the 16×16 textures; dry white dust; **book UI only** (dark void).

**Worked (third pass):** Same layouts as basic journal, chunky Minecraft pixels, dry chalk/flour dust speckles, no world background.

**Verify:** Open the six PNGs next to `RP/textures/items/snow_book.png`, `mb_snow.png`, and `RP/textures/blocks/'snow'_layer.png`. August keep / more dust / still too painted.

**Do not regress:** Do not reuse the clean book mockups as Powdery Journal. Quotes around “snow” mean infection powder (`mb:snow` / `mb:snow_layer`), not a winter biome. Do not paint photo-snow or put a world screenshot behind journal mockups. **Production plates should be blank** — baked title/TOC/lore was only for look review. Keep today’s ActionForm journal flow; new look, not a vanilla book-and-quill editor.

## 2026-09-15 — Missing named export kills scripts and unregisters custom blocks

**Symptom (August Content Log, 21:47):** Swarm of `[Texture] The block named mb:infected_* used in blocks.json does not exist in the registry`, plus `mb:snow_layer`, plus `block_placer` missing `mb:snow_layer`. Sound `normal`/`fly` is existing noise.

**Failed:** Treating it as missing block JSON (files were on disk, 109 blocks). `sync:biome-registry` rewrote `mb_biomeReplaceRegistry.js` from the CJS template and **dropped** `isInfectedComponentBiomeAt`. `mb_leafInfection.js` still imports it → `SyntaxError: Could not find export 'isInfectedComponentBiomeAt'` → **main.js never loads** → custom components never register → every `mb:` vegetation block and snow_layer vanish from the registry. RP `blocks.json` still lists them.

**Worked:** Put `isInfectedComponentBiomeAt` back in `tools/syncBiomeReplaceRegistry.cjs` (thin `getBiome` wrapper around `isInfectedComponentBiome`) so regen cannot wipe it. Comment lists required exports.

**Verify:** **Playtest 2026-09-15 (August):** “All good now I think.” Dev pack discovered, spawn/day tracker/world init, intro already seen, minor infection loaded, journal already given. **No** missing-export SyntaxError. **No** `blocks.json` registry swarm. JOIN retries 1–3, Buff AI attempt 2 skip, and `No sound found for block type 'normal'` are existing noise. Server 2.6→2.10 promote still expected.

**Do not regress:** After `npm run sync:biome-registry`, grep that `isInfectedComponentBiomeAt` is still exported. A codegen file that other modules import is not a dump of JSON only — keep the helpers.

## 2026-09-15 — 26.50 Dappled Forest poplar uses the vegetation generator

**Symptom (August):** Bedrock 26.5 / 26.50 shipped. Pack still ran (self-test 22/22). Need dappled forest wood/leaves infected, plus other systems that break or convert blocks.

**Failed:** Assuming journal difficulty already scaled block spread (separate). Assuming Samples `main` has poplar TGA — 26.50 leaf/log PNGs are on Samples **preview**. Guessing a fourth poplar leaf ID; vanilla is three colors + one `poplar_log` set.

**Worked:** Add `red_poplar` / `orange_poplar` / `yellow_poplar` leaf species + `poplar` wood to `generateInfectedVegetationPack.js` and the texture builder. Storm / snow / mining drop lists get the vanilla IDs; mining/torpedo already break any solid except unbreakable. `red_shrub` and `shelf_mushroom` on snow-replace / storm-destruct / walk-through. Content log `Plugin … promoted [@minecraft/server] from [2.6.0] to [2.10.0]` is the engine lifting our requested 2.6 — not a break. JOIN retries 1–3 and `No sound found for block type 'normal'` are existing noise.

**Verify:** **Playtest 2026-09-15 (August, new world, 26.50):** “Everything seems to be loading correctly.” Intro ran (journal given, minor infection at AND SO ARE YOU). Full self-test **22/22**, storm harness ok, 48 modules import. Vegetation `diff=1.00` on Normal. Day 0 `leaves=0` (correct). JOIN retries 1–3 and `No sound found for block type 'normal'` still existing noise. **Still open:** powder a poplar log/leaves on day 2+ and check Creative Nature names.

**Do not regress:** Do not hand-edit `mb_infectedVegetation.js`. New vanilla trees go through the generator + Samples/preview cutouts. Do not bump `@minecraft/server` in the manifest just because 26.50 promotes it. Infecting poplar blocks is **not** the same as snow `replace_biomes` — both are required for a new forest biome. VAN overlay is still `minecraft:forest` only; spawn scripts do not key off this biome.

## 2026-09-15 — New vanilla biome needs replace_biomes + catalog, not only vegetation

**Symptom (August):** After 26.50 poplar infection, asked if red shrubs were covered, then to include missed systems (snow replace list for Dappled Forest).

**Failed:** Treating “we can infect those blocks” as “the biome is on the Maple Bear worldgen list.” Spawn controller already keys off `dusted_dirt`, not forest IDs.

**Worked:** `red_shrub` was already greenery + snow/storm/mining walk-through. Added `minecraft:dappled_forest` to snow infected `replace_biomes` (small/medium/large, same 8% land group as cherry/pale). Catalog stub `dev/biomes stuff/biomes/dappled_forest.biome.json` + `npm run sync:biome-registry`. Floor plants: `leaf_litter` + `brown_mushroom` on greenery convert; brown mushroom on snow/storm/mining walk-through. VAN overlay still forest-only. Wool stairs and abandoned camps need no infection pass.

**Verify:** Fully exit to menu. New chunks (old Dappled Forest terrain will not pick up replace). Biome checker: LIST / SNW on `minecraft:dappled_forest`. Grep `dappled_forest` in `BP/biomes/` and `mb_biomeReplaceRegistry.js`. Powder a red shrub on day 2+.

**Do not regress:** New vanilla biomes: vegetation generator **and** `replace_biomes` + catalog stub + `sync:biome-registry`. Do not invent a VAN twin unless August asks. Other host VAN overlays still wait (`INFECTED_VANILLA_BIOMES.md`).

## 2026-09-15 — Journal Addon Difficulty must scale block spread, not only bears

**Symptom (August):** Block infection spread should follow Journal → Settings Addon Difficulty if it does not already.

**Failed:** Assuming spawnMultiplier already hit leaves/wood/grass. It did not. Difficulty already covered spawn, hits, infection timer, mining interval, torpedo blocks, storm first day. Vegetation used day knots × `BLOCK_SPREAD_CHANCE_MULT` × dev `mb_block_spread_speed_mult` × director/storm only.

**Worked:** `blockSpreadMultiplier` on `getAddonDifficultyState` (Easy 0.7 / Normal 1 / Hard 1.3, same as spawn). `getBlockSpreadDifficultyMultiplier` inside `blockSpreadChance` so every leaf/wood/grass chance inherits it. Kill-stain `spreadDustedDirt` chance uses the same field (radius stays day/victim/killer). Scan interval and `getInfectionRate` unchanged. Dev Block spread speed still stacks.

**Verify:** **Playtest 2026-09-15 (August, new world):** self-test vegetation line shows `diff=1.00` on Normal (day 0 chances 0). Hard vs Easy canopy speed still needs a day-2+ look.

**Do not regress:** Do not wire block spread back to `getInfectionRate`. Do not skip `blockSpreadMultiplier` on new convert-chance helpers — put them through `blockSpreadChance`.

## 2026-09-02 — Dev tool: block spread speed lives under Infection & players

**Symptom (August):** Need a quick in-game control for vegetation spread speed in Developer Tools.

**Failed:** Putting it in Systems (already a long kitchen-sink of toggles). Host-tools pin (`pinInReleaseAdmin`). Changing scan interval instead of convert chance.

**Worked:** Journal → Developer Tools → **Infection & players** → Block spread speed. World property `mb_block_spread_speed_mult` scales leaf/wood/grass chances (0 pause, 1 play, 8 testing fire). Mob conversion unchanged.

**Verify:** Fully exit to menu. Open that menu, set Fast (2x), watch the shown leaf % double vs Play. Script self-test vegetation line starts with `spd=`.

**Do not regress:** Do not wire this multiplier into `getInfectionRate`. Do not put it on Host tools.

## 2026-09-01 — Block spread play curve is much slower than the test table

**Symptom (August):** Single-player spreading tests are done. The test-sped block spread is too fast. Ramp day 2→20, 20→25, then slower to 50 / later milestones, cap day 100. Multiplayer still needs load testing.

**Failed:** Leaf/wood/grass chances followed `getInfectionRate` (20% day 2 → 100% day 20) so a mixed canopy flash-filled.

**Worked:** `getBlockSpreadProgress` knots 2 / 20 / 25 / 50 / 75 / 100. Mob conversion still uses `getInfectionRate`. August then doubled the chance table (`BLOCK_SPREAD_CHANCE_MULT = 2`) so day-2 canopy convert is ~4%, not ~2%. Knots unchanged.

**Verify:** Fully exit to menu. Day 2: creep, not a blotch. Script self-test vegetation line: day 2 `leaves` ~0.040. Cap after day 100.

**Do not regress:** Do not wire block spread back to `getInfectionRate`. Do not put `minecraft:tick` on every dusted_dirt.

## 2026-09-01 — Infected logs craft into 2 planks, not 4

**Symptom (August):** Infected logs should only craft into 2 planks instead of 4, because they decayed.

**Failed:** Loot dropped a vanilla log, which still crafts into 4 planks.

**Worked:** Infected log/wood/stripped drop themselves. Shapeless recipe → 2 matching vanilla planks. Wart unchanged.

**Verify:** Fully exit to menu. Mine an infected oak log — get the infected log. Craft it — 2 oak planks.

**Do not regress:** Do not drop vanilla logs from infected timber to “restore” 4 planks.

## 2026-09-01 — Far leaf wall must not share the near face’s holes

**Symptom (August screenshot, ~1638, 76, 17):** Inward planes + single-sided: **no fighting**, sides show. The opposite face you look through is empty — sky/water through the holes.

**Failed:** One inward UV per slab, same `[0,0] [16,16]` as the near face. Head-on, those holes line up so the far wall looks missing. Negative-size inner cube still hollow. Two-sided `alpha_test_to_opaque` still z-fights.

**Worked (August ~1636, 82, 23):** Both faces on each inner slab + 180° UV. No fighting. Far wall shows. Doubled-up inner texture is **keep** — he said it looks how he wants.

**Verify:** Playtested. Fully exit to menu if geo changes again.

**Do not regress:** Do not turn two-sided `alpha_test_to_opaque` back on. Do not drop the inner planes. Do not “fix” the doubled look.

## 2026-09-01 — Two-sided custom leaves z-fight inside a clump

**Symptom (August screenshot, ~1638, 76, 24):** Look-through and Fancy stacking are better, but inside a cluster the textures flicker / fight (grid of overlapping planes).

**Failed:** `alpha_test_to_opaque` (vanilla leaf *name*) on a custom cube disables backface culling (Learn). Both sides of each face share one plane, so a clump z-fights. Leaf-to-leaf culling stops the fight but makes a lattice (Fast). Negative-size inner cube + single-sided stayed hollow (Bedrock does not treat negative size as inverted winding). Tiny 0.03 inset was not enough.

**Worked (August ~1636, 82, 23):** `alpha_test_single_sided_to_opaque` + six inner slabs (both faces, 180° UV). No fight, far wall, sides, Fancy stacking. Doubled inner texture is keep.

**Verify:** Playtested ~1636, 82, 23.

**Do not regress:** Do not put `alpha_test_to_opaque` back. Do not re-add `mb:culling.infected_leaves`. Do not strip inner slabs to “undouble.”

## 2026-09-01 — Fancy leaves get denser down a chain, Fast culling does not

**Symptom (August screenshots, ~1638, 75, 25):** Otherside is better, but infected leaves stay see-through no matter how many are in a row. Vanilla Fancy fills holes with the next leaf. Ours stay a lattice to the sky.

**Failed:** `same_culling_layer` / `mb:culling.infected_leaves` hides the next cube’s near face. Two-sided `alpha_test_to_opaque` densifies but z-fights (August ~1638, 76, 24).

**Worked (August ~1636, 82, 23):** Single-sided + inner slabs, **no** leaf-vs-leaf cull. See **Far leaf wall must not share the near face’s holes**.

**Verify:** Playtested.

**Do not regress:** Do not re-add leaf-to-leaf face culling. Do not use `blend`. Do not use two-sided `alpha_test_to_opaque` on custom cubes.

## 2026-09-01 — Looking through a leaf must show that cube’s far wall

**Symptom (August screenshot, ~1282, 73, -66):** Selected infected oak leaf is a hollow paper. Through the holes you see sky, not the other side of the same cube. He thought this was already fixed.

**Failed:** `alpha_test_single_sided` culls backfaces. Inner inverted cube + single-sided does **not** draw from outside (those faces are still backfaces). `alpha_test_to_opaque` alone drew every neighbor interior (soup).

**Worked (August ~1636, 82, 23):** Single-sided + six inner slabs, both faces, 180° UV. Not two-sided. Not a negative-size cube. Doubled look is keep.

**Verify:** Playtested.

**Do not regress:** Do not go back to two-sided `alpha_test_to_opaque`. Do not re-add leaf-to-leaf culling. Do not use `blend`. Do not switch only oak.

## 2026-09-01 — Emulsifier particle load must thin when the dome is busy

**Symptom (August):** Lots of dusted dirt / purify puffs at once lag the game. Need fewer particles when there is a lot of emulsifying.

**Failed:** Leaf checkerboard only (every other leaf). Dirt/wood/powder still puffed on every queued cell, 1–3 particles, refreshing on the storm-density interval. A full dome is hundreds of `spawnParticle` calls.

**Worked:** Scale off `pendingEmulsifierConversions.size`: skip every 2nd / 4th / 8th cell, cap puffs per cell 3→1, stretch the refresh interval, and hard-cap 36 `mb:white_dust_particle` calls per game tick. Convert delay unchanged. Leaf checkerboard still applies on top.

**Verify:** Fully exit to menu. Fuel a machine in a dusty field — small patch still puffs clearly; a huge dome should look sparser, not a particle storm, and still convert after the delay.

**Do not regress:** Do not skip converting cells to save particles. Do not remove the leaf checkerboard. Do not drop the per-tick spawn cap.

## 2026-09-01 — Custom leaf Fancy method is the interior-soup glitch

**Symptom (August screenshot, ~1297, 71, -21):** Infected oak canopy overlapping interior faces / X-ray soup again. Fix the glitch **without** making holes have no other side.

**Failed:** `alpha_test_to_opaque` with **leaf-to-leaf culling** — otherside is better but a chain stays a lattice to the sky (August ~1638, 75, 25). Single-sided + inner cube still hollow from outside.

**Worked:** See **Fancy leaves get denser down a chain** (two-sided, **no** leaf-vs-leaf cull, inset cube). Soup from seeing neighbor interiors is the Fancy tradeoff; Fast culling kills density.

**Verify:** Fully exit to menu. One leaf in air: far wall through holes. Thick clump: later layers fill earlier holes.

**Do not regress:** Do not use single-sided to kill soup. Do not re-add `mb:culling.infected_leaves`.

## 2026-09-01 — Looking through leaves must show the other side

**Symptom (August):** Some leaf textures are transparent on the other side when you look through them. No leaf block of any kind should do that.

**Failed:** `alpha_test_single_sided` alone culls backfaces. Inner inverted cube still hollow from outside (August ~1282, 73, -66). Leaf-to-leaf culling then made a thick clump as see-through as one block.

**Worked:** Two-sided `alpha_test_to_opaque`, no leaf-vs-leaf cull, slightly inset cube. See **Fancy leaves get denser down a chain**.

**Verify:** Fully exit to menu. Look through a hole — far wall of that leaf still shows. A chain should get denser.

**Do not regress:** Do not put `alpha_test_single_sided` back. Do not re-add neighbor leaf culling.

## 2026-09-01 — Emulsifier purify particles + no infection in the dome

**Symptom (August):** Dusted-dirt purify particles sat in/on the dirt, not above it. Purifying a canopy spawned particles on every leaf and caused minor lag. Infection powder and infected blocks still spread inside the emulsifier radius while it was cleaning.

**Failed:** Non-leaf purify particles used `y + 1.0` (clips into dirt). Leaf particles fired on every queued cell for ~20s. The no-spawn cylinder is not the purify dome, so vine/powder/leaf/wood still hopped in that volume. Importing `mb_spawnController.js` from `mb_snowPlacement.js` / `mb_grassInfection.js` would cycle (spawnController → snow → grass).

**Worked:** Dusted dirt particles at `y + 1.5`. Infected leaves still convert every cell, but particles only on even `x+y+z` (queue, interval, and convert-complete). Active fueled emulsifier sphere (same as purify, clipped 10 down) blocks powder placement and leaf/wood/dirt spread. Snow/grass use register callbacks; wood/leaf import the spread guard.

**Verify:** Fully exit to menu. Fuel an emulsifier in dusty forest: dirt puffs sit above the block; canopy puffs are every other leaf; powder/leaves/dirt at the dome edge do not creep inward.

**Do not regress:** Do not skip converting odd leaves — only skip their particles. Do not import spawnController from snowPlacement. Do not use the no-spawn cylinder as the spread block.

## 2026-09-01 — Emulsifier purifies every infected block in radius

**Symptom (August):** The emulsifier should purify any infected block in its radius.

**Failed:** Dome scan already walked the sphere, but `queueEmulsifierConversion` only accepted `mb:dusted_dirt` and `mb:snow_layer`. Infected leaves and logs (and nether wood/wart) were skipped. The unused air-path helper also treated leaves as pass-through without queueing them.

**Worked:** Same delayed convert. Targets = dusty dirt, powder, every infected leaf stage, every infected log/wood/stripped/wart. Leaves restore that species’ vanilla leaf (`persistent_bit` kept). Wood restores vanilla with `pillar_axis` from `mb:axis`. Dirt still becomes `minecraft:dirt`. **Powder layers (`mb:snow_layer`) become air** — not vanilla snow (August 2026-09-16).

**Verify:** Fully exit to menu. Fuel an emulsifier next to dusty ground, powder, infected canopy, and an infected trunk — after the particle delay dirt/leaves/wood should be vanilla again; powder plates should be **gone** (air), not Minecraft snow.

**Do not regress:** Do not only purify dirt/snow. Do not change spawn tiles (`TARGET_BLOCK`) to infected leaves. Do not tick every dusted_dirt. Do **not** replace `mb:snow_layer` with `minecraft:snow_layer` — quotes around “snow” mean infection powder, not winter snow.

## 2026-09-01 — Hills are not a one-block terrace

**Symptom (August):** Hills should not be safe. Scan should look a bit farther so hillside grass/dirt/trees convert.

**Failed:** Vine slopes were only ±1 Y. Known sources next to a 2-block terrace counted as having no front and were dropped. Player footprint was Y −2…+1, ground ray 6 up / 14 down — standing on a ridge missed dusty cells in the valley.

**Worked:** Each vine step still converts **one** cell. Prefer same Y, then climb/drop up to 4 in that column (cardinals, then diagonals). Touch checks use the same climb so hillside sources stay queued. Footprint Y −8…+8, look 16, ground ray 12 up / 22 down. Wood/leaf hops include ±2 and ±3 height. Snow sample looks 12 down. Still no tick on every dirt. Not a blotch.

**Verify:** Fully exit to menu. Journal day 2+. Stand where dusty ground meets a hill — the front should crawl up/down the slope and into trees on the rise, not stop at the first terrace.

**Do not regress:** Do not convert every climb height at once. Do not tick every dirt. Do not treat a 2–4 block hill as out of range.

## 2026-09-01 — Dirt under trees is not grass_block

**Symptom (August):** Trees should pick up infection even when slightly offset. There is no grass under a tree — just dirt — so a trunk surrounded by infected blocks still never converted.

**Failed:** Vine only converted `minecraft:grass_block`. `isAllowedCoverAbove` rejected logs, so dirt under a trunk could not convert even if we added it. Drain deleted remembered dusty cells that did not touch grass (`sourceTouchesGrass`). Wood/leaf hops were 6-face only, so a log one over and one up from dusty ground was skipped. `onSource` (wood/leaf) ran only after a successful grass convert.

**Worked:** Vine converts dirt-like (`dirt`, podzol, coarse, rooted, mycelium, moss, farmland, path) the same one-shot as grass. Logs/leaves count as allowed cover. Horizontal diagonals after cardinals. Remembered sources stay if they still touch dirt-like or vanilla wood/leaves. Drain always tries wood/leaves on visited sources (visit cap 8). Wood/leaf spread uses face + 12 edge-diagonals. Leaf decay BFS stays 6-face.

**Verify:** Fully exit to menu. Journal day 2+. Stand at a dusty/green forest edge where trunks sit on dirt, slightly offset from the front — dirt under the tree should dust, then the log/leaves, even if no grass_block is under the trunk.

**Do not regress:** Do not tick every dirt. Do not require `grass_block` under a tree. Do not treat a log as blocking ground convert. Do not delete known sources that only touch dirt or wood.

## 2026-09-01 — Any infected vegetation infects any neighbor

**Symptom (August):** Other leaf types should infect other leaf types. Any infected thing should infect anything else.

**Failed:** Infected leaves only advanced dust on the same species. Wood ticks skipped leaves. Dusted dirt only hopped into grass_block.

**Worked:** `infectLeafNeighbors` converts any vanilla species and advances any infected leaf. Dusty logs call `tryInfectLeavesAround`. Dusted-dirt samples also try wood and leaves. Still no tick on every dirt.

**Verify:** Fully exit to menu. Day 2+ infected oak beside vanilla birch; infected log beside oak leaves; dusty dirt beside a leafy bush.

**Do not regress:** Do not require matching species to spread. Do not tick every dusted_dirt.

## 2026-09-01 — Placed snow / dusted dirt must spread per orifice

**Symptom (August playtest):** Placed a bunch of "snow" on grass_block. Each converted the block under it, then stopped. No sideways spread. Random other patches sometimes moved. Dusted dirt is one-shot (no stages). Wanted a random chance on **each** available face, and placed infected blocks prioritized because scripts already know them.

**Failed (August playtest):** Rolling every face at once filled huge blotches instead of a creeping vine. New dusty cells were remembered with lastTry in the past, so the same drain flood-filled neighbors of neighbors. Player/mob place also ran a full orifice pass immediately.

**Worked:** Vine growth — shuffle the four ground faces, convert **one** neighbor (slopes only if cardinals miss). New cells wait ~40t before they vine. Drain does at most 3 one-cell steps per poll, round-robin. Place/mob snow still converts under it (seed) but does not flood sideways in the same tick.

**Verify:** Fully exit to menu. Journal day 2+. Place one dusty dirt or a short snow strip on grass — the front should creep cell-by-cell like a tendril, not jump out in a disk.

**Do not regress:** Do not tick every `mb:dusted_dirt`. Do not skip neighbor rolls after converting the block under snow. Do not assume `setType` fires `onPlace`. Do not place mob snow with raw `setType` and skip `notifySnowLayerPlaced`.

## 2026-09-01 — Dusted dirt must creep into grass_block like leaves

**Symptom (August playtest, ~967, 68, -308):** Placed a small dusty island on plains grass. Adjacent `grass_block` stayed green. Leaves hop; the ground did not.

**Failed:** No `minecraft:tick` on `mb:dusted_dirt` (correct — infected biomes are a dusty carpet). Leaves spread because each infected leaf ticks every 100–180t. Ground relied on `Dimension.getBlocks({ includeTypes: ["mb:dusted_dirt"] })` plus a plains `grass_block` iterator with a 220 visit cap — custom ids often return empty, and 8 random rays in radius 14 miss a 12-block island. Neighbor chance was also slower (`0.04 + r * 0.20`) with `noHop` and cap 2.

**Worked:** Walk a 13×13×4 `getBlock` neighborhood around the player, plus the crosshair block and the block underfoot. Neighbor chance matches `getLeafNeighborSpreadChance`. Hop on. Cap 8. Still no tick on every dusted_dirt. Day 0–1 still 0 (journal day, not `/time set`).

**Verify:** Fully exit to menu. Journal day 2+. Stand looking at a dusty/green edge like ~967, 68, -308 — adjacent grass_block should turn dusty within a few seconds.

**Do not regress:** Do not tick every `mb:dusted_dirt`. Do not convert grass_block that does not touch infection. Do not use `getBlocks` includeTypes for custom `mb:` blocks as the only finder.

## 2026-08-31 — Infected logs must dust neighboring grass

**Symptom (August):** Asked if infected logs infect grass / grass_block. They did not.

**Failed:** Grass sources were only dusted dirt, infected leaves, and powder. Wood ticks only chained logs.

**Worked:** Infected wood is a grass infection source (including a log sitting on grass). `onInfectedWoodTick` calls `tryInfectGrassAround` after the log hop. Still no tick on every dusted_dirt or vanilla log.

**Verify:** Fully exit to menu. Place an infected log on grass day 2+ — the grass_block under/beside it becomes dusted dirt; plants on it become powder.

**Do not regress:** Do not tick every grass_block. Do not skip the wood→grass call when the log already converted two wood neighbors.

## 2026-08-31 — Explosion infection needs a distance gradient

**Symptom (August playtest, ~1006, 75, -491):** Buff blast is mostly good, but remaining blocks go full white while the next one stays green. Wants a level fade as it gets farther out.

**Failed:** `infectVegetationInBlast` used `forceSnow` on every leaf/log in the sphere. Snow spray painted every column in the disk. Binary Snow vs vanilla.

**Worked:** Distance → dust 0–3 (center Snow, rim just converted; never lower existing dust). Ground: inner powder, mid dusted dirt, rim left green. Same bands on torpedo snow.

**Verify:** Fully exit to menu. Detonate a buff bear on grass under a tree — white cap in the middle, dusty leaves/dirt farther out, green at the edge that can still creep.

**Do not regress:** Do not `forceSnow` the whole blast radius. Do not skip the mid dusted-dirt ring.

## 2026-08-31 — Leaf neighbor spread too fast after all species

**Symptom (August playtest):** Infection races through the canopy. Wants it as fast as before (oak-only wave).

**Failed:** Same `0.10 + r * 0.55` neighbor chance after every leaf type ticks and converts. Ungating `tryInfectWoodAround` / `tryInfectGrassAround` on every leaf tick added extra work on top.

**Worked:** Neighbor chance `0.07 + r * 0.32`. Grass neighbor stays a bit under that (`0.06 + r * 0.28`). Wood/grass from a leaf tick only run when that leaf already rolled a spread. Wood chain keeps the old rate (`0.10 + r * 0.55`). Infected-wood ticks still chain logs.

**Verify:** Fully exit to menu. Stand under a VAN canopy day 2+ — leaves creep, not flash-fill. Logs next to infected leaves still dust, just not every leaf tick.

**Do not regress:** Do not put wood/grass convert on every infected-leaf tick. Do not restore `0.10 + r * 0.55` while all species spread.

## 2026-08-31 — Generated lang merge needs explicit sentinels

**Symptom:** `generateInfectedVegetationPack.js` spliced `en_US.lang` between the oak-leaves line and the infected-cow spawn-egg line. Renaming either, or any hand-written names in that range, gets wiped on the next generate.

**Failed:** Using live display-name keys as range markers.

**Worked:** `## BEGIN infected vegetation` / `## END infected vegetation` in `RP - Dev/texts/en_US.lang` and `RP/texts/en_US.lang`. Generator throws if either is missing.

**Verify:** `node tools/generateInfectedVegetationPack.js` — sentinels stay, cow spawn-egg line stays after END.

**Do not regress:** Do not splice lang on `tile.mb:infected_oak_leaves` or spawn-egg keys.

## 2026-08-31 — Wood chains from leaves; nether is opaque; snow drops; buff blast

**Asked:** Infected logs infect neighboring logs (including after a leaf convert). Cover nether trees. Dusted blocks drop `"snow"` like dusted dirt; leaves twice as often. Buff explosions instantly infect like torpedo.

**Failed:** Treating nether fungus caps as leaves (cutout / `alpha_test` / oak leaf geo). Crimson/warped have **no leaves** and are fully opaque. Putting `tryInfectWoodAround` inside the leaf-to-leaf chance roll — logs next to infected leaves often never converted.

**Worked:**
- Leaf ticks always try wood. Newly converted logs immediately hop to their vanilla neighbors. Infected wood ticks convert up to 2 adjacent logs and advance dustier neighbors.
- Nether: crimson/warped stem + hyphae + stripped (Samples `huge_fungus/`), plus `nether_wart_block` / `warped_wart_block` as **full opaque cubes** with `mb:dust` (same cream 0–2 / Snow 3 as wood). No custom nether biomes — convert from powder / bears / neighbor spread. Snow + wood scans run in the nether.
- Loot: dusted dirt stays 15% `mb:snow`. Infected wood/wart 15%. Infected leaves 30%.
- `infectVegetationInBlast` (leaves **and** wood/wart to Snow). Torpedo still calls it. Buff stuck-explosion calls it at radius 6 after breaks.

**Verify (August):** Fully exit to menu. Infected oak log next to vanilla oak logs should dust the trunk. Nether: powder on crimson stem / wart block converts (opaque, not see-through). Mine infected leaves — snow drops more often than dusted dirt. Buff explosion near trees Snow-stages remaining canopy.

**Do not regress:** No tick on every vanilla log or dusted_dirt. Do not render nether wart/stems with leaf cutout geo. No bamboo/mushroom stems yet. Do not overwrite `mb_buildConfig.js`.

## 2026-08-31 — Planned vegetation + sheep pass

**Asked:** Do the parked list: dusted-dirt creep, all leaf types, infect wood, torpedo Snow-stage leaves, remake infected sheep.

**Failed (sheep, earlier):** Dusted-dirt palette + brown blotches. Looked muddy. Palette-only lerp without the snow_layer **top** grain.

**Worked:**
- Grass: neighbor chance closer to leaves (`0.10 + r * 0.50`), convert cap 3, extra dusted-dirt front sample, infected-leaf ticks also `tryInfectGrassAround`. Still no tick on every dirt.
- Leaves: Samples cutout + oak render + 0–3 for oak/birch/spruce/jungle/acacia/dark oak/mangrove/cherry/azalea/flowering azalea/pale oak. `tools/buildInfectedVegetationTextures.py` + `generateInfectedVegetationPack.js`.
- Wood: Samples log/stripped, cream lift 0–2, stage 3 snow remap, `mb:dust` + `mb:axis`. Only converted wood ticks.
- Torpedo: `infectLeavesInTorpedoBlast` radius 5, cap 96, skip duds.
- Sheep: tile the **snow_layer TOP** (geo UP uv 0,0 / 16x16 on the 32x32 sheet) onto wool. Face stays a sheep.

**Verify (August):** Fully exit to menu. Day 2+ VAN grass edge fills in. Creative all leaf types 0–3. Log next to infected leaves dusts. Kill a live torpedo under a canopy — leaves go Snow. `/summon mb:infected_sheep` next to a snow layer — cream powder wool, not mud.

**Do not regress:** No tick on every dusted_dirt or vanilla log. No inner leaf cube / `opaque` / cube `material_instance`. Stage 3 leaves have no `default_foliage`. Sheep wool references snow_layer **top**, not dusted dirt.

## 2026-08-31 — Infected sheep texture looks muddy (Compoohter remake)

**Symptom (August playtest, ~808, 65, -446):** `mb:infected_sheep` does not read as infected. It looks like a muddy / dirt-covered sheep. Entity and conversion are fine. Texture is the fail. **Next time — Compoohter remakes it.** Do not start tonight.

**Failed:** High-frequency brown / tan / cream mottling on `RP - Dev/textures/entity/infected_sheep.png` (same file in `RP/`). Reads as mud, not powder infection. Do not “fix” it by adding more brown noise.

**Worked:** Keep Samples sheep UV / `geometry.infected_sheep`. Wool is painted from **`snow_layer` TOP** (16x16 UP face), not dusted dirt. Face stays a sheep. Rebuild: `python tools/buildInfectedSheepTexture.py`.

**Verify:** Fully exit to menu. `/summon mb:infected_sheep` next to a snow layer, infected pig, and cow. August says cream powder, not mud.

**Do not regress:** Do not change geo, render controller, or livestock behavior for this. Swap the PNG only (and the spawn-egg if it copies the same mud). Keep `isInfectedLivestock()`.

## 2026-08-31 — Next pass: dusted dirt must spread more naturally

**Symptom (August, parked overnight):** Floor infection (`mb:dusted_dirt` into neighbor `grass_block`) should creep like the leaves — natural, not sparse or stuck. Next pass, not tonight.

**Do not start from zero:** Neighbor spread already exists (`mb_grassInfection.js` + `getGreeneryNeighborSpreadChance`). Player-centric scan, cap 2, no `minecraft:tick` on every dusted_dirt. Random lawn rays stay on the slower `getGreenerySpreadChance` table.

**Done (2026-09-01):** Nearby dusty cells sampled with `getBlocks`. Neighbor chance matches leaves. New dusty cell hops once into `grass_block`. Still no tick on every dirt.

**Also done:** Infect **wood** — Samples log/stripped, no tick on every vanilla log. **Torpedo** blast Snow-stages leaves in radius 5 (skip duds).

**Do not regress:** Do not tick every `mb:dusted_dirt`. Do not convert grass with no infection neighbor. Journal day, not `/time set`.

## 2026-08-31 — Leaf stage names: only the last is Snow

**Symptom (August):** Only the last infected leaf look is whiteish. Names should not call the earlier stages white.

**Failed:** Calling `_2` “White” / “Pale” while it is still biome-tinted (green in LIST, dusty in VAN).

**Worked:** Display names only (IDs stay `mb:infected_oak_leaves` … `_3`):  
0 Infected Oak Leaves · 1 (Dusted) · 2 (Faded) · 3 (Snow). Snow matches the `"snow"` powder. Same pattern when other leaf types get four stages.

**Verify:** Fully exit to menu. Creative Nature: last oak leaf is **Infected Oak Leaves (Snow)**. `_2` is Faded, not White.

**Do not regress:** Do not rename the block identifiers. Lang vs `/give` IDs — display only.

## 2026-08-31 — Infected leaves: Samples cutout + oak render + oak whitening

**Symptom (August):** Birch (and later every other leaf type) must keep **that** tree’s hole pattern. Looking through custom birch showed a hollow/transparent cube. Render and the whiter stages should stay what already works on oak.

**Failed:** Inventing a new render path per leaf. Two-sided / `opaque` / inner flipped cube (oak playtests). Painting white onto `default_foliage` (LIST lime). Guessing cutouts instead of Samples TGAs.

**Worked (recipe — clone this, do not reinvent):**
1. **Cutout** = Mojang Bedrock Samples TGA for that leaf (`resource_pack/textures/blocks/leaves_*.tga`). Binary alpha. Fill a=0 hole RGB with nearest leaf color (mipmaps). Do not fill holes opaque.
2. **Render** = same as oak: `geometry.infected_oak_leaves` (one inset cube), `alpha_test_single_sided`, `face_dimming: true`, AO off. No inner cube. No cube `material_instance`.
3. **Whitening** = same four looks as oak. Stages 0–2 grayscale lift + `default_foliage` (VAN dusty, LIST still green). Stage 3 = snow_layer cream bake, **no** engine tint. Builder: `tools/buildInfectedOakLeavesTexture.py`.

**Next pass (August: when we work other leaves):** spruce, jungle, acacia, dark oak, mangrove, cherry, azalea / flowering azalea, pale oak. Birch already has Samples cutout + oak render; it still needs oak’s **four stages** (today it is stage 0 only). Host biomes (plains, taiga, …) still wait until August says the oak forest test is done.

**Verify:** Fully exit to menu. Infected birch holes match vanilla birch, not oak. Whitening matches oak 0→3. No black insides, no solid painted cube.

**Do not regress:** Do not put the inner cube back. Do not use oak holes on birch (or any other species). Do not add `default_foliage` to stage 3.

## 2026-08-31 — Final leaf stage is untinted snow-layer cream

**Symptom (August):** Infected oak stages look right in VAN (dusty white). In normal biomes they stay pretty green. Asked for a 4th transformation that matches the `"Snow"` / snow_layer palette.

**Failed:** Putting `default_foliage` on a white TGA (LIST neon lime). Dropping tint on stages 1–2 (VAN lost the dusty oak look August already passed).

**Worked:** Keep 0–2 grayscale + `default_foliage`. Add `mb:infected_oak_leaves_3` with **no** engine tint; bake oak cutouts through the snow_layer cream (`tools/buildInfectedOakLeavesTexture.py`). That block is the last look in every biome.

**Verify:** Fully exit to menu. Creative `_3` next to `mb:snow_layer` in LIST forest and in VAN — cream powder leaves, not green, not lime. Stages 0–2 still biome-tint.

**Do not regress:** Do not add `default_foliage` to `_3`. Do not drop `default_foliage` on 0–2. Do not use `opaque` / two-sided alpha / cube `material_instance` / inner flipped cube.

## 2026-08-31 — Sample snow layers; do not trust onPlace for worldgen powder

**Symptom (August):** Player-placed `mb:snow_layer` on leaves advances infection. Worldgen / non-player powder sits there and never seems to trigger the scripts.

**Failed:** Custom `onPlace` (`setType` and feature place never fire it). Six random downward rays with no `force` (sparse, and the thin slab is easy to miss). Scanning only at foot Y.

**Worked:** Periodically sample a small set of nearby snow layers (volume query around the player plus a few columns up into the canopy), then `tryInfectUnderSnow({ force: true, convertOnly: true })` on what's under them. Still day-gated (`chance <= 0` before journal day 2). Do not put `minecraft:tick` on every snow_layer.

**Verify:** Fully exit to menu. Journal day 2+. Stand under VAN trees that already have worldgen powder on top — those leaves should convert without replacing the snow. Player-placed powder still works. Day 0–1: powder stays.

**Do not regress:** Do not assume feature-placed or script-placed blocks fire custom `onPlace`. Storms must still call `notifySnowLayerPlaced` after `setType`. Do not tick every snow_layer.

## 2026-08-31 — Birch foliage ignores biome foliage_appearance hex

**Symptom (August):** In an infected biome, oak leaves pick up the dusty white tint. Birch stays green.

**Failed:** Expecting client `minecraft:foliage_appearance` `{ "color": "#C4C0B4" }` to recolor every leaf. That hex only drives `default_foliage`. Birch uses `birch_foliage` (spruce uses `evergreen_foliage`). A global `textures/colormap/birch.png` would tint birch in every biome, including LIST forest.

**Worked:** Convert birch in infected biomes (`isInfectedComponentBiomeAt`) to `mb:infected_birch_leaves` — Samples birch cutout + `default_foliage`, so it uses the same biome hex as oak. Snow-on-birch converts to that block too. Other host biomes wait until August says so.

**Verify:** Fully exit to menu. VAN forest: birch canopies go dusty/white like the oaks, not spring green. LIST forest birch stays vanilla green until powder converts them.

**Do not regress:** Do not override the global birch colormap. Do not drop `default_foliage` on infected birch. Do not start plains/taiga infected variants until August asks.

## 2026-08-30 — Infection Snow item matches dusted-dirt crust, not vanilla white

**Symptom (August):** `"Snow"` / `snow_layer` looked stark white vs dusted dirt. Wants the powder palette like dusted dirt + `'snow'_layer`.

**Failed:** Leaving `mb_snow.png` as a near-vanilla white pile (mean RGB ~225, p90 255).

**Worked:** Remap item + layer from dusted-dirt light crust + existing layer grain (`tools/recolorMbSnowTextures.py`). Keep alpha / slab UV. Identifiers unchanged.

**Verify:** Fully exit to menu. Hotbar `mb:snow` and placed `mb:snow_layer` read cream/tan powder, not bleach-white snow.

**Do not regress:** Do not swap in vanilla snowball/snow_block textures. Do not change `mb:snow` / `mb:snow_layer` IDs.

## 2026-08-30 — Infected oak white is an overlay; three blocks

**Symptom (August):** Wants leaves **very similar to vanilla**, with an infected **white tint that grows stronger**. OK with 3 blocks if permutations fail outside VAN (LIST forest).

**Playtest (August, VAN screenshots + Content Log):** Stage 0 picks up biome foliage tint. Stages 1–2 did **not** — they had `tint_method` stripped so LIST would not lime baked white. VAN vanilla oaks with `#C4C0B4` foliage are the target look. Day 20 + powder on leaves looked like nothing was converting because stage 0 **is** that same tinted oak.

**Playtest (August, 2026-08-31, ~807, 96, -354):** “Much better.” Creative `_2` / `_1` / stage 0 in a row in VAN: same dusty biome tint, each stage paler/whiter, oak cutouts intact. Keep this (grayscale TGA + `default_foliage` on all three). Screenshot is the placed stages, not a worldgen-snow or birch-canopy pass.

**Failed:** Cube `material_instance` overlay (geo invalid, blank blocks). Baking green + dropping foliage tint on `_1`/`_2`. Painting white onto a tinted TGA for LIST.

**Worked:** One inset cube. All three stages = Samples oak grayscale + `default_foliage`. `_1`/`_2` lift toward white so VAN gets paler dusty oak, still biome-tinted. Snow on an infected leaf advances dust on tick. Rebuild: `python tools/buildInfectedOakLeavesTexture.py`.

**Verify:** Fully exit to menu. VAN: stage 0 matches neighboring vanilla oaks. `_1` / `_2` same tint, paler. Powder on leaves at journal day 20: those cells go 0→1→2. No geometry errors.

**Playtest result (August, 2026-08-31):** Pass on the three-stage look in VAN. Worldgen powder convert and birch tint still need their own look in the trees, not only creative blocks.

**Do not regress:** Do not drop `default_foliage` on `_1`/`_2`. Stage `_3` is the exception (no tint, snow-layer bake). Do not put `material_instance` on geometry cubes. Do not bake a fixed forest green on 0–2. Do not use `opaque` or two-sided alpha. Do not put the inner flipped cube back. Journal day, not `/time set`.

## 2026-08-30 — Infected oak leaves must match vanilla oak TGA

**Symptom (August playtest, two LIST forest screenshots):** Still not right vs vanilla oaks. Wants them **very similar** to vanilla leaf blocks — not neon, not a darker custom green.

**Failed:** Darkening the TGA (0.74–0.82) after LIST looked lime. Remapping oak RGB through dust palettes / white lerp. `face_dimming: false` (flat, self-lit faces). Guessing brightness instead of using Samples `leaves_oak.tga` as stage 0.

**Worked:** Stage 0 = exact Samples oak (same RGB + holes). Stages 1–2 only a light dust lerp on leaf pixels. `default_foliage` + `face_dimming: true`. Keep `alpha_test_single_sided` and no inner cube. Rebuild: `python tools/buildInfectedOakLeavesTexture.py`.

**Verify:** Fully exit to menu. LIST forest: converted / creative infected leaves sit next to vanilla oaks with the same green and the same holey Fancy look. Stage 2 slightly dustier, still oak-shaped.

**Do not regress:** Do not darken or brighten stage 0 away from the Samples TGA. Do not turn `face_dimming` off. Do not use `opaque` or two-sided alpha. White infection belongs on the **untinted overlay**, not on this TGA.

## 2026-08-30 — Infected Maple Bear cap scales with 3 players and journal difficulty

**Symptom (August):** The nearby cap for normal infected Maple Bears should work with 3 players, and with shifting Journal → Settings Easy / Normal / Hard.

**Failed:** Flat `ENTITY_TYPE_CAPS.infected = 17` for every party size. Journal difficulty only multiplied spawn *chance* (`spawnMultiplier` 0.7/1/1.3) and added `extraCount` that was then clamped by per-variant `maxCountCap`. Easy `extraCount` was floored at 0 so the cap never dropped. Buff/mining already scaled with player count; infected did not.

**Worked:** `getInfectedTypeCap(playerCount, spawnMultiplier)` — 1p 17, 2p ×1.4, 3p ×1.75, 4+ ×2, then Easy/Normal/Hard. Ceiling 48. Per-variant `maxCount` scales toward that family cap so day-20 `maxCountCap` 14 does not bind first.

**Verify:** Fully exit to menu. Three players together: infected nearby can exceed 17 on Normal. Journal Hard raises the cap; Easy lowers it. Solo Normal still ~17.

**Do not regress:** Do not hard-code 17 in `attemptSpawnType`. Do not ignore `getAddonDifficultyState().spawnMultiplier` on the infected family cap.

## 2026-08-30 — Ocean-base spawns prefer seafloor, not a player mine

**Symptom (August):** At a base in the ocean, the spawn system filled a mine the group dug under the base instead of the water / seafloor around them.

**Failed:** No grass → not “above ground.” Nearby stone → “underground.” With 3 players `yRangeDown` is only 10, so the mine (near player Y) fills the tile budget; seafloor dusted_dirt is too deep. Mining’s 40% stone/cave pass prefers that mine. Cache within ±30 Y keeps mine tiles.

**Worked:** Detect open water on offset columns. Expand Y down to seafloor. Scan seafloor first. Prefer tiles with water above. Skip the mining stone/cave pass over water. Cache: skip air-above tiles when over water; allow 48 down. Bears still spawn on ocean-floor dusted_dirt.

**Verify:** Fully exit to menu. Ocean platform with a mine underneath — new infected/mining spawns around the water/seafloor, not piled in the mine. Land caves unchanged.

**Do not regress:** Do not skip Maple Bear ocean-floor script spawns. Do not treat player-made caves as the ocean surface.

## 2026-08-30 — Inner leaf cube fills Fancy holes; three dust textures on one block

**Symptom (August screenshots, LIST forest):** Converted dusty leaves looked solid next to vanilla oaks. Vanilla still showed Fancy cutout holes (sky through the clumps). Dusty patches read as painted plastic. He asked for **3 stages / 3 textures getting more white**, or 3 leaf blocks.

**Failed:** Treating this as a missing alpha mask (Samples `leaves_oak.tga` and `infected_oak_leaves_0.png` already share the same holes — 84 cutout pixels). `opaque` (painted cubes). Two-sided / `alpha_test_to_opaque` / blend (black holes on custom blocks). The **inner flipped cube** in `geometry.infected_oak_leaves` — through a hole you see inner walls, so the canopy looks opaque vs neighboring oak. Four dust stages (0–3) when he wanted three. Three separate block IDs (not needed).

**Worked:** One block `mb:infected_oak_leaves`. **`mb:dust` 0–2** (three textures, each whiter). State **3** still exists as an alias of texture 2 for old chunks. **One inset cube**, no inner shell. Keep `alpha_test_single_sided`. Copy Samples oak alpha exactly; fill hole RGB only (a=0) for mipmaps. Rebuild: `python tools/buildInfectedOakLeavesTexture.py`.

**Verify:** Fully exit to menu. LIST forest next to vanilla oak: same holey Fancy look, dusty flesh. Creative: place three dust stages — 0 oak-like, 1 dusty, 2 noticeably white. Log / sky visible through holes, no black flicker.

**Playtest (August, LIST forest):** First pass neon lime, then darken 0.74 looked too dark/muddy vs vanilla oaks. See **Infected oak leaves must match vanilla oak TGA**. Holes/geo stay.

**Do not regress:** Do not put the inner flipped cube back to “fill emptiness.” Do not use `opaque` or two-sided alpha. Do not fill texture holes. Three block IDs are OK (August asked) — the fail is a **second solid cube**, not extra identifiers.

## 2026-08-30 — Storms must not dump livestock in the ocean

**Symptom (August):** Old update — a snow storm in the ocean spawned a bunch of cows. Needs to stay fixed in this pack.

**Failed:** `!= ocean` on livestock rules while snow infected **land** biomes also replaced oceans (those chunks lose the ocean tag, seafloor is `mb:dusted_dirt`). Putting livestock in `SPAWN_CONFIGS` — storm tiles include seafloor and storms bump spawn chance. `entity.remove()` on water livestock.

**Worked:** Water replacements are `mb:infected_biome_*_ocean` tagged `ocean`. Livestock JSON already skips `ocean`. Spawn controller refuses `isInfectedLivestock`. Bears still script-spawn on seafloor dirt.

**Verify:** Fully exit to menu. New ocean chunks. Summon a storm at sea — no new cow/pig/sheep herds in the water. Bears can still be on the floor.

**Do not regress:** Do not put pig/cow/sheep in `SPAWN_CONFIGS`. Do not move ocean/river/beach targets back onto land infected biome IDs. Do not `entity.remove()` livestock for water.

## 2026-08-30 — Leaf conversion runs outside VAN

**Symptom (August):** Conversion should run outside VAN. VAN white/dust is good; LIST trees still convert.

**Failed:** Biome-gating `convertLeafToInfected` / grass neighbor-scan to VAN. Reading “LIST looks different” as “stop converting there.”

**Worked:** No biome check on convert. Overflow oaks and LIST forest convert. VAN look unchanged. LIST look = cutouts + dusty flesh (`default_foliage` of that biome), not `opaque`.

**Verify:** Fully exit to menu. VAN dusty/white. Walk to `forest LIST` — oaks still convert over time, with holes, not painted cubes.

**Do not regress:** Do not require `isVanillaInfectedBiomeAt` on leaf convert. Do not use `opaque` on infected leaves.

## 2026-08-30 — VAN leaf/grass infection stays inside VAN

**Superseded same night (August):** Conversion **should run outside VAN**. Gating `convertLeafToInfected` / grass scan to VAN was the wrong read of “LIST looks different.” VAN white/dust stay; convert still follows into LIST and river overflow. See **Infected leaves are vanilla cutouts with dust, not opaque cubes** for the LIST look (cutouts, not opaque cubes). Do not biome-gate leaf convert again.

## 2026-08-30 — Infected leaves are vanilla cutouts with dust, not opaque cubes

**Symptom (August playtest):** After switching to `opaque`, converted leaves were solid dark-green cubes — not like vanilla leaves at all. He wants vanilla oak holes, just dustier.

**Failed:** `render_method: "opaque"` (painted cube). Two-sided / `alpha_test_to_opaque` / blend (black holes). Treating “too translucent” as “fill the whole cube.”

**Worked:** `alpha_test_single_sided` (vanilla cutout). Dustier TGA on the **leaf pixels only** — keep Samples oak holes. **Do not** add an inner flipped cube — that filled the Fancy holes (see **Inner leaf cube fills Fancy holes**). Three dust stages 0–2. Do not fill holes. Do not drop darken to 1.0 with heavy cream.

**Verify:** Fully exit to menu. Creative Infected Oak Leaves should show oak-shaped holes like Fancy leaves, with powder on the flesh. VAN converted cells match nearby oaks’ silhouette, dustier. Log visible through holes, no black flicker.

**Do not regress:** Do not use `opaque` on this block. Do not use two-sided alpha or blend.

## 2026-08-30 — Infected leaves should render opaque, not cutout

**Superseded same night (August playtest):** `opaque` made solid cubes. See **Infected leaves are vanilla cutouts with dust, not opaque cubes**. Two-sided / `alpha_test_to_opaque` are still fails.

## 2026-08-30 — Infection powder must not sit on kelp

**Symptom (August screenshot):** White powder plate (`mb:snow_layer`) floating mid-ocean on a kelp stalk, with an air pocket on top.

**Failed:** `SNOW_REPLACEABLE_BLOCKS` included kelp / seagrass / sea pickle. Storms treat kelp as the surface (not liquid), then replace it with powder. Same list is used by death/torpedo/buff/trails. Do not script-delete existing plates. Do not stop Maple Bear seafloor spawns.

**Worked:** Remove water plants from `SNOW_REPLACEABLE_BLOCKS`. `isWaterColumnSnowBlock` gates `applyInfectionSnowLayer` and column placement. Storms skip kelp when finding surface (`findSurfaceBlock`) and pass through it for particles. Land grass/flowers still get powder.

**Verify:** Fully exit to menu. New ocean / kelp — no new white plates on kelp. Bears can still be on seafloor dirt. Land storms still snow lawns. Old plates already in the world stay until broken.

**Do not regress:** Do not add kelp back to `SNOW_REPLACEABLE_BLOCKS`. Do not `entity.remove()` / sweep-delete ocean powder. Do not skip bear ocean-floor script spawns.

## 2026-08-30 — Infected leaves whiten in dust stages 0–3

**Updated same night:** August asked for **three** stages, not four. See **Inner leaf cube fills Fancy holes; three dust textures on one block** (`mb:dust` 0–2; state 3 aliases texture 2).

**Symptom (August):** Converted leaves used to look like they whitened in stages/gradients. One dusty look was not that.

**Failed:** Treating the mix of vanilla oak + one converted texture as the gradient. Brightening a single TGA toward white (ghostly canopy). Script-ticking every leaf extra to force stages.

**Worked:** `mb:dust` on `mb:infected_oak_leaves`. Convert starts at 0 (oak-like). Powder, neighbor spread, and the existing leaf tick advance dust. Still binary alpha + darkened cutouts — not the old ghost wash. Rebuild: `python tools/buildInfectedOakLeavesTexture.py`.

**Verify:** Creative Infected Oak Leaves is stage 0. Day 2+ VAN: newly converted cells darker/oak-like, then paler over time. Whitest stage not a white ghost; log still visible through holes.

**Do not regress:** Do not use two-sided alpha or blend. Do not put `minecraft:tick` on every dusted_dirt. Do not skip Maple Bear ocean-floor spawns. Do not flatten back to one texture without asking.

## 2026-08-30 — Infected livestock must not spawn in water

**Symptom (playtester):** Infected pigs spawning in an ocean.

**Failed:** `has_biome_tag != ocean` alone. Snow infected biomes **replace oceans** and often drop the `ocean` tag; seafloor is `mb:dusted_dirt`. `spawns_underground` plus surface spawn on that dirt puts livestock in the water column. A min-Y 62 height filter would also break superflat / low plains. **Script `entitySpawn` remove** (and skipping conversion in liquid) — August does not want scripts deleting livestock that appear in water; prevent natural spawn only.

**Worked:** Livestock **JSON spawn rules** only: surface only (drop `spawns_underground`), `spawns_on_block_prevented_filter` water/flowing_water, keep ocean-tag skip as extra. **Ocean/river/beach replacements** use `mb:infected_biome_*_ocean` tagged `ocean` so that skip actually matches (same land ID replacing ocean used to drop the tag). Spawn controller never script-spawns livestock (storm tiles include seafloor). Maple Bear script spawns on ocean-floor dirt stay. Livestock that later walk into water still float (`behavior.float` / `avoid_water`).

**Verify:** Fully exit to menu. Infected coast/ocean — no new pigs/cows/sheep in open water, including during a dust storm. Bears still on seafloor dusted dirt. Land VAN / snow infected still get livestock. Superflat still can spawn them. New chunks for ocean replacements (`mb:infected_biome_*_ocean`).

**Do not regress:** Do not add a sea-level height_filter. Do not `entity.remove()` livestock for being in water. Do not skip Maple Bear ocean-floor script spawns. Do not police livestock water in conversion.

## 2026-08-30 — Infected leaves have one dusty look, not whitening stages

**Superseded** the same day: August asked for real stages. See **Inner leaf cube fills Fancy holes; three dust textures on one block** (three textures, `mb:dust` 0–2). Ghost-white single TGA is still a fail.

## 2026-08-30 — Script-placed powder infects the block under it

**Symptom (August):** Storm snow layers should infect viable blocks underneath. The powder is the infection substance.

**Failed:** Trusting snow `onPlace` for storm `setType` (same miss as worldgen). Storm placement skipped `grass_block` entirely (`SNOW_NEVER_REPLACE` used as “skip this column”) and skipped plants, so storms almost never landed on lawns or canopies. Player-centric scans were the only convert path.

**Worked:** After every script-placed `mb:snow_layer`, `notifySnowLayerPlaced` → `tryInfectUnderSnow({ force: true })`. Storms place powder in air above grass/dirt/leaves (or replace a plant), never turn grass_block into snow. Still day 0–1 = 0. Do not tick every snow_layer.

**Verify:** Day 2+ (or summon a storm in Dev). Powder on oak leaves converts that leaf. Powder on grass_block converts to dusted_dirt. Day 0–1 powder sits.

**Do not regress:** Do not assume `setType` fires custom `onPlace`. Do not skip grass_block columns when placing air-above snow. Do not put `minecraft:tick` on every snow_layer.

## 2026-08-30 — Infected leaf cutouts must stay darker than vanilla-tint gray

**Superseded (August playtest):** Darken 0.74 made LIST converted leaves **too dark / muddy** vs vanilla oaks. The lime pass was from **lightening** the TGA (white lerp), not from using vanilla luma. See **Infected oak leaves must match vanilla oak TGA**.

**Symptom (first LIST playtest):** Converted leaves were **neon lime** — too bright vs neighboring vanilla oaks.

**Failed:** `darken` 0.92–1.0 plus white lerp (lime). Then `darken` 0.74–0.82 (too dark vs vanilla). Cream/white wash. `face_dimming: false`.

**Worked (updated):** Stage 0 = exact Samples `leaves_oak.tga`. Do not darken below vanilla. Keep `default_foliage`. Do not use two-sided alpha.

## 2026-08-30 — Dusted dirt spreads to neighbor grass like leaves, without ticking dirt

**Symptom (August):** Dusted dirt / infection floor should creep into grass around it the way infected leaves infect neighboring leaves.

**Failed:** `minecraft:tick` on every `mb:dusted_dirt` (snow biomes are a full carpet). Randomly sampling 4 of 13 neighbor offsets, then checking `grassTouchesInfection` again (the dirt beside the grass often was not in the sample). Cap 1 convert and the slow scan table on dirt→grass so the front barely moved.

**Worked:** When a scan hits dusted dirt / powder / infected leaves, try every grass neighbor (`knownAdjacent`) using `getGreeneryNeighborSpreadChance` (leaf-neighbor curve, slightly slower). Still no tick on dusted_dirt. Random lawn rays stay on the slower table. Cap 2 per scan.

**Verify:** Day 2+ VAN or a snow-biome grass edge. Stand near dusted dirt — adjacent grass_block should convert one cell at a time. Day 0–1 still 0. Snow-biome interiors should not hitch.

**Do not regress:** Do not put `minecraft:tick` on dusted_dirt. Do not convert grass that does not touch infection. Do not use `/time set` as the addon day.

## 2026-08-30 — Bedrock feature JSON uses engine IDs, not Java aliases

**Symptom (August Content Log):** `[Json][error] Unknown block during Deferred BlockDescriptor resolution: …` on world join.

**Failed:** Pasting Java wiki IDs into Bedrock feature JSON (`may_replace`, `may_attach_to`, etc.).
- 2026-08-30: `minecraft:sugar_cane` in infected oak tree `may_replace`. Engine ID is `minecraft:reeds`.
- 2026-08-31: `minecraft:flowering_azalea_leaves` in `infected_canopy_dust_block` attach list. Engine ID is `minecraft:azalea_leaves_flowered` (`data/bedrock_blocks.json`). Custom `mb:infected_flowering_azalea_leaves` is fine — that is our block.

**Worked:** Only IDs from `data/bedrock_blocks.json` in feature block lists. Generator `allVanillaLeaves()` throws if a species table has a non-Bedrock vanilla id.

**Verify:** Fully exit to menu, rejoin. No `Deferred BlockDescriptor` Json error. Flowering azalea canopies still convert (`azalea_leaves_flowered`).

**Do not regress:** Do not paste Java wiki IDs into Bedrock feature JSON. Check `data/bedrock_blocks.json` first. `[Sound][inform] No sound found for block type 'normal'` on join is engine noise unless an MBA block actually uses `"sound": "normal"`.

## 2026-08-30 — Content Log "No sound found for block type 'normal'" is vanilla

**Symptom (August Content Log):** `[Sound][inform] No sound found for block type 'normal'` on join.

**Failed:** Treating it as an MBA custom-block miss. Our `RP/blocks.json` uses `dirt_with_roots`, `mb:snow_layer`, `metal`, `grass` — not `normal`.

**Worked:** Ignore unless a custom block actually uses `"sound": "normal"` or a step sound is missing on `mb:` blocks. Same class already seen in FFG logs.

**Verify:** Walk on dusted dirt, infected leaves, powder — those should use the mapped sounds. `normal` on join without a missing MBA step is engine noise.

**Do not regress:** Do not add `"sound": "normal"` to `RP/blocks.json`. Do not spend a session hunting it if our sound keys are already valid.

## 2026-08-30 — World vegetation infection rides the world stack

**Symptom (design):** Leaf/grass infection over days should be part of the same world infection system as storms, director tiers, and work-spread — not a private loop.

**Failed:** A raw 40-tick `runInterval` that ignored `claimSpreadSlice` (day-0 8×, village 4×, spawn-load 2×, chunk-edge). Convert chance was day-table only, so storms and director pressure did not touch vegetation. Using load-escalated director stage on block converts would have made busy worlds convert *more* cells.

**Worked:** Same stack as other world work: `claimSpreadSlice("leaf_infection")` + village-burst defer + clustered players. Convert chance = day table × director **day-band** × storm reservoir (`getWorldInfectionSpreadMult`). Load still slows scans, not extra converts. Day-0 bisect category `leaf_infection`. Self-test prints leaves/grass × world mult.

**Verify:** Journal → script self-test: World vegetation line. Day 0–1 still 0. Day 2+ VAN. Stand in a storm after day 8+ — slightly faster at the front, not fire. High spawn load should hitch less, not melt lawns.

**Do not regress:** Do not put vegetation on a private interval. Do not apply load-escalated spawn stage to block converts. Do not tick every dusted_dirt.

## 2026-08-30 — Infected livestock = Samples shape + pig hostile delta

**Symptom (design):** New infected farm animals should still read as that vanilla mob, then look/act infected like pig and cow.

**Failed:** Inventing a sheep from scratch. Light dust on vanilla-white wool (still reads as a normal sheep). Copying cow leftovers (`cow_adult` milk/breed) or vanilla sheep shear/dye/eat_block/baby. Putting vanilla `baby_transform` head scale 2 on custom geo (pig lesson: giant heads). Dropping `convertCowToInfectedCow` while adding sheep (Dev conversion would throw).

**Worked:** Start from Mojang Bedrock Samples sheep (texture is `sheep.tga`, wooly geo inherit). Apply the pig delta: family `infected` only, melee + nearest player/mob, tempt snow + foods, despawn like other MB entities, loot snow + meat, inventory/pickup, no baby. Client: Samples geo, vanilla animations, custom render controller forcing Texture.default, **no** baby_transform. Sounds: vanilla `mob.sheep.*` at ~0.55 pitch (same idea as pig). Convert sheep to `mb:infected_sheep`, never to a Maple Bear. Keep `isInfectedLivestock()` so pig/cow/sheep stay on one path.

**Playtest (August, 2026-08-31, ~808, 65, -446):** Behavior/shape OK. **Texture failed** — muddy, not infected. Compoohter remakes `infected_sheep.png` next time. See **Infected sheep texture looks muddy**.

**Verify:** `/summon mb:infected_sheep`. Compare standing next to infected pig/cow. Kill a vanilla sheep with a bear after day 2. Journal Mobs → Infected Sheep. Creative spawn egg **07. Infected Sheep**. After the remake, it must not look like mud.

**Do not regress:** Do not convert sheep into infected bears. Do not add eat_block (fights grass infection). Do not use vanilla sheep color/shear. Do not skip the livestock helper when adding the next farm animal.

## 2026-08-30 — Vegetation scans must not run N× in multiplayer

**Symptom (design):** Leaf/grass infection over days must stay cheap when several players are online.

**Failed:** `spreadPlayersForWork` only round-robins on addon day 0–3 (`isVillageEntitySpreadActive`). After that every player fired 8 canopy rays + 6 grass scans every 40 ticks, and each grass candidate checked 13 neighbor offsets.

**Worked:** `spreadPlayersForVegetationWork` always picks one 32-block player cluster per interval (clustered co-op shares a scan). Canopy columns 8→6. Dirt→grass tries all neighbor offsets (`knownAdjacent`); random lawn rays stay capped. Same `leaf_infection` toggle. Still do not tick all `mb:dusted_dirt`.

**Verify:** Two-plus players in VAN after day 3 — grass/leaf spread should not feel like fire or hitch. Solo play should still creep. Journal day, not `/time set`.

**Do not regress:** Do not go back to “all players after day 3” for `leaf_infection`. Do not tick every dusted dirt. Do not convert grass that does not touch infection. Broader class: every MBA system has a solo budget and an MP budget.

## 2026-08-30 — Greenery infection must not tick every dusted dirt

**Symptom (design):** Infection should spread through grass plants and grass_block over days, like leaves — nothing at the start, slow, then visible in 5–10s by day 20–25, not fire.

**Failed:** Putting `minecraft:tick` on `mb:dusted_dirt` (snow infected biomes are already a full carpet of it — that would melt the sim). Using the leaf `getInfectionRate` wrap at day 2 (too fast for a whole lawn). Converting grass with no infected neighbor (looks like fire).

**Worked:** Player-centric scan (`mb_grassInfection.js`) plus powder-on-grass. Convert only cells that already touch `mb:snow_layer`, `mb:dusted_dirt`, or infected leaves. Dusted dirt uses leaf-style neighbor spread (`getGreeneryNeighborSpreadChance`, `knownAdjacent`). Cap **2** converts per scan. Separate slower table for random lawn rays. Grass_block → dusted_dirt; grass/fern on top → powder. Skip if a solid build is on top. Same `leaf_infection` toggle and day-0 sleep.

**Verify:** Addon day 0–1 (journal day, not only `/time set`): VAN grass stays. Day 2+: stand next to ground powder or a snow-biome / VAN dirt edge — one cell at a time. Day 20–25: watch a front 5–10s. Flowers still green.

**Do not regress:** Do not tick all dusted_dirt. Do not convert grass that does not touch infection. Do not use `/time set` as the addon day.

## 2026-08-30 — Tree features must finish across biome edges

**Symptom (August playtest):** VAN oak at a river (`Bio OW river LIST 10`, ~9806, 77, 20130). Inland canopy full dusty/purple; the side over water was sparse dark-green. Trees looked cut off at the biome line.

**Failed:** Tight `may_replace` (air/grass/leaves only) — vanilla oak includes **water** and **flowing_water**. Custom `mb:infected_oak_leaves` as worldgen `leaf_block` — addon blocks often will not place in a neighboring biome (river), so the canopy stops at the VAN/river edge.

**Worked:** Match vanilla oak `may_replace` / `may_grow_through` (water, other leaves, vines, plants). Worldgen canopies use `minecraft:oak_leaves` so they overflow like vanilla; `mb_leafInfection.js` converts later (including outside VAN). Feature-rule `biome_filter` still only gates **where the trunk starts**, not extra trees in the river.

**Verify:** New chunks at VAN next to a river. A tree that starts on grass should keep a full oak blob over the water, same as a normal forest oak. Already-generated shoreline trees will not change.

**Do not regress:** Do not omit water from tree `may_replace`. Do not use custom leaf blocks as worldgen `leaf_block` if the canopy must cross biomes. Do not add Java `minecraft:sugar_cane` (use `minecraft:reeds`). Do not put `mb:snow_layer` in `leaf_blocks`.

## 2026-08-30 — Worldgen snow on trees does not fire onPlace

**Symptom (August playtest):** Naturally generated powder on canopy did not infect leaves until he replaced the snow himself. Follow-up: player-placed snow advances; worldgen / script snow still did not.

**Failed:** Trusting snow `onPlace` for worldgen. Scanning random blocks at **foot height**. Six sparse downward rays without `force` (thin slab easy to miss; random roll on top of a 6/1089 column hit).

**Worked:** Sample nearby `mb:snow_layer` cells (small volume around the player + canopy columns) and convert what's under them with `force` (still day-gated). See **2026-08-31 — Sample snow layers**. Do not spawn whole trees already infected just to fake “progress.”

**Verify:** VAN with cheats, day 2+. Stand on the forest floor under snowy oaks — tops should convert over time without replacing snow. Day 0–1: powder stays on vanilla leaves.

**Do not regress:** Do not assume feature-placed **or script-placed** blocks fire custom `onPlace`. Do not scan only at the player’s Y. Storms must call `notifySnowLayerPlaced` / `tryInfectUnderSnow` after `setType`. Do not tick every snow_layer.

## 2026-08-30 — Cutout leaf holes must not be black RGB

**Symptom (August):** Gradients look good; keep the old texture glitches from coming back (flicker, black through holes, harsh edges).

**Failed:** Two-sided alpha. Semi-transparent hole edges. Hole pixels stored as black RGB even when alpha is 0 — atlas mipmaps (`num_mip_levels: 4`) average with black and fringe the cutouts.

**Worked:** Keep `alpha_test_single_sided` + inner flipped cube + AO off. Texture binary alpha only. After paint, copy nearest leaf RGB into a=0 holes so mipmaps stay leaf-colored. Do not change render method to get a gradient.

**Verify:** Creative: walk around a leaf in front of a log — log stays wood, no black fringe on holes. VAN converted canopy keeps foliage tint without sparkle.

**Do not regress:** Do not put black RGB in leaf holes. Do not re-enable two-sided alpha for tint.

## 2026-08-30 — custom_components array is invalid from 1.21.90

**Symptom (August Content Log):** `minecraft:custom_components component is not valid from 1.21.90 onward` on `snow_layer.json` and `infected_oak_leaves.json`. Leaf block parsing failed; `blocks.json` said `mb:infected_oak_leaves` does not exist. Script warned the custom components were unused. JOIN retries 1–3 are existing noise, not this bug.

**Failed:** The pre-1.21.90 array `"minecraft:custom_components": ["mb:infected_oak_leaf"]` on format 1.26.10. `minecraft:queued_ticking` (renamed to `minecraft:tick`). Empty `minecraft:random_ticking`.

**Worked:** Custom Components V2 — put the component id in `components` like vanilla: `"mb:infected_oak_leaf": {}`. Use `"minecraft:tick": { "looping": true, "interval_range": [100, 180] }` for `onTick`.

**Verify:** Reload; no custom_components / block-parse errors. Creative Infected Oak Leaves exists. Place snow on oak leaves.

**Do not regress:** Do not bring back `minecraft:custom_components` or `queued_ticking` on current format versions.

## 2026-08-30 — Custom leaves drop like oak; infection creeps from powder

**Symptom:** Infected oak leaves always dropped as a block (unlike oak). August wanted silk/shears only, plus infection spreading through the canopy over time, and snow-on-leaf becoming infected. A fully infected custom tree looked like a flat painted cube with no gradient.

**Failed:** Loot table that listed `mb:infected_oak_leaves` as a normal drop. Remapping the whole oak TGA onto dusted_dirt/snow (no foliage tint) so a converted tree had one uniform color. Weighting extra trees toward already-custom canopies (nothing left to infect; whole trees popped as dusty cubes). **`minecraft:custom_components` array** on format 1.26.10 (August Content Log: not valid from 1.21.90 onward — leaf block failed to parse, `blocks.json` said the block does not exist).

**Worked (Samples + wiki):** Silk Touch **ignores** `minecraft:loot` and always drops the block — so the loot table must **not** include the leaf. Shears use `match_tool` item `minecraft:shears`. Other breaks: oak sapling 5%, sticks 2%, apple 0.5% (vanilla oak rates). `tint_method: default_foliage` on the custom leaf plus keeping most of the Samples oak color. Snow `onPlace` converts the leaf under powder; infected leaves **`minecraft:tick`** infect neighbors. Extra trees mostly `infected_oak_tree_partial` again so snow-capped vanilla oaks are the seeds. Custom components V2: put `"mb:infected_oak_leaf": {}` in `components` (same as vanilla keys). Rename `queued_ticking` → `tick`.

**Verify:** Punch an infected leaf (no drop of the block). Shears / Silk Touch drop it. Place `mb:snow_layer` on oak leaves — the leaf should convert. Stand in VAN: infection should creep from snowy tops, not spawn as all-custom cubes. New chunks for the tree mix.

**Playtest (August):** Looks so good. Keep the anti-glitch render (single-sided + inner shell) while using foliage tint.

**Do not regress:** Do not put the leaf item in the default loot pool. Do not turn two-sided alpha back on. Do not put snow_layer in tree `leaf_blocks`. Do not fully recolor the oak TGA if you still want biome gradient. Do not use `minecraft:custom_components` or `minecraft:queued_ticking` on format ≥ 1.21.90.

## 2026-08-30 — Custom leaves need an inner shell, not two-sided alpha

**Superseded same night (August screenshots):** The inner flipped cube filled Fancy holes vs neighboring vanilla oak. See **Inner leaf cube fills Fancy holes**. Keep `alpha_test_single_sided` + **one** inset cube. Two-sided alpha is still a fail (black insides). Tree weights / canopy dust search still stand.

## 2026-08-30 — Custom leaf holes show black: unlit backfaces

**Symptom (August playtest):** Flicker only while moving. Looking through infected oak leaves, the oak log behind is jagged black. Texture already binary alpha (holes are a=0, not black pixels).

**Failed:** `alpha_test` and `alpha_test_to_opaque`. Both **disable backface culling**. Vanilla leaves get a special two-sided shader; custom blocks do not, so the inside of the cube is black and shows through the cutouts. Moving changes which coplanar neighbor face wins (z-fight).

**Worked:** `alpha_test_single_sided` (cull backfaces so holes show the log). Inset cube `geometry.infected_oak_leaves` (~0.03) so adjacent leaves are not coplanar. AO/face_dimming off on the cutout.

**Verify:** Creative: look through a leaf at a log while walking around — log stays wood, no flicker.

**Do not regress:** Do not use `alpha_test` or `alpha_test_to_opaque` on custom leaf cubes. Vanilla leaf render methods do not transfer to custom blocks.

## 2026-08-30 — Custom leaves flicker: use vanilla leaf render method

**Symptom (August playtest):** Infected oak leaves texture was good, but adjacent blocks flickered with black lines (z-fighting). Normal oaks looked patchy vs vanilla. Little/no powder on canopy tops.

**Failed:** `render_method: "alpha_test"` (no backface cull — both faces of every leaf draw, so neighbors fight). Random Y scatter for snow often missed the top of the tree. Oak `variation_chance` last layer 1/2 made canopies holey vs vanilla.

**Worked (partial, then corrected):** Canopy dust search **-y**; vanilla oak variation_chance; oak trunk for bare trees. **`alpha_test_to_opaque` did not stop flicker** — see the next lesson.

**Verify:** New VAN chunks: oak-shaped canopies, more `mb:snow_layer` on tops.

**Do not regress:** Do not put snow_layer in tree leaf_blocks.

## 2026-08-30 — snow_layer in tree leaf_blocks z-fights

**Symptom (August playtest):** Custom VAN trees had thin white plates all around trunks and leaf sides, flickering (z-fighting). He wanted normal oak shape, dusty leaf color, powder sprinkled **on top** only. Extra tree density was not wanted.

**Failed:** Putting `mb:snow_layer` in `random_spread_canopy.leaf_blocks`. Worldgen ignores placement_filter, so the 2px slab sits in a full cell beside logs/leaves — coplanar with leaf faces. Bleaching oak leaves toward `#F0F2F4` made a harsh black/white canopy.

**Worked:** Oak `trunk` + `canopy` (no snow in the tree). Dust = `after_surface_pass` scatter with `may_attach_to.bottom` = oak / birch / infected leaves. Rebuild `infected_oak_leaves` from dusted_dirt + snow palettes (dirt browns + cream cap). Foliage tint `#C4C0B4`. Restore original tree scatter density (2 × 5 × 70%).

**Verify:** New VAN chunks. No white shelves on trunks. Powder on canopy tops. Custom leaves read as dusty dirt, not static.

**Do not regress:** Do not put `mb:snow_layer` in tree `leaf_blocks`. Do not crank tree iterations because a screenshot looked sparse (vanilla forest tag already places oaks).

## 2026-08-30 — Teleport after locate must wait for a ticking chunk

**Symptom (August playtest, Test #98):** Biome checker hub showed biome `(unknown)`, red `getBiome` “not in a chunk currently loaded and ticking,” and yellow “NOT on replace list.” He already uses `/locate biome` and it works.

**Failed:** Seed-search then immediately `getBlockFromRay` + `getBiome` + reopen hub at the destination. Unloaded chunks throw; null biome was treated as “not on replace list.”

**Worked:** Run `/locate biome <id>` first (chat matches August). Teleport to XZ at Y 180, poll `getBlock` until the chunk is ticking, then surface-snap, then open the hub. If getBiome throws chunk-not-loaded, show “loading / Refresh” — do not label it a replace-list miss.

**Verify:** Dev pack, cheats on. Teleport to `mb:infected_vanilla_forest`. Hub should show the id after a short wait, not unknown.

**Do not regress:** Do not query `getBiome` / surface raycast on a chunk that is not ticking.

## 2026-08-30 — Vanilla oak leaves use biome foliage_appearance

**Symptom:** VAN patches with trees used normal oak leaves, dark green — not dusty white.

**Failed:** Client biome `foliage_appearance` `#5A6B4E` (dark olive). Custom `mb:infected_oak_leaves` never registered in those chunks (FeatureRegistry), so only vanilla oaks showed, tinted dark.

**Worked:** Set foliage to dusty white `#F0F2F4` (same family as snow-infected fog). Vanilla oaks pick this up on RP reload. Custom dusty/bare trees still need **new chunks**.

**Verify:** Stand in VAN after RP reload — oak canopies pale/white. Creative Infected Oak Leaves stay the painted texture (no colormap).

**Do not regress:** Do not set VAN foliage back to dark olive.

## 2026-08-30 — VAN coastal patches can have no trees

**Symptom:** HUD `mb:infected_vanilla_forest` on a grassy ocean cliff, no trees.

**Failed:** Treating that as “biome did not generate.” Thin `replace_biomes` forest-on-coast plus failed custom tree features (first load) leave meadow-like VAN.

**Worked:** White foliage on whatever oaks exist. Denser custom tree scatter (8×8, always) on `surface_pass`; ground snow/dead bush on `after_surface_pass` so powder does not eat tree spots. Old empty chunks stay empty — fly new forest.

**Verify:** New VAN chunks should look like forest. Coastal old chunks may stay bare.

**Do not regress:** Do not put tree features and ground snow in the same pass if snow can cover `may_grow_on`.

## 2026-08-30 — feature_rules identifier suffix must match filename

**Symptom:** Content Log `FeatureRegistry[error]` — Feature rule identifier `'infected_vanilla_*_rule'` does not match filename `'infected_vanilla_*'`.

**Failed:** Suffixing identifiers with `_rule` (or any extra token) while the file is `feature_rules/foo.json`. JOIN retry lines (`player found = false` until retry 3) look like load errors; they are existing join-timing noise, not FeatureRegistry failures.

**Worked:** `description.identifier` after the namespace must equal the filename without `.json`. File `infected_vanilla_forest_trees.json` → `mb:infected_vanilla_forest_trees`. `places_feature` stays the scatter/tree id.

**Verify:** Reload world; FeatureRegistry must not print identifier/filename mismatch. New chunks still needed for trees.

**Do not regress:** Do not add `_rule` to feature_rules identifiers.

## 2026-08-30 — scatter_chance denominator must exceed numerator

**Symptom:** FeatureRegistry: Bad value for scatter_chance — denominator should be greater than the numerator.

**Failed:** `"numerator": 1, "denominator": 1` meaning “always.” Engine rejects equality.

**Worked:** Omit `scatter_chance` when placement should always run (same as `village_marker_plains_slot0.json`). Keep 2/3 snow and 1/2 dead bush. Scatter feature can still own its own chance.

**Verify:** No scatter_chance error on world load.

**Do not regress:** Never use 1/1. Use n/(n+1) or omit the field.

## 2026-08-30 — acacia_trunk requires trunk_lean

**Symptom:** FeatureRegistry: Required child trunk_lean not found, then No definition found for feature `mb:infected_oak_tree*`. World with FFG promoted `@minecraft/server` to 2.9.0.

**Failed:** Oak-style `acacia_trunk` with only width, height, and block (older 1.13 tree JSON). Engine then drops the whole feature.

**Worked:** Add `trunk_lean` (`allow_diagonal_growth`, `lean_height`, `lean_steps`). Straight trees: diagonal false, lean 1–1. Bare/eaten: diagonal true, lean_height 2–3.

**Verify:** No trunk_lean / no-definition errors. New `VAN` chunks for trees. In-game look still pending August.

**Do not regress:** Do not ship `acacia_trunk` without `trunk_lean` on current Bedrock.

## 2026-08-30 — GitHub MBA is not the Bridge project

**Symptom:** Edits in `Maple-Bear-Take-Over` do not show in-game / in Bridge until copied.

**Failed:** Editing only the GitHub repo. Assuming Bridge `%LocalAppData%\com.bridge.dev\bridge\projects\Maple Bear Apocalypse` (- Dev) auto-tracks git.

**Worked:** `npm run sync:bridge` copies repo `BP`/`RP` → Bridge release project, and `BP - Dev`/`RP - Dev` → Bridge Dev project’s `BP`/`RP`. Then `npm run sync:dev-to-minecraft` if playing development packs. Both now **prune** dest files deleted in git. Fully exit to title.

**Verify:** Bridge Dev `BP/biomes/mb_infected_vanilla_forest.json` exists; Dev `mb_buildConfig.js` still `INCLUDE_FULL_DEVELOPER_TOOLS === true`. Deleted recipes are gone from dest.

**Do not regress:** Do not overwrite Bridge `.bridge/` or that project’s `config.json`. Do not copy release `mb_buildConfig.js` onto the Dev Bridge BP. Do not copy without prune.

## 2026-08-30 — Biome checker stays Dev

**Symptom:** August: biome checker (and its teleport) must not ship as a player/Host-tools feature.

**Failed:** Treating script-parity (`BP/scripts/mb_biomeCheckerDev.js` exists on public) as “the checker is public.” Adding `pinInReleaseAdmin` would leak it to Host tools.

**Worked:** Gate on `INCLUDE_FULL_DEVELOPER_TOOLS`. Hub + HUD already no-op on public. Pin `biome_checker` has `pinInReleaseAdmin: false`. Load **BP - Dev + RP - Dev** to use it. Public players with cheats can still `/locate biome mb:infected_vanilla_forest`.

**Verify:** Public journal has Host tools only — no Biome checker button. Dev Systems menu has it.

**Do not regress:** Do not add biome checker to Host tools, What’s new for players, or release pins.

## 2026-08-30 — Bedrock can /locate biome; checker can TP

**Symptom:** Docs said `/locate biome` was Java-only. Hard to find the 12% infected forest test.

**Failed:** Telling August to fly forests only. Assuming locate does not exist on Bedrock 1.26.

**Worked:** `/locate biome mb:infected_vanilla_forest` (cheats). Dev Biome checker → **Teleport to biome** uses `findClosestBiome` / `calculateClosestBiomeFromSeed` once (not per tick), then surface TP. Menu is `INCLUDE_FULL_DEVELOPER_TOOLS` only.

**Verify:** Dev pack, new chunks, cheats. Checker TP or locate; HUD `VAN`.

**Do not regress:** Do not run closest-biome search every tick (perf). Do not treat hoped-for TP as a pass until August playtests.

## 2026-08-30 — Playtest results go in Obsidian the same turn

**Symptom:** Code shipped; August tests; next chat does not know what actually looked right.

**Failed:** Repo `docs/lessons.md` only, or hoped-for verify written as if it passed.

**Worked:** Same turn as his report: this file + vault `Projects/Maple Bear Apocalypse/lessons.md` + `Atlas/Lessons.md`. How he talks: vault `People/August.md`.

**Verify:** Vault note exists. Open loops cleared or updated.

**Do not regress:** Do not skip Obsidian because the repo already has a note.

## 2026-08-30 — Infected vanilla cover is a weighted mix

**Symptom:** Infected forest only had one fully dusty oak; user wanted trees and props partly or wholly covered in powder, plus bare trees eaten by the infection.

**Failed:** One `mb:infected_oak_tree` of only `mb:infected_oak_leaves`. Putting `mb:snow_layer` with `enforce_placement_rules: true` would fail the block’s placement_filter.

**Worked:** `minecraft:weighted_random_feature` (`mb:weighted_infected_oak_trees`) — partial (green + dusty + powder), full dusty, bare stripped oak with sparse remaining leaves. Ground: `mb:snow_layer` + `minecraft:deadbush` scatters on tag `infected_vanilla`, `enforce_* : false`, scatter `y: 1`.

**Verify:** JSON parses. **In-game still pending August** (new `VAN` chunks). Do not treat this as a pass until he reports.

**Do not regress:** Keep snow infected biomes barren. Do not name vanilla-infected IDs `mb:infected_biome_*`. Bedrock dead-bush block id is `minecraft:deadbush`.

## 2026-08-30 — Grep stray tokens before shipping pack JSON

**Symptom:** Invalid JSON / mystery strings in biome, block, or feature files (`" marvin"` inserted into arrays).

**Failed:** Writing JSON and assuming the file was clean.

**Worked:** Grep the pack for the stray token and re-parse with `npm run validate:json` before treating worldgen as done.

**Verify:** `rg marvin` empty; validate:json 0 failed.

**Do not regress:** After any agent JSON write, grep + parse before copy to `BP - Dev/`.

## 2026-08-30 — Vanilla files come from Bedrock Samples

**Symptom:** Guessing block/biome/feature JSON or texture names (e.g. `leaves_oak.png` which does not exist).

**Failed:** Inventing vanilla paths. Oak leaves in Samples are `resource_pack/textures/blocks/leaves_oak.tga`.

**Worked:** Pull from https://github.com/Mojang/bedrock-samples and adapt. Standing fact in vault `Memories.md`.

**Verify:** Texture/JSON matches Samples; derived assets (infected leaves) keep vanilla silhouette.

**Do not regress:** Prefer Samples over wiki guesses for Bedrock vanilla files.

## 2026-08-30 — Custom biome vegetation comes from tags

**Symptom:** Custom biome that replaces forest looks like a barren dusted plain (no trees).

**Failed:** Assuming worldgen “remembers” it was forest. Snow infected biomes only tag `infected_biome` + size and use `mb:dusted_dirt` as top — vanilla tree feature_rules never fire.

**Worked:** Infected-vanilla test keeps host tags (`forest`) and `grass_block` surface. ID prefix `mb:infected_vanilla_` so village scripts (`mb:infected_biome*`) stay on snow biomes.

**Verify:** New chunks; biome checker shows `mb:infected_vanilla_forest`; oak trees on grass.

**Do not regress:** Do not name vanilla-infected IDs `mb:infected_biome_*`.

## 2026-08-24 — public vs Dev packs

**Failed:** Shipping `BP - Dev` / full developer tools to CurseForge.

**Worked:** Public stores get **BP+RP only**. `INCLUDE_FULL_DEVELOPER_TOOLS === false` on public `BP/`. After copying scripts into public BP, restore Dev `mb_buildConfig.js`.

**Do not regress:** Planned gear (Buff Arm, Torpedo Spine, Claw) is design, not live items.

## 2026-08-24 — jigsaw POC stays optional

**Failed:** Leaving abandoned-village jigsaw JSON active without `well_center.mcstructure` → `Invalid asset path mb/av_plains/well_center`.

**Worked:** Keep POC under `BP/_optional/abandoned_village_jigsaw_poc/` until the structure is exported. Villages use script placement until then.

## 2026-08-24 — Bridge config is a template copy

**Failed:** Treating `config/dev` or `config/release` as live Bridge config.

**Worked:** `npm run bridge:config:dev` or `bridge:config:release` copies onto repo-root `config.json`. Do not overwrite public `mb_buildConfig.js` with the Dev copy.
