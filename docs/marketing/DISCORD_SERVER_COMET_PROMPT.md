# Comet AI prompt — Maple Bear Discord server

**Copy everything below the line into Comet** to generate channel layout, rules, role names, welcome text, topic descriptions, and optional bot/rule suggestions. Fill in `[PLACEHOLDERS]` yourself where noted.

---

## Prompt (paste from here)

You are helping **Litbolt123** and **Compoohter** set up an official **Discord server** for their Minecraft Bedrock addon **Maple Bear Apocalypse** (short name: **M.B.A**). This is the community hub for beta players, co-op groups, bug reports, and updates — not a generic gaming server.

### Canonical names (use exactly)

- **Short:** **M.B.A**
- **Full:** **Maple Bear Apocalypse**
- **Archived — do not use in new copy:** "Maple Bear Takeover" / "MapleBear TakeOver" (old title only)
- **Creators:** Litbolt123 & Compoohter
- **Platform:** Minecraft **Bedrock Edition** only (not Java)
- **Current beta label:** v0.9.0-beta.3
- **Tagline (use sparingly, one line max in welcome):** *Don't do drugs kids…* — tone marker, not a lecture

### What the addon is (one paragraph for your context)

Bedrock behavior + resource pack invasion/survival addon. Days unlock deadlier Maple Bears (tiny → infected → buff → flying → mining → torpedo). White powder infection, cures, multi-storm weather, infected overworld biomes on new worlds (**1.26.2+: no world experiments required**), Powdery Journal codex, Nether/End pressure. Co-op-first, solo OK. Slow-burn dread, not jump-scare horror. Public release is **`BP/` + `RP/`** only; creators use internal dev packs — do not tell members to download "dev" packs from random links.

### Server goals (design for these)

1. **Welcome & orient** new players (install both packs, fresh world tip, **1.26.2+ no experiments**, where download lives).
2. **Co-op LFG** — find realm buddies, share journal knowledge without spoiling everything.
3. **Beta feedback** — bugs, lag, balance feel; link to GitHub issues when appropriate.
4. **Announcements** — changelog-style updates (read-only channel).
5. **Community vibe** — survival/horror fans, memes OK but not toxic; spoilers in dedicated channels.
6. **Creator space** — staff channels for Litbolt123 & Compoohter (not public).

### Tone & voice for all copy you write

- Warm, slightly eerie, **not** try-hard edgy. Think: "the world won't stay clean" energy.
- Clear and short — Discord mobile readers.
- **No** heavy spoiler dumps in #rules or #welcome (journal discoveries are part of the game).
- **No** real-world drug encouragement; the powder is fictional mystery.
- Professional enough for parents/teens; Minecraft ESRB-aware community standards.
- Emojis: light use (snow, bear, book for journal) — don't overload.

### Deliverables — produce all of these

1. **Server name + description** (Discord discovery blurb, ≤ 120 chars where needed).
2. **Welcome / rules channel** — single pinned-friendly post: be kind, Bedrock only, no impersonating the project/creators, no republishing the pack under our name, spoiler tags, no illegal/pirated content, GitHub for bug reports `[GITHUB_ISSUES_URL]`.
3. **Channel structure** — categories + channel names + one-line topic each. Suggested minimum set:
   - **START HERE:** rules, announcements, download/links `[DOWNLOAD_LINK]`, faq
   - **INVASION:** general chat, media/screenshots, spoilers (journal/lore), suggestions
   - **CO-OP:** lfg-bedrock, realm-invites (optional), voice optional note
   - **SUPPORT:** bugs-and-crashes, performance-tips, install-help
   - **CREATORS (private):** staff-chat, dev-log (describe who sees it)
4. **Role list** — names, colors (hex ideas), who gets them: e.g. `@Founders`, `@Developer`, `@Beta Tester`, `@Member`, `@Bot`; optional `@Announcements ping`. Permissions: founders/dev post in announcements; members read-only there.
5. **#faq content** — 8–12 Q&As: Bedrock vs Java, world experiments (not needed on 1.26.2+), is it a map?, multiplayer/realm, cheats/Host tools for hosts, version, where to report bugs, "is it finished?" (beta honesty).
6. **Welcome DM or #start-here hook** — 3–5 sentences + bullet "first steps in game."
7. **Optional:** 3 slowmode / automod suggestions; 2 channel topic templates for release day.

### Hard constraints

- Do **not** invent download URLs, Patreon tiers, or CurseForge links — use placeholders `[DOWNLOAD_LINK]`, `[PATREON_URL]`, `[GITHUB_REPO]`, `[GITHUB_ISSUES_URL]`.
- Do **not** promise features or dates we didn't ship (Day 100 arc is vision, not "coming next week").
- Do **not** instruct users to publish forks named **M.B.A** / Maple Bear Apocalypse or use our pack icon — point to "unofficial forks must rename and rebrand."
- Keep **spoiler policy**: major journal/cure details only in #spoilers or spoiler tags.

### Branding notes for visuals (text only — we add art later)

- Mood: pale sky, dusted ground, corrupted forest, small bears → worse bears, journal book.
- Colors: cold greys, off-white, muted red accents (infection), not neon rainbow.
- Server icon suggestion: describe using pack icon or infected biome screenshot `[SERVER_ICON_NOTE]`.

### Reference links (placeholders)

- GitHub: `https://github.com/Litbolt123/Maple-Bear-Apocalypse`
- Issues: `https://github.com/Litbolt123/Maple-Bear-Apocalypse/issues`
- Patreon: `[PATREON_URL]`

### Output format

Use markdown headings. For each channel, give: **#channel-name** | topic line | who can post. End with a **launch checklist** (10 items) for the server owner after Comet generates the layout.

---

## After Comet responds (owner checklist)

- [ ] Replace all `[PLACEHOLDERS]` with real links
- [ ] Set server icon & banner from `RP/pack_icon.png` or screenshot
- [ ] Create roles before opening public invite
- [ ] Pin rules + download message in #rules or #start-here
- [ ] Wire announcement webhook or post first "v0.9.0-beta.3" welcome
- [ ] Paste `[DISCORD_LINK]` into Patreon draft when invite is stable
- [ ] Enable verification level / automod per Comet suggestions
- [ ] Test one LFG post format in #lfg-bedrock

---

*Internal reference: [NAMING.md](NAMING.md), [DESIGN_VISION.md](../design/DESIGN_VISION.md), [PATREON_FIRST_POST_DRAFT.md](PATREON_FIRST_POST_DRAFT.md)*
