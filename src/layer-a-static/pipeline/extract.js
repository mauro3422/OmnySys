import path from 'path';
import { BatchTimer, startTimer } from '../../utils/performance-tracker.js';
import { AtomExtractionPhase } from './phases/atom-extraction/index.js';
import { saveAtom } from '#layer-c/storage/atoms/atom.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { enrichAtom as enrichAtomPurpose } from './phases/atom-extraction/metadata/purpose-enricher.js';
import { enrichAtom as enrichAtomVectors } from '#layer-c/storage/enrichers/atom-enricher.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:extract');

/**
 * Extrae y guarda átomos de todos los archivos parseados (paralelizado).
 * @returns {Promise<number>} Total de átomos extraídos
 */
export async function extractAndSaveAtoms(parsedFiles, absoluteRootPath, verbose) {
    if (verbose) logger.info('\n⚛️  Extracting rich atomic metadata...');
    const atomPhase = new AtomExtractionPhase();
    let totalAtomsExtracted = 0;

    const BATCH_SIZE = 50;
    const entries = Object.entries(parsedFiles);
    const totalFiles = entries.length;
    const batchTimer = new BatchTimer('Atom extraction', totalFiles);
    const repo = getRepository(absoluteRootPath);

    for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const allExtractedAtoms = [];
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);

        if (verbose && batchIndex % 5 === 0) {
            logger.debug(`  📦 Processing batch ${batchIndex}/${totalBatches}...`);
        }

        await Promise.allSettled(batch.map(async ([absoluteFilePath, parsedFile]) => {
            let relativeFilePath;
            try {
                relativeFilePath = path.relative(absoluteRootPath, absoluteFilePath).replace(/\\/g, '/');
                const context = {
                    filePath: relativeFilePath,
                    code: parsedFile.source || '',
                    fullFileCode: parsedFile.source || '',
                    fileInfo: parsedFile,
                    fileMetadata: parsedFile.metadata || {}
                };

                await atomPhase.execute(context);

                parsedFile.atoms = context.atoms || [];
                parsedFile.atomCount = context.atomCount || 0;
                totalAtomsExtracted += context.atomCount || 0;

                if (context.atoms && context.atoms.length > 0) {
                    const purposeEnriched = context.atoms.map(atom => enrichAtomPurpose(atom));
                    const enrichedAtoms = purposeEnriched.map(atom => enrichAtomVectors(atom));

                    // 🚀 ULTRA-LITE ATOMS: Prune EVERYTHING not needed for Graph/Links
                    const liteAtoms = enrichedAtoms.map(atom => {
                        const lite = { ...atom };
                        // Remove heavy fields (saved to DB but not needed for Graph/Links)
                        delete lite.dna;
                        delete lite.dataFlow;
                        delete lite.temporal;
                        delete lite.errorFlow;
                        delete lite.performance;

                        // NEW: Prune identifier refs from RAM (huge memory sink)
                        if (lite._meta) {
                            const meta = { ...lite._meta };
                            delete meta.identifierRefs;
                            lite._meta = meta;
                        }

                        return lite;
                    });

                    parsedFile.atoms = liteAtoms;
                    // NEW: Prune File-level memory bombs
                    delete parsedFile.source;
                    delete parsedFile.identifierRefs;

                    allExtractedAtoms.push(...enrichedAtoms.filter(atom => atom.name));
                }

                batchTimer.onItemProcessed(1);
            } catch (error) {
                logger.warn(`  ⚠️ Failed to extract atoms from ${relativeFilePath}: ${error.message}`);
                parsedFile.atoms = [];
                parsedFile.atomCount = 0;
                // Cleanup even on error
                delete parsedFile.source;
                delete parsedFile.identifierRefs;
            }
        }));

        // 🚀 BULK INSERT: Guardar los átomos de este batch
        if (allExtractedAtoms.length > 0) {
            if (repo.saveManyBulk) {
                // FIXED: Use 50 instead of 500 for SQLite parameter safety
                repo.saveManyBulk(allExtractedAtoms, 50);
            } else {
                await Promise.allSettled(
                    allExtractedAtoms.map(atom => saveAtom(absoluteRootPath, atom.filePath || '', atom.name, atom))
                );
            }
        }

        // ✅ Log memory after each batch to see leaks in real-time
        const { logMemoryUsage } = await import('../../utils/memory-telemetry.js');
        logMemoryUsage(`Extract Batch ${batchIndex}/${totalBatches}`);

        // ✅ Forzar GC si es posible para ver si ayuda
        if (global.gc) {
            global.gc();
        }
    }

    if (verbose) {
        logger.info(`  ✓ ${totalAtomsExtracted} rich atoms extracted and saved`);
        logger.info(`  ✓ Individual atoms saved to .omnysysdata/atoms/\n`);
    }

    return totalAtomsExtracted;
}
