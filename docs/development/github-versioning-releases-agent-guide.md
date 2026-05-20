# Agent guide: GitHub versioning, Actions, and Releases

**Purpose:** A **shareable, project-agnostic** playbook for AI assistants and humans setting up (or debugging) **semantic versioning**, **Git tags**, **GitHub Actions**, and **GitHub Releases** for a desktop or CLI app shipped as binaries (e.g. .NET + optional installer).

**Reference implementation:** This repository ([`Directory.Build.props`](../Directory.Build.props), [`.github/workflows/release-windows.yml`](../.github/workflows/release-windows.yml), [`docs/releasing.md`](releasing.md)). Adapt names (`WhatAmIDoing`, paths, Inno) to the target product.

---

## 1. Terminology (do not conflate these)

| Term | Meaning |
|------|--------|
| **`Version` (MSBuild)** | The **product version string** used in About dialogs, update checks, and often installer filenames. **Single source of truth** in the repo (commonly root `Directory.Build.props` or the main `.csproj`). |
| **`AssemblyVersion` / `FileVersion`** | Windows **four-part numeric** values (`major.minor.build.revision`). Must stay valid for tools that reject extra segments (e.g. WPF **MC1005** if you use five parts). For SemVer prereleases like `1.0.2-beta.1`, keep these as the **numeric core** (e.g. `1.0.2.0`). |
| **Git tag** | A label on a **commit** (e.g. `v1.2.3`). CI often runs **only** on tags matching `v*`. |
| **GitHub Release** | A **Releases** page entry: title, markdown body, attached assets. Usually created by CI when a tag is pushed (if the workflow includes a publish step). |
| **Workflow artifact** | A file produced by an Actions **run**, downloadable from the **Actions** tab. **Not** a Release until a job publishes one. |

**Invariant many teams enforce:**  
`git tag` name = **`v` + MSBuild `Version`** exactly (e.g. `Version` `1.2.3` → tag `v1.2.3`; `Version` `1.0.0-rc.1` → tag `v1.0.0-rc.1`). CI **fails** if the pushed tag and `Version` disagree—this prevents shipping the wrong bits under the wrong label.

---

## 2. Recommended layout (greenfield or refactor)

1. **One place for the ship version**  
   Root **`Directory.Build.props`** (imported by all projects in the tree):

   ```xml
   <Project>
     <PropertyGroup>
       <Version>1.0.0</Version>
       <AssemblyVersion>1.0.0.0</AssemblyVersion>
       <FileVersion>1.0.0.0</FileVersion>
     </PropertyGroup>
   </Project>
   ```

   For a **prerelease** `Version` such as `1.0.2-beta.1`, keep **`AssemblyVersion` / `FileVersion`** as **`1.0.2.0`** (core only), not the literal string `1.0.2-beta.1`.

2. **App reads version at runtime** from assembly metadata (`InformationalVersion` / `AssemblyInformationalVersion` or `Assembly.GetName().Version`) so it always matches the build.

3. **CI reads the same `Version`** with:

   ```bash
   dotnet msbuild path/to/Entry.csproj -nologo -getProperty:Version
   ```

   Use that output for filenames, release titles, and tag verification.

4. **Two triggers** (pattern used here):
   - **`on: push: tags: ['v*']`** — full release pipeline: build, verify tag == `Version`, attach to **GitHub Release**.
   - **`workflow_dispatch`** — same build steps, upload **artifact only** for QA; **no** Release (unless you add a separate manual publish step).

5. **`permissions`**  
   Jobs that create or update releases need at least:

   ```yaml
   permissions:
     contents: write
   ```

   The default `GITHUB_TOKEN` can publish releases to **this** repo when `contents: write` is allowed.

6. **Publish step**  
   Common choice: **`softprops/action-gh-release`** with:
   - `files:` glob for installer(s) / zip(s)
   - `body_path:` pointing to a **checked-in** markdown file (or inline `body:`), and optionally **`generate_release_notes: false`** if you want full control.
   - **`prerelease:`** / **`make_latest:`** derived from SemVer (e.g. if `Version` matches `^\d+(\.\d+)*-.+$`, set `prerelease: true` and `make_latest: false` so betas do not steal **Latest**).

