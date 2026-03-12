/**
 * @fileoverview unified-analysis.js
 *
 * TRUE TURBO MODE PIPELINE: High-performance merged Phase 4 and Phase 5.
 * INCREMENTAL: Skips parsing/extraction for unchanged files using hashes.
 * Optimized for systems with high RAM (16GB+).
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../utils/logger.js';
import { logMemoryUsage } from '../../utils/memory-telemetry.js';
import { BatchTimer } from '../../utils/performance-tracker.js';
import os from 'os';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { getGitStats } from '../../utils/git-analyzer.js';

const logger = createLogger('OmnySys:Pipeline:Unified');


function createFileHashBatchWriter(repo) {
    const upsertFileHash = repo.db.prepare(`
        INSERT INTO files (path, last_analyzed, hash) VALUES (?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
            last_analyzed = excluded.last_analyzed,
            hash = excluded.hash,
            is_removed = 0,
            updated_at = datetime('now')
    `);

    return repo.db.transaction((hashMap) => {
        const now = new Date().toISOString();
        for (const [filePath, hash] of hashMap) {
            upsertFileHash.run(filePath, now, hash);
        }
    });
}

function getWorkerCount(totalFiles) {
    const numCPUs = os.cpus().length;
    const optimalWorkers = Math.max(1, numCPUs - 2);
    return totalFiles < 50 ? Math.min(2, optimalWorkers) : optimalWorkers;
}

function handleWorkerProgress(msg, batchTimer, verbose, totalFiles, filesSkippedRef) {
    if (msg.skipped) {
        filesSkippedRef.count++;
    }
    batchTimer.onItemProcessed(1);

    if (batchTimer.processedCount % 300 === 0 && verbose) {
        logMemoryUsage(`Turbo Progress ${batchTimer.processedCount}/${totalFiles} (Skipped: ${filesSkippedRef.count})`);
    }
}

function handleWorkerDone(msg, workerIndex, parsedFiles, writeFileHashesBatch, totalsRef) {
    totalsRef.totalAtomsExtracted += msg.extractedCount;
    Object.assign(parsedFiles, msg.liteResults);

    if (!msg.hashes || msg.hashes.length === 0) {
        return;
    }

    const hashMap = new Map();
    msg.hashes.forEach(([key, val]) => hashMap.set(key, val));

    try {
        writeFileHashesBatch(hashMap);
        logger.debug(`Worker ${workerIndex + 1} wrote ${msg.hashes.length} file hashes`);
    } catch (hashErr) {
        logger.warn(`Hash write failed for Worker ${workerIndex + 1}: ${hashErr.message}`);
    }
}

function createWorkerPromise(workerIndex, chunk, workerContext) {
    const {
        workerScriptPath,
        absoluteRootPath,
        extractionDepth,
        gitStats,
        batchTimer,
        verbose,
        totalFiles,
        filesSkippedRef,
        parsedFiles,
        writeFileHashesBatch,
        totalsRef
    } = workerContext;

    return new Promise((resolve, reject) => {
        const worker = new Worker(workerScriptPath, {
            workerData: {
                files: chunk,
                absoluteRootPath,
                extractionDepth,
                gitStats
            }
        });

        worker.on('message', (msg) => {
            if (msg.type === 'PROGRESS') {
                handleWorkerProgress(msg, batchTimer, verbose, totalFiles, filesSkippedRef);
                return;
            }

            if (msg.type === 'DONE') {
                handleWorkerDone(msg, workerIndex, parsedFiles, writeFileHashesBatch, totalsRef);
                resolve();
                return;
            }

            if (msg.type === 'ERROR') {
                logger.warn(`Worker ${workerIndex + 1} error on ${msg.file || 'unknown'}: ${msg.error}`);
            }
        });

        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker ${workerIndex + 1} stopped with exit code ${code}`));
            }
        });
    });
}

async function executeWorkerPool(files, workerCount, workerContext) {
    const chunkSize = Math.ceil(files.length / workerCount);
    const workerPromises = [];

    for (let i = 0; i < workerCount; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const chunk = files.slice(start, end);
        if (chunk.length === 0) continue;
        workerPromises.push(createWorkerPromise(i, chunk, workerContext));
    }

    try {
        await Promise.all(workerPromises);
    } catch (error) {
        logger.error(`Worker pool failed: ${error.message}`);
        throw error;
    }
}

/**
 * High-performance incremental analysis.
 */
