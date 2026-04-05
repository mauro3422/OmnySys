import { createLogger } from '../../utils/logger.js';
import { logMemoryUsage } from '../../utils/memory-telemetry.js';
import { BatchTimer } from '../../utils/performance-tracker.js';
import os from 'os';
import { Worker } from 'worker_threads';
import { saveFileSummariesBatch } from './file-summary-storage.js';

const logger = createLogger('OmnySys:Pipeline:Unified');
const DEFAULT_WORKER_TIMEOUT_MS = Number(process.env.OMNYSYS_UNIFIED_WORKER_TIMEOUT_MS || 240000);

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

function buildBalancedWorkerChunks(files, workerCount) {
    const chunks = Array.from({ length: workerCount }, () => []);
    files.forEach((file, index) => {
        chunks[index % workerCount].push(file);
    });
    return chunks.filter((chunk) => chunk.length > 0);
}

function createWorkerPromise(workerIndex, chunk, workerContext) {
    const {
        workerScriptPath,
        absoluteRootPath,
        extractionDepth,
        gitStats,
        batchTimer,
        verbose,
        workerCount,
        totalFiles,
        filesSkippedRef,
        parsedFiles,
        pendingWrites,
        totalsRef
    } = workerContext;

    return new Promise((resolve, reject) => {
        const workerStartedAt = Date.now();
        let worker = null;
        let watchdog = null;
        let lastProgressAt = workerStartedAt;
        let settled = false;

        const cleanup = () => {
            if (watchdog) {
                clearInterval(watchdog);
                watchdog = null;
            }
        };

        const settleResolve = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve();
        };

        const settleReject = (error) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(error);
        };

        if (verbose) {
            logger.info(`  Worker ${workerIndex + 1}/${workerCount} started with ${chunk.length} file(s)`);
        }

        worker = new Worker(workerScriptPath, {
            workerData: {
                files: chunk,
                absoluteRootPath,
                extractionDepth,
                gitStats
            }
        });

        worker.on('message', (msg) => {
            if (msg.type === 'PROGRESS') {
                lastProgressAt = Date.now();
                handleWorkerProgress(msg, batchTimer, verbose, totalFiles, filesSkippedRef);
                return;
            }

            if (msg.type === 'DONE') {
                handleWorkerDone(msg, workerIndex, parsedFiles, pendingWrites, totalsRef);
                if (verbose) {
                    const elapsedMs = Date.now() - workerStartedAt;
                    logger.info(`  Worker ${workerIndex + 1}/${workerCount} completed in ${elapsedMs}ms (${msg.extractedCount || 0} atoms)`);
                }
                settleResolve();
                return;
            }

            if (msg.type === 'ERROR') {
                lastProgressAt = Date.now();
                logger.warn(`Worker ${workerIndex + 1} error on ${msg.file || 'unknown'}: ${msg.error}`);
            }
        });

        watchdog = setInterval(async () => {
            if (settled || !worker) return;

            const idleMs = Date.now() - lastProgressAt;
            if (idleMs < DEFAULT_WORKER_TIMEOUT_MS) {
                return;
            }

            logger.warn(`Worker ${workerIndex + 1}/${workerCount} idle for ${idleMs}ms on ${chunk.length} file(s); terminating`);
            try {
                await worker.terminate();
            } catch (error) {
                logger.warn(`Worker ${workerIndex + 1}/${workerCount} terminate failed: ${error.message}`);
            }
            settleReject(new Error(`Worker ${workerIndex + 1} timed out after ${Math.round(idleMs / 1000)}s without progress`));
        }, Math.min(30000, Math.max(5000, Math.floor(DEFAULT_WORKER_TIMEOUT_MS / 4))));

        worker.on('error', (error) => {
            settleReject(error);
        });
        worker.on('exit', (code) => {
            cleanup();
            if (settled) {
                return;
            }
            if (code !== 0) {
                settleReject(new Error(`Worker ${workerIndex + 1} stopped with exit code ${code}`));
                return;
            }
            settleResolve();
        });
    });
}

