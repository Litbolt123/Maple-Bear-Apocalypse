/**
 * Player-facing "what changed" text (journal + docs/PLAYER_CHANGELOG.md).
 * Bump PLAYER_CHANGELOG_VERSION when you edit bullets for a new beta
 * or when player-facing work lands (so Journal What's new shows unread).
 */

import {
    BUILD_FLAVOR,
    getAddonVersionDisplayString,
    PACK_DISPLAY_NAME,
    PACK_DISPLAY_NAME_DEV
} from "./mb_buildConfig.js";

export const PLAYER_CHANGELOG_VERSION = "0.9.0-beta.5.10";

/** Human label for journal What's new title (not raw semver). */
export function getPlayerChangelogDisplayLabel() {
    const m = PLAYER_CHANGELOG_VERSION.match(/beta\.(\d+)(?:\.(\d+))?/);
    if (m) return m[2] ? `Beta ${m[1]}.${m[2]}` : `Beta ${m[1]}`;
    return PLAYER_CHANGELOG_VERSION;
}

/** @param {object} [codex] Player codex from getCodex() */
export function isPlayerChangelogUnread(codex) {
    const seen = codex?.journal?.whatsNewLastSeenVersion;
    return seen !== PLAYER_CHANGELOG_VERSION;
}

/** @returns {string} Formatted body for ActionFormData (Minecraft color codes). */
export function getPlayerChangelogBody() {
    const ver = getAddonVersionDisplayString();
    const label = getPlayerChangelogDisplayLabel();
    const packName = BUILD_FLAVOR === "dev" ? PACK_DISPLAY_NAME_DEV : PACK_DISPLAY_NAME;
    const lines = [
        `§e${packName}`,
        `§7${ver}`,
        "",
        `§6${label}`,
        "§7Highlights:",
        "§8• §7Dusty grass plants spawn on the ground (not in the air in the trees)",
        "§8• §7Dusty firefly bushes do not grow in infected forests (vanilla ones by water still convert)",
        "§8• §7Podzol infects to dusty dirt for now. Coarse dirt stays clean.",
        "§8• §7Dusty vines look like vanilla vines with a white powder tint (not a cream box)",
        "§8• §7Dusty plants: grass, ferns, mushrooms, vines, leaf litter — convert; forests grow those dusty plants (not firefly bushes)",
        "§8• §7Dusty leaf litter stays brown leaf-shaped with powder on it",
        "§8• §7Dusty tree leaves keep climbing to the cream powder stage",
        "§8• §7Partly dusty leaves and logs can infect healthy neighbors; fully dusty ones check the six faces (no green holes left in the canopy)",
        "§8• §7Mining Maple Bears chew obsidian and other diamond-slow blocks (~5s each). Buff smash can still break those, but much less often than stone. Bedrock and portals stay unbreakable.",
        "§8• §7Dusty grass plants match vanilla blades (powder color, thinner at the base)",
        "§8• §7Dusty double tall grass and large ferns are two blocks tall (converting vanilla tall grass no longer breaks the plant)",
        "§8• §7Tree dust climbs the trunk from the ground (or down from the canopy), one log at a time — even on day 100. Mid-dust leaves keep going to cream.",
        "§8• §7Powder crawls slower on podzol and mycelium, and slower still in mushroom fields and giant taiga. Those biomes are not a hideout.",
        "§8• §7Vanilla mushrooms resist the powder more than grass. They do not clean it.",
        "§8• §7Emulsifier: powder plates → air; leaves sometimes vanish; dusty dirt can grow grass (nether: netherrack/nylium)",
        "§8• §7Older Maple Bears burn in fire and lava",
        "§8• §7Day 100+ titles stay on screen; dusty forests hitch less (scans share the tick when the world is busy or when two players are in)",
        "",
        "§8Full notes: §7docs/PLAYER_CHANGELOG.md · after beta.5"
    ];
    return lines.join("\n");
}
