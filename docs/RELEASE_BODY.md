<!-- UNRELEASED DRAFT: see docs/development/releases/UNRELEASED_DRAFT.md — do not publish until next tag -->

## The Maple Bear Apocalypse — v0.9.0-beta.4

Performance pass for **day 0–1** and **village / new-chunk** load, plus **buff bear** conversion and death fixes.

### Download & install

This release ships **public pack folders** only — download **`…-BP.zip`** and **`…-RP.zip`**, unzip so you have `BP/` and `RP/` folders.

1. Open in **Bridge**, or export `.mcpack` and import into Minecraft.
2. Enable **The Maple Bear Apocalypse** on both behavior and resource sides of your world.

If upgrading from an older beta, remove the previous pack from the world before applying the new build.

### Performance

- **Day 0–1** and approaching **villages** should hitch less — heavy work is spread across ticks and uses smaller entity scans near players instead of huge sweeps.

### Buff bears & conversions

- **Death explosion:** buff bears leave a powder/block burst on death again (fresh conversion spawns are excluded).
- **Mob kills:** conversion respects **victim size** (tiny / normal / large), not always the smallest bear.
- **Buff cap:** all spawn paths share the same limit (1 / 2 / 3 buff bears by players in the dimension); over cap → **infected** for the current day.
- **Storms:** no double conversion when a bear killed the mob; storm waves respect the buff cap.

### Still heavy?

Use **Journal → Performance** (spawn load, adaptive perf, LAGGY tier) after day 2.

### Known

Minor infection can still be cleared with **weakness + enchanted golden apple** (same handler as major). Documented minor cure is golden apple + carrot only — unchanged in this beta.
