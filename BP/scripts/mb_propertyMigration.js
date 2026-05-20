/**
 * One-shot world migrations when dynamic property keys or schema change.
 * Bump CURRENT_SCHEMA and add branches when renaming keys (see docs/PLAYER_CHANGELOG.md).
 */

import { getWorldProperty, setWorldProperty, saveAllProperties } from "./mb_dynamicPropertyHandler.js";
import { ensureWorldLagComfortDefaults } from "./mb_codex.js";

const SCHEMA_WORLD_KEY = "mb_addon_schema_version";

/** Increment when you add a new migration block. */
export const CURRENT_PROPERTY_SCHEMA = 2;

/**
 * Run after world/properties are loadable. Safe to call once per session (idempotent).
 */
export function runWorldPropertyMigrations() {
    try {
        const raw = getWorldProperty(SCHEMA_WORLD_KEY);
        let v = 0;
        if (raw !== undefined && raw !== null && raw !== "") {
            const n = Number(raw);
            v = Number.isFinite(n) ? Math.floor(n) : 0;
        }

        if (v >= CURRENT_PROPERTY_SCHEMA) return;

        if (v < 2) {
            ensureWorldLagComfortDefaults();
        }

        setWorldProperty(SCHEMA_WORLD_KEY, CURRENT_PROPERTY_SCHEMA);
        try {
            saveAllProperties();
        } catch {
            /* ignore */
        }
    } catch {
        /* ignore — world not ready */
    }
}
