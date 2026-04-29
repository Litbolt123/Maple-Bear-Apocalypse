# Infection mod evolution — implementation game plan

**Date:** 2026-04-29  
**Built on:** [INFECTION_MOD_CONCEPT_AUDIT_2026-04-28.md](INFECTION_MOD_CONCEPT_AUDIT_2026-04-28.md) (concepts + archetypes).  
**Phase 0 (complete):** [INFECTION_MOD_PHASE0_2026-04-29.md](INFECTION_MOD_PHASE0_2026-04-29.md) — pitch, provisional gates, engine touchpoints.  
**Related:** [INFECTION_SYSTEM.md](../systems/INFECTION_SYSTEM.md), [ADDON_SYSTEMS_AND_FEATURES.md](../ADDON_SYSTEMS_AND_FEATURES.md), [SNOW_STORM_DESIGN.md](../systems/SNOW_STORM_DESIGN.md).

---

## Purpose

Turn the concept audit into **ordered decisions**, **phases**, and **verification criteria** so new “infection mod” style depth fits Maple Bear’s **weather-borne** identity, **Bedrock script budgets**, and **existing** day/spawn/perf/codex systems—without a one-shot giant rewrite.

**Non-goals for early phases:** global world conversion, heavy per-tick full-world scans, or parity with Java mod feature lists.

---

## Preconditions (met)

- Dev **simulated players** + spawn/infection stress paths exist for validating load (`mb_simPlayers.js`, spawn merges, etc.).
- Use those tools when prototyping anything that touches spawn loops, AI caches, or infection ticks.

---

## Design gates (decide before coding each pillar)

Answer these once per pillar so scope stays small:


| Gate                    | Question                                                | Options to pick from                                                                                                 |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Reservoir**           | Where does “extra” pressure live?                       | Storm-only bias · rare localized anchors · hybrid (anchors amplify storms nearby)                                    |
| **Coordination signal** | One clear rule players learn?                           | e.g. single **marked/dusted** state tied to storms/exposure (audit Archetype C)                                      |
| **Director**            | What changes **behavior** at thresholds—not only rates? | e.g. two modes: **scout pressure** vs **raid pressure** (audit Archetype B); journal-legible reason strings optional |
| **Counterplay**         | What surfaces already ship?                             | Shelter clarity · emulsifier/no-spawn zones · explicit “reclaim” UX in codex (audit Archetype D)                     |


**Recommended Maple Bear angle (from audit):** localized reservoirs + director thresholds + one coordination signal + infrastructure counterplay.

---

## Phase 0 — Alignment (documentation only)

**Done (2026-04-29).** Canonical content: **[INFECTION_MOD_PHASE0_2026-04-29.md](INFECTION_MOD_PHASE0_2026-04-29.md)** (player pitch, filled design gates, file-anchored touchpoints, Phase 1 option reminder).

- Exit achieved: signature + counterplay named; touchpoints listed for Phase 1 scoping. Next: choose one Phase 1 slice (coordination / director / counterplay).

---

## Phase 1 — Smallest playable slice (“feel” test)

**Shipped design (2026-04-29):** **Storm-touch spawn coordination** — while a player’s **storm exposure** (`stormSeconds` in `groundExposureState`) ramps toward major-from-storm thresholds, natural Maple Bear spawn **chance** gets a **modest** extra multiplier (capped +15%), applied in `mb_spawnController.js` via bridge module `mb_exposureSpawnPressure.js`. Full patch steps: [INFECTION_MOD_PHASE1_STORM_TOUCH_SPEC.md](INFECTION_MOD_PHASE1_STORM_TOUCH_SPEC.md).

**Objective:** Players notice **one new rule** that ties storms + infection identity together, without new entities if possible.

**Candidate directions** (pick **one** for the slice):

1. **Marked / dusted coordination light:** short windows where exposed or storm-touched players/infected sync aggro or spawn pressure (reuse existing exposure/storm hooks; radius caps).
2. **Director legibility:** one new staged behavior unlocked by existing day/storm/spawn state (e.g. alternate spawn emphasis), logged only in dev or codex debug first.
3. **Counterplay clarity:** codex/journal copy + HUD cue tightening for shelter/emulsifier loops (no new mechanics—reduces “nothing works” confusion).

**Verification:**

- `npm run check` clean on touched scripts.
- Sim players / multi-merge spawn paths: no regression spikes vs baseline (subjective + Content Log).
- Manual: 15–30 min survival session; confirm pillar is **readable** and **fun**, not just heavier numbers.

---

## Phase 2 — Reservoir prototype (shipped 2026-04-29)

**Storm-center reservoirs:** Active dust storm centers act as localized anchors (audit Archetype A). Natural Maple Bear spawn **chance** gains up to **+8%** (tunable in `mb_balance.js`) when the spawn evaluation position is near a storm eye, falling off to the storm radius edge. `**getStormReservoirSpawnChanceMult`** in `mb_snowStorm.js`; applied in `**mb_spawnController.js**`. Caps/spacing reuse existing storm count/overlap rules; no separate anchor entities. Spec: [INFECTION_MOD_PHASE2_RESERVOIR_SPEC.md](INFECTION_MOD_PHASE2_RESERVOIR_SPEC.md).

**Verification:** `npm run check`; dev stress with sim players + storms (spawn HUD / perf toggles).

---

## Phase 3 — Director + escalation polish (shipped 2026-04-29)

**Infection director:** Named tiers **scout → pressure → surge → stormfront** from **day bands** (1–7 / 8–14 / 15–19 / 20+). **Spawn-load** snapshot `**load01`** can bump the tier by one when world strain is high (capped). Gameplay: modest **chance** multiplier plus **extra spawn attempts** at surge/stormfront (not rate-only). Action-bar toasts when **day bands** advance (load bumps affect math only). Spec: [INFECTION_MOD_PHASE3_DIRECTOR_SPEC.md](INFECTION_MOD_PHASE3_DIRECTOR_SPEC.md).

**Verification:** `npm run check`; cross tier boundaries in survival/dev without unexplained cliffs.

---

## Phase 4 — Ship checklist (shipped 2026-04-29)

**Codex:** Biomes **Infection Storm** entry adds **Pressure over time** + **Shelter & reclaim** (emulsifier detox bubble blocks natural spawns). **Balance / perf:** documented pointers in [INFECTION_MOD_PHASE4_SHIP_SPEC.md](INFECTION_MOD_PHASE4_SHIP_SPEC.md) (`mb_balance.js`, spawn configs, spawn-load metrics, adaptive perf, bear cull). **Release:** `PLAYER_CHANGELOG.md` **v0.9.0-beta.2**, `mb_playerChangelog.js` version + What's new body.

**Verification:** `npm run check`; read storm entry in journal after `stormSeen`.

---

## Risks and guardrails

- **Scripts lack cheap global terrain conversion** — keep reservoirs **bounded** and **event-driven**.
- **Multiplayer + simulation distance** — ghost/sim testing helps counts; validate with **real** split-screen or server when changing proximity logic.
- **Avoid duplicate systems** — prefer extending storms/emulsifier/exposure before inventing parallel “corruption layers.”

---

## Living updates

Revise this file when a phase completes or gates change; keep the concept audit as **timeless vocabulary**, not task tracking.