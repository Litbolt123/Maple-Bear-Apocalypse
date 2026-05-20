# Player-facing changelog

Short bullets for patch notes and in-game **What's new** (`BP/scripts/mb_playerChangelog.js`).  
Bump **`PLAYER_CHANGELOG_VERSION`** in `mb_playerChangelog.js` when you ship a new beta.

## v0.9.0-beta.4

- Performance: day 0–1 and approaching villages should hitch less — heavy work is spread across ticks and uses smaller entity scans near players.
- Buff bears: death powder explosion is back; kills convert by victim size (tiny / normal / large), not always the smallest bear.
- Balance: buff bear count is capped on **all** spawn paths (including storms and conversions); extra conversions become infected bears for the current day.
- Storms: fixed double conversion when a bear killed the mob; storm waves no longer flood buff bears past the cap.

## v0.9.0-beta.3

- Storms: when no overworld player is within horizontal range of a storm center, that storm does less particles/snow/drift work (far storms still expire normally). Mob damage and major destruct remain gated by nearby players as before.
- Bear population cull: lower global trigger toward a smaller target; eligible types default to tiny + infected family (buff/flying/mining/torpedo unchanged). Dev pack: journal tuning for thresholds and per-type eligibility overrides.
- Mining bears: pathfinding cleanup uses direct entity lookup instead of scanning dimensions by type.
- Codex: storm hub copy clarifies concurrent Maple Bear storms vs the engine’s storm cap.

## v0.9.0-beta.2

- Infection evolution (Phases 1–3): storm exposure and proximity to active storms influence natural Maple Bear spawn pressure; day bands and world load feed a staged “director” that adjusts spawn attempts on top of chance; HUD may toast when day phases advance.
- Journal / codex: **Biomes → Infection Storm** — schedule by addon difficulty (Hard day 2 / Normal 4 / Easy 6 first eligible day); minors dominate through day 10, majors from day 11, only majors after day 20; shelter, emulsifier reclaim, and pressure notes as before.
- Performance: existing spawn-load scaling and adaptive perf continue to apply alongside the new systems—use **Journal → Performance** if the world feels heavy.

## v0.9.0-beta.1

- Spawn balance: infected and flying bear caps adjusted; natural buff spawns respect a world cooldown between spawn-controller buffs (conversions unchanged).
- Journal: new **What's new** entry on the Powdery Journal main menu.
- Internal: balance numbers centralized in `mb_balance.js` for easier tuning.
