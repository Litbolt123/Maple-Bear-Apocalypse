/**
 * Player-facing "what changed" text (journal + docs/PLAYER_CHANGELOG.md).
 * Bump PLAYER_CHANGELOG_VERSION when you edit bullets for a new beta.
 */

import { getAddonVersionDisplayString } from "./mb_buildConfig.js";

export const PLAYER_CHANGELOG_VERSION = "0.9.0-beta.2";

/** @returns {string} Formatted body for ActionFormData (Minecraft color codes). */
export function getPlayerChangelogBody() {
    const ver = getAddonVersionDisplayString();
    const lines = [
        `§eMapleBear TakeOver §7— §f${ver}`,
        "",
        "§7Recent highlights:",
        "§8• §7Storms: difficulty sets first storm day (Hard 2 / Normal 4 / Easy 6); minors through day 10, majors from day 11, only majors after day 20",
        "§8• §7Journal / Biomes: storm entry covers schedule, shelter, and emulsifier reclaim",
        "§8• §7Performance: spawn load still auto-throttles scans when the world is heavy",
        "§8• §7Spawn caps, buff cooldown, What's new (see full changelog in repo)",
        "",
        "§8Full notes: §7see docs/PLAYER_CHANGELOG.md in the repo"
    ];
    return lines.join("\n");
}
