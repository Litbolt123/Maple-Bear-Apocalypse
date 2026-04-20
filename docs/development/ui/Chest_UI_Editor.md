# Chest UI Editor - Minecraft Bedrock
**Source:** Bedrock Add-Ons Discord - #dev-resources
**Author/OP:** Minato (minato4743)
**Posted:** March 14, 2025
**Tags:** Tool, User Interface

## Links
- **Live Editor:** https://minato-mba.github.io/web-apps/chest-ui-editor/
- **GitHub Repo:** https://github.com/Minato-mba/web-apps/tree/main/chest-ui-editor

---

## Overview

A web-based editor for creating custom chest UIs for Minecraft Bedrock Edition. Design interactive interfaces with drag-and-drop components and export them as resource packs.

---

## Features

- Drag and drop interface for UI component placement
- Live preview of your chest UI design
- Several pre-built templates
- Local storage to save your projects
- Export to ready-to-use Minecraft resource packs

---

## Components

### 1. Container Item
- Standard inventory slot for item placement
- Properties: Collection index, position, size
- Used for regular item slots in your UI

### 2. Container Item with Picture
- An inventory slot with a custom background image
- Properties: Collection index, picture path, position, size
- Useful for specialized slots (e.g., book slots, special crafting inputs)

### 3. Progress Bar
- Visual indicator for cooking/crafting progress
- Properties: Collection index, current value, position
- Progress controlled by renaming item in slot to 0-9 (0 = empty, 9 = full)
- **Tip:** Use an unobtainable item to prevent shift-click placing

### 4. On/Off Item
- Toggle switch for binary states
- Properties: Collection index, active state, position
- State controlled by renaming item to 1 (on) or anything else (off)
- **Tip:** Use an unobtainable item to prevent shift-click placing

### 5. Un-interactable Slot
- Visual-only slot players cannot interact with
- Properties: Collection index, position
- Used for decorative elements or visual guides
- **Tip:** Rename displayed item to a random name to prevent shift-click

### 6. Container Type
- Standard inventory slot with dynamic background picture
- Background changes based on item name in slot (0-9)
- Properties: Collection index, position, size
- **Tip:** Use an unobtainable item to prevent shift-click placing

### 7. Image
- Static decorative image
- Properties: Texture path, alpha (transparency), position, size
- Used for backgrounds or decorative elements

### 8. Label
- Text element
- Properties: Text content, color, position
- Used for titles, descriptions, or instructions

---

## Usage Guide

### 1. Adding Components
- Drag components from the left sidebar onto the chest UI area
- Position precisely using the Properties panel

### 2. Editing Properties
- Select any component to edit its properties
- Includes position, size, text content, colors, etc.

### 3. Saving and Loading
- Save button stores project in browser local storage
- Load button retrieves saved projects
- **NOTE:** Cannot recover unsaved work after leaving the page

### 4. Exporting
- Click Export to generate a Minecraft Bedrock resource pack (.zip)
- Includes all necessary textures and UI definition files

### 5. In-Game Usage
- Make a custom entity with an inventory matching your UI slot count (vanilla containers work too)
- Spawn the entity named `§t§e§s§t§r` to display the UI
- Control UI behavior using the Script API

---

## In-Game Setup

- Give your entity an **entity inventory component** with the same slot count as your UI
- Name the entity with the trigger name: `§t§e§s§t§r`
- To attach the GUI to a custom block or entity: use the entity inventory component and name the entity

---

## Known Limitations

- **No automatic screen scaling** - UI does not scale based on screen resolution
  - Workaround: Make background image as large as possible, position all assets for smallest resolution. Trial and error.
  - Test by increasing the UI scale setting in Minecraft on PC
- **Multiple custom UIs will conflict** - must manually merge them
- **Herobrine Chest UI** uses forms and will NOT conflict
- **Mobile drag-and-drop** was broken at launch, fixed March 17, 2025
- **No JSON UI import** back into the editor (difficult to reverse-parse arbitrary JSON UI)
- **Chest-style UI only** - crafting table and smithing table not yet supported

---

## FAQ / Thread Q&A

**Q: Can I load work I made before without saving?**  
A: No. You must save first using the Save button to be able to load it later.

**Q: Does this work with custom crafting tables?**  
A: Not currently - only chest-style UIs are supported.

**Q: Will multiple custom UIs conflict with each other?**  
A: Yes, multiple chest UIs conflict and need manual merging. Herobrine Chest UI (uses forms) will NOT conflict.

**Q: Can I import an existing JSON UI file back into the editor?**  
A: Not easily - parsing arbitrary JSON UI back to the editor's internal format is difficult.

**Q: How do I attach this GUI to a custom block or entity?**  
A: Use the entity inventory component and name the entity appropriately.

**Q: How do I test different screen resolutions?**  
A: Increase the UI scale setting in Minecraft on your PC to simulate different resolutions.

**Q: Does this work on mobile?**  
A: Drag-and-drop on mobile was initially broken but was fixed on March 17, 2025.

**Q: Will this interfere with Herobrine's Chest UI?**  
A: No - Herobrine's Chest UI uses forms, so they won't conflict.

---

## Credits

- Created by **minato4743**
- Uses **JSZip** library for ZIP file generation
- Cooking pot UI template credited to the cooking pot mod

---

## Thread Timeline

| Date | Event |
|---|---|
| Mar 14, 2025 | Tool released with full documentation. Community very excited (128+ reactions). |
| Mar 14, 2025 | Mobile drag-and-drop reported as broken. |
| Mar 14, 2025 | Confirmed: only chest-style UI supported (no crafting tables). |
| Mar 14, 2025 | Confirmed: multiple UIs conflict and need manual merging. |
| Mar 17, 2025 | Mobile drag-and-drop fixed. |
| Apr 9, 2026 | Long discussion about screen resolution scaling - no universal solution found. |
| Apr 11, 2026 | Q&A: how to import GUI into entity - use entity inventory component + name it. |
| Apr 12, 2026 | Feature request: add a button to trigger crafting events so devs don't need permanent checks. |
| Apr 15, 2026 | Request for crafting table and smithing table UI support. |