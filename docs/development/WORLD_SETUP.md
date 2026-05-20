# World setup (Bedrock)

## World experiments — **not required on 1.26.2+**

**Playtest (2026-05):** On **Minecraft Bedrock 1.26.2**, infected overworld biomes (`minecraft:replace_biomes` in `BP/biomes/`) worked with **no world experiments enabled** (including **Custom Biomes** off).

Older addon docs assumed the **Custom Biomes** experiment was required. That may still apply on **older** 1.26.x builds; treat **1.26.2+** as **no experiment toggles needed** unless Mojang or a future pack change says otherwise.

| Topic | 1.26.2+ (current guidance) |
|-------|----------------------------|
| **Custom Biomes experiment** | **Not required** (verified) |
| **Beta APIs experiment** | **Not required** for this pack (`@minecraft/server` 2.6.0 stable deps in manifest) |
| **Script API** | Enabled when behavior pack with script module is applied |

## Still recommended

- **Fresh world** for infected-biome generation — mixed old/new chunks can show **seams** at borders (world gen issue, not experiments).
- Apply **both** behavior + resource packs (`BP/` + `RP/` release trees).
- **Min engine** in manifests: `[1, 26, 10]` — use **1.26.10+** or the version you ship against; **1.26.2** playtest was successful for biomes.

## If infected biomes do not appear

1. Confirm **both** packs are active and world was created **after** packs were added (or travel to **new chunks**).
2. On very old Bedrock builds, try enabling **Custom Biomes** once as a fallback.
3. Check `BP/biomes/mb_infected_biome_*.json` are present in the exported `.mcpack`.

## Host tools

Release pack: journal **Host tools** for `mb_cheats` / Litbolt123 only — not full Developer Tools. See [`AGENTS.md`](../../AGENTS.md).

## Lag / tick stalls

If the world **freezes** briefly (sounds continue, blocks stop, hits catch up), see [`PERFORMANCE_DEBUG.md`](PERFORMANCE_DEBUG.md) — especially **day 0–1** near villages and new chunks.