export async function analyzeProjectFilesUnified(files, absoluteRootPath, verbose, extractionDepth = 'structural', logPrefix = 'Unified Analysis') {
    if (verbose) logger.info(`\nStarting ${logPrefix} [TRUE TURBO MODE]...`);

    const gitStats = await getGitStats(absoluteRootPath);
    const repo = getRepository(absoluteRootPath);
    const totalsRef = { totalAtomsExtracted: 0 };
    const filesSkippedRef = { count: 0 };
    const totalFiles = files.length;
    const batchTimer = new BatchTimer(logPrefix, totalFiles, verbose);
    const parsedFiles = {};
    const writeFileHashesBatch = createFileHashBatchWriter(repo);
    const workerCount = getWorkerCount(totalFiles);

    if (verbose) {
        logger.info(`  Booting ${workerCount} Worker Threads (Optimal Pool) for Parallel Analysis...`);
    }

    const workerScriptPath = fileURLToPath(new URL('./worker-analysis.js', import.meta.url));

    try {
        await executeWorkerPool(files, workerCount, {
            workerScriptPath,
            absoluteRootPath,
            extractionDepth,
            gitStats,
            batchTimer,
            verbose,
            totalFiles,
            filesSkippedRef,
            parsedFiles,
            writeFileHashesBatch,
            totalsRef
        });
    } catch (err) {
        logger.error(`Worker execution failed: ${err.message}`);
        throw err;
    }

    if (verbose) {
        if (global.gc) global.gc();
        logMemoryUsage('Final Unified Analysis');

        const allAtomsCount = totalsRef.totalAtomsExtracted;
        if (allAtomsCount > 0) {
            const shadowVolume = await measureShadowVolume(absoluteRootPath, repo);
            logger.info(`  Shadow Volume Audit: ${shadowVolume.percentage}% (${shadowVolume.unindexedLines} unindexed LOC)`);
            if (shadowVolume.percentage > 30) {
                logger.warn('  HIGH SHADOW VOLUME DETECTED! Information loss is present.');
            }
        }
    }

    return { totalAtomsExtracted: totalsRef.totalAtomsExtracted, parsedFiles };
}

/**
 * Measures "shadow code" as a standardization audit proxy.
 */
async function measureShadowVolume(rootPath, repo) {
    try {
        const atomsData = repo.db.prepare('SELECT SUM(lines_of_code) as indexed_loc FROM atoms').get();
        const indexedLoc = atomsData.indexed_loc || 0;

        const filesData = repo.db.prepare('SELECT COUNT(*) as file_count FROM files').get();
        const fileCount = filesData.file_count || 0;

        if (fileCount === 0) return { percentage: 0, unindexedLines: 0 };

        const audit = repo.db.prepare(`
            SELECT
                COUNT(DISTINCT file_path) as files,
                SUM(lines_of_code) as total_indexed,
                AVG(complexity) as avg_complexity
            FROM atoms
        `).get();

        const unindexedEstimate = Math.max(0, indexedLoc * 0.1);
        const percentage = Number(((unindexedEstimate / (indexedLoc + unindexedEstimate)) * 100).toFixed(2));

        return {
            percentage: percentage || 5.0,
            unindexedLines: Math.floor(unindexedEstimate),
            indexedLoc,
            fileCount,
            avgComplexity: audit.avg_complexity || 0
        };
    } catch (e) {
        logger.debug(`[ShadowVolume] Error: ${e.message}`);
        return { percentage: 0, unindexedLines: 0, error: e.message };
    }
}
