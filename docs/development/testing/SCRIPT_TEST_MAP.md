# Script test map (automated vs in-game)

**What each script is for (overview):** [`../SCRIPTS_REFERENCE.md`](../SCRIPTS_REFERENCE.md).

Behavior pack scripts cannot run under Node.js end-to-end (`@minecraft/server` exists only in the game). Use **automated checks on your PC** before playtesting, then **manual** verification in Minecraft.

## Automated (run on your machine)

| Command | What it proves |
|--------|----------------|
| `npm run validate:json` | All JSON in `BP/`, `BP - Dev/`, `RP/`, `RP - Dev/` parses |
| `npm run test:scripts` or `npm run validate:syntax` | Every `*.js` under `BP/scripts/` and `BP - Dev/scripts/` passes **`node --check`** (syntax / parse only) |
| `npm run test:scripts:release` | Same, **release pack only** (`BP/scripts/`) |
| `npm run lint` | ESLint on `BP/scripts/`, `BP - Dev/scripts/`, `tools/` |
| `npm run check` | JSON + syntax + lint (full gate before commit) |

**Windows:** `validate:syntax` uses `tools/testAllScripts.js` (no bash `for` loop), so it works in PowerShell.

## In-game (dev pack only)

| Where | What it does |
|-------|----------------|
| **Journal → Developer Tools → Systems → Script self-test (in-game)** | Runs **`mb_devScriptSelfTest.js`**: day, infection rate, addon difficulty, spawn-load snapshot, storm count, which script toggles are off, `SPAWN_CONFIGS` / cap counts, dimensions, block below feet, player count; then **`import()`** on every **`mb_*.js`** in the pack (38 files; `main.js` is entry only). Failures list per-file errors. Full plain text is also **`console.warn`**’d (Content Log). **Pin:** “Script self-test (in-game)” on the main menu. |

This does **not** execute every script file; it samples APIs the addon already uses. Use **`npm run check`** on your PC for full static validation.

---

## Per-file: what to exercise in-game

Use this when you change a file or before a release. **Entry:** `main.js` loads the rest via imports/side effects.

| Script | Role | Quick manual test |
|--------|------|-------------------|
| `main.js` | Entry, subscriptions, infection, items, deaths | New world loads; kill mob near bear → conversion; storm kill; eat snow/cures |
| `mb_buildConfig.js` | Dev vs release flags | Release: no dev journal; Dev: full tools |
| `mb_codex.js` | Journal, codex, dev menus | Open journal, search, mark discovery, dev debug menu (dev pack) |
| `mb_dayTracker.js` | Day, milestones, action bar | Day advances; milestone messages; merged HUD text |
| `mb_dynamicPropertyHandler.js` | Properties save/load | Reload world: day, infection, codex persist |
| `mb_propertyMigration.js` | Migrations on load | Upgrade old world; no property errors in log |
| `mb_scriptToggles.js` | Feature toggles | Toggle in dev tools; behavior matches |
| `mb_balance.js` | Caps, infection rate, conversion constants | Spawn density feels right; conversion rates at low/high day |
| `mb_spawnEntityIds.js` | ID strings | Spawns/conversions use correct entities (no wrong variant) |
| `mb_spawnConfigs.js` | Natural spawn tables | Per-type spawn rates by day (spawn controller) |
| `mb_spawnController.js` | Spawning, tiles, emulsifier | Bears spawn; dev spawn overrides; emulsifier zones |
| `mb_spawnLoadMetrics.js` | Load metrics for spawn | HUD / journal shows bear/load info when enabled |
| `mb_spawnMobilityCamp.js` | Cluster / mobility camp | Multiplayer spawn pressure behaves |
| `mb_mainMobConversion.js` | Bear kill + storm conversion | Pig/cow → infected; mob → bear by day/size; storm deaths |
| `mb_snowStorm.js` | Storms, exposure | Storm damage; `wasKilledByStorm` conversion path |
| `mb_infectionAudio.js` | Cough, breath, cure sounds | Proximity audio; tiers from codex |
| `mb_infectionExposureLos.js` | LOS for exposure | Infection cues respect line of sight |
| `mb_actionBarHud.js` | HUD segments, toasts | Infection + spawn HUD merge; toasts |
| `mb_biomeAmbience.js` | Biome ambience | Infected biome ambience |
| `mb_dimensionAdaptation.js` | Dimension rules | Nether/End behavior if enabled |
| `mb_blockLists.js` | Block sets | Storm / snow replace lists match gameplay |
| `mb_chatColors.js` | Message prefixes | Chat messages colored as expected |
| `mb_itemRegistry.js` | Item use handlers | Potions, snow, apples, carrots |
| `mb_itemFinder.js` | Inventory search | Cure / item flows that search inventory |
| `mb_infectedAI.js` | Infected bears | Aggro, targeting |
| `mb_flyingAI.js` | Flying bears | Air behavior, anger |
| `mb_buffAI.js` | Buff bears | Stuck fuse, explosion; day 8→13 transform on death |
| `mb_miningAI.js` | Mining bears | Mining path, blocks |
| `mb_miningBlockList.js` | Mining block list | Mining bear breaks allowed blocks |
| `mb_miningConstants.js` | Mining constants | Dimension/mining types consistent |
| `mb_torpedoAI.js` | Torpedo bears | Dive / break behavior |
| `mb_performanceProfile.js` | Perf scaling | No runaway under load |
| `mb_sharedCache.js` | Shared caches | No stale cache bugs |
| `mb_utilities.js` | Shared helpers | Consumers behave |
| `mb_devSoundCatalog.js` | Dev sound list | Dev catalog UI if used |
| `mb_playerChangelog.js` | Player-facing changelog | What’s new / changelog |
| `mb_journalWhatsNew.js` | Journal “what’s new” | Section opens |
| `mb_bearTelemetry.js` | Bear telemetry log | Spawn → Bear telemetry logs counts |
| `mb_devScriptSelfTest.js` | Dev Tools self-test panel | Developer Tools → Systems → **Script self-test** |

**Duplicates:** `BP - Dev/scripts/` mirrors `BP/scripts/`; run the same in-game checks when using the dev pack.

---

## Deeper scenarios

- **`TESTING_CHECKLIST.md`** — Historical checklist (properties, intro, items, snow).
- **`TEST_SCENARIOS.md`** — Scenario-style flows.
- **`BETA_SMOKE_CHECKLIST.md`** — Beta smoke pass.

---

## What automation cannot do

- **Script API behavior** (entities, dimensions, blocks) must be verified **inside Bedrock**.
- **Lint warnings** about unused variables are normal for this repo; focus on **errors** and **`npm run check`** exit code.
