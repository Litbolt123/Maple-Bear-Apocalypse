## Infection mod concept audit (Java + Bedrock)

**Date:** 2026-04-28  
**Purpose:** Extract reusable *concepts* (not code) from infection/corruption mods and map them to MapleBear’s current systems and Bedrock constraints.

---

## Quick vocabulary (shared model)

Most “infection mods” are a bundle of 6 parts:

- **Reservoir**: where infection “lives” long-term (node/nest/biome/hidden meter).
- **Vectors**: how it moves (hits, spores, AoE clouds, on-death conversion, block spread).
- **Hosts**: what gets infected (mobs, players, blocks/biomes, items).
- **Progression**: levels/stages/mass thresholds that unlock stronger behavior/content.
- **Decision-making**: rules the infection uses to pick actions/targets/expansion.
- **Counterplay**: how players slow/stop/reverse it (purification, core destruction, quarantine).

This framing helps because **Bedrock scripts** can’t cheaply do “convert the whole world”; we want **localized reservoirs + cheap vectors + clear counterplay**.

---

## Archetype A — Node/Nest reservoir + local world conversion

### What it is
Infection is anchored to **a few cores** (“Nodes”, “Nests”, “Brain nodes”) that:
- convert terrain within a radius,
- spawn/upgrade infected units,
- apply debuffs/ambience within an influence range,
- and are the main “win condition” for stopping spread.

### Why it works (player experience)
- It becomes **strategic** (find/kill core; defend regions).
- It feels “alive” without requiring global scans.

### Common mechanics across mods
- **Hard caps / spacing**: max nodes per dimension; minimum distance between nodes.
- **Tiered nodes**: node level upgrades → buffs to infected faction.
- **Persistent contamination**: even after stopping growth, the infected area remains until purified.

### Bedrock feasibility
High (if we keep conversion localized and budgeted).

### MapleBear mapping (today)
- We already have:
  - storms as a roaming pressure mechanic,
  - emulsifier/no-spawn zones as a “clean area” concept,
  - dev tools for tuning and performance controls.
- A Bedrock-friendly version would be:
  - **rare “infection anchors”** that bias storms/spawns locally (and optionally do small block flavoring),
  - strict caps/spread spacing,
  - journal guidance for discovery and counterplay.

---

## Archetype B — Director AI + evolution thresholds

### What it is
Infection behaves like a faction with a **director**:
- tracks an “evolution” meter (time, mass, kills, conversions),
- unlocks new unit types and behaviors by stage,
- and reallocates effort (raids, expansion, defense) based on threat.

### Why it works
- Players perceive it as **smart and adaptive**, not random spawns.
- It naturally supports **endgame escalation** without only “more mobs”.

### Bedrock feasibility
High (director = data + simple rules). Avoid heavy per-tick scanning.

### MapleBear mapping (today)
- We already have a proto-director:
  - day progression (`getInfectionRate` step table),
  - spawn load auto scaling + bias tiers,
  - adaptive performance probes.
- Opportunity:
  - make director decisions **legible**: journal lines like “Storm pressure rose because …”
  - add 1–2 new “director actions” per stage (not many).

---

## Archetype C — Status-effect network (“marker” / awareness propagation)

### What it is
Infection spreads intent using lightweight effects:
- “marker” debuffs that spread from victim to nearby infected,
- increases targeting range or priority,
- makes infected coordinate without complex AI.

### Why it works
- The infection feels coordinated without heavy logic.
- Enables stealth/paranoia and “you’re being hunted” loops.

### Bedrock feasibility
High (effects + simple radius checks).

### MapleBear mapping (today)
- We already have:
  - infection timers (minor/major),
  - exposure logic (storm LoS/shelter),
  - anger targeting patterns (infected/flying).
- Opportunity:
  - add a **“Dusted / Marked”** state that increases coordination (aggro + pressure) for a short time,
  - tie it to storms (weather-borne identity).

---

## Archetype D — Counterplay that’s infrastructure (not just cures)

### What it is
Players fight infection with:
- zones/structures that block spread,
- purification tools that reclaim land,
- and long-term objectives that reduce reservoir strength.

### Why it works
- Infection becomes a campaign, not a nuisance.
- Supports multiplayer roles: builder/defender/raider.

### Bedrock feasibility
High (zones/flags are cheap; careful block edits are budgeted).

### MapleBear mapping (today)
- Emulsifier zones + shelter already fit this archetype well.
- Opportunity:
  - tighten the loop: “storm → shelter → relief / failure feedback”
  - make “reclaiming” more explicit in journal/codex.

---

## What makes MapleBear distinct (and worth doubling down on)

- **Weather-borne identity** (storms) is less common than sculk/biome corruption.
- **Day-tier escalation** is clear and predictable.
- **Performance-aware design** (spawn-load scaler, adaptive perf, soft culling) is a major differentiator for real servers.
- **Journal/Codex UX** makes complex systems understandable.

Recommended unique angle:

> **Weather-borne infection with shelter, signals, and smart pressure**  
> Use localized reservoirs + director decisions + a “marked by dust” network effect, with infrastructure counterplay.

---

## Similarities across infection mods (design patterns)

- A small set of “core sources” (even if hidden).
- Spread via *events* (hit/death/step-on) rather than constant scanning.
- Discrete stages / thresholds that change *behavior*, not just numbers.
- A coordination signal (marker/awareness/call-of-hive).
- Strong counterplay (purification + core destruction) to avoid “unbeatable”.
- Guardrails (caps, spacing, budgets) to prevent runaway performance collapse.

---

## Notes for MapleBear implementation planning (later)

When we choose what to implement, we should decide:
- **Reservoir form**: anchors? storms-only? hybrid?
- **One coordination signal**: a single “marked” mechanic tied to storms.
- **Two-stage director actions**: e.g. “scout pressure” vs “raid pressure”.
- **Counterplay surfaces**: shelter cues, emulsifier zones, reclaim tools.

This doc is concept-only; implementation should be planned after dev stress tools are tested and committed.

