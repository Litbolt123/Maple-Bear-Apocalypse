# Behavior pack scripts reference (`BP/scripts/`)

**← [docs/README.md](../README.md)** (full documentation index)

One-line (or short) descriptions of each JavaScript module in the behavior pack. **`BP - Dev/scripts/`** mirrors these files for internal builds; **`mb_buildConfig.js`** differs (full developer tools on in dev).

**Related:** testing and commands → [`testing/SCRIPT_TEST_MAP.md`](testing/SCRIPT_TEST_MAP.md).

---

## Entry

| File | Purpose |
|------|---------|
| **`main.js`** | Game entry: world/player subscriptions, infection system, item use (registry), bear hits, deaths, dusted dirt, ambient pressure, many codex hooks. Imports and wires other modules; does not re-export everything. |

---

## Build & config

| File | Purpose |
|------|---------|
| **`mb_buildConfig.js`** | Loaded first from `main.js`. Version string, **`INCLUDE_FULL_DEVELOPER_TOOLS`** / **`INCLUDE_ADMIN_TOOLS`**, optional console silencing on release. |
| **`mb_balance.js`** | Central tuning: **`ENTITY_TYPE_CAPS`**, natural buff spawn cooldown, mob→bear **conversion pressure** constants, **`MB_CONVERSION_BUFF_NEAR_CAP`**, **`getInfectionRate(day)`**. |
| **`mb_scriptToggles.js`** | World properties for enabling/disabling major scripts (mining, infected/flying/torpedo/buff AI, biome ambience, infection audio, spawn controller, storms, dimension adaptation). Developer Tools UI reads/writes these. |

---

## Data, properties, migration

| File | Purpose |
|------|---------|
| **`mb_dynamicPropertyHandler.js`** | Cached read/write for player and world dynamic properties, periodic saves, chunked storage helpers. |
| **`mb_propertyMigration.js`** | **`runWorldPropertyMigrations()`** — schema version and one-shot key migrations after the property handler initializes. |

---

## Journal & UI (forms, codex, colors)

| File | Purpose |
|------|---------|
| **`mb_codex.js`** | Powdery Journal / codex: unlocks, sections, **`showCodexBook`**, settings, dev/admin menus, spawn/storm UIs, search, emulsifier UI hooks, debug flags, many exports used by `main.js` and spawn code. Very large. |
| **`mb_chatColors.js`** | Shared `CHAT_*` string prefixes for colored player messages. |
| **`mb_actionBarHud.js`** | Merged action-bar HUD segments (infection, spawn tuning hints, etc.) and short toasts. |

---

## World & progression

| File | Purpose |
|------|---------|
| **`mb_dayTracker.js`** | Day counter, milestones, scoreboard, daily events, **`getCurrentDay`**, action-bar day text (merged with other HUD), intro/day display helpers. |
| **`mb_playerChangelog.js`** | In-game “What's new” body; **`PLAYER_CHANGELOG_VERSION`** pairs with **`docs/PLAYER_CHANGELOG.md`** for beta notes. |
| **`mb_journalWhatsNew.js`** | “What’s new” journal section wiring. |

---

## Spawning & world simulation

