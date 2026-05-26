# Safe Biomes - Maple Bear Spawning

Based on `BP/biomes/mb_infected_biome_*.json` (`minecraft:replace_biomes`), the infected biome replaces specific vanilla biomes. Biomes **NOT** in that replacement list are considered "safer" zones where Maple Bears don't spawn naturally (or spawn at much lower rates).

**Dev tool (in-game):** Journal → Developer Tools → Systems → **Biome checker** — shows biome at your feet vs the replace list and catalogs biomes missing from JSON. After editing biome JSON, run `npm run sync:biome-registry` (or `node tools/syncBiomeReplaceRegistry.cjs`).

## 🔴 Biomes Targeted by Infected Biome (NOT Safe)

The infected biome replaces these biomes at various densities:

### Common Land Biomes (8% replacement)
- Plains, Sunflower Plains
- Forest, Forest Hills
- Birch Forest (all variants)
- Taiga (all variants)
- Savanna (all variants)
- Meadow, Cherry Grove, Flower Forest
- Roofed Forest (all variants)
- Jungle (all variants)
- Bamboo Jungle (all variants)
- Swampland (all variants)
- Mangrove Swamp
- Pale Garden

### Ocean & Water Biomes (4% replacement)
- All Ocean variants (Ocean, Deep Ocean, Cold Ocean, Lukewarm Ocean, Warm Ocean, Frozen Ocean)
- All Beach variants (Beach, Cold Beach, Stone Beach)
- River, Frozen River

### Arid & Mountain Biomes (4% replacement)
- Desert (all variants)
- Mesa (all variants)
- Extreme Hills (all variants)
- Jagged Peaks, Frozen Peaks, Stony Peaks

### Cold Biomes (4% replacement)
- Ice Plains, Ice Plains Spikes
- Cold Taiga (all variants)
- Grove, Snowy Slopes

### Cave Biomes (6% replacement)
- Lush Caves
- Dripstone Caves
- Deep Dark

---

## 🟢 Safe by design (overworld — intentional)

These vanilla biomes are **deliberately omitted** from `replace_biomes`. The dev **Biome checker** labels them **Safe by design** (not “forgotten”). Source of truth for the checker: `INTENTIONAL_SAFE_OVERWORLD_BIOMES` in `tools/syncBiomeReplaceRegistry.cjs` (regenerate with `npm run sync:biome-registry`).

| Biome id | Notes |
|----------|--------|
| `minecraft:mushroom_island` | Mushroom Fields |
| `minecraft:mushroom_island_shore` | Mushroom Fields Shore |
| `minecraft:mega_taiga` | Mega Taiga |
| `minecraft:mega_taiga_hills` | Mega Taiga Hills |
| `minecraft:ice_mountains` | Ice Mountains (legacy id in catalog) |
| `minecraft:redwood_taiga_mutated` | Giant Tree Taiga (mutated) |
| `minecraft:redwood_taiga_hills_mutated` | Giant Tree Taiga Hills (mutated) |

### Nether / End

Gameplay in those dimensions is fine without infected biome JSON today. Reference catalog ids (`hell`, `crimson_forest`, `warped_forest`, `soulsand_valley`, `basalt_deltas`, `the_end`) are **not** in `mb_infected_biome_*.json` yet — add `replace_biomes` groups there when you want dimension infection.

### Other overworld biomes

Any other catalog id not on the replace list and not in the table above shows as **Review gaps** in the biome checker (worth a deliberate pass).

---

## ⚠️ Important Notes

1. **"Safer" doesn't mean "safe"**: 
   - Mining Bears can still dig to players in any biome
   - Flying/Torpedo Bears can reach any location
   - Players can still be infected and spawn bears anywhere
   - Dusted dirt can still be placed manually or by bear actions

2. **Spawn System**: 
   - The spawn controller (`mb_spawnController.js`) spawns bears based on finding `dusted_dirt` blocks, not directly checking biomes
   - However, the infected biome generates `dusted_dirt` as surface material, so infected biomes naturally have more spawn opportunities
   - Safe biomes won't have natural `dusted_dirt` generation, making them safer by default

3. **Future Plans**:
   - According to design vision, some overworld biomes should remain "relatively safer" (no natural spawns or much lower rates)
   - This document identifies which biomes currently fit that description
   - Future updates may explicitly configure certain biomes as "safe zones"

---

## 🎯 Recommendation

**Mushroom Fields** appears to be the most clearly "safe" biome, as it's:
- Not in any replacement list
- Already isolated in vanilla Minecraft
- Rare and hard to find (fitting the "secluded" description)

Other biomes not explicitly listed may also be safer, but Mushroom Fields is the most obvious candidate for a "safe zone" where players could theoretically build without natural Maple Bear spawns (though they'd still need to watch for mining/flying bears and manual dusted_dirt placement).

