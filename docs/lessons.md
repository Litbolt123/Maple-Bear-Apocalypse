# Lessons

Short log so the same fix is not re-taught. Newest first.

## 2026-09-23 — Ground fast path round-robin after day 3

- **Symptom:** `spreadPlayersForWork` only rotates players through day 3. At day 100 the infected-ground fast loop still checks every player every pass.
- **Failed:** Turning the day-3 gate off globally would also rotate biome, inventory, and other callers.
- **Worked:** Optional `forceRoundRobin` on `spreadPlayersForWork`, used only by the ground fast path when the world has 2+ players. Rotate the on-ground list, one player per pass. Timers stay in seconds, so each player still finishes.
- **Verify:** Change C in `docs/development/testing/infection-spread-efficiency-check.md`. Two players on infected ground both still infect. Solo cadence unchanged.

## 2026-09-23 — Infection writes must drain, not drop

- **Symptom:** Day-100 hitch from kill `setType` bursts and storm snow waves, plus a full `dustedDirtCache` walk per player on infected ground.
- **Failed:** Clamping storm placement back to the day-40 count. That makes day 100 look slow. `fillBlocks` on the whole radius is one spike and throws on unloaded chunks. A custom tick on every infected block gets worse as the area grows.
- **Worked:** One host queue and `system.runJob`. Yield between slices of 24 dust writes (a normal kill is ≤20) and 8 snow attempts. Leave the tail queued. Never `clearJob` while work remains. Ambient pressure: one spatial sample per 32-block player cluster, shared, LOS still applied from that sample.
- **Verify:** `docs/development/testing/infection-spread-efficiency-check.md` with 2+ players on a day-100 world. Self-test should show the write queue return to empty. `npm run check` does not replace that.
