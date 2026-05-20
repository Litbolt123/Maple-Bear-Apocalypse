# Bridge config templates

Bridge reads **only** the repo-root [`config.json`](../config.json). These folders hold **templates** — copy one to the root before opening the project in Bridge.

| Template | Pack folders | Use when |
|----------|--------------|----------|
| [`dev/bridge.json`](dev/bridge.json) | `BP - Dev` + `RP - Dev` | Day-to-day playtests (full Developer Tools in scripts) |
| [`release/bridge.json`](release/bridge.json) | `BP` + `RP` | Store / public `.mcpack` export |

## Commands

```bash
npm run bridge:config:dev
npm run bridge:config:release
```

Optional: run `npm run sync:pack-metadata` first so `name`, `description`, and `simpleRewrite.packName` match [`BP/scripts/mb_buildConfig.js`](../BP/scripts/mb_buildConfig.js).

## Runtime vs Bridge

- **Bridge `config.json`** — which folders Bridge compiles.
- **`mb_buildConfig.js`** — in-game dev vs release gating (`INCLUDE_FULL_DEVELOPER_TOOLS`). Never overwrite release `BP/scripts/mb_buildConfig.js` with the dev copy when merging.

See also [`docs/development/BRIDGE_EXPORT_AND_VERSIONING.md`](../docs/development/BRIDGE_EXPORT_AND_VERSIONING.md) and [`docs/development/PERFORMANCE_DEBUG.md`](../docs/development/PERFORMANCE_DEBUG.md).
