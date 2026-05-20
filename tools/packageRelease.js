/**
 * Zip pack folders for GitHub Releases (source trees — export .mcpack in Bridge locally).
 *
 *   node tools/packageRelease.js
 *   node tools/packageRelease.js --out dist
 */
import { execFileSync, execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outArg = process.argv.indexOf("--out");
const outDir = outArg >= 0 ? resolve(root, process.argv[outArg + 1] ?? "dist") : join(root, "dist");

const versionJson = execFileSync(process.execPath, [join(root, "tools/getVersion.js"), "--json"], {
    encoding: "utf8"
});
const { version, assetBase } = JSON.parse(versionJson.trim());

/** @type {{ dir: string, label: string }[]} */
const packs = [
    { dir: "BP", label: "BP" },
    { dir: "RP", label: "RP" },
    { dir: "BP - Dev", label: "BP-Dev" },
    { dir: "RP - Dev", label: "RP-Dev" }
];

for (const { dir } of packs) {
    if (!existsSync(join(root, dir))) {
        console.error(`Missing ${dir}/`);
        process.exit(1);
    }
}

if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

/**
 * @param {string} srcDirName folder at repo root (e.g. "BP")
 * @param {string} label short asset label (e.g. "BP-Dev")
 * @param {string} outFile
 */
function zipFolder(srcDirName, label, outFile) {
    const srcDir = join(root, srcDirName);
    const absOut = resolve(outFile);
    if (process.platform === "win32") {
        const ps = [
            "$ErrorActionPreference = 'Stop'",
            `if (Test-Path '${absOut.replace(/'/g, "''")}') { Remove-Item -Force '${absOut.replace(/'/g, "''")}' }`,
            `Compress-Archive -Path '${srcDir.replace(/'/g, "''")}' -DestinationPath '${absOut.replace(/'/g, "''")}' -CompressionLevel Optimal`
        ].join("; ");
        execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit", cwd: root });
    } else {
        execSync(`zip -r "${absOut}" "${srcDirName}" -x "*.git*"`, { stdio: "inherit", cwd: root });
    }
    console.log(`Wrote ${outFile}`);
}

const outputs = [];
for (const { dir, label } of packs) {
    const out = join(outDir, `${assetBase}-${label}.zip`);
    zipFolder(dir, label, out);
    outputs.push(out);
}

console.log(`\nRelease assets (${version}) — unzip, then open in Bridge or copy into a Bedrock project:`);
for (const p of outputs) {
    console.log(`  ${p}`);
}
