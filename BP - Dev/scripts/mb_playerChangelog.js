/**
 * Player-facing "what changed" text (journal + docs/PLAYER_CHANGELOG.md).
 * Bump PLAYER_CHANGELOG_VERSION when you edit bullets for a new beta.
 */

import { getAddonVersionDisplayString } from "./mb_buildConfig.js";

export const PLAYER_CHANGELOG_VERSION = "0.9.0-beta.1";

/** @returns {string} Formatted body for ActionFormData (Minecraft color codes). */
export function getPlayerChangelogBody() {
    const ver = getAddonVersionDisplayString();
    const lines = [
        `§eMapleBear TakeOver §7— §f${ver}`,
        "",
        "§7Recent highlights:",
        "§8• §7Spawn caps tuned for infected & flying bears",
        "§8• §7Natural buff bears: cooldown between spawn-controller spawns",
        "§8• §7Journal: optional \"What's new\" entry",
        "§8• §7Dev: optional bear-count telemetry (Spawn debug)",
        "",
        "§8Full notes: §7see docs/PLAYER_CHANGELOG.md in the repo"
    ];
    return lines.join("\n");
}
