# Unreleased — draft release notes (next **public** beta)

**Public pack semver:** still **`v0.9.0-beta.5`** until maintainer tags.  
**Journal What's new / Dev pack label:** **`v0.9.0-beta.5.10`**.  
**Last GitHub Release body file:** `docs/RELEASE_BODY.md` is still the **beta.4** tag text — replace it from this draft on the next tag.

**Status:** Player-facing work after beta.5 is listed below. Do **not** tag GitHub until the maintainer says release.  
**When shipping:** copy player bullets → `docs/PLAYER_CHANGELOG.md` (move **Unreleased** under a version heading), `docs/RELEASE_BODY.md`, `BP/scripts/mb_playerChangelog.js` + Dev copy, bump `PLAYER_CHANGELOG_VERSION` + `ADDON_VERSION_PRERELEASE`, run `npm run sync:pack-metadata`, tag `v*`. CI attaches **BP + RP** zips only (no dev pack downloads on the Release).

---

## Player-facing (What's new / Patreon / GitHub Release)

### Infection & world (2026-09-16)

- **Dusty grass plants** grow on the ground, not in the air in the trees.
- **Dusty firefly bushes** do not grow in infected forests. Vanilla firefly bushes by water still convert when infection reaches them.
- **Podzol** infects to dusty dirt for now. **Coarse dirt** does not infect.
- **Dusty vines** look like vanilla vines with a white powder tint (not a cream box).
- **Dusty plants** — grass, ferns, mushrooms, mushroom blocks, leaf litter, and vines have infected versions. Nearby living plants convert to those dusty plants, **not** powder plates. Firefly bushes convert too, but they do not grow as infected-biome floor scatter in forests.
- **Dusty leaf litter** keeps vanilla leaf shapes: brown dry leaves with powder/“snow” (not a torn cream slab).
- **Dusty tree leaves** keep climbing to the cream / powder stage even when the canopy is only partly converted. Partly dusty leaves/logs can infect healthy neighbors; a block that just became fully dusty checks the six faces (green holes next to cream fill in).
- **Dusty grass plants** match vanilla blade cutouts with powder colors (thinner at the base so they are not a cream wall on the lawn).
- **Dusty double tall grass** and **large ferns** are two blocks tall (vanilla top + bottom, powder colors). Converting vanilla tall grass no longer breaks the plant.
- **Mushroom fields and giant / old-growth taiga** take longer for the powder to crawl (mycelium and podzol biomes). Not a hideout.
- **Mycelium** converts about as slowly as podzol.
- **Vanilla brown and red mushrooms** resist convert more than grass. They do not fight the infection back.
- **Tree / leaf infection** climbs the trunk from dusty dirt, then the leaves — one cell at a time, up from the ground or down from the canopy. Mid-dust leaves keep going to cream (day 100 does not fill a whole oak at once).
- **Infected biomes** grow dusty **floor plants** in new chunks (not ocean floors).
- **Warped and crimson nylium** infect like overworld grass. Nether roots, sprouts, fungus, twisting vines, and weeping vines convert to dusty plants.
- Living ground includes grass **and** dirt-like soils (dirt, podzol, mycelium, moss, farmland, paths). **Podzol and mycelium** convert about half as often as dirt/grass. In mushroom fields and giant taiga, grass and dirt also crawl slower. Stone and sand stay clean.

### Emulsifier (2026-09-16)

- Powder plates purify to **air**, not vanilla snow.
- Infected leaves and dusty plants sometimes **vanish** instead of restoring.
- Dusted dirt on open lawns/floors sometimes comes back as **grass**. Caves stay dirt. In the **Nether**, dusty ground becomes netherrack or matching nylium — never overworld grass.

### Bears (2026-09-19)

- **Mining Maple Bears** chew **obsidian** and other diamond-slow blocks in about **five seconds** each. **Buff smash** can still break those, but far less often than stone. Bedrock, the ancient city portal (reinforced deepslate), and other survival-unbreakable blocks stay closed. Torpedo bursts still skip slow walls so a cube is not a one-tick delete.

### Bears (2026-09-16)

- Older Maple Bears and infected (day 4 / 8 / 13, and the rest of the family) **burn in fire and lava**. Day 20 infected already did.

### Performance & HUD (2026-09-16)

- Large dusty forests hitch less (no tick on every infected leaf/log). World-load content log no longer errors that those blocks subscribed to `onTick` without `minecraft:tick`.
- A netherite-fueled emulsifier should stall the world less.
- Day **100+** sunrise titles and fat action bars stay on screen.
- Dusty-forest scans stay **player-first** (leaves + grass every slice). Extra wood / powder / tint work **rotates** only when the world is already busy — quiet solo play still does the full set. **Two-plus players** always rotate those extras so joiners hitch less. Pack load uses a `textures_list.json` cache.

### Still queued from earlier drafts (already in trees; confirm on tag if not already in beta.5 notes)

- **Journal → Settings → Addon Difficulty** scales **block** infection (Easy 0.7× / Normal 1× / Hard 1.3×).
- **Dappled Forest / 26.50:** poplar logs/leaves infect; shrubs, shelf mushrooms, leaf litter, brown mushrooms take powder/storms; snow infected patches can replace Dappled Forest in new chunks.
- **Villages & chunk travel / day 0–1 / crowded-world spawn throttle** (see beta.5 notes for overlapping day-0 / chunk travel).
- **Buff dual cap**, **~5% torpedo duds**, mining **stair stall** + more powder while digging.

---

## Dev pack only (journal — not in public release notes unless you want)

- **Biome checker:** Journal → Developer Tools → Systems — compare `getBiome` at your feet vs infected biome JSON; optional **action-bar HUD**; safe-by-design list (mushroom island, mega taiga, etc.).
- **Pinnable shortcuts:** Pin menu organized by category (Performance, Systems, Bears, …); new pins for Spawn AUTO, biome checker, emulsifier, etc.
- **Force spawn bears** moved under **Developer Tools → Bears** (not Spawn controller).
- **Script self-test**, spawn load HUDs, perf roadmap docs (`docs/development/PERFORMANCE_OPTIMIZATION_ROADMAP.md`).

---

## Maintainer checklist (on release day)

1. [x] Playtest: VAN lawn spreading (dusted dirt + dusty grass plants, 2026-09-19). [x] dusty grass-plant look (KEEP — powder blades, fits the addon). [ ] infected-biome floor plants; emulsifier powder→air / leaf vanish / dirt→grass; nether nylium; older bears in fire; day 100 HUD; netherite emulsifier hitch.
2. [ ] Pick public version (e.g. promote **`0.9.0-beta.5.1`** or bump to **`0.9.0-beta.6`**).
3. [ ] `PLAYER_CHANGELOG.md` — move **Unreleased** bullets under new `## v…` section.
4. [ ] `mb_playerChangelog.js` + `BP - Dev` copy — bump `PLAYER_CHANGELOG_VERSION` + in-game body (keep in sync with this draft).
5. [ ] `docs/RELEASE_BODY.md` — GitHub Release text from the player-facing section above.
6. [ ] `mb_buildConfig.js` (both packs) — `ADDON_VERSION_PRERELEASE`; `npm run sync:pack-metadata`.
7. [ ] Merge dev → public: `npm run sync:bp-from-dev`; copy any changed JSON/assets in `BP/` + `RP/` from dev twins (keep release `mb_buildConfig.js`).
8. [ ] `npm run check`; tag; GitHub Release (**BP + RP** zips only).

---

## Git reference

| Commit | Summary |
|--------|---------|
| `67d9de8` | Dev: perf pass, biome checker, buff dual-cap, journal pins |
