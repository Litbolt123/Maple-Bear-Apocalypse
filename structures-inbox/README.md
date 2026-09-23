# Structure inbox (owner drops)

**Drop custom `.mcstructure` files here.** This folder is for reference only. Files here are **not** in the live behavior pack and will **not** spawn in-world until they are copied into `BP/structures/` (and `BP - Dev/structures/`) and wired to jigsaws / feature rules.

## Folder (copy this path)

```
C:\Users\Augus\Desktop\Maple Bear Addon\GitHub projects\Maple-Bear-Take-Over\structures-inbox
```

Repo-relative: `structures-inbox/`

## Where to put what

| Subfolder | Use for |
|-----------|---------|
| `villages/` | Abandoned houses, wells, paths, churches, farms |
| `camps/` | Single-piece camps, forage stalls, outposts |
| `bunkers/` | Lore bunkers, storm shelters, hideouts |
| `other/` | Anything else (markers, door grafts, experiments) |

Optional: add a short `.txt` next to the file (biome, size, what it is, any unique marker block). Or copy `_NOTES_TEMPLATE.txt`.

After you drop files, say so in chat so they can be reviewed and wired.

## Export checklist (Structure Block)

1. Tight box — no basement dirt, no side padding, no grass on Y=0.
2. Structure Block **outside** the save box; Offset **0, 0, 0** (default Y=-1 will bury the floor).
3. Include Entities only if you really need them (NPCs often fail in natural jigsaw gen anyway; we staff from scripts).
4. **Air**, not `structure_void` (Bedrock treats void like a solid barrier).
5. Avoid vanilla 2-block tiles (beds, doors) unless grafted from a known-good ref.
6. Filename: lowercase, underscores, no spaces — e.g. `plains_well_center.mcstructure`.

Engineering notes: [docs/development/FFG_WORLDGEN_HANDOFF_MBA_IMPROVEMENTS.md](../docs/development/FFG_WORLDGEN_HANDOFF_MBA_IMPROVEMENTS.md). Live collab plains pieces (already in the pack, not this inbox): `BP - Dev/structures/mb/av_plains/`.
