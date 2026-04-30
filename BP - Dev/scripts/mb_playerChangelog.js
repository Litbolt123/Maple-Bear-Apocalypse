/**
 * Player-facing "what changed" text (journal + docs/PLAYER_CHANGELOG.md).
 * Bump PLAYER_CHANGELOG_VERSION when you edit bullets for a new beta.
 */

import { getAddonVersionDisplayString } from "./mb_buildConfig.js";

export const PLAYER_CHANGELOG_VERSION = "0.9.0-beta.3";

/** @returns {string} Formatted body for ActionFormData (Minecraft color codes). */
export function getPlayerChangelogBody() {
    const ver = getAddonVersionDisplayString();
    const lines = [
        `§eMapleBear TakeOver §7— §f${ver}`,
        "",
        "§7Recent highlights:",
        "§8• §7Storms: lighter work when no overworld player is near the storm (particles/snow reduced); lifecycle unchanged",
        "§8• §7Bear population cull: tighter global threshold and dev tuning (types/caps; dev pack)",
        "§8• §7Mining bears: cheaper pathfinding cleanup on busy worlds",
        "§8• §7Codex storm hub clarifies concurrent storm limit vs engine cap",
        "",
        "§8Full notes: §7see docs/PLAYER_CHANGELOG.md in the repo"
    ];
    return lines.join("\n");
}