7. **Guardrails**  
   - **Verify tag step** (tag builds only): strip leading `v` from `github.ref_name` and compare to MSBuild `Version`.
   - **Verify release notes** exist and exceed a minimum length before publishing (stops empty release pages).

---

## 3. Minimal workflow sketch (YAML)

Concept only—adjust paths, project name, and build commands.

```yaml
name: Release build

on:
  push:
    tags: ["v*"]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  ship:
    runs-on: windows-latest   # or ubuntu-latest, etc.
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "8.0.x"

      - name: Read Version from MSBuild
        id: ver
        run: |
          $v = dotnet msbuild ./src/MyApp/MyApp.csproj -nologo -getProperty:Version
          "version=$($v.Trim())" >> $env:GITHUB_OUTPUT
        shell: pwsh

      - name: Verify tag matches Version
        if: startsWith(github.ref, 'refs/tags/v')
        run: |
          $tag = "${{ github.ref }}" -replace '^refs/tags/v',''
          if ($tag -ne "${{ steps.ver.outputs.version }}") { throw "Tag v$tag does not match Version ${{ steps.ver.outputs.version }}" }
        shell: pwsh

      # ... your build / test / package steps ...

      - name: Publish GitHub Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: dist/*.exe
          body_path: docs/RELEASE_BODY.md
          generate_release_notes: false
          prerelease: false   # or expression from semver prerelease detection
          make_latest: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 4. Maintainer checklist (ship a stable version)

1. Bump **`Version`** (and aligned **`AssemblyVersion` / `FileVersion`**) in **`Directory.Build.props`**; commit and push to default branch.
2. Update **release notes** file used by CI (`body_path`).
3. `git tag vX.Y.Z` on the commit you intend to ship.
4. `git push origin vX.Y.Z` (not only `git push --tags` if your policy prefers explicit remote tag push).
5. Watch **Actions** for the **tag** run (not only a branch run); confirm green.
6. Open **Releases** on GitHub; confirm asset + body.

**Manual QA without Releases:** run the workflow from the **Actions** tab (`workflow_dispatch`) and download the **artifact**.

---

## 5. Common failures (for agents triaging CI)

| Symptom | Likely cause |
|--------|----------------|
| “Verify tag matches Version” failed | Tag `v…` does not equal MSBuild `Version`; fix props or retag. |
| Release step never runs | `if:` condition wrong; or push was **branch** only—need **`refs/tags/v*`** push. |
| `403` / permission denied on release | Missing `permissions: contents: write` or org policy blocking `GITHUB_TOKEN`. |
| WPF / Windows SDK **MC1005** | **`AssemblyVersion` / `FileVersion` / manifest version`** must be **exactly four** numeric components. |
| Empty or useless release text | No `body_path` / forgot to edit release notes; add verification step. |
| Wrong “Latest” on GitHub | Prerelease not marked `prerelease: true` or `make_latest` not set to `false` for betas. |

---

## 6. Alternatives (when this pattern is not enough)

- **semantic-release** (Node ecosystem): automates version bumps from conventional commits; less common for small WPF teams but popular for JS libs.
- **GitHub “Create release” UI only:** fine for rare ships; does not replace CI for reproducible builds.
- **CalVer or custom schemes:** still map cleanly to `Version` + tags if you define the tag rule once and verify it in CI.

---

## 7. How to reuse this doc in another Cursor project

1. Copy this file into the other repo (e.g. `docs/github-versioning-releases-agent-guide.md`).
2. In **Cursor Rules** or the first agent message, point to it: *“Follow `docs/github-versioning-releases-agent-guide.md` for versioning and releases.”*
3. Replace placeholders: solution path, OS runner, packaging tool (Inno, MSIX, zip only), and whether Releases should require a human approval gate.

---

*Derived from a working Windows/.NET + Inno + tag-triggered Release pipeline. Product-specific steps (installer scripts, self-contained publish flags) stay in that repo’s [`docs/releasing.md`](releasing.md).*
