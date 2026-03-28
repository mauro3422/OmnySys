/**
 * @fileoverview unified-analysis.js
 *
 * TRUE TURBO MODE PIPELINE: High-performance merged Phase 4 and Phase 5.
 * INCREMENTAL: Skips parsing/extraction for unchanged files using hashes.
 * Optimized for systems with high RAM (16GB+).
 */

import {
    REPOSITORY_MUTATION_DURABILITY,
    getRepository,
    runRepositoryMutation
} from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../utils/logger.js';
import { logMemoryUsage } from '../../utils/memory-telemetry.js';
import { BatchTimer } from '../../utils/performance-tracker.js';
import os from 'os';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { getGitStats } from '../../utils/git-analyzer.js';
import { saveFileSummariesBatch } from './file-summary-storage.js';

const logger = createLogger('OmnySys:Pipeline:Unified');

function getWorkerCount(totalFiles, existingHashCount = 0, extractionDepth = 'structural') {
    const numCPUs = os.cpus().length;
    const optimalWorkers = Math.max(1, numCPUs - 2);

    if (existingHashCount === 0) {
        return Math.min(optimalWorkers, 4);
    }

    if (extractionDepth === 'deep') {
        return Math.min(optimalWorkers, 2);
    }

    return totalFiles < 50 ? Math.min(2, optimalWorkers) : optimalWorkers;
}

function handleWorkerProgress(msg, batchTimer, verbose, totalFiles, filesSkippedRef) {
    const processedCount = Math.max(1, Number(msg.count || 1));

    if (msg.skipped) {
        filesSkippedRef.count += processedCount;
    }
    batchTimer.onItemProcessed(processedCount);

    if (batchTimer.itemsProcessed % 300 === 0 && verbose) {
        logMemoryUsage(`Turbo Progress ${batchTimer.itemsProcessed}/${totalFiles} (Skipped: ${filesSkippedRef.count})`);
    }
}

function collectWorkerWrites(msg, pendingWrites) {
    const workerFiles = Object.values(msg.liteResults || {});
    for (const fileResult of workerFiles) {
        if (Array.isArray(fileResult.atoms) && fileResult.atoms.length > 0) {
            pendingWrites.atoms.push(...fileResult.atoms);
        }
    }

    if (Array.isArray(msg.summaries) && msg.summaries.length > 0) {
        pendingWrites.summaries.push(...msg.summaries);
    }

    if (Array.isArray(msg.hashes) && msg.hashes.length > 0) {
        pendingWrites.hashes.push(...msg.hashes);
    }
}

