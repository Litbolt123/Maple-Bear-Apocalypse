# Cursor SDK (optional — not used in this repo)

The [Cursor SDK](https://cursor.com/docs/sdk) runs Composer agents from scripts (TypeScript `@cursor/sdk` or Python `cursor-sdk`). **This addon does not depend on it** — Bedrock packs are built and tested in Bridge + Minecraft.

## Ideas for later

| Task | Pattern |
|------|---------|
| Pre-tag checklist | `Agent.prompt` + local `cwd` → run `npm run verify:build-config` / summarize blockers |
| Draft Patreon / release blurb | Read `docs/PLAYER_CHANGELOG.md` → non-spoiler post text |
| Post-tag CI failure | Cloud agent on `Litbolt123/Maple-Bear-Apocalypse` → fix lint/syntax on a branch |

**Auth:** `CURSOR_API_KEY` from [Dashboard → Integrations](https://cursor.com/dashboard/integrations).

**Releases here:** tag `v*` → [`.github/workflows/release.yml`](../../.github/workflows/release.yml) zips **`BP/`** + **`RP/`** only. See [releasing.md](../releasing.md).
