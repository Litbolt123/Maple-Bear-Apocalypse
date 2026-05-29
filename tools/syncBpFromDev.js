/**
 * Copy BP - Dev/scripts/*.js → BP/scripts/, skipping release-only mb_buildConfig.js.
 *
 *   npm run sync:bp-from-dev
 *   node tools/syncBpFromDev.js --dry-run
 */
import { copyFileSync, existsSync, readdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "BP - Dev", "scripts");
const destDir = join(root, "BP", "scripts");

/** Never overwrite release build gating. */
const SKIP_FILES = new Set(["mb_buildConfig.js"]);

const dryRun = process.argv.includes("--dry-run");

if (!existsSync(srcDir)) {
    console.error(`Missing ${srcDir}`);
    process.exit(1);
}
if (!existsSync(destDir)) {
    console.error(`Missing ${destDir}`);
    process.exit(1);
}

const copied = [];
const skipped = [];

for (const name of readdirSync(srcDir).sort()) {
    if (!name.endsWith(".js")) continue;
    const src = join(srcDir, name);
    if (!statSync(src).isFile()) continue;

    if (SKIP_FILES.has(name)) {
        skipped.push(name);
        continue;
    }

    const dest = join(destDir, name);
    if (!dryRun) {
        copyFileSync(src, dest);
    }
    copied.push(name);
}

console.log(
    dryRun
        ? `[dry-run] Would copy ${copied.length} file(s) from BP - Dev/scripts → BP/scripts`
        : `Copied ${copied.length} file(s) from BP - Dev/scripts → BP/scripts`
);
for (const name of copied) {
    console.log(`  ${name}`);
}
if (skipped.length) {
    console.log(`Skipped (release-only): ${skipped.join(", ")}`);
}
console.log("\nNext: npm run verify:build-config && npm run check");
