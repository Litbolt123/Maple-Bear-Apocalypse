# Phase 4 — infection evolution ship checklist (spec)

**Status:** documented + player-facing copy shipped (2026-04-29).

**Slice:** [INFECTION_MOD_GAME_PLAN_2026-04-29.md](INFECTION_MOD_GAME_PLAN_2026-04-29.md) **Phase 4 — Ship checklist** after Phases 1–3.

## Codex / journal (onboarding + counterplay)

- **Powdery Journal → Biomes:** **Infection Storm** entry (once `stormSeen`) now ends with:
  - **Pressure over time** — later weeks vs early survival; proximity to storms/centers; exposure stacking.
  - **Shelter & reclaim** — solid cover slows infection buildup in storms; **emulsifier** detox bubble blocks **natural** Maple Bear spawns inside its field (reclaim ground).
- No new unlock flags—uses existing storm discovery.

## Balance pass (references)

Tuning lives in:


| Area                                    | Primary files                                       |
| --------------------------------------- | --------------------------------------------------- |
| Storm-touch / reservoir / director caps | `mb_balance.js` (`STORM_*`, `INFECTION_DIRECTOR_*`) |
| Per-entity spawn curves                 | `mb_spawnConfigs.js`                                |
| Infection timers / exposure             | `main.js`, `mb_snowStorm.js`, `mb_dayTracker.js`    |


Phase 4 does **not** mandate numeric changes—validate in playtests and adjust constants above.

## Performance

- **Spawn load:** `mb_spawnLoadMetrics.js` + **Journal → Performance** (spawn interval / block budget / scan cooldown; optional thrift bias).
- **Adaptive perf:** `mb_performanceProfile.js` (storm/mining work when Auto + not “LAGGY”).
- **Bear cull:** `mb_bearPopulationCull.js` soft cap when global totals run away.

Director + reservoir logic stays **O(storms)** per spawn evaluation—no new global scans.

## Release notes

- `**docs/PLAYER_CHANGELOG.md`** — **v0.9.0-beta.2** entry for infection evolution + journal + perf pointer.
- `**mb_playerChangelog.js`** — `**PLAYER_CHANGELOG_VERSION**` bumped to `**0.9.0-beta.2**`; **What's new** body updated for in-game journal.

## Verification

- `npm run check`.
- In-game: open Biomes after seeing a storm — new paragraphs readable and accurate.
- Journal **What's new** shows beta.2 bullets once pack syncs.