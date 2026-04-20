#!/usr/bin/env node
/**
 * Cross-platform JS syntax check for all behavior-pack scripts.
 * Uses `node --check` (parse only; does not execute @minecraft/server imports).
 *
 * Usage:
 *   node tools/testAllScripts.js
 *   node tools/testAllScripts.js --release-only   # BP/scripts only
 *
 * Full repo gate: npm run check  (JSON + this + ESLint)
 */

import { readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");

const ARGS = new Set(process.argv.slice(2));
const RELEASE_ONLY = ARGS.has("--release-only");

const SCRIPT_DIRS = RELEASE_ONLY
    ? [join(ROOT, "BP", "scripts")]
    : [join(ROOT, "BP", "scripts"), join(ROOT, "BP - Dev", "scripts")];

function walkJsFiles(dir, acc = []) {
    let st;
    try {
        st = statSync(dir);
    } catch {
        return acc;
    }
    if (!st.isDirectory()) return acc;
    for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walkJsFiles(p, acc);
        else if (name.name.endsWith(".js")) acc.push(p);
    }
    return acc;
}

function main() {
    const files = [];
    for (const d of SCRIPT_DIRS) {
        walkJsFiles(d, files);
    }
    files.sort((a, b) => a.localeCompare(b));

    const failures = [];
    console.log("Maple Bear — JS syntax check (node --check)\n");
    for (const file of files) {
        const rel = relative(ROOT, file).replace(/\\/g, "/");
        try {
            execFileSync(process.execPath, ["--check", file], {
                stdio: ["ignore", "pipe", "pipe"]
            });
            console.log(`  OK  ${rel}`);
        } catch (e) {
            console.error(`  FAIL ${rel}`);
            if (e?.stderr?.length) process.stderr.write(e.stderr);
            if (e?.stdout?.length) process.stderr.write(e.stdout);
            if (e?.message) console.error(e.message);
            failures.push(rel);
        }
    }

    console.log(`\nSummary: ${files.length} file(s), ${failures.length} failure(s).`);
    if (failures.length) {
        console.error("\nFailed:", failures.join(", "));
        process.exit(1);
    }
}

main();
