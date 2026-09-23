/**
 * Copy a pack folder, then delete dest files that are gone from source.
 * Copy-only sync left deleted recipes loaded (duplicate crafting_table warning).
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from "fs";
import { join } from "path";

/** Dest-only folders the game/Bridge may keep. Never prune these. */
export const KEEP_DEST_ONLY = new Set(["_archived", ".git", ".bridge"]);

export function copyPackContents(srcRoot, destRoot, { dryRun = false } = {}) {
    for (const name of readdirSync(srcRoot)) {
        const src = join(srcRoot, name);
        const dest = join(destRoot, name);
        if (!dryRun) {
            cpSync(src, dest, { recursive: true, force: true });
        }
    }
}

/**
 * Remove dest files/folders that no longer exist in source.
 * @returns {string[]} relative paths removed (or that would be removed)
 */
export function pruneStaleDest(srcRoot, destRoot, { dryRun = false } = {}) {
    const removed = [];
    function walk(rel) {
        const destDir = rel ? join(destRoot, rel) : destRoot;
        if (!existsSync(destDir) || !statSync(destDir).isDirectory()) return;
        for (const name of readdirSync(destDir)) {
            if (!rel && KEEP_DEST_ONLY.has(name)) continue;
            const destPath = join(destDir, name);
            const srcPath = rel ? join(srcRoot, rel, name) : join(srcRoot, name);
            const childRel = rel ? join(rel, name) : name;
            if (!existsSync(srcPath)) {
                removed.push(childRel);
                if (!dryRun) rmSync(destPath, { recursive: true, force: true });
                continue;
            }
            try {
                if (statSync(destPath).isDirectory() && statSync(srcPath).isDirectory()) {
                    walk(childRel);
                }
            } catch {
                /* dest may have been removed */
            }
        }
    }
    walk("");
    return removed;
}

export function syncPackTree(srcRoot, destRoot, { dryRun = false } = {}) {
    copyPackContents(srcRoot, destRoot, { dryRun });
    return pruneStaleDest(srcRoot, destRoot, { dryRun });
}
