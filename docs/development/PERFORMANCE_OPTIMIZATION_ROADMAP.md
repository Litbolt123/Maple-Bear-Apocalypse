# Script systems performance roadmap

**Symptom playbook:** [PERFORMANCE_DEBUG.md](PERFORMANCE_DEBUG.md) (tick stalls, A/B tests, dev toggles).  
**This doc:** which scripts cost the most, what we already optimized, and phased next steps.

---

## Inventory vs item finder

| Module | When it runs | Cost |
|--------|----------------|------|
| [`mb_itemFinder.js`](../../BP - Dev/scripts/mb_itemFinder.js) | Item use / cures only | O(slots) per call — not a hot loop |
| `main.js` inventory discovery | Periodic (was every 40t inside infection loop) | Full container scan × multiple item types × players |
| [`mb_spawnLoadMetrics.js`](../../BP - Dev/scripts/mb_spawnLoadMetrics.js) | 120t overworld | `getEntities` for `minecraft:item` near players |

---

## Chunk / spawn scanning

There is no separate “chunk finder” script. Chunk work lives in [`mb_spawnController.js`](../../BP - Dev/scripts/mb_spawnController.js):

- `isChunkLoaded` + `chunkLoadingCache`
- Barren-chunk and dusted-dirt spatial maps
- Progressive block scans + main spawn loop (**off until day 2**)
- **10t** `processEmulsifierZones` when machines exist

---

## Script tier list (priority)

| Tier | Module | Main cost drivers |
|------|--------|-------------------|
| **1** | `main.js` | Infection 40t; ground 8t/4t + block cache; inventory/biome discovery (split intervals) |
| **1** | `mb_spawnController.js` | Day 2+ spawn loop; `getBlock` budgets; chunk queue cap; emulsifier 10t |
| **1** | `mb_spawnLoadMetrics.js` | 40t bears; 120t items (player anchors) |
| **2** | `mb_miningAI.js`, `mb_buffAI.js`, `mb_flyingAI.js`, `mb_infectedAI.js`, `mb_torpedoAI.js`, `mb_snowStorm.js` | Per-entity AI intervals |
| **3** | `mb_bearSnapshot.js`, `mb_sharedCache.js`, `mb_blockCache.js`, `mb_dimensionAdaptation.js`, `mb_biomeAmbience.js`, `mb_performanceProfile.js` | Shared caches + adaptive multipliers |
| **4** | `mb_itemFinder.js`, `mb_mainMobConversion.js`, `mb_codex.js` (UI) | Event-driven or forms |

---

## Already in place

- [`mb_workSpread.js`](../../BP - Dev/scripts/mb_workSpread.js) — day 0–1 **8×** spacing; 3×3 **32-block** entity sections; **soft spread** (2×) for metrics when day ≥ 2 and load high
- Spawn off before day 2; bear counts via snapshot; spawn-load scaling
- `getBiomeIdAt` chunk fallback cooldown in `main.js`
- Release CI: `verify:build-config`, BP+RP-only GitHub assets

---

## `main.js` interval map

| Period | Work |
|--------|------|
| 40t | Infection timers + effects (dedicated interval) |
| 120t | Inventory codex discovery (gated; skips when all flags set) |
| 40t | Biome discovery (cooldown per player; spread on day 0–1) |
| 8t / 4t | Ground exposure slow/fast (`claimSpreadSlice`) |
| 20t | Infection HUD refresh |
| 600t | Dusted dirt cleanup (gated) |

Spawn controller main loop: **22–280t** effective (base ~60t) after load multipliers.

---

## Phased implementation status

| Phase | Focus | Status |
|-------|--------|--------|
| **A** | This doc + links | Done |
| **B** | `main.js` — split infection / inventory / biome intervals | Done in `BP - Dev` + `BP` |
| **C** | Spawn — chunk queue cap, tile block cache, emulsifier fast exit | Done in `BP - Dev` + `BP` |
| **D** | Metrics + AI interval thrift alignment | Done in `BP - Dev` + `BP` |
| **E** | Soft work-spread past day 1 (metrics) | Done in `mb_workSpread.js` |

---

## How to measure

1. Repro: day 0–1 village approach; day 5+ with spawn on.
2. Dev toggles: spawn off, biome ambience off, no emulsifier — see PERFORMANCE_DEBUG.
3. `npm run check` before merge; in-game Script self-test (dev pack).
4. Optional: enable perf debug counters in spawn controller / work spread (content log).

---

## Village / chunk-edge pass (2026-05-20)

Solo village entry lag (pack on vs off) drove a targeted slice:

| Area | Behavior |
|------|----------|
| **`mb_workSpread.js`** | `tickPlayerChunkEdgeWatch` — **6s** defer after crossing a **16×16** chunk; days **2–3** use **4×** entity spread |
| **`mb_spawnController.js`** | Solo **queues** new 128-block region scans (was MP-only); **quadrant** progressive discovery on first solo visit; **1** scan + **1** enqueue/tick; lower block budget until area ages |
| **`main.js` / ambience / cache / metrics** | Honor `shouldDeferVillageBurst` — no burst polls right after chunk load |

Design intent: **more over time, less in one tick** while staying in an area.

**Spawn feel compensation (same pass):** Slower full scans are paired with faster **near-player** tile probes (16-block ring, reserved block budget), **player-chunk-first** queue priority + sooner schedule for the 128-block region you stand in, progressive discovery starting in the **quadrant under the player**, and higher early **spawn attempts/chance** when scans are queued (`THROTTLED_SCAN_SPAWN_*` + tile-density boost). Goal: same Maple Bear pressure near the player; distant chunk fill-in stays gradual.

---

## Maintainer workflow

1. Change **`BP - Dev/scripts/`** first.
2. `npm run verify:build-config` && `npm run check`.
3. Mirror logic to **`BP/scripts/`** (never copy dev `mb_buildConfig.js` over release).
4. Note changes in [`docs/context summary.md`](../context%20summary.md).

**Future automation (no SDK in repo):** see [CURSOR_SDK.md](CURSOR_SDK.md).
