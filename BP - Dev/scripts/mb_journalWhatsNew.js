/**
 * Powdery Journal — "What's new" screen (content from mb_playerChangelog.js).
 */

import { ActionFormData } from "@minecraft/server-ui";
import { getPlayerChangelogBody } from "./mb_playerChangelog.js";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => void} onBack
 * @param {number} [volumeMultiplier]
 */
export function showJournalWhatsNew(player, onBack, volumeMultiplier = 0.85) {
    try {
        const form = new ActionFormData().title("§aWhat's new");
        form.body(getPlayerChangelogBody());
        form.button("§8Back");
        form.show(player).then((res) => {
            try {
                player.playSound("mb.codex_turn_page", { pitch: 1.0, volume: 0.8 * volumeMultiplier });
            } catch { /* ignore */ }
            if (!res || res.canceled || res.selection === 0) {
                onBack();
            }
        }).catch(() => onBack());
    } catch {
        onBack();
    }
}
