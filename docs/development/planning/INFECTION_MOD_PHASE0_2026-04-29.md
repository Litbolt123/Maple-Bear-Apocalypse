# Infection evolution — Phase 0 (alignment)

**Status:** complete (docs only, 2026-04-29)  
**Parent:** [INFECTION_MOD_GAME_PLAN_2026-04-29.md](INFECTION_MOD_GAME_PLAN_2026-04-29.md)  
**Vocabulary:** [INFECTION_MOD_CONCEPT_AUDIT_2026-04-28.md](INFECTION_MOD_CONCEPT_AUDIT_2026-04-28.md)

This file is the **canonical** Phase 0 output: pitch, provisional design gates, engine touchpoints, and a reminder of Phase 1 options. Update it when gates change; keep the concept audit as stable terminology.

---

## 1. Player-facing pitch (internal alignment)

In a typical session, players already feel Maple Bear as **weather-borne pressure**: snow storms, dust, and day progression that ramps what spawns and how hard the world pushes back. The evolution we want is not a second infection system—it is a **clearer, more legible** version of that loop: the sky and the ground work together, and your **personal** infection (minor/major, powder load, timer) stays tied to **where you stand** and **what the storm is doing**. Day tiers keep long-term escalation predictable; shelter, emulsifier-style safe zones, and cures stay the main **counterplay**, not a hidden tech tree. New depth should read as: *“When I’m marked by the storm or the dust, the world coordinates against me; when I prepare shelter or detox, I earn relief.”* We add **signal** (why things got worse) and **fair tools** to answer it—without turning Bedrock into a mod that replays the whole world every tick.

---

## 2. Design gates (provisional — Phase 0)

These are **default stances** for the next design pass; Phase 1 may pick one slice and leave others “as today.”

| Gate | Provisional choice (Phase 0) | Notes |
|------|------------------------------|--------|
| **Reservoir** | **Storm-biased + existing world systems** | Primary “where pressure lives” remains **active storms** and **day/spawn state** (see `mb_snowStorm.js`, spawn controller, `getInfectionRate` / day in balance). **No new anchor entities in Phase 1** unless we explicitly open Phase 2 (localized nodes with caps). |
| **Coordination signal** | **Storm-touch window (Phase 1):** spawn chance nudges up as `stormSeconds` ramps (see [INFECTION_MOD_PHASE1_STORM_TOUCH_SPEC.md](INFECTION_MOD_PHASE1_STORM_TOUCH_SPEC.md)) | Reuses **storm exposure** only; no separate “mark” property. |
| **Director** | **Keep current proto-director; add legibility first** | Day table, spawn load auto-scaling, and adaptive perf already **steer** pressure. Next step is **explaining** shifts (optional journal/codex line) or **one** new behavioral switch—only after Phase 1 direction is chosen. |
| **Counterplay** | **Shelter + emulsifier + existing cures** | **Short-term:** clearer codex/journal/HUD for storm shelter and no-spawn / emulsifier zones. **No** new “reclaim the world” minigame until reservoir design is agreed for Phase 2+. |

**Exit (Phase 0):** Signature = **weather + personal infection + day tiers**; counterplay = **shelter / emulsifier (no-spawn) / apple & weakness cure loops** (as documented in [INFECTION_SYSTEM.md](../systems/INFECTION_SYSTEM.md)).

---

## 3. Engine touchpoints (file-anchored)

Use this list to start a Phase 1 task without a full repo search.

| Area | What to know | Primary paths / docs |
|------|----------------|----------------------|
| **Player infection state** | `playerInfection` map, minor/major, `ticksLeft`, `snowCount`, transformation | [main.js](BP/scripts/main.js) (infection apply/tick/expire); [INFECTION_SYSTEM.md](../systems/INFECTION_SYSTEM.md) |
| **Exposure meters** | Ground, ambient, biome, **storm** seconds; cough/dust spread to others | `groundExposureState` / `getGroundExposureState` in [main.js](BP/scripts/main.js); ground fast/slow/decay intervals |
| **Storms** | Active storm, placement, player-in-storm | [mb_snowStorm.js](BP/scripts/mb_snowStorm.js); [SNOW_STORM_DESIGN.md](../systems/SNOW_STORM_DESIGN.md) |
| **Spawn / tiles / pressure** | Per-player processing, tiles, merge with sim stress (dev) | [mb_spawnController.js](BP/scripts/mb_spawnController.js); [SPAWN_SYSTEM_EXPLANATION.md](../systems/SPAWN_SYSTEM_EXPLANATION.md) |
| **Balance & infection rate** | Day-based tables, caps, conversion pressure | [mb_balance.js](BP/scripts/mb_balance.js); [mb_spawnConfigs.js](BP/scripts/mb_spawnConfigs.js) |
| **No-spawn / emulsifier** | Zones that block natural MB spawns | APIs in [mb_spawnController.js](BP/scripts/mb_spawnController.js) (e.g. `isInsideEmulsifierNoSpawnZone`); wiring from [main.js](BP/scripts/main.js); [ADDON_SYSTEMS_AND_FEATURES.md](../ADDON_SYSTEMS_AND_FEATURES.md) |
| **Biome / ambience** | Infected biome, dusted dirt proxy | [mb_biomeAmbience.js](BP/scripts/mb_biomeAmbience.js); biome loop in [main.js](BP/scripts/main.js) |
| **AI that cares about players** | Cached players (real + sims when enabled) | [mb_sharedCache.js](BP/scripts/mb_sharedCache.js), [mb_simPlayers.js](BP/scripts/mb_simPlayers.js) (dev stress) |
| **Spawn load & perf** | Auto scaling, spawn HUD | [mb_spawnLoadMetrics.js](BP/scripts/mb_spawnLoadMetrics.js), [mb_performanceProfile.js](BP/scripts/mb_performanceProfile.js) |
| **Codex / journal** | Unlocks, dev tools, player messaging | [mb_codex.js](BP/scripts/mb_codex.js); [CODEX_UNLOCKS.md](../systems/CODEX_UNLOCKS.md) |
| **World / save plumbing** | Properties, chunks | [mb_dynamicPropertyHandler.js](BP/scripts/mb_dynamicPropertyHandler.js) |

---

## 4. Phase 1 options (reminder)

Pick **one** slice for the first gameplay change (see full detail in the [game plan](INFECTION_MOD_GAME_PLAN_2026-04-29.md#phase-1--smallest-playable-slice-feel-test)):

| Option | One-line cost / risk |
|--------|----------------------|
| **1 — Marked / dusted coordination** | Reuses exposure + storm hooks; **medium** code (AI aggro and/or spawn pressure, radius caps, tests with sim players). |
| **2 — Director legibility** | Mostly spawn/storms + optional debug/codex strings; **lower** risk if behavior change is small and gated. |
| **3 — Counterplay clarity** | **Low** code risk: copy, journal, HUD; **high** player value if confusion is the main problem. |

After Phase 0, re-run the product choice: which option ships first.

---

## 5. Verification (Phase 0)

- [x] Pitch names **one** signature (weather + personal infection + day) and **one** counterplay path (shelter / emulsifier / cures).
- [x] Touchpoint list is sufficient to scope Phase 1 without blind search.
- [x] No `BP/scripts` edits required for Phase 0 itself.
