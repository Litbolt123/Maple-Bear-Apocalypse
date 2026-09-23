# Player goal and the keep-playing loop

**Status:** Standing design. Think with this while making M.B.A. Do **not** treat any example here as a build ticket.

**From:** August and Aiden Miller (2026-09-19). Aiden is working toward a **game design** degree. This is basic **player UX**, not a new mob. Vault person note: `People/Aiden.md`.

**Fits with:** [DESIGN_VISION.md](DESIGN_VISION.md) *No True Safety* (mining vs underground, flying vs sky). That counters *where* you hide. This note counters *stopping* — the obsidian cube, the fueled dome you never leave, the one item that ends the apocalypse.

---

## The problem

A player who builds an obsidian cube and sits inside it has **solved the addon** if the cube is immunity. As of 2026-09-19, mining and buff Maple Bears **chew** obsidian slowly (not instantly); bedrock and the ancient city portal stay closed. That makes the cube a delay, not a win — but delay-only is not the whole player goal. The same failure if one machine, biome, or craft **guarantees** survival.

We still need things that **help**. Help without a guarantee is the whole point. You can build toward being better at surviving. You cannot buy “I won, I can stop.”

Replay dies on a **one-shot solution**. A **fight and struggle** keeps people in the world — but only if it is not hopeless and not trivial. Balance is the job.

---

## The player goal (UX, not lore)

Ask this of every feature:

1. **What is the player trying to do this session?** Not “exist in a dusty world.” A goal they can name.
2. **How do they interact?** Fight, explore, maintain a machine, reclaim a lawn, run a trial — something they *do*, not only something that happens to them.
3. **If they turtle, does the world still demand they leave?** Infection, storms, fuel, repairs, a counter that only exists out there.
4. **Too hard or too easy?** Hopeless = they quit. Trivial = they box and quit. The band in the middle is motivating.
5. **After they succeed, is there a next loop?** If success is the end, they will not play it over and over.

The goal is **struggle plus progress**, not a finish button.

---

## The loop (keep going)

Keep people playing by making a loop they have to **keep up with**:

1. **Pressure at home** — powder, bears, storms. Sitting still gets worse.
2. **Leave to get a specific help** — an item, block, or recipe that answers *one* threat better. Not god mode.
3. **Come back stronger against that threat** — still can die. Still can lose the lawn.
4. **Upkeep or a different threat** sends them out again.

No one solution. The day clock and the infection already want to be this loop. Features should **feed** it, not let the player opt out.

### Exploration as urgency (example class, not a spec)

Aiden’s example: something that **helps against buff Maple Bears** (repel, resist, counter) but the only way to get it is a **heavy core** — you have to find a **trial chamber**. While you are gone, home is still rotting. That is urgency. You cannot stay where you are.

That is the **class**:

- The counter is **partial** (buffs, not flying, not mining, not the storm).
- The cost is **vanilla exploration** when we can (trial chambers, nether fortress, end city) so we are not inventing a custom dungeon first.
- Home **does not pause** while you are away.
- The next threat needs a **different** trip.

Do not implement a heavy-core buff-repeller until August asks. Use the class when designing gear, emulsifier fuel, and “safe” blocks.

---

## Honest tension with what we already have

These are useful. They become the cube if they **end** the loop:

| Thing now | Helps | Cube risk |
|-----------|--------|-----------|
| **Emulsifier** | Reclaim a bubble; fuel already costs | If the dome **guarantees** no bears and you never leave, it is the cube. Keep fuel, upkeep, and holes. |
| **Storm bunker** | Roof vs storm | Three blocks down forever is the cube for storms. Shelter can help; the world still needs a reason to go out. |
| **Mushroom fields / “safer” biomes** | Relatively quieter | Moving there and never leaving is a stay-put win. Safer ≠ solved. |
| **Enchanted golden apple + weakness** | Cure | Fine if infection can return. Bad if one apple ends the addon. |
| **Day 25 “victory”** | A milestone | Must not mean “stop playing.” Day 100 / post-credits still pressure. |
| **Planned bear gear** ([MBA_ITEMS_MASTER_PLAN.md](MBA_ITEMS_MASTER_PLAN.md)) | Fight → drop → repair/purify | Closer to the loop. Keep it rare, partial, hungry for materials. |
| **Quarantine / safe beacons** in [IDEA_BRAINSTORM.md](../development/planning/IDEA_BRAINSTORM.md) | Tempting | High cube risk. If we ever do them, they help a fight, they do not delete the apocalypse. |

*No True Safety* already says mining bears vs holes and flying vs sky. **Also** say: a perfect box is not a win.

Solo vs multiplayer: the loop has to work for one person **and** a realm. Do not design a goal that only a four-person raid can feed, then starve solo. Do not design a cube that one host can sit in while friends have nothing to do.

---

## Checklist (use while making)

Before adding a “this helps you survive” block, item, or biome:

- [ ] Names a **player goal** for the session (not only more threat).
- [ ] Helps **without guaranteeing** survival.
- [ ] Turtling still **loses ground** (or misses the only source).
- [ ] Success **spends** something (fuel, durability, a trip, a day).
- [ ] Answers **one** pressure, not every Maple Bear type.
- [ ] Not too hard, not too easy — we will tune when August playtests.
- [ ] After it works, the player still has a **reason to go out again**.

If a feature fails this list, it is flavor or a win button. Park it or redesign it.

---

## Parked examples (ideas only)

- Buff-bear counter gated on **heavy core** / trial chambers.
- Emulsifier fuel that **requires powder + a trip** (detox orb brainstorm already parked).
- Gear repair that needs **dense / purified snow** so you keep gathering (master plan).
- Counters that map onto **vanilla structures** (trial, fortress, monument, end city) instead of a custom “win dungeon.”

Implement none of these until August picks one.

---

*Keep this next to DESIGN_VISION. Update when a playtest proves a loop too hard, too easy, or too much of a cube.*
