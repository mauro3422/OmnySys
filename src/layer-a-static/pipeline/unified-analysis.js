/**
 * @fileoverview unified-analysis.js
 * 
 * TRUE TURBO MODE PIPELINE: High-performance merged Phase 4 and Phase 5.
 * INCREMENTAL: Skips parsing/extraction for unchanged files using hashes.
 * Optimized for systems with high RAM (16GB+).
 */

import { parseFileFromDisk } from '../parser/index.js';
import { AtomExtractionPhase } from './phases/atom-extraction/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { enrichAtom as enrichAtomPurpose } from './phases/atom-extraction/metadata/purpose-enricher.js';
import { enrichAtom as enrichAtomVectors } from '#layer-c/storage/enrichers/atom-enricher.js';
import { createLogger } from '../../utils/logger.js';
import { logMemoryUsage } from '../../utils/memory-telemetry.js';
import { BatchTimer } from '../../utils/performance-tracker.js';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';

const logger = createLogger('OmnySys:Pipeline:Unified');

/**
 * Calculates a quick hash of the file content.
 */
function calculateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * High-performance incremental analysis.
 */
export async function analyzeProjectFilesUnified(files, absoluteRootPath, verbose) {
    if (verbose) logger.info('\n🚀 Starting Unified Analysis [TRUE TURBO MODE]...');

    const atomPhase = new AtomExtractionPhase();
    const repo = getRepository(absoluteRootPath);
    let totalAtomsExtracted = 0;
    let filesSkipped = 0;

    // Turbo Mode Settings
    const CONCURRENCY = 60;
    const totalFiles = files.length;
    const batchTimer = new BatchTimer('Unified Analysis', totalFiles);
    const parsedFiles = {};

    // Prepared statement for hash upserts — created ONCE, reused per batch
    const upsertFileHash = repo.db.prepare(`
        INSERT INTO files (path, last_analyzed, hash) VALUES (?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
            last_analyzed = excluded.last_analyzed,
            hash = excluded.hash
    `);
    const writeFileHashesBatch = repo.db.transaction((hashMap) => {
        const now = new Date().toISOString();
        for (const [filePath, hash] of hashMap) {
            upsertFileHash.run(filePath, now, hash);
        }
    });

    // ---------------------------------------------------------
    // WORKER THREAD ORCHESTRATION
    // ---------------------------------------------------------
    const numCPUs = os.cpus().length;
    // Usar hasta (numCPUs - 2) workers para dejar 2 CPUs al OS y main thread.
    // Antes: Math.floor(numCPUs/2) = 6 workers en 12 CPUs.
    // Ahora: Math.max(1, numCPUs - 2) = 10 workers en 12 CPUs (2.8x más carga distribuida).
    const optimalWorkers = Math.max(1, numCPUs - 2);

    // Si son menos de 50 archivos, lanzamos máximo 2 workers para no perder tiempo en el booteo.
    const workerCount = totalFiles < 50 ? Math.min(2, optimalWorkers) : optimalWorkers;

    if (verbose) {
        logger.info(`  🖥️ Booting ${workerCount} Worker Threads (Optimal Pool) for Parallel Analysis...`);
    }

    const chunkSize = Math.ceil(totalFiles / workerCount);
    const workerPromises = [];
    const workerScriptPath = fileURLToPath(new URL('./worker-analysis.js', import.meta.url));

    for (let i = 0; i < workerCount; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const chunk = files.slice(start, end);

        if (chunk.length === 0) continue;

        const workerPromise = new Promise((resolve, reject) => {
            const worker = new Worker(workerScriptPath, {
                workerData: {
                    files: chunk,
                    absoluteRootPath
                }
            });

            worker.on('message', (msg) => {
                if (msg.type === 'PROGRESS') {
                    if (msg.skipped) {
                        filesSkipped++;
                    }
                    batchTimer.onItemProcessed(1);

                    // Imprimir progreso de vez en cuando para no spawnear la vista
                    if (batchTimer.processedCount % 300 === 0 && verbose) {
                        logMemoryUsage(`Turbo Progress ${batchTimer.processedCount}/${totalFiles} (Skipped: ${filesSkipped})`);
                    }
                } else if (msg.type === 'DONE') {
                    totalAtomsExtracted += msg.extractedCount;
                    Object.assign(parsedFiles, msg.liteResults);

                    // Escribir los hashes saltados y calculados
                    if (msg.hashes && msg.hashes.length > 0) {
                        const hashMap = new Map();
                        msg.hashes.forEach(([key, val]) => hashMap.set(key, val));
                        try {
                            writeFileHashesBatch(hashMap);
                            logger.debug(`  🔑 Worker ${i + 1} wrote ${msg.hashes.length} file hashes`);
                        } catch (hashErr) {
                            logger.warn(`  ⚠️ Hash write failed for Worker ${i + 1}: ${hashErr.message}`);
                        }
                    }
                    resolve();
                } else if (msg.type === 'ERROR') {
                    logger.warn(`  ⚠️ Worker ${i + 1} error on ${msg.file || 'unknown'}: ${msg.error}`);
                }
            });

            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker ${i + 1} stopped with exit code ${code}`));
                }
            });
        });

        workerPromises.push(workerPromise);
    }

    try {
        await Promise.all(workerPromises);
    } catch (err) {
        logger.error(`  ❌ Error executing parallel workers: ${err.message}`);
        throw err;
    }

    // Limpieza final de cache
    if (verbose) {
        if (global.gc) global.gc();
        logger.info(`  ✓ True Parallel Analysis Complete: ${totalAtomsExtracted} atoms extracted, ${filesSkipped} files skipped`);
        logMemoryUsage('Final Unified Analysis');
    }


    return { totalAtomsExtracted, parsedFiles };
}
