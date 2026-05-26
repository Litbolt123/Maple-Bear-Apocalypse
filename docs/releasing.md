# Releasing (maintainers)

This repo ships like **What Am I Doing**: push a **`v*`** Git tag → GitHub Actions validates and zips pack folders → **GitHub Release** attaches those `.zip` files. Ordinary pushes to `main` do **not** publish a Release.

**`.mcpack` export:** done in **Bridge** on your machine (more reliable than CI). CI only ships **`BP/`**, **`RP/`**, **`BP - Dev/`**, **`RP - Dev/`** as zips.

**Players:** [GitHub Releases](https://github.com/Litbolt123/Maple-Bear-Take-Over/releases) → download **`…-BP.zip`** + **`…-RP.zip`**, unzip, export/import via Bridge or Bedrock as you prefer.

---

## End-to-end flow

```
Maintainer
  1. Copy draft bullets from docs/development/releases/UNRELEASED_DRAFT.md → docs/PLAYER_CHANGELOG.md (new ## v… section), mb_playerChangelog.js, docs/RELEASE_BODY.md
  2. Bump ADDON_VERSION_* in BP/scripts/mb_buildConfig.js (+ PLAYER_CHANGELOG_VERSION)
  3. npm run sync:pack-metadata
  4. Edit docs/RELEASE_BODY.md (user-facing — required for tag builds)
  5. npm run check
  6. Commit & push to main
  7. git tag v<semver>     (e.g. v0.9.0-beta.4 when config says 0.9.0-beta.4)
  8. git push origin v0.9.0-beta.4

GitHub Actions (.github/workflows/release.yml)
  → sync manifests, validate JSON + BP/scripts syntax, lint
  → zip BP/, RP/ only → dist/*.zip (dev packs stay in repo, not on Releases)
  → upload-artifact (always)
  → softprops/action-gh-release (tag pushes only)
       attaches .zip pack folders, body from docs/RELEASE_BODY.md

Players / maintainers
  → Releases page → unzip BP + RP → Bridge .mcpack export or direct pack use
```

---

## Single source of truth: version

| File | Role |
|------|------|
| **`BP/scripts/mb_buildConfig.js`** | `ADDON_VERSION_MAJOR/MINOR/PATCH`, `ADDON_VERSION_PRERELEASE` |
| **`npm run sync:pack-metadata`** | Updates all four `manifest.json`, `config.json` descriptions |
| **`BP - Dev/scripts/mb_buildConfig.js`** | Keep prerelease label in sync for dev playtests |
| **`docs/RELEASE_BODY.md`** | GitHub Release description (what downloaders read) |
| **`docs/PLAYER_CHANGELOG.md`** | Longer player notes + in-game What's new source |

Read version locally:

```bash
node tools/getVersion.js
node tools/getVersion.js --json
```

**Do not** hand-edit all four manifests each release if you run sync after bumping build config.

---

## Git tags vs GitHub Releases

| Concept | Rule |
|---------|------|
| **Git tag** | Must be **`v` + exact semver** from `mb_buildConfig.js` — e.g. `0.9.0-beta.4` → `v0.9.0-beta.4` |
| **GitHub Release** | Created by CI on **tag push** only |
| **Tag / version guard** | Workflow fails if tag `v0.9.0-beta.3` but config says `0.9.0-beta.4` |
| **Retagging** | Delete remote tag, fix commit/version, recreate tag on the right commit |

---

## CI workflow: `.github/workflows/release.yml`

**Triggers:**

- `push` to tags matching `v*`
- `workflow_dispatch` (manual — build + artifact only, **no** Release publish)

**Permissions:** `contents: write` (for `action-gh-release`).

**Steps (summary):**

1. Checkout, Node 20, `npm ci`
2. Read version → `node tools/getVersion.js --github-output`
3. Prerelease flag: if version contains `-` after numeric core → GitHub **Pre-release**, `make_latest: false`
4. **Verify tag matches version** (tag builds only)
5. `node tools/syncPackMetadata.js`
6. `npm run validate:json` + `node tools/testAllScripts.js --release-only` + `npm run lint`
7. `node tools/packageRelease.js` → `*-BP.zip`, `*-RP.zip` only
8. Upload artifact (always)
9. Verify `docs/RELEASE_BODY.md` exists and ≥ 80 chars (tag builds only)
10. Publish GitHub Release (tag builds only)

**Manual `workflow_dispatch`:** steps 1–8 run; step 10 skipped. Download the Actions artifact instead.

---

## Release notes file (required for tags)

**File:** `docs/RELEASE_BODY.md`

- Edit **before** every `v*` tag push
- Becomes the GitHub Release description
- CI **fails** if missing or &lt; 80 characters
- Typos on GitHub can be edited after publish; git file is for the **next** tag

Per-release archives (optional): `docs/development/releases/vX.Y.Z.md`

---

## Asset naming

From `tools/packageRelease.js` + `PACK_DISPLAY_NAME`:

```
The_Maple_Bear_Apocalypse_v0.9.0-beta.4-BP.zip
The_Maple_Bear_Apocalypse_v0.9.0-beta.4-RP.zip
```

Each zip contains the folder at repo root (e.g. unzip → `BP/manifest.json`). **GitHub Releases attach these two only.**

**Dev packs** (`BP - Dev/`, `RP - Dev/`) remain in the **git repo** for maintainers and Bridge — they are **not** published as release download assets.

---

## Stable vs beta

| Version in `mb_buildConfig.js` | Tag | GitHub Release |
|--------------------------------|-----|----------------|
| `0.9.0` (empty prerelease) | `v0.9.0` | Normal; can be **Latest** |
| `0.9.0-beta.4` | `v0.9.0-beta.4` | **Pre-release**; not Latest |

To promote beta → stable: set `ADDON_VERSION_PRERELEASE = ""`, bump patch if needed, sync, update `RELEASE_BODY.md`, tag `v0.9.0`, push.

---

## Minimal maintainer recipe

```bash
# 1. Edit BP/scripts/mb_buildConfig.js (and dev twin + changelogs)
# 2. Edit docs/RELEASE_BODY.md
npm run sync:pack-metadata
npm run check
git add -A && git commit -m "Release 0.9.0-beta.5" && git push origin main
git tag v0.9.0-beta.5
git push origin v0.9.0-beta.5
# 3. GitHub → Actions → run for v0.9.0-beta.5 → green → Releases has BP + RP zips only
```

**Rule of thumb:** tag = `v` + `mb_buildConfig` semver → push tag → wait for green **tag** workflow → verify assets on Releases.

---

## Common failures

| Symptom | Cause / fix |
|---------|-------------|
| Verify tag matches version | Tag `v0.9.0-beta.3` on commit where config says `0.9.0-beta.4` — align or retag |
| `RELEASE_BODY` too short / missing | Fill `docs/RELEASE_BODY.md` before push |
| Green `main` but no Release | Release step only runs on **tag** ref |
| Wrong “Latest” on GitHub | Stable tag should have empty `ADDON_VERSION_PRERELEASE` |
| Player imported one pack | They need **both** BP + RP from the same release (export both from Bridge) |

---

## Key files

| Path | Role |
|------|------|
| `BP/scripts/mb_buildConfig.js` | Version bump |
| `docs/RELEASE_BODY.md` | GitHub release body |
| `.github/workflows/release.yml` | Build + publish |
| `tools/getVersion.js` | Read semver for scripts/CI |
| `tools/packageRelease.js` | Zip `BP/`, `RP/` for Releases (not dev) |
| `tools/verifyBuildConfig.js` | Dev `INCLUDE_FULL_DEVELOPER_TOOLS` must be true |
| `tools/syncPackMetadata.js` | Manifest / Bridge name sync |
| `docs/development/BRIDGE_EXPORT_AND_VERSIONING.md` | Bridge export details |
| `docs/development/github-versioning-releases-agent-guide.md` | Generic patterns (other repos) |

---

## Already tagged v0.9.0-beta.4 locally?

After this workflow lands on `main`:

```bash
git push origin main
git push origin v0.9.0-beta.4
```

If the tag already exists on GitHub with no assets, delete the remote tag and re-push after CI is on `main`, or create a new patch beta tag.
