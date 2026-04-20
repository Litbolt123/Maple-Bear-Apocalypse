# Beta smoke checklist

Run before tagging a beta. Record **addon version** (see `BP/scripts/mb_buildConfig.js` → `getAddonVersionDisplayString`) and **date** for each run.

| Beta version | Date (YYYY-MM-DD) | Tester | Pass / fail | Notes |
|--------------|-------------------|--------|-------------|-------|
| v0.9.0-beta.1 | | | | |

## Quick smoke (≈15 min)

- [ ] New world loads; no script errors in content log (dev build).
- [ ] Basic journal received; open Powdery Journal main menu.
- [ ] **What's new** opens from journal.
- [ ] Spawn controller runs (bears appear by design by day 2+).
- [ ] Infection: take a hit from a bear; HUD/feedback behaves as before.
- [ ] Save & quit; reload world; codex / dynamic properties persist.

## Optional (dev)

- [ ] Spawn debug → **Bear telemetry** ON → content log shows `[BEAR TELEMETRY]` lines (dev pack only).
- [ ] `npm run check` passes.

## Full regression

See `docs/development/testing/TESTING_CHECKLIST.md` for deeper coverage.