| File | Purpose |
|------|---------|
| **`mb_spawnEntityIds.js`** | Canonical string IDs for bear tiers and infected pig/cow; **`MAPLE_BEAR_*`** aliases for `main.js`. |
| **`mb_spawnConfigs.js`** | **`SPAWN_CONFIGS`** (per-type natural spawn curves) and display names for dev toggles. |
| **`mb_spawnController.js`** | Main spawn system: tiles, scanning, caps, difficulty, emulsifier zones, spawn overrides, dev spawn UI hooks, dusted-dirt registration helpers, much of natural bear spawning. |
| **`mb_exposureSpawnPressure.js`** | Storm exposure (`stormSeconds`) → modest natural spawn **chance** multiplier; accessor registered from `main.js` (avoids circular import with spawn controller). |
| **`mb_infectionDirector.js`** | Phase 3 **director** tiers (day bands + spawn-load escalation): spawn **chance** + **attempt** modifiers; HUD toasts on day-band changes (`initializeInfectionDirectorWatch` from `main.js`). |
| **`mb_spawnLoadMetrics.js`** | Samples bear/mob/item/storm load; drives spawn-interval and block-budget scaling; **`getSpawnLoadDebugSnapshot`** for HUD and dev menus. |
| **`mb_spawnMobilityCamp.js`** | Player cluster / mobility camp ramp and storm-start scaling used by spawn and storms. |
| **`mb_snowStorm.js`** | Dust storms, exposure, storm placement/kill tracking, **`getActiveStormCount`**, **`getStormReservoirSpawnChanceMult`** (Phase 2 localized spawn pressure near storm centers), storm dev/admin hooks. |
| **`mb_performanceProfile.js`** | Wall-clock tick stress and weighted “expensive mob” pressure for adaptive storm/mining multipliers and spawn probes. |

---

## Combat, AI, and special bears

| File | Purpose |
|------|---------|
| **`mb_infectedAI.js`** | Infected bear targeting and anger propagation. |
| **`mb_flyingAI.js`** | Flying bear air behavior and anger helpers. |
| **`mb_buffAI.js`** | Buff bear movement, stuck detection, explosion/fuse, day-tier transforms. |
| **`mb_miningAI.js`** | Mining bear pathing, digging, block breaking (script-side), dimension rules. |
| **`mb_miningBlockList.js`** | List of breakable block types for mining bears (and tooling). |
| **`mb_miningConstants.js`** | Shared mining dimensions, bear type IDs, pathfinding families, air-block set. |
| **`mb_torpedoAI.js`** | Torpedo bear diving and burst block clearing. |

---

## Infection & environment

| File | Purpose |
|------|---------|
| **`mb_mainMobConversion.js`** | Mob→Maple Bear / infected livestock conversion (bear kills and storm deaths), pressure multipliers, **`getMobSize`**. |
| **`mb_infectionAudio.js`** | Cough, breath, hiccup, cure sigh — timing and codex-gated tiers. |
| **`mb_infectionExposureLos.js`** | Line-of-sight checks for infection exposure / cues. |
| **`mb_biomeAmbience.js`** | Ambient biome audio/logic for infected-related biomes. |
| **`mb_dimensionAdaptation.js`** | Nether (and related) adaptation rules when enabled. |
| **`mb_blockLists.js`** | Shared sets: snow replaceable, storm pass-through, plants, etc. |

---

## Items & inventory

| File | Purpose |
|------|---------|
| **`mb_itemRegistry.js`** | Registers `itemCompleteUse` handlers (potions, snow, golden food, etc.). |
| **`mb_itemFinder.js`** | Inventory search helpers for cure flows and similar. |

---

## Utilities & shared

| File | Purpose |
|------|---------|
| **`mb_utilities.js`** | Small shared helpers used across modules. |
| **`mb_sharedCache.js`** | Shared caching utilities. |

---

## Developer-only or tooling-facing

| File | Purpose |
|------|---------|
| **`mb_devScriptSelfTest.js`** | In-game diagnostics panel (Developer Tools → Systems → Script self-test): day, rates, spawn snapshot, toggles, dimensions, etc. |
| **`mb_devSoundCatalog.js`** | Sound ID catalog for the “Play sound” dev menu. |
| **`mb_bearTelemetry.js`** | Periodic bear counts by type to content log when enabled from spawn dev UI. |

---

## Maintenance notes

- **Import order:** `main.js` pulls `mb_buildConfig.js` first, then codex/day tracker, then side-effect imports for AI/spawn subsystems.
- **Size:** `main.js` and `mb_codex.js` are the largest files; many behaviors are intentionally centralized there until split further.
- **Runtime:** Scripts only execute inside **Minecraft Bedrock**; Node is used on a dev PC for syntax/lint only (`npm run check`).
