/**
 * Copy GitHub pack trees into the two Bridge projects August actually opens.
 *
 * GitHub is git canonical. Bridge folders are what you compile / play from.
 * Editing only Maple-Bear-Take-Over does not update in-game until this (or a
 * manual copy) runs.
 *
 *   npm run sync:bridge
 *   node tools/syncRepoToBridge.js --dry-run
 *
 * Maps:
 *   repo BP/      + RP/      →  .../Maple Bear Apocalypse/BP + RP          (release)
 *   repo BP - Dev + RP - Dev →  .../Maple Bear Apocalypse - Dev/BP + RP    (dev)
 *
 * Does not touch Bridge `.bridge/`, `builds/`, or that project's `config.json`.
 * After copy, dest files that were deleted in git are pruned (stale recipes otherwise stay loaded).
 */
import { existsSync, statSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { syncPackTree } from "./copyPackTree.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

function bridgeProjectsRoot() {
    const local = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    return join(local, "com.bridge.dev", "bridge", "projects");
}

const PAIRS = [
    {
        label: "Release Bridge (Maple Bear Apocalypse)",
        destProject: "Maple Bear Apocalypse",
        packs: [
            { src: join(root, "BP"), destName: "BP" },
            { src: join(root, "RP"), destName: "RP" }
        ]
    },
    {
        label: "Dev Bridge (Maple Bear Apocalypse - Dev)",
        destProject: "Maple Bear Apocalypse - Dev",
        packs: [
            { src: join(root, "BP - Dev"), destName: "BP" },
            { src: join(root, "RP - Dev"), destName: "RP" }
        ]
    }
];

function copyPackContents(srcRoot, destRoot) {
    const pruned = syncPackTree(srcRoot, destRoot, { dryRun });
    if (pruned.length) {
        const prefix = dryRun ? "    [dry-run] would prune" : "    Pruned";
        for (const p of pruned) console.log(`${prefix} ${p}`);
    }
}

let copied = 0;
let missing = 0;
const bridgeRoot = bridgeProjectsRoot();

console.log(dryRun ? "[dry-run] GitHub → Bridge pack sync\n" : "GitHub → Bridge pack sync\n");
console.log(`Bridge projects: ${bridgeRoot}`);

for (const pair of PAIRS) {
    const projectDir = join(bridgeRoot, pair.destProject);
    console.log(`\n${pair.label}`);
    console.log(`  Project: ${projectDir}`);
    if (!existsSync(projectDir)) {
        console.warn("  Missing Bridge project folder — skip.");
        missing += 1;
        continue;
    }
    for (const pack of pair.packs) {
        const destRoot = join(projectDir, pack.destName);
        if (!existsSync(pack.src)) {
            console.error(`  Missing source: ${pack.src}`);
            process.exit(1);
        }
        if (!existsSync(destRoot) || !statSync(destRoot).isDirectory()) {
            console.warn(`  Missing dest pack folder: ${destRoot} — skip.`);
            missing += 1;
            continue;
        }
        console.log(dryRun ? `  [dry-run] ${pack.src} → ${destRoot}` : `  Syncing ${pack.destName} ← ${pack.src}`);
        copyPackContents(pack.src, destRoot);
        copied += 1;
    }
}

if (copied === 0) {
    console.error("\nNothing copied.");
    process.exit(1);
}

console.log(
    dryRun
        ? `\n[dry-run] Would update ${copied} pack folder(s).`
        : `\nUpdated ${copied} pack folder(s). Recompile / refresh in Bridge, then reload the world.`
);
if (missing) {
    console.warn(`Skipped ${missing} missing path(s).`);
}
