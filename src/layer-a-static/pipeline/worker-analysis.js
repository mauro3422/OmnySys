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

async function runWorker() {
    const { files, absoluteRootPath, extractionDepth = 'structural', gitStats = {} } = workerData;
    const repo = getRepository(absoluteRootPath);

    let totalExtractedCount = 0;
    let processedSinceLastPing = 0;
    const allLiteResults = {};
    const allFileHashesToSave = new Map();
    const allFileSummariesToSave = new Map();
    const globalWorkerBuffer = [];

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

            const relativeFilePath = path.relative(absoluteRootPath, absoluteFilePath).replace(/\\/g, '/');

            // 1. Incremental Check
            const content = await fs.readFile(absoluteFilePath, 'utf8');
            const currentHash = calculateHash(content);
            allFileHashesToSave.set(relativeFilePath, currentHash);

            const existingHash = knownHashes.get(relativeFilePath);
            if (existingHash && existingHash === currentHash && extractionDepth !== 'deep') {
                const dbAtoms = repo.getByFile(relativeFilePath);
                if (dbAtoms && dbAtoms.length > 0) {
                    const persistedSummary = getPersistedFileSummary?.get(relativeFilePath) || {};
                    allLiteResults[absoluteFilePath] = {
                        atoms: dbAtoms.map(a => ({ ...a, skipped: true })),
                        atomCount: dbAtoms.length,
                        imports: JSON.parse(persistedSummary.imports_json || '[]'),
                        exports: JSON.parse(persistedSummary.exports_json || '[]'),
                        skipped: true
                    };
                    return { skipped: true };
                }
            }

            // 2. Unified Analysis
            const result = await analyzeFileCore(absoluteFilePath, absoluteRootPath, {
                depth: extractionDepth,
                source: content,
                gitStats,
                verbose: false
            });

            // 3. Lite Optimization & Buffer
            const liteAtoms = result.atoms.map(atom => {
                const lite = { ...atom };

                // Buffer to RAM for bulk save
                globalWorkerBuffer.push({ ...lite, filePath: relativeFilePath });

                // Prune for IPC (Inter-Process Communication) memory efficiency
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
            });

            totalExtractedCount += liteAtoms.length;
            allFileSummariesToSave.set(relativeFilePath, {
                imports: result.parsed?.imports || [],
                exports: result.parsed?.exports || [],
                atomCount: liteAtoms.length,
                totalLines: content.split(/\r?\n/).length
            });
            allLiteResults[absoluteFilePath] = {
                atoms: liteAtoms,
                atomCount: liteAtoms.length,
                metadata: result.metadata,
                imports: result.parsed?.imports || [],
                exports: result.parsed?.exports || [],
                skipped: false
            };

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
            parentPort.postMessage({
                type: 'PROGRESS',
                count: processedSinceLastPing,
                skipped: result?.skipped || false
            });
            processedSinceLastPing = 0;
        }
    }

    if (processedSinceLastPing > 0) {
        parentPort.postMessage({ type: 'PROGRESS', count: processedSinceLastPing, skipped: false });
    }

    // Bulk Save
    if (globalWorkerBuffer.length > 0) {
        repo.saveManyBulk(globalWorkerBuffer);
    }
    if (allFileSummariesToSave.size > 0 && repo?.db) {
        const upsertFileSummary = repo.db.prepare(`
            INSERT INTO files (path, imports_json, exports_json, atom_count, total_lines, last_analyzed)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
                imports_json = excluded.imports_json,
                exports_json = excluded.exports_json,
                atom_count = excluded.atom_count,
                total_lines = MAX(COALESCE(files.total_lines, 0), excluded.total_lines),
                last_analyzed = excluded.last_analyzed
        `);
        const now = new Date().toISOString();
        const saveFileSummaries = repo.db.transaction((entries) => {
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
        saveFileSummaries(Array.from(allFileSummariesToSave.entries()));
    }

    // Final Report
    parentPort.postMessage({
        type: 'DONE',
        liteResults: allLiteResults,
        hashes: Array.from(allFileHashesToSave.entries()),
        extractedCount: totalExtractedCount
    });
}

runWorker().catch(e => {
    parentPort.postMessage({ type: 'ERROR', error: e.message });
    process.exit(1);
});
