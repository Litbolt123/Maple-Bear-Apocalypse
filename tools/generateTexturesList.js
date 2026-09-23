/**
 * Write RP/textures/textures_list.json (and RP - Dev twin).
 * Bedrock Wiki: the list is a texture-path cache so the engine does not
 * walk the folder on every lookup (SirLich / solvedDev / Joelant05).
 *
 * Usage: node tools/generateTexturesList.js
 */
import { readdirSync, writeFileSync, statSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMAGE_EXT = new Set([".png", ".tga", ".jpg", ".jpeg", ".webp"]);
const PACKS = ["RP", "RP - Dev"];

function walkImages(dir, into) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
            walkImages(p, into);
            continue;
        }
        const lower = e.name.toLowerCase();
        const dot = lower.lastIndexOf(".");
        if (dot < 0) continue;
        const ext = lower.slice(dot);
        if (!IMAGE_EXT.has(ext)) continue;
        into.push(p);
    }
}

function toListEntry(packRoot, filePath) {
    const rel = relative(packRoot, filePath).replace(/\\/g, "/");
    const noExt = rel.replace(/\.(png|tga|jpg|jpeg|webp)$/i, "");
    return `textures/${noExt}`;
}

function writePack(packName) {
    const packRoot = join(root, packName);
    const texRoot = join(packRoot, "textures");
    const files = [];
    walkImages(texRoot, files);
    const entries = [...new Set(files.map((f) => toListEntry(packRoot, f)))].sort();
    const out = join(texRoot, "textures_list.json");
    writeFileSync(out, `${JSON.stringify(entries, null, "\t")}\n`, "utf8");
    console.log(`${packName}: ${entries.length} texture paths → textures/textures_list.json`);
    return entries.length;
}

let total = 0;
for (const pack of PACKS) {
    total += writePack(pack);
}
if (total === 0) {
    console.error("No textures found");
    process.exit(1);
}
