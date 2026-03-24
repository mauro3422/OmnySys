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
import { saveFileSummariesBatch } from './file-summary-storage.js';
import { calculateContentHash, toProjectRelativePath } from './incremental-analysis-utils.js';
import fs from 'fs/promises';

const logger = createLogger('OmnySys:Worker:Analysis');

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

function saveAnalyzedFileResult(state, relativeFilePath, absoluteFilePath, content, currentHash, result) {
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
        totalLines: content.split(/\r?\n/).length,
        hash: currentHash
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

async function readFileSnapshot(absoluteRootPath, absoluteFilePath) {
    const stat = await fs.stat(absoluteFilePath).catch(() => null);
    if (!stat || stat.isDirectory()) return null;

    const relativeFilePath = toProjectRelativePath(absoluteRootPath, absoluteFilePath);
    const content = await fs.readFile(absoluteFilePath, 'utf8');

    return {
        absoluteFilePath,
        relativeFilePath,
        content,
        currentHash: calculateContentHash(content)
    };
}

function reusePersistedResultIfPossible({
    repo,
    relativeFilePath,
    currentHash,
    knownHashes,
    extractionDepth,
    getPersistedFileSummary
}) {
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

async function analyzeAndPersistFile({
    absoluteFilePath,
    absoluteRootPath,
    relativeFilePath,
    content,
    currentHash,
    extractionDepth,
    gitStats,
    repo,
    knownHashes,
    getPersistedFileSummary,
    state
}) {
    try {
        state.allFileHashesToSave.set(relativeFilePath, currentHash);

        const skippedResult = reusePersistedResultIfPossible({
            repo,
            relativeFilePath,
            currentHash,
            knownHashes,
            extractionDepth,
            getPersistedFileSummary
        });
        if (skippedResult) {
            state.allLiteResults[absoluteFilePath] = skippedResult;
            return { skipped: true };
        }

        const result = await analyzeFileCore(absoluteFilePath, absoluteRootPath, {
            depth: extractionDepth,
            source: content,
            gitStats,
            verbose: false
        });

        saveAnalyzedFileResult(state, relativeFilePath, absoluteFilePath, content, currentHash, result);
        return { skipped: false };
    } catch (error) {
        logger.warn(`[WorkerAnalysis] Failed to analyze ${relativeFilePath}: ${error.message}`);
        throw error;
    }
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
    for (const absoluteFilePath of files) {
        const result = await processWorkerFile(absoluteFilePath);
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
    saveFileSummariesBatch(repo, Array.from(state.allFileSummariesToSave.entries()));

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
