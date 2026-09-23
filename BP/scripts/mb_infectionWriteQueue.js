/**
 * Host infection block writes (kill spread + storm snow).
 *
 * One `system.runJob` generator drains until the queues are empty.
 * `@minecraft/server` 2.10.0: `runJob(generator: Generator<void, void, void>): number`.
 * The generator runs until it yields or returns. A yield pauses until the next tick.
 * This module never calls `clearJob` while work remains, and it does not drop the tail
 * when a slice ends — leftover kill writes and snow attempts stay queued.
 *
 * A normal kill converts at most 20 blocks. The dust slice is larger than that, so those
 * writes finish in one resume. Storm placement count is unchanged; each wave is chewed
 * across resumes instead of in the storm tick.
 */

import { system } from "@minecraft/server";

/** Dust `setType`s per resume. Must stay above the per-kill cap (20). */
const DUST_WRITES_PER_SLICE = 24;
/** Surface searches per resume. Matches the old storm per-tick attempt cap. */
const SNOW_ATTEMPTS_PER_SLICE = 8;

/** Applier asked to try this write again on a later resume (chunk not loaded yet). */
export const WRITE_RETRY = "retry";

/** @type {{ x: number, y: number, z: number, dimension: import("@minecraft/server").Dimension, key: string, retries?: number }[]} */
const dustWrites = [];

/**
 * @type {{
 *   target: number,
 *   maxAttempts: number,
 *   placed: number,
 *   iter: number,
 *   cancelled?: boolean,
 *   attempt: () => true | false | "pause" | "stop",
 *   onDone?: (placed: number, iter: number) => void
 * }[]}
 */
const snowWaves = [];

/** @type {number | null} */
let jobId = null;

/** @type {((job: object) => true | false | "retry") | null} */
let dustApplier = null;

export function setDustedDirtWriteApplier(fn) {
    dustApplier = fn;
}

export function getDustedDirtQueueLength() {
    return dustWrites.length;
}

export function enqueueDustedDirtConversion(job) {
    dustWrites.push(job);
    ensureJob();
}

export function enqueueSnowPlacementWave(wave) {
    snowWaves.push(wave);
    ensureJob();
}

export function getInfectionWriteQueueSnapshot() {
    let snowPlaced = 0;
    let snowTarget = 0;
    for (const wave of snowWaves) {
        snowPlaced += wave.placed ?? 0;
        snowTarget += wave.target ?? 0;
    }
    return {
        jobRunning: jobId != null,
        dustQueued: dustWrites.length,
        snowWaves: snowWaves.length,
        snowPlaced,
        snowTarget,
        writeSlice: DUST_WRITES_PER_SLICE,
        snowAttemptsPerSlice: SNOW_ATTEMPTS_PER_SLICE
    };
}

function safeWaveDone(wave) {
    if (!wave || wave._done) return;
    wave._done = true;
    try {
        wave.onDone?.(wave.placed ?? 0, wave.iter ?? 0);
    } catch {
        /* debug log only */
    }
}

function ensureJob() {
    if (jobId != null) return;
    if (dustWrites.length === 0 && snowWaves.length === 0) return;
    jobId = system.runJob(drainInfectionWrites());
}

function* drainInfectionWrites() {
    try {
        // Let the caller finish enqueueing this tick's burst before the first slice.
        // runJob may enter the generator immediately; this yield returns control.
        // A later resume still drains until empty. Nothing is discarded here.
        yield;
        while (dustWrites.length > 0 || snowWaves.length > 0) {
            let ops = 0;

            while (dustWrites.length > 0 && ops < DUST_WRITES_PER_SLICE) {
                const job = dustWrites.shift();
                let result = false;
                try {
                    result = typeof dustApplier === "function" ? dustApplier(job) : WRITE_RETRY;
                } catch {
                    result = false;
                }
                if (result === WRITE_RETRY) {
                    dustWrites.push(job);
                    break;
                }
                ops++;
            }

            // Snow column scans stay off a resume that already committed kill writes,
            // so a ≤20-block kill is not stuck behind surface searches.
            const dustRan = ops > 0;
            let attempts = 0;
            let cursor = 0;
            let guard = 0;
            const attemptCap = snowWaves[0]?.attemptsPerResume ?? SNOW_ATTEMPTS_PER_SLICE;
            const guardMax = snowWaves.length + attemptCap;
            while (
                !dustRan &&
                snowWaves.length > 0 &&
                attempts < attemptCap &&
                guard < guardMax
            ) {
                guard++;
                if (cursor >= snowWaves.length) cursor = 0;
                const wave = snowWaves[cursor];
                if (!wave || wave.cancelled) {
                    snowWaves.splice(cursor, 1);
                    safeWaveDone(wave);
                    continue;
                }

                let result = false;
                try {
                    result = wave.attempt();
                } catch {
                    result = false;
                }

                if (result === "pause") {
                    cursor++;
                    if (cursor >= snowWaves.length) break;
                    continue;
                }
                if (result === "stop") {
                    wave.cancelled = true;
                    snowWaves.splice(cursor, 1);
                    safeWaveDone(wave);
                    continue;
                }

                wave.iter = (wave.iter ?? 0) + 1;
                attempts++;
                if (result === true) wave.placed = (wave.placed ?? 0) + 1;

                if ((wave.placed ?? 0) >= wave.target || wave.iter >= wave.maxAttempts) {
                    snowWaves.splice(cursor, 1);
                    safeWaveDone(wave);
                } else {
                    cursor++;
                }
            }

            if (dustWrites.length > 0 || snowWaves.length > 0) {
                yield;
            }
        }
    } finally {
        jobId = null;
        if (dustWrites.length > 0 || snowWaves.length > 0) {
            system.run(() => ensureJob());
        }
    }
}
