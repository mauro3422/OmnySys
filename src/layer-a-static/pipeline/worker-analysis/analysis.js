/**
 * @fileoverview worker-analysis.js
 *
 * Worker Thread para ejecutar la Fase 4 de análisis en paralelo.
 * Recibe un lote de archivos, lee desde el disco, parsea el AST, extrae átomos
 * y devuelve los resultados "lite" al Master, además de guardarlos en SQLite.
 * 
 * ✅ OPTIMIZACIONES v2:
 *  1. Usa core-analyzer.js para lógica unificada.
 *  2. Mantiene RAM optimization (Lite Atoms).
 *
 * @module pipeline/worker-analysis
 */

import { parentPort, workerData } from 'worker_threads';
import { getRepository } from '../../../layer-c-memory/storage/repository/index.js';
import {
    analyzeAndPersistFile,
    flushProgress,
    logger,
    readFileSnapshot,
    withBusyRetry
} from './index.js';
import { warmExtractorCache } from '../phases/atom-extraction/extraction/atom-extractor/extractor-loader.js';
import { saveFileSummariesBatch } from '../file-summary-storage.js';

const FLUSH_INTERVAL = 100; // Flush pending writes every N files

function flushWorkerWritesToDb(repo, state, processedCount, totalFiles) {
    if (repo?.db?.open === false) return;

    try {
        // Flush atoms incrementally (lite atoms only — no heavy fields)
        // This prevents total data loss if the worker crashes before sending DONE message
        if (state.pendingAtoms && state.pendingAtoms.length > 0) {
            const atomsToFlush = state.pendingAtoms;
            try {
                if (repo.saveManyBulk) {
                    repo.saveManyBulk(atomsToFlush, 200); // Smaller batch = less lock time
                } else if (repo.saveMany) {
                    repo.saveMany(atomsToFlush);
                }
                state.pendingAtoms = [];
            } catch (flushError) {
                // If SQLite is busy, don't lose the atoms — keep them for next flush
                if (flushError.message.includes('database is locked') || flushError.message.includes('SQLITE_BUSY')) {
                    logger.debug(`[Worker] SQLite busy, deferring ${atomsToFlush.length} atoms to next flush`);
                    return; // Keep atoms in state, retry later
                }
                throw flushError;
            }
        }

        // Flush file hashes (incremental upsert) → usa file_hashes como fuente de verdad
        if (state.allFileHashesToSave.size > 0) {
            const hashEntries = Array.from(state.allFileHashesToSave.entries());
            const upsertStmt = repo.db.prepare(`
                INSERT OR REPLACE INTO file_hashes (file_path, content_hash, last_updated)
                VALUES (?, ?, ?)
            `);
            const tx = repo.db.transaction((entries) => {
                const now = Date.now();
                for (const [filePath, hash] of entries) {
                    upsertStmt.run(filePath, hash, now);
                }
            });
            tx(hashEntries);
            state.allFileHashesToSave.clear();
        }

        // Flush file summaries
        if (state.allFileSummariesToSave.size > 0) {
            saveFileSummariesBatch(repo, Array.from(state.allFileSummariesToSave.entries()), undefined, 200);
            state.allFileSummariesToSave.clear();
        }
    } catch (error) {
        logger.warn(`[Worker] Incremental flush failed: ${error.message}`);
    }
}

async function runWorker() {
    const { files, absoluteRootPath, extractionDepth = 'structural', gitStats = {} } = workerData;
    const repo = getRepository(absoluteRootPath);

    // Wait for DB schema migration to complete before accessing it.
    // During reanalyze, workers can start before migration finishes.
    // We MUST wait — skipping = losing data = corrupt DB.
    if (repo?.db?.open === false) {
        const maxWaitMs = 60000;
        const pollMs = 500;
        let waited = 0;
        logger.warn(`[Worker] DB not open, waiting for schema migration (max ${maxWaitMs / 1000}s)...`);
        while (repo?.db?.open === false && waited < maxWaitMs) {
            await new Promise((r) => setTimeout(r, pollMs));
            waited += pollMs;
        }
        if (repo?.db?.open === false) {
            parentPort.postMessage({
                type: 'ERROR',
                error: `DB not ready after ${waited / 1000}s — schema migration failed or took too long`,
                file: 'worker-init'
            });
            return;
        }
        logger.info(`[Worker] DB ready after ${waited / 1000}s, proceeding with ${files.length} files`);
    }

    const state = {
        totalExtractedCount: 0,
        allLiteResults: {},
        allFileHashesToSave: new Map(),
        allFileSummariesToSave: new Map(),
        pendingAtoms: []  // NEW: accumulate atoms for incremental flush
    };
    let processedSinceLastPing = 0;

    // Pre-warm extractors
    await warmExtractorCache();

    const knownHashes = (typeof repo.getAllFileHashes === 'function')
        ? await withBusyRetry(() => repo.getAllFileHashes(), 'load known hashes')
        : new Map();
    const getPersistedFileSummary = repo?.db
        ? async (relativeFilePath) => {
            try {
                const row = await withBusyRetry(
                    () => Promise.resolve(repo.db.prepare(`
                        SELECT imports_json, exports_json
                        FROM files
                        WHERE path = ?
                    `).get(relativeFilePath)),
                    `load persisted summary for ${relativeFilePath}`
                );
                return row || {};
            } catch (error) {
                logger.warn(`[WorkerAnalysis] Falling back without persisted summary for ${relativeFilePath}: ${error.message}`);
                return {};
            }
        }
        : null;

    async function processWorkerFile(absoluteFilePath) {
        try {
            const snapshot = await readFileSnapshot(absoluteRootPath, absoluteFilePath);
            if (!snapshot) return { skipped: true };

            return await analyzeAndPersistFile({
                absoluteFilePath,
                absoluteRootPath,
                relativeFilePath: snapshot.relativeFilePath,
                content: snapshot.content,
                currentHash: snapshot.currentHash,
                extractionDepth,
                gitStats,
                repo,
                knownHashes,
                getPersistedFileSummary,
                state
            });
        } catch (error) {
            parentPort.postMessage({ type: 'ERROR', file: absoluteFilePath, error: error.message });
            return { skipped: false, error: true };
        }
    }

    // Main Loop
    let filesProcessed = 0;
    for (const absoluteFilePath of files) {
        const result = await processWorkerFile(absoluteFilePath);
        processedSinceLastPing++;
        filesProcessed++;

        // Incremental flush every FLUSH_INTERVAL files to prevent data loss on crash
        if (filesProcessed % FLUSH_INTERVAL === 0) {
            flushWorkerWritesToDb(repo, state, filesProcessed, files.length);
        }

        if (processedSinceLastPing >= 20) {
            processedSinceLastPing = flushProgress(processedSinceLastPing, result?.skipped || false);
        }
    }

    // Final flush of remaining pending writes
    flushWorkerWritesToDb(repo, state, filesProcessed, files.length);

    processedSinceLastPing = flushProgress(processedSinceLastPing, false);

    // Final Report
    parentPort.postMessage({
        type: 'DONE',
        liteResults: state.allLiteResults,
        hashes: Array.from(state.allFileHashesToSave.entries()),
        summaries: Array.from(state.allFileSummariesToSave.entries()),
        extractedCount: state.totalExtractedCount
    });
}

runWorker().catch(e => {
    parentPort.postMessage({ type: 'ERROR', error: e.message });
    process.exit(1);
});