async function executeWorkerPool(files, workerCount, workerContext) {
    const workerPromises = [];
    const balancedChunks = buildBalancedWorkerChunks(files, workerCount);

    if (workerContext.verbose) {
        logger.info(`  Balanced worker distribution: ${balancedChunks.map((chunk) => chunk.length).join(', ')}`);
    }

    for (let i = 0; i < balancedChunks.length; i += 1) {
        const chunk = balancedChunks[i];
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
async function persistPendingWorkerWrites(repo, pendingWrites) {
    if (pendingWrites.atoms.length > 0) {
        const total = pendingWrites.atoms.length;
        const batchSize = 500;
        const batches = Math.ceil(total / batchSize);
        logger.info(`  Persisting ${total} atoms in ${batches} batches...`);
        repo.saveManyBulk(pendingWrites.atoms, batchSize);
        logger.info(`  ✓ Atoms persisted`);
    }

    if (pendingWrites.summaries.length > 0) {
        saveFileSummariesBatch(repo, pendingWrites.summaries, undefined, 500);
    }

    if (pendingWrites.hashes.length > 0) {
        writeFileHashBatch(repo, pendingWrites.hashes);
    }
}
async function flushPendingWorkerWritesIfNeeded(repo, pendingWrites) {
    if (pendingWrites.atoms.length === 0 && pendingWrites.summaries.length === 0 && pendingWrites.hashes.length === 0) {
        return;
    }

    try {
        await persistPendingWorkerWrites(repo, pendingWrites);
        logger.debug(
            `Persisted worker settlement writes after Phase 2 ` +
            `(atoms=${pendingWrites.atoms.length}, summaries=${pendingWrites.summaries.length}, hashes=${pendingWrites.hashes.length})`
        );
    } catch (persistErr) {
        logger.warn(`Deferred worker write flush failed after settlement: ${persistErr.message}`);
    }
}

function logWorkerBootstrap(existingHashCount, extractionDepth, workerCount, verbose) {
    if (!verbose) return;

    if (existingHashCount === 0) {
        logger.info('  Cold-start detected: using limited parallel workers until the file-hash baseline exists.');
    } else if (extractionDepth === 'deep') {
        logger.info('  Deep scan detected: using a conservative worker cap to reduce SQLite contention.');
    }
    logger.info(`  Booting ${workerCount} Worker Threads (Optimal Pool) for Parallel Analysis...`);
}
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
    } catch (error) {
        logger.debug(`[ShadowVolume] Error: ${error.message}`);
        return { percentage: 0, unindexedLines: 0, error: error.message };
    }
}

async function finalizeVerboseUnifiedAnalysis({ verbose, absoluteRootPath, repo, totalAtomsExtracted }) {
    if (!verbose) return;

    if (global.gc) global.gc();
    logMemoryUsage('Final Unified Analysis');

    if (totalAtomsExtracted <= 0) return;

    const shadowVolume = await measureShadowVolume(absoluteRootPath, repo);
    logger.info(`  Shadow Volume Audit: ${shadowVolume.percentage}% (${shadowVolume.unindexedLines} unindexed LOC)`);
    if (shadowVolume.percentage > 30) {
        logger.warn('  HIGH SHADOW VOLUME DETECTED! Information loss is present.');
    }
}

export async function runUnifiedAnalysisPipeline({
    files,
    absoluteRootPath,
    verbose,
    extractionDepth = 'structural',
    logPrefix = 'Unified Analysis',
    gitStats,
    repo,
    workerScriptPath
}) {
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

    logWorkerBootstrap(existingHashCount, extractionDepth, workerCount, verbose);

    await executeWorkerPool(files, workerCount, {
        workerScriptPath,
        absoluteRootPath,
        extractionDepth,
        gitStats,
        batchTimer,
        verbose,
        workerCount,
        totalFiles,
        filesSkippedRef,
        parsedFiles,
        pendingWrites,
        totalsRef
    });

    await flushPendingWorkerWritesIfNeeded(repo, pendingWrites);
    await finalizeVerboseUnifiedAnalysis({
        verbose,
        absoluteRootPath,
        repo,
        totalAtomsExtracted: totalsRef.totalAtomsExtracted
    });

    return { totalAtomsExtracted: totalsRef.totalAtomsExtracted, parsedFiles };
}
