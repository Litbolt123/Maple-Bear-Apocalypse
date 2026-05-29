# Abandoned settlements (no vanilla villages)

Maple Bear worlds treat villagers as removed for performance and tone. This doc covers **worldgen** (no village structures) and the **replacement ruin** feature.

## What the pack does

| Layer | What |
|--------|------|
| **Scripts** | `mb_villagerSpawnPolicy.js` — blocks villager spawn eggs, removes adults on spawn, periodic purge. Escalating warnings if eggs are spammed. |
| **Spawn rules** | `BP/spawn_rules/villager*.sr.json` — impossible natural spawn conditions. |
| **Biomes** | `BP/biomes/worldgen_no_village/*.biome.json` — vanilla overworld biomes with `minecraft:village_type` removed (10 biomes). **New chunks** in those biomes will not roll vanilla villages. |
| **Features** | `mb:abandoned_settlement/*` — small mossy floor + barrel + cobwebs + `mb:dusted_dirt` patches (~1/48 chunks on plains/savanna/taiga/meadow/desert). |

Wandering traders are **not** suppressed.

## Villager spawn eggs and lag (important)

Spamming villager spawn eggs (or dispensers) can still cause brief world hitches even with Maple Bear scripts removed entirely. That stall is mostly **vanilla Bedrock** paying the cost to create villager entities (AI, POI, and related setup) before our pack can cancel or remove them. Scripts block eggs, despawn adults, and warn you in dev — they do **not** remove that first-tick vanilla spawn work. For performance testing, do not use mass villager eggs as a stand-in for addon lag; use script toggles or day-0 bisect for Maple Bear systems instead.

## Regenerating biome overrides

After a Minecraft update, re-run:

```bash
node tools/generateNoVillageBiomeOverrides.js
```

This pulls current Mojang `bedrock-samples` biome JSON and strips `minecraft:village_type`.

## Testing

1. Use **`BP/`** or **`BP - Dev/`** with behavior pack reloaded (or new world).
2. **Villages:** explore **new** terrain in plains/desert/savanna — you should not find vanilla village wells/houses. Old chunks keep old structures.
3. **Ruins:** same — only **newly generated** chunks get `mb:abandoned_settlement` patches.
4. **Eggs:** villager egg → chat + action bar; rapid use → louder warnings + title at 5+ in 2s; 4+ cancels in one tick → bulk/dispenser message.

## Bigger custom structures (Bridge)

The current ruin is a **lightweight block feature** (no `.mcstructure` yet). To ship a full prefab:

1. Build in creative, export **`mb/abandoned_camp.mcstructure`** under `BP/structures/`.
2. Add `minecraft:structure_template_feature` pointing at `mb:abandoned_camp` and a feature rule (or swap the aggregate in `mb:abandoned_settlement/ruin.json`).

**Feature rule file name:** must match the identifier path after the namespace — use `feature_rules/abandoned_settlement_overworld.json` for `mb:abandoned_settlement_overworld` (not `mb_abandoned_settlement_overworld.json`).

**Cobwebs in features:** Bedrock block id is `minecraft:web`, not `minecraft:cobweb`.

See [Managing villages (Microsoft)](https://learn.microsoft.com/en-us/minecraft/creator/documents/managingvillages) for biome `village_type` background.

## Allow villagers again (debug)

**Dev pack:** Journal → **Debug Menu** or **Developer Tools → Systems** → **Villager suppress** (toggles **`mb_suppress_villagers`**). Entity query hub links here too.

Or set **`mb_suppress_villagers`** to **`0`** manually. Default is **on** (suppress). When off, eggs work and adults are not purged; spawn rules may still block natural spawns.
