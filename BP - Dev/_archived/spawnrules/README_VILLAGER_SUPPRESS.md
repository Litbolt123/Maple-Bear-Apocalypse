# Villager spawn rules (restored / disabled)

Active copies live in **`BP/spawn_rules/`** and **`BP - Dev/spawn_rules/`**:

| File | Identifier | Notes |
|------|------------|--------|
| `villager.sr.json` | `minecraft:villager` | `"conditions": []` — no natural spawn via rules |
| `villager_v2.sr.json` | `minecraft:villager_v2` | same |
| `zombie_villager.sr.json` | `minecraft:zombie_villager` | Restored from this folder’s old `zombie_villager.sr.json`, then emptied |
| `zombie_villager_v2.sr.json` | `minecraft:zombie_villager_v2` | same for v2 |

**Scripts:** `mb_villagerSpawnPolicy.js` — spawn eggs cancelled; structure/dispenser spawns removed.

**Not blocked:** `minecraft:wandering_trader` (spawn egg + entity).

**Limits:** Villagers in **already-generated** vanilla villages still appear until chunks load; script removes adults on `entitySpawn`. Zombie→zombie_villager **permute** still uses vanilla `zombie` rules unless you add a pack `zombie.sr.json` without `permute_type` (see archived `zombie.sr.json`).

Toggle for testing: world property `mb_suppress_villagers` = `0`.
