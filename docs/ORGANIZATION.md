# Documentation layout

How `docs/` is organized. **The canonical index with links to every file is [README.md](README.md).**

---

## Principles

1. **`docs/context summary.md`** stays at **`docs/` root** (canonical session log; see `AGENTS.md`).
2. **`docs/PLAYER_CHANGELOG.md`** stays at **`docs/` root** (in-game string points at `docs/PLAYER_CHANGELOG.md`).
3. **`docs/collaborators/`** — non-programmer tasks (textures, lore, UI copy). *(Renamed from `Compoohter/` in 2026.)*
4. **`docs/archive/`** — one-off reports and old session dumps, not primary reading.
5. **`docs/development/`** — technical work, grouped by **guides**, **systems**, **planning**, **testing**, **ai**, **sounds**, **ui**, **prompts**, **tracking**.

---

## Folder tree (summary)

```
docs/
├── README.md                 # Master index (start here)
├── ORGANIZATION.md           # This file
├── context summary.md        # Session / change log (canonical)
├── PLAYER_CHANGELOG.md       # Player-facing beta notes
├── ai/                       # Stub → context summary
├── archive/                  # Historical reports
├── collaborators/            # Co-creator tasks & guides
├── design/                   # Vision & world
├── development/
│   ├── guides/               # How-to, debug, compatibility
│   ├── sounds/               # Audio docs
│   ├── ai/                   # Bear AI & pathing
│   ├── systems/              # Spawn, infection, storms, codex unlocks…
│   ├── planning/             # Roadmaps, ideas, QoL
│   ├── tracking/             # Changelogs, session summaries
│   ├── testing/              # QA, script test map
│   ├── ui/                   # UI reference notes
│   ├── prompts/              # AI prompt files
│   ├── SCRIPTS_REFERENCE.md
│   ├── DEVELOPER_ONBOARDING.md
│   ├── ADDON_SYSTEMS_AND_FEATURES.md
│   └── PROJECT_STATUS.md
└── reference/                # External Bedrock links & styling
```

---

## When moving files

- Update **[README.md](README.md)** (master list).
- Search the repo for **old paths** (`grep` the filename).
- Prefer **kebab-case or underscores** in new filenames (avoid spaces).

---

## Related

- **[AGENTS.md](../AGENTS.md)** — tooling and `context summary` rules
- **[README.md](README.md)** — full file index
