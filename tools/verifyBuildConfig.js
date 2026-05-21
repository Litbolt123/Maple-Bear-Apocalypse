/**
 * Fail if dev/release mb_buildConfig.js flags are swapped or missing.
 * Run before Bridge export: npm run verify:build-config
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readBuildConfig(relPath) {
    const path = join(root, relPath);
    const src = readFileSync(path, "utf8");
    const flavor = (src.match(/export const BUILD_FLAVOR = ["']([^"']+)["']/) || [])[1];
    const devTools = (src.match(/export const INCLUDE_FULL_DEVELOPER_TOOLS = (true|false)/) || [])[1];
    return { path: relPath, flavor, devTools: devTools === "true" };
}

const dev = readBuildConfig("BP - Dev/scripts/mb_buildConfig.js");
const release = readBuildConfig("BP/scripts/mb_buildConfig.js");

let ok = true;

if (dev.flavor !== "dev") {
    console.error(`${dev.path}: BUILD_FLAVOR must be "dev" (got "${dev.flavor}")`);
    ok = false;
}
if (!dev.devTools) {
    console.error(`${dev.path}: INCLUDE_FULL_DEVELOPER_TOOLS must be true for dev pack`);
    ok = false;
}
if (release.flavor !== "release") {
    console.error(`${release.path}: BUILD_FLAVOR must be "release" (got "${release.flavor}")`);
    ok = false;
}
if (release.devTools) {
    console.error(`${release.path}: INCLUDE_FULL_DEVELOPER_TOOLS must be false for release pack`);
    ok = false;
}

if (!ok) {
    process.exit(1);
}

console.log("OK  BP - Dev: INCLUDE_FULL_DEVELOPER_TOOLS = true");
console.log("OK  BP:      INCLUDE_FULL_DEVELOPER_TOOLS = false");
