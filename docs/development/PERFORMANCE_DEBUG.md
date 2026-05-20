# Performance debug — tick stalls (MSPT)

Symptoms like **entities still making sound, blocks frozen, hits catching up after** are usually **server tick stalls**, not client FPS. Addon scripts share the main simulation thread.

## Day 0–1 note

**Work spread (`mb_workSpread.js`):** On day 0–1, most periodic systems run at **8×** nominal spacing (one player / one dimension / one anchor per slice). Entity queries use a **3×3 grid of 32-block cells** around each player instead of one large radius per tick (mob cache, bear snapshot, conversion counts). Mob cache builds over multiple ticks; `findClosestBiome` is off; world init is staggered. Re-test villages after pack reload.

The spawn controller **main loop does not run** when `getCurrentDay() < 2` (no dusted-dirt chunk tile scans from that loop). Early-day spikes are more often:

- Vanilla chunk load + village entity AI
- Custom **infected biome** borders
- **`findClosestBiome`** fallback in [`main.js`](../../BP/scripts/main.js) (`getBiomeIdAt`)
- **Spawn load metrics** (`getEntities` sweeps + overworld item count) — throttled on day 0–1 in script
- **Biome ambience** (`getBiome` every 1–3s per player)
- **Emulsifier** block scans if any machine is active

## A/B test (do this first)

1. Same world, seed, day 0–1, two players walking into **new chunks** near a village.
2. Run **with** addon packs, then **without** (remove behavior + resource packs only).
3. If vanilla-only is smooth → focus addon toggles below. If both lag → note world gen / hardware; script fixes help marginally.

## Confirm the right pack

| In-world behavior pack name | Folder |
|----------------------------|--------|
| **The Maple Bear Apocalypse (Dev)** | `BP - Dev` |
| **The Maple Bear Apocalypse** (no Dev) | `BP` release |

Bridge template: `npm run bridge:config:dev` or `bridge:config:release` — see [`config/README.md`](../../config/README.md).

## In-game toggles (dev pack, Content Log)

Journal → **Developer Tools** → **Debug** / script toggles:

| Toggle | Effect |
|--------|--------|
| Spawn controller off | Little change on day 0–1 (main spawn loop already off) |
| Biome ambience off | Stops periodic `getBiome` + ambient restarts |
| Spawn scan perf HUD off | Stops extra 10t HUD work (metrics still refresh on 40t watch) |
| No emulsifier machines nearby | Avoids 10t `processEmulsifierZones` block budgets |

**LAGGY** / performance tier — note if stalls align with high adaptive stress (`mb_performanceProfile.js`).

## What to report

- Day number, 1p vs 2p, dev vs release pack title
- Near **infected biome** or village only?
- **First visit** to chunk vs every revisit
- Any **emulsifier** running?
- Vanilla A/B result

## Maintainer hotspots

| File | Work |
|------|------|
| `mb_spawnLoadMetrics.js` | Bear/item entity queries; day &lt; 2 light path |
| `main.js` | `getBiomeIdAt`, infection interval, biome discovery 40t |
| `mb_spawnController.js` | Chunk scan queue (day 2+), progressive block scan resume, MP group one-player-per-tick, emulsifier 10t |
| `mb_dimensionAdaptation.js` | Uses `mb_bearSnapshot` (not unfiltered `getEntities`) |
| `mb_sharedCache.js` | Mob cache: scoped per player (128), excludes item/xp_orb; not whole dimension |
| `mb_spawnController.js` | Spawn bear counts via `getBearSnapshot` (not all entities in radius — villages) |
| `mb_bearSnapshot.js` | Empty snapshot TTL 40t (not 4t) when no bears loaded |
| `mb_spawnLoadMetrics.js` | Item count sampled near players (96), not whole overworld |
| `mb_biomeAmbience.js` | In-biome checks |

After changes: `npm run check` on PC; in-game **Script self-test** (dev) is supplementary.
