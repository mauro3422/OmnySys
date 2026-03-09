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
import { analyzeFileCore } from './core-analyzer.js';
import { createLogger } from '../../utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { warmExtractorCache } from './phases/atom-extraction/extraction/atom-extractor/extractor-loader.js';
import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';

const logger = createLogger('OmnySys:Worker:Analysis');

function calculateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

function toRelativeFilePath(absoluteRootPath, absoluteFilePath) {
    return path.relative(absoluteRootPath, absoluteFilePath).replace(/\\/g, '/');
}

function createSkippedLiteResult(dbAtoms, persistedSummary) {
    return {
        atoms: dbAtoms.map((atom) => ({ ...atom, skipped: true })),
        atomCount: dbAtoms.length,
        imports: JSON.parse(persistedSummary.imports_json || '[]'),
        exports: JSON.parse(persistedSummary.exports_json || '[]'),
        skipped: true
    };
}

function createLiteAtom(atom, relativeFilePath, globalWorkerBuffer) {
    const lite = { ...atom };
    globalWorkerBuffer.push({ ...lite, filePath: relativeFilePath });

    delete lite.dna;
    delete lite.dataFlow;
    delete lite.temporal;
    delete lite.errorFlow;
    delete lite.performance;

    if (lite._meta) {
        const meta = { ...lite._meta };
        delete meta.identifierRefs;
        lite._meta = meta;
    }

    if (lite.node) delete lite.node;

    return lite;
}

function createAnalyzedResult(result, liteAtoms) {
    return {
        atoms: liteAtoms,
        atomCount: liteAtoms.length,
        metadata: result.metadata,
        imports: result.parsed?.imports || [],
        exports: result.parsed?.exports || [],
        skipped: false
    };
}

function tryReusePersistedAnalysis(repo, relativeFilePath, currentHash, knownHashes, extractionDepth, getPersistedFileSummary) {
    const existingHash = knownHashes.get(relativeFilePath);
    if (!existingHash || existingHash !== currentHash || extractionDepth === 'deep') {
        return null;
    }

    const dbAtoms = repo.getByFile(relativeFilePath);
    if (!dbAtoms || dbAtoms.length === 0) {
        return null;
    }

    const persistedSummary = getPersistedFileSummary?.get(relativeFilePath) || {};
    return createSkippedLiteResult(dbAtoms, persistedSummary);
}

function saveAnalyzedFileResult(state, relativeFilePath, absoluteFilePath, content, result) {
    const liteAtoms = result.atoms.map((atom) => createLiteAtom(
        atom,
        relativeFilePath,
        state.globalWorkerBuffer
    ));

    state.totalExtractedCount += liteAtoms.length;
    state.allFileSummariesToSave.set(relativeFilePath, {
        imports: result.parsed?.imports || [],
        exports: result.parsed?.exports || [],
        atomCount: liteAtoms.length,
        totalLines: content.split(/\r?\n/).length
    });
    state.allLiteResults[absoluteFilePath] = createAnalyzedResult(result, liteAtoms);
}

function flushProgress(processedSinceLastPing, skipped = false) {
    if (processedSinceLastPing <= 0) {
        return 0;
    }

    parentPort.postMessage({
        type: 'PROGRESS',
        count: processedSinceLastPing,
        skipped
    });

    return 0;
}

function persistFileSummaries(repo, allFileSummariesToSave) {
    if (allFileSummariesToSave.size === 0 || !repo?.db) {
        return;
    }

    const upsertFileSummary = repo.db.prepare(`
        INSERT INTO files (path, imports_json, exports_json, atom_count, total_lines, last_analyzed)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
            imports_json = excluded.imports_json,
            exports_json = excluded.exports_json,
            atom_count = excluded.atom_count,
            total_lines = MAX(COALESCE(files.total_lines, 0), excluded.total_lines),
            last_analyzed = excluded.last_analyzed,
            is_removed = 0,
            updated_at = datetime('now')
    `);
    const now = new Date().toISOString();
    const saveFileSummariesTx = repo.db.transaction((entries) => {
        for (const [filePath, summary] of entries) {
            upsertFileSummary.run(
                filePath,
                JSON.stringify(summary.imports || []),
                JSON.stringify(summary.exports || []),
                Number(summary.atomCount || 0),
                Number(summary.totalLines || 0),
                now
            );
        }
    });

    saveFileSummariesTx(Array.from(allFileSummariesToSave.entries()));
}

async function runWorker() {
    const { files, absoluteRootPath, extractionDepth = 'structural', gitStats = {} } = workerData;
    const repo = getRepository(absoluteRootPath);

    const state = {
        totalExtractedCount: 0,
        allLiteResults: {},
        allFileHashesToSave: new Map(),
        allFileSummariesToSave: new Map(),
        globalWorkerBuffer: []
    };
    let processedSinceLastPing = 0;

    // Pre-warm extractors
    await warmExtractorCache();

    const knownHashes = (typeof repo.getAllFileHashes === 'function')
        ? repo.getAllFileHashes()
        : new Map();
    const getPersistedFileSummary = repo?.db?.prepare(`
        SELECT imports_json, exports_json
        FROM files
        WHERE path = ?
    `);

    async function processFile(absoluteFilePath) {
        try {
            const stat = await fs.stat(absoluteFilePath).catch(() => null);
            if (!stat || stat.isDirectory()) return { skipped: true };

            const relativeFilePath = toRelativeFilePath(absoluteRootPath, absoluteFilePath);

            // 1. Incremental Check
            const content = await fs.readFile(absoluteFilePath, 'utf8');
            const currentHash = calculateHash(content);
            state.allFileHashesToSave.set(relativeFilePath, currentHash);

            const skippedResult = tryReusePersistedAnalysis(
                repo,
                relativeFilePath,
                currentHash,
                knownHashes,
                extractionDepth,
                getPersistedFileSummary
            );
            if (skippedResult) {
                state.allLiteResults[absoluteFilePath] = skippedResult;
                return { skipped: true };
            }

            // 2. Unified Analysis
            const result = await analyzeFileCore(absoluteFilePath, absoluteRootPath, {
                depth: extractionDepth,
                source: content,
                gitStats,
                verbose: false
            });

            // 3. Lite Optimization & Buffer
            saveAnalyzedFileResult(state, relativeFilePath, absoluteFilePath, content, result);

            return { skipped: false };

        } catch (error) {
            parentPort.postMessage({ type: 'ERROR', file: absoluteFilePath, error: error.message });
            return { skipped: false, error: true };
        }
    }

    // Main Loop
    for (const absoluteFilePath of files) {
        const result = await processFile(absoluteFilePath);
        processedSinceLastPing++;
        if (processedSinceLastPing >= 20) {
            processedSinceLastPing = flushProgress(processedSinceLastPing, result?.skipped || false);
        }
    }

    processedSinceLastPing = flushProgress(processedSinceLastPing, false);

    // Bulk Save
    if (state.globalWorkerBuffer.length > 0) {
        repo.saveManyBulk(state.globalWorkerBuffer);
    }
    persistFileSummaries(repo, state.allFileSummariesToSave);

    // Final Report
    parentPort.postMessage({
        type: 'DONE',
        liteResults: state.allLiteResults,
        hashes: Array.from(state.allFileHashesToSave.entries()),
        extractedCount: state.totalExtractedCount
    });
}

runWorker().catch(e => {
    parentPort.postMessage({ type: 'ERROR', error: e.message });
    process.exit(1);
});
