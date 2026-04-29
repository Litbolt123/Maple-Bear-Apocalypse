# Player-facing changelog

Short bullets for patch notes and in-game **What's new** (`BP/scripts/mb_playerChangelog.js`).  
Bump **`PLAYER_CHANGELOG_VERSION`** in `mb_playerChangelog.js` when you ship a new beta.

## v0.9.0-beta.2

- Infection evolution (Phases 1–3): storm exposure and proximity to active storms influence natural Maple Bear spawn pressure; day bands and world load feed a staged “director” that adjusts spawn attempts on top of chance; HUD may toast when day phases advance.
- Journal / codex: **Biomes → Infection Storm** — schedule by addon difficulty (Hard day 2 / Normal 4 / Easy 6 first eligible day); minors dominate through day 10, majors from day 11, only majors after day 20; shelter, emulsifier reclaim, and pressure notes as before.
- Performance: existing spawn-load scaling and adaptive perf continue to apply alongside the new systems—use **Journal → Performance** if the world feels heavy.

## v0.9.0-beta.1

- Spawn balance: infected and flying bear caps adjusted; natural buff spawns respect a world cooldown between spawn-controller buffs (conversions unchanged).
- Journal: new **What's new** entry on the Powdery Journal main menu.
- Internal: balance numbers centralized in `mb_balance.js` for easier tuning.
