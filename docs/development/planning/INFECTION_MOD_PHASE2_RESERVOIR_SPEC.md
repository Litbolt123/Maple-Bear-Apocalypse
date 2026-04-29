# Phase 2 implementation — storm-center reservoir (spec)

**Status:** implemented in `BP/scripts/` + `BP - Dev/scripts/` (2026-04-29).

**Slice:** [INFECTION_MOD_GAME_PLAN_2026-04-29.md](INFECTION_MOD_GAME_PLAN_2026-04-29.md) **Phase 2 — Reservoir prototype** (audit Archetype A). **Anchors** are **active dust storm centers** (existing `storms[]` in `mb_snowStorm.js`), not new blocks or entities.

## Behavior

- **`getStormReservoirSpawnChanceMult(dimension, x, z)`** — Overworld only; if `(x,z)` lies inside any enabled storm’s current horizontal radius (same math as `isPositionInStormRadius`), computes a **0–1 influence**: full strength inside an inner disk (**35%** of radius by default), linear falloff from inner edge to storm edge.
- Natural Maple Bear spawn **chance** multiplier: **`1 + STORM_RESERVOIR_SPAWN_CHANCE_MAX_BUMP × influence`** (default **+8%** max at storm eye). Applied in **`mb_spawnController.js`** after Phase 1 storm-touch multiplier (multiplicative).
- **Caps / spacing:** Storm count and placement remain whatever **`mb_snowStorm.js`** already enforces (overlap/intersection logic, storm lifetime). Reservoir pressure **vanishes** when a storm ends — no separate “purify block” yet.

## Budget (queries/tick)

- **None added for maintenance.** The multiplier runs **only inside the existing natural spawn path** for each player attempt (already iterating spawn logic). Cost per call: **O(n)** over **`storms.length`** (typically small), no block queries.

## Files

| Area | File |
|------|------|
| Tunables | `mb_balance.js` — `STORM_RESERVOIR_SPAWN_CHANCE_MAX_BUMP`, `STORM_RESERVOIR_INNER_RADIUS_FRACTION` |
| Logic | `mb_snowStorm.js` — `getStormReservoirSpawnChanceMult` |
| Application | `mb_spawnController.js` — multiply `chanceMultiplier`; optional spawn debug line when factor > 1.005 |

## Verification

- `npm run check` on touched trees.
- Dev: storms + sim players; spawn debug category shows **`storm-reservoir`** lines when standing near a storm center.
