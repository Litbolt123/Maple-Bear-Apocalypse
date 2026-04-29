# Phase 3 implementation — infection director (spec)

**Status:** implemented in `BP/scripts/` + `BP - Dev/scripts/` (2026-04-29).

**Slice:** [INFECTION_MOD_GAME_PLAN_2026-04-29.md](INFECTION_MOD_GAME_PLAN_2026-04-29.md) **Phase 3 — Director + escalation polish** (audit Archetype B). Few **named** tiers with **different behaviors**: spawn **attempt budget** rises at higher tiers, not only spawn chance.

## Named tiers (day bands)

| Tier id | Days (inclusive) | Gameplay (defaults in `mb_balance.js`) |
|--------|-------------------|----------------------------------------|
| `scout` | 1–7 | Baseline: chance ×1, +0 extra spawn attempts |
| `pressure` | 8–14 | Chance ×1.02, +0 attempts |
| `surge` | 15–19 | Chance ×1.045, **+1** attempt per eligible spawn config pass |
| `stormfront` | 20+ | Chance ×1.07, **+2** attempts |

## Spawn-load escalation

- Reads **`load01`** from **`getSpawnLoadDebugSnapshot()`** (`mb_spawnLoadMetrics.js`).
- If **`load01 ≥ INFECTION_DIRECTOR_LOAD_ESCALATE`** (default **0.52**), director **stage index** bumps by **+1** (capped at stormfront).
- Affects **spawn math** every evaluation; does **not** trigger HUD toasts alone (avoids oscillation spam).

## HUD toasts

- **`initializeInfectionDirectorWatch()`** in **`main.js`** — short action-bar toast when the **day-band** tier changes (not load-only bumps). Scout tier stays silent.
- Cooldown between toasts (~**5200** ticks).

## Files

| File | Role |
|------|------|
| `mb_balance.js` | `INFECTION_DIRECTOR_*` constants |
| `mb_infectionDirector.js` | `getInfectionDirectorSpawnModifiers`, `getInfectionDirectorBaseStageFromDay`, watch |
| `mb_spawnController.js` | Applies `chanceMult` and `attemptBonus` |
| `main.js` | Starts director watch after spawn-load scaler |

## Verification

- `npm run check`.
- Script self-test lists director line after spawn load snapshot.
- Cross day boundaries 7→8, 14→15, 19→20: expect tier toasts (with cooldown) and Content Log spawn debug when enabled (`director (…) spawn chance`).
