Summary: "notification ui thingy" Thread (Bedrock Add-Ons Discord)
Source: #dev-resources > notification ui thingy thread in the Bedrock Add-Ons Discord

Author/OP: Alien Edds

What It Is
This thread covers a custom toast-style notification UI system for Minecraft Bedrock Edition addons. The OP (Alien Edds) built a UI overlay that mimics Minecraft's recipe-unlock toast pop-up, allowing addon developers to send custom notifications with icons to players.

How It Works
The system intercepts the chat panel (not the title/subtitle system) and uses custom JSON UI files to render notifications. It hooks into the chat message stream by prefixing messages with toast. — the UI then detects those messages and displays them as toast notifications instead of regular chat messages. This approach allows multiple notifications to stack (unlike the old title-based approach, which would get overwritten by other title commands).

Key Files (4 total)
hud_screen.json — Main UI panel definition, anchored top-right, 4 KB

chat_screen.json — Filters messages starting with toast. from the chat display, 1 KB

style_dark.json — Nine-slice texture styling for the notification panel, 1 KB

Texture file — Placed in the textures/ folder; referenced via its path (e.g., textures/style_dark)

hud_screen.json and chat_screen.json go in the UI folder. style_dark.json goes alongside them.

Code Examples
TypeScript — sendNotification function
typescript
import { Player, system, world } from "@minecraft/server";

export function sendNotification(
  player: Player,
  message: string,
  icon: string,
  playSound?: boolean
) {
  if (playSound === undefined || playSound)
    player.playSound("random.toast_recipe_unlocking_in");

  const text = (
    `toast.${message}${message.length < 200 ? "$".repeat(200 - message.length) : ""}${icon}${icon.length < 200 ? "$".repeat(200 - icon.length) : ""}`
  );

  player.sendMessage(text);

  if (playSound === undefined || playSound)
    system.runTimeout(() => {
      if (player && player.isValid())
        player.playSound("random.toast_recipe_unlocking_out");
    }, 108);
}
JavaScript — sendNotification function
javascript
import { system } from "@minecraft/server";

export function sendNotification(player, message, icon, playSound) {
  if (playSound === undefined || playSound)
    player.playSound("random.toast_recipe_unlocking_in");

  const text = (
    `toast.${message}${message.length < 200 ? "$".repeat(200 - message.length) : ""}${icon}${icon.length < 200 ? "$".repeat(200 - icon.length) : ""}`
  );

  player.sendMessage(text);

  if (playSound === undefined || playSound)
    system.runTimeout(() => {
      if (player && player.isValid())
        player.playSound("random.toast_recipe_unlocking_out");
    }, 108);
}
chat_screen.json — Filtering toast messages from chat
json
{
  "messages_text/text": {
    "bindings": [
      {
        "binding_type": "view",
        "source_property_name": "(('§\u001b' + #text + '§r') - ('§\u001b' + 'toast.') = ('§\u001b' + #text + '§r'))"
      }
    ]
  }
}
style_dark.json — Nine-slice texture config (partial)
json
{
  "nineslice_size": [2, 2, 2, 2]
}
/tellraw alternative (no texture support)
text
/tellraw @s {"rawtext":[{"text": "toast.test message"}]}
Note: /tellraw works but you can't include textures unless you manually type out the $ padding characters.

