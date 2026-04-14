import { parentPort } from 'worker_threads';
import fs from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';
import { analyzeFileCore } from '../core-analyzer.js';
import { getRepository } from '../../../layer-c-memory/storage/repository/index.js';
import { warmExtractorCache } from '../phases/atom-extraction/extraction/atom-extractor/extractor-loader.js';
import { deriveModuleName } from '../single-file-utils.js';
import { calculateContentHash, toProjectRelativePath } from '../incremental-analysis-utils.js';

export const logger = createLogger('OmnySys:Worker:Analysis');

function isBusyDatabaseError(error) {
    const message = String(error?.message || '').toLowerCase();
    return (
        error?.code === 'SQLITE_BUSY' ||
        error?.code === 'SQLITE_LOCKED' ||
        message.includes('database is locked') ||
        message.includes('database is busy')
    );
}

async function wait(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withBusyRetry(operation, label, attempts = 5, baseDelayMs = 50) {
    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (!isBusyDatabaseError(error) || attempt === attempts - 1) {
                throw error;
            }

            const delay = baseDelayMs * (attempt + 1);
            logger.warn(`[WorkerAnalysis] Retrying ${label} after SQLite lock (${attempt + 1}/${attempts}) in ${delay}ms`);
            await wait(delay);
        }
    }

    throw lastError;
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

function createLiteAtom(atom, relativeFilePath) {
    const lite = { ...atom };
    lite.filePath = relativeFilePath;

    // Keep DNA/dataFlow: they are part of the canonical atom history and
    // must survive worker flushes so reindexing does not erase evolution.
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
        relativeFilePath
    ));

    state.totalExtractedCount += liteAtoms.length;
    state.allFileSummariesToSave.set(relativeFilePath, {
        imports: result.parsed?.imports || [],
        exports: result.parsed?.exports || [],
        moduleName: deriveModuleName(relativeFilePath),
        atomCount: liteAtoms.length,
        totalLines: content.split(/\r?\n/).length,
        hash: currentHash
    });
    state.allLiteResults[absoluteFilePath] = createAnalyzedResult(result, liteAtoms);

    // NEW: Accumulate atoms for incremental flush to prevent data loss on worker crash
    if (state.pendingAtoms) {
        state.pendingAtoms.push(...liteAtoms);
    }
}

export function flushProgress(processedSinceLastPing, skipped = false) {
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

export async function readFileSnapshot(absoluteRootPath, absoluteFilePath) {
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

async function reusePersistedResultIfPossible({
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

    const dbAtoms = await withBusyRetry(
        () => Promise.resolve(repo.getByFile(relativeFilePath)),
        `load persisted atoms for ${relativeFilePath}`
    );
    if (!dbAtoms || dbAtoms.length === 0) {
        return null;
    }

    let persistedSummary = {};
    if (getPersistedFileSummary) {
        try {
            persistedSummary = await getPersistedFileSummary(relativeFilePath);
        } catch (error) {
            logger.warn(`[WorkerAnalysis] Falling back without persisted summary for ${relativeFilePath}: ${error.message}`);
        }
    }
    return createSkippedLiteResult(dbAtoms, persistedSummary);
}

export async function analyzeAndPersistFile({
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

        const skippedResult = await reusePersistedResultIfPossible({
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

export async function prepareWorkerRuntime() {
    await warmExtractorCache();
    return { getRepository };
}