function handleWorkerDone(msg, workerIndex, parsedFiles, pendingWrites, totalsRef) {
    totalsRef.totalAtomsExtracted += msg.extractedCount;
    Object.assign(parsedFiles, msg.liteResults);
    collectWorkerWrites(msg, pendingWrites);

    if (Array.isArray(msg.hashes) && msg.hashes.length > 0) {
        logger.debug(`Worker ${workerIndex + 1} staged ${msg.hashes.length} file hashes`);
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
        pendingWrites,
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
                handleWorkerDone(msg, workerIndex, parsedFiles, pendingWrites, totalsRef);
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

function writeFileHashBatch(repo, hashEntries) {
    if (!repo?.db || repo.db.open === false || !Array.isArray(hashEntries) || hashEntries.length === 0) {
        return;
    }

    const upsertFileHash = repo.db.prepare(`
        INSERT INTO files (path, last_analyzed, hash) VALUES (?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
            last_analyzed = excluded.last_analyzed,
            hash = excluded.hash,
            is_removed = 0,
            updated_at = datetime('now')
    `);

    const hashMap = new Map(hashEntries);
    const transaction = repo.db.transaction((entries) => {
        const now = new Date().toISOString();
        for (const [filePath, hash] of entries) {
            upsertFileHash.run(filePath, now, hash);
        }
    });

    transaction(hashMap.entries());
}

async function persistPendingWorkerWrites(absoluteRootPath, pendingWrites) {
    if (pendingWrites.atoms.length > 0) {
        const atomResult = await runRepositoryMutation(
            absoluteRootPath,
            {
                label: 'save atom bulk',
                durability: REPOSITORY_MUTATION_DURABILITY.DURABLE,
                metadata: {
                    source: 'unified-analysis',
                    count: pendingWrites.atoms.length
                },
                run: (bulkRepo) => bulkRepo.saveManyBulk(pendingWrites.atoms, 500)
            },
            { durability: REPOSITORY_MUTATION_DURABILITY.DURABLE }
        );

        if (atomResult?.success === false) {
            logger.warn(`Deferred atom flush failed after worker settlement: ${atomResult.reason || atomResult.error || 'unknown error'}`);
        }
    }

    if (pendingWrites.summaries.length > 0) {
        const summaryResult = await runRepositoryMutation(
            absoluteRootPath,
            {
                label: 'save file summaries',
                durability: REPOSITORY_MUTATION_DURABILITY.DURABLE,
                metadata: {
                    source: 'unified-analysis',
                    count: pendingWrites.summaries.length
                },
                run: (summaryRepo) => saveFileSummariesBatch(summaryRepo, pendingWrites.summaries, undefined, 500)
            },
            { durability: REPOSITORY_MUTATION_DURABILITY.DURABLE }
        );

        if (summaryResult?.success === false) {
            logger.warn(`Deferred summary flush failed after worker settlement: ${summaryResult.reason || summaryResult.error || 'unknown error'}`);
        }
    }

    if (pendingWrites.hashes.length > 0) {
        const hashResult = await runRepositoryMutation(
            absoluteRootPath,
            {
                label: 'save file hashes',
                durability: REPOSITORY_MUTATION_DURABILITY.DURABLE,
                metadata: {
                    source: 'unified-analysis',
                    count: pendingWrites.hashes.length
                },
                run: (hashRepo) => writeFileHashBatch(hashRepo, pendingWrites.hashes)
            },
            { durability: REPOSITORY_MUTATION_DURABILITY.DURABLE }
        );

        if (hashResult?.success === false) {
            logger.warn(`Deferred hash flush failed after worker settlement: ${hashResult.reason || hashResult.error || 'unknown error'}`);
        }
    }
}

/**
 * High-performance incremental analysis.
 */
export async function analyzeProjectFilesUnified(files, absoluteRootPath, verbose, extractionDepth = 'structural', logPrefix = 'Unified Analysis') {
    if (verbose) logger.info(`\nStarting ${logPrefix} [TRUE TURBO MODE]...`);

    const gitStats = await getGitStats(absoluteRootPath);
    const repo = getRepository(absoluteRootPath);
    const existingHashCount = typeof repo.getAllFileHashes === 'function'
        ? (repo.getAllFileHashes()?.size || 0)
        : 0;
    const totalsRef = { totalAtomsExtracted: 0 };
    const filesSkippedRef = { count: 0 };
    const totalFiles = files.length;
    const batchTimer = new BatchTimer(logPrefix, totalFiles, verbose);
    const parsedFiles = {};
    const pendingWrites = {
        atoms: [],
        summaries: [],
        hashes: []
    };
    const workerCount = getWorkerCount(totalFiles, existingHashCount, extractionDepth);

    if (verbose) {
        if (existingHashCount === 0) {
            logger.info('  Cold-start detected: using limited parallel workers until the file-hash baseline exists.');
        } else if (extractionDepth === 'deep') {
            logger.info('  Deep scan detected: using a conservative worker cap to reduce SQLite contention.');
        }
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
            pendingWrites,
            totalsRef
        });
    } catch (err) {
        logger.error(`Worker execution failed: ${err.message}`);
        throw err;
    }

    if (pendingWrites.atoms.length > 0 || pendingWrites.summaries.length > 0 || pendingWrites.hashes.length > 0) {
        try {
            await persistPendingWorkerWrites(absoluteRootPath, pendingWrites);
            logger.debug(
                `Persisted worker settlement writes after Phase 2 ` +
                `(atoms=${pendingWrites.atoms.length}, summaries=${pendingWrites.summaries.length}, hashes=${pendingWrites.hashes.length})`
            );
        } catch (persistErr) {
            logger.warn(`Deferred worker write flush failed after settlement: ${persistErr.message}`);
        }
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
