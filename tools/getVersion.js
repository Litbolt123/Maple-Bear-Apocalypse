/**
 * Read addon semver from BP/scripts/mb_buildConfig.js (release pack = source of truth).
 *
 *   node tools/getVersion.js              → prints 0.9.0-beta.4
 *   node tools/getVersion.js --json       → {"version":"0.9.0-beta.4","prerelease":true,...}
 *   node tools/getVersion.js --github-output  → version=… and prerelease=… for GITHUB_OUTPUT
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildConfigPath = join(root, "BP/scripts/mb_buildConfig.js");
const src = readFileSync(buildConfigPath, "utf8");

function readConst(name, fallback = "") {
    const m = src.match(new RegExp(`export const ${name} = ["']([^"']+)["']`));
    return m ? m[1] : fallback;
}

function readNum(name) {
    const m = src.match(new RegExp(`export const ${name} = (\\d+)`));
    return m ? Number(m[1]) : 0;
}

const major = readNum("ADDON_VERSION_MAJOR");
const minor = readNum("ADDON_VERSION_MINOR");
const patch = readNum("ADDON_VERSION_PATCH");
const prereleaseMatch = src.match(/export const ADDON_VERSION_PRERELEASE = ["']([^"']*)["']/);
const prerelease = prereleaseMatch ? prereleaseMatch[1] : "";
const packName = readConst("PACK_DISPLAY_NAME", "The Maple Bear Apocalypse");

const core = `${major}.${minor}.${patch}`;
const version = prerelease ? `${core}-${prerelease}` : core;
const isPrerelease = Boolean(prerelease);
const tag = `v${version}`;
const assetBase = `${packName.replace(/\s+/g, "_")}_v${version}`;

const info = {
    version,
    tag,
    prerelease: isPrerelease,
    packDisplayName: packName,
    assetBase,
    manifestTriple: [major, minor, patch]
};

const args = process.argv.slice(2);
if (args.includes("--json")) {
    console.log(JSON.stringify(info));
} else if (args.includes("--github-output")) {
    console.log(`version=${version}`);
    console.log(`prerelease=${isPrerelease}`);
    console.log(`tag=${tag}`);
    console.log(`asset_base=${assetBase}`);
} else {
    console.log(version);
}