Thread Discussion Highlights
Date	Topic
Feb 4, 2025	Questions about preventing notifications from being overwritten by other title commands. Alien Edds says to use the chat panel instead (but didn't know how at the time).
Mar 7, 2025	Major update — Alien Edds figured out how to use the chat panel. Shared all 4 files + TS/JS sendNotification functions. Notifications can now stack.
Mar 7, 2025	Also noted /tellraw can trigger notifications, but without texture support.
Jan 16, 2026	User asks how to make notifications stack vertically (on top of each other). Alien Edds suggests offsetting the factory element by its own size.
Jan 22, 2026	User requests a ready-made .mcpack template. Alien Edds declines (no time), notes it's only 4 files.
Feb 7, 2026	User reports the old (pre-update) version now just sends text in chat. Alien Edds confirms the new version still works and is used in his "Core Craft" addon.
Apr 12, 2026	User asks about translation key support. Alien Edds confirms it works — put texture references first, text last.
Apr 14–15, 2026	PHNTOMXD reports a broken texture (error texture showing). Fix: correct the texture path. Goes in the textures/ folder.
Apr 15, 2026	Daniel asks where to put the files — answer: hud_screen.json and chat_screen.json go in the UI folder.
Markdown File
Here is the full .md file content ready for you to save as notification-ui-thingy.md:

text
# Notification UI Thingy — Minecraft Bedrock Addon
**Source:** Bedrock Add-Ons Discord · `#dev-resources > notification ui thingy`  
**Author/OP:** Alien Edds  
**Thread dates:** Feb 4, 2025 – Apr 17, 2026

---

## Overview

A custom toast-style notification UI for Minecraft Bedrock Edition addons. Uses the chat panel (not title/subtitle) and custom JSON UI to display stackable pop-up notifications with icons.

Notifications are triggered by sending a chat message prefixed with `toast.` — the UI intercepts these and renders them as toast pop-ups instead of showing them in chat.

---

## Files Required (4 total)

| File | Location | Size |
|---|---|---|
| `hud_screen.json` | `ui/` folder | ~4 KB |
| `chat_screen.json` | `ui/` folder | ~1 KB |
| `style_dark.json` | `ui/` folder | ~1 KB |
| Texture file | `textures/` folder | varies |

---

## Code Examples

### TypeScript — sendNotification

```typescript
import { Player, system, world } from "@minecraft/server";

export function sendNotification(
  player: Player,
  message: string,
  icon: string,
  playSound?: boolean
) {
  if (playSound === undefined || playSound)
    player.playSound("random.toast_recipe_unlocking_in");

  const text = (
    `toast.${message}${message.length < 200 ? "$".repeat(200 - message.length) : ""}${icon}${icon.length < 200 ? "$".repeat(200 - icon.length) : ""}`
  );

  player.sendMessage(text);

  if (playSound === undefined || playSound)
    system.runTimeout(() => {
      if (player && player.isValid())
        player.playSound("random.toast_recipe_unlocking_out");
    }, 108);
}
```

### JavaScript — sendNotification

```javascript
import { system } from "@minecraft/server";

export function sendNotification(player, message, icon, playSound) {
  if (playSound === undefined || playSound)
    player.playSound("random.toast_recipe_unlocking_in");

  const text = (
    `toast.${message}${message.length < 200 ? "$".repeat(200 - message.length) : ""}${icon}${icon.length < 200 ? "$".repeat(200 - icon.length) : ""}`
  );

  player.sendMessage(text);

  if (playSound === undefined || playSound)
    system.runTimeout(() => {
      if (player && player.isValid())
        player.playSound("random.toast_recipe_unlocking_out");
    }, 108);
}
```

### chat_screen.json — Filter toast messages from chat

```json
{
  "messages_text/text": {
    "bindings": [
      {
        "binding_type": "view",
        "source_property_name": "(('§\u001b' + #text + '§r') - ('§\u001b' + 'toast.') = ('§\u001b' + #text + '§r'))"
      }
    ]
  }
}
```

### style_dark.json — Nine-slice texture config (partial)

```json
{
  "nineslice_size":[1]
}
```

### /tellraw Alternative (no texture support)
/tellraw @s {"rawtext":[{"text": "toast.test message"}]}

text

> **Note:** `/tellraw` can trigger notifications but cannot display textures unless the `$` padding characters are manually typed out.

---

## How Stacking Works

By default notifications appear one below the other. To stack them on top of each other, Alien Edds suggests **offsetting the factory element by its own size** in the JSON UI.

---

## Translation Key Support

Yes — translation keys work. Put all texture references **first**, then the text **last** in the message string.

---

## Tips & Troubleshooting

- **Texture shows as error texture?** → Make sure the texture path is correct (e.g., `textures/style_dark`).
- **Notification just shows in chat?** → You're likely using the old (pre-March 2025) version or set up the files incorrectly.
- **Files go in wrong place?** → `hud_screen.json` and `chat_screen.json` → `ui/` folder. Texture → `textures/` folder.
- **Notifications getting overwritten?** → Make sure you're using the chat panel version (March 2025 update), not the title-based version.

---

## Thread Timeline

| Date | Event |
|---|---|
| Feb 4, 2025 | Questions about title command interference. Chat panel suggested as fix. |
| Mar 7, 2025 | **Major update**: chat panel implementation released. Files + TS/JS functions shared. |
| Mar 7, 2025 | `/tellraw` method noted (no texture support). |
| Jan 16, 2026 | Stacking discussion — offset factory by its own size. |
| Jan 22, 2026 | Request for `.mcpack` template declined (only 4 files anyway). |
| Feb 7, 2026 | Confirmed still working on latest update (used in Core Craft addon). |
| Apr 12, 2026 | Translation key support confirmed. Texture refs go first, text last. |
| Apr 14–15, 2026 | Texture path fix. Files go in `ui/` folder. |
| Apr 17, 2026 | Community thanks. |

---

## MapleBear — future (not implemented)

Ideas for later: route some player feedback through toast-style notifications instead of chat where appropriate; a **quests / achievements log** in the journal; **loot or rewards** for killing buff bears (with optional rare rolls for other bear types). No gameplay or UI work for these until explicitly scheduled.