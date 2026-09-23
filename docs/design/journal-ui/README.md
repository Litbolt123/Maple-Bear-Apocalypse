# Journal book UI art (look-first pass)

Original pixel-art mockups for a future **CustomForm** journal skin. Inspired by vanilla **Book and Quill** / signed-book screens.

**Look keep (2026-09-15, August):** Powdery blocky-pixel pass is the direction. **Next (tomorrow):** blank plates of those same three layouts (no title, TOC, lore, or page labels baked in) so scripts can put our own words on them. Keep the **same ActionForm experience** as today’s journal (`mb_codex.js` `openMain()`), just a different look, with possible layout tweaks to how info sits on the page. Not in `RP/textures/` until that pass.

## Two looks

August 2026-09-15: the first pass matches **basic journal**. **Powdery Journal** needs heavy MBA “snow” (infection powder), using the palette from the dusted journal icon, snow item, and snow layer.

| Set | Files | Look |
|-----|--------|------|
| **Basic journal** | `basic-journal-contents-spread.png`, `basic-journal-closed-cover.png`, `basic-journal-reading-spread.png` | Clean dusty cream paper, brown leather |
| **Powdery Journal** | `powdery-journal-contents-spread.png`, `powdery-journal-closed-cover.png`, `powdery-journal-reading-spread.png` | Same layouts; **blocky Minecraft pixels**; dry white dust (not photo-snow); **book UI only** (dark void, no world) |

## Palette (Powdery only)

Sampled from pack textures (not vanilla ice snow):

- **Dusted journal icon** `RP/textures/items/snow_book.png` — leather `#312104` `#654b17` `#522e10` `#44250a` `#816c41`; powder on the book `#cdcbb5` `#d8d6b5` `#bebba2`
- **Snow item** `RP/textures/items/mb_snow.png` — `#f2ede7` `#e7e6e3` `#e5d2c2` `#dfcbbb`
- **Snow layer** `RP/textures/blocks/'snow'_layer.png` — mottled `#e9e2dc` `#e6ddd7` `#dcc7b5` `#e6d3c5`

Warm cream / tan **dry dust** (flour/chalk), painted in big Minecraft pixels like the 16×16 icons. Not photo-snow, not ice, not a world screenshot behind the book.

## Placeholder TOC (contents spread)

Infection · Symptoms · Mobs · Items · Biomes and Blocks · Timeline · Achievements · What's new

## Vault copy

Mirrored at `Projects/Maple Bear Apocalypse/design/journal-ui/` in the Obsidian vault.

## Out of scope (this pass)

- No `mb_codex.js` / `CustomForm` wiring
- No `@minecraft/server-ui` version bump
- No JSON UI override of vanilla book screens
