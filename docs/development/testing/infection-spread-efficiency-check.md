# Infection spread efficiency — playtest gate

Draft only. Do not merge until August, Joe, or Aiden walk this list in a **day-100 world with 2 or more players**. This VM cannot run Bedrock multiplayer. The notes below are what the scripts do, and what to look for in game.

`npm run check` is the static pass (JSON, syntax, ESLint). It does not prove feel.

## Where to look in game

Dev pack (`BP - Dev` / `RP - Dev`): **Journal → Developer Tools → Systems → Script self-test**.

The report includes:

- `Infection writes dust=… snowWaves=… job=running|idle slice=24`
- `Dusted cache entries=… cells=…`
- `Infection write queue empty` when nothing is left to write

Open it once while a storm is laying snow (queue should be non-zero, job running) and again a few seconds later (queue empty, job idle). Content Log gets the same text.

Debug: **snow_storm → placement** logs each placed snow block and the wave total (`placed/target`).

## Change A — host write queue (`system.runJob`)

Kill spreads and storm snow **enqueue** block writes. One generator drains them. Slice is **24** dust writes per resume (a normal kill is at most **20**, so it finishes in that resume). Snow keeps the day curve (`getScaledPlacementCount`, about **8.7×** at day 100, ~104 per major wave) and runs **8** placement attempts per resume, shared with the same job. The job yields while work remains. It does not call `clearJob` on a non-empty queue.

Preserves: day curve, radius, chance, victim/killer size, every block the kill already picked, major vs minor snow, foliage break, storm duration.

| Check | Pass |
| --- | --- |
| Kill a mob on grass/dirt. Every block that starts turning (up to 20) finishes as `mb:dusted_dirt`. No patch left half-converted. | |
| Self-test (or a second kill after the first has settled) shows the dust queue at **0** and the job **idle**. | |
| Two bears killing at once may stutter a tick or two. The later kills still finish. Nothing is thrown away because the tick was busy. | |
| Day 100, 2+ players: a kill still looks immediate. Spread is still the fast late-game burst, not a slow creep. | |
| Major storm at day 100 still carpets a lot of infected snow (not the early-game 12). The wave may arrive over a few ticks instead of one hitch. | |
| After the storm wave, self-test snow waves are **0**. Walking out of the storm still stops *new* placement, same as before. | |
| Bears, storm damage, blindness, ground infection timers, and emulsifier detox behave as they do now. | |

## Change B — one ambient sample per player pocket

Players on infected ground who are within **32 blocks** of each other share **one** cache sample per ground-check (about once a second). The sample reads 16-block cells around the group, not the whole hour-long cache. Line-of-sight walls still block that sample. The count still flips ambient pressure at **100** blocks. Each player keeps their own ambient / ground / storm timers.

Preserves: ambient pressure, LOS walls, the 100-block threshold, per-player infection timers. Ground contact, snow 2× speed, and decay are unchanged.

| Check | Pass |
| --- | --- |
| Two players standing together on a large infected patch both build ambient pressure. A wall between the group and the patch still blocks it. | |
| Two players more than 32 blocks apart are separate pockets (each can be pressured or not on their own). | |
| Standing on infected ground still advances that player's own ground timer. Jumping still counts. Stepping off still decays. | |
| Day 100 with 2+ players on the infected ground does not hitch every second the way a full-cache walk per player did. Spread still looks fast. | |
| Self-test cache **cells** stays well below **entries** on a large world (the index is in use). | |

## Not in this change

Block cleanup, mining-AI stretch, storm size/duration clamps, and ground-check round-robin are not in this branch.

## Static check

Run `npm run check` before review. In-game multiplayer was not run here.
