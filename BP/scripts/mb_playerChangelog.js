/**
 * Player-facing "what changed" text (journal + docs/PLAYER_CHANGELOG.md).
 * Bump PLAYER_CHANGELOG_VERSION when you edit bullets for a new beta.
 */

import { getAddonVersionDisplayString } from "./mb_buildConfig.js";

export const PLAYER_CHANGELOG_VERSION = "0.9.0-beta.4";

/** @returns {string} Formatted body for ActionFormData (Minecraft color codes). */
export function getPlayerChangelogBody() {
    const ver = getAddonVersionDisplayString();
    const lines = [
        `§eMapleBear TakeOver §7— §f${ver}`,
        "",
        "§7Recent highlights:",
        "§8• §7Performance: smoother day 0–1 and village approach (spread work, smaller scans)",
        "§8• §7Buff bears: death explosion back; kills respect victim size",
        "§8• §7Buff cap on all paths — storms/conversions spawn infected when over limit",
        "§8• §7Storms: no double convert on bear kills; storm waves respect buff cap",
        "",
        "§8Full notes: §7see docs/PLAYER_CHANGELOG.md in the repo"
    ];
    return lines.join("\n");
}
