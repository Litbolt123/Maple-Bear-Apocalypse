# M.B.A — Maple Bear Apocalypse

*Don't do drugs kids…*

Minecraft **Bedrock Edition** addon (**M.B.A**): a day-driven invasion of Maple Bears, infection and “snow” mechanics, journals that unlock knowledge over time, storms, and host/dev tooling. Former working title *Maple Bear Takeover* is archived.

## What you get

- **World progression**: Days unlock stronger bear variants and new threats (flying, mining, torpedo, buff, infected).
- **Infection & cures**: Minor vs major infection, powder tiers, cures, immunity, and journal entries that respect spoilers.
- **Journal (codex)**: Powdery Journal UI with search, settings, achievements, daily log, and optional knowledge sharing.
- **Environment**: Custom **infected overworld biomes**, dusted ground, **Emulsifier** purification machines, **snow storms** (multi-storm capable).
- **Dimensions**: Bears spawn in **Nether** and **End** on native blocks; Nether fire adaptation and End aerial spawn bias.
- **Admin / dev**: Spawn controller hub, storm controls, AI debug flags, day/infection utilities (cheats-gated).

## Repository structure

| Path | Role |
|------|------|
| `BP/` | Behavior pack (JSON + `BP/scripts/` JavaScript) |
| `RP/` | Resource pack (models, textures, sounds, client biomes) |
| `config.json` | **Bridge** project file only — points Bridge at `BP/` + `RP/`, export plugins. Not used by the game or `npm run check`. See [`docs/development/BRIDGE_EXPORT_AND_VERSIONING.md`](docs/development/BRIDGE_EXPORT_AND_VERSIONING.md). |
| `package.json` | Node tooling (`npm run check`, lint, `sync:pack-metadata`) |
| `docs/` | Design, mechanics, systems reference, testing checklists |
| `tools/` | Node maintenance scripts |

## Documentation

Full index: **[`docs/README.md`](docs/README.md)**.

**Start here**

- **[Design vision](docs/design/DESIGN_VISION.md)** — goals and tone  
- **[Systems & features](docs/development/ADDON_SYSTEMS_AND_FEATURES.md)** — what each script/system does  
- **[Project status & next steps](docs/development/PROJECT_STATUS.md)** — current snapshot  
- **[Mechanics summary](docs/development/tracking/MECHANICS_SUMMARY.md)** — detailed gameplay mechanics  
- **[TODO](TODO.md)** — backlog and implemented checklist  
- **[AGENTS.md](AGENTS.md)** — tooling, `npm run check`, Script API constraints  

## Development

Requires Node.js for lint/validation only (game APIs are provided by Minecraft at runtime).

```bash
npm install
npm run check
```

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint on `BP/scripts/` and `tools/` |
| `npm run validate` | JSON parse + JS syntax check |
| `npm run check` | Full validate + lint |

## Installing in Minecraft

1. Copy or symlink the **behavior pack** and **resource pack** into your Bedrock worlds/packs location.  
2. Apply both packs to a world. On **Bedrock 1.26.2+**, **world experiments are not required** (Custom Biomes verified off). See [`docs/development/WORLD_SETUP.md`](docs/development/WORLD_SETUP.md).  
3. Prefer a **fresh world** for infected-biome generation; playtest with [`docs/development/testing/TESTING_CHECKLIST.md`](docs/development/testing/TESTING_CHECKLIST.md).

## License

See `package.json` / repository metadata for license and links.
