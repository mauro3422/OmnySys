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

    // Process all files in parallel (Promise.allSettled doesn't abort on individual failures)
    const entries = Object.entries(parsedFiles);
    const batchTimer = new BatchTimer('Atom extraction', entries.length);

    // Acumular todos los átomos para bulk insert al final
    const allExtractedAtoms = [];

    await Promise.allSettled(entries.map(async ([absoluteFilePath, parsedFile]) => {
        let relativeFilePath;
        try {
            relativeFilePath = path.relative(absoluteRootPath, absoluteFilePath).replace(/\\/g, '/');
            const context = {
                filePath: relativeFilePath,
                code: parsedFile.source || '',
                fileInfo: parsedFile,
                fileMetadata: parsedFile.metadata || {}
            };

            await atomPhase.execute(context);

            parsedFile.atoms = context.atoms || [];
            parsedFile.atomCount = context.atomCount || 0;
            totalAtomsExtracted += context.atomCount || 0;

            // 🆕 Enrich atoms with better purpose, archetype, AND vectors
            if (context.atoms && context.atoms.length > 0) {
                // Primero purpose/archetype enrichment
                const purposeEnriched = context.atoms.map(atom => enrichAtomPurpose(atom));
                // Luego vectores matemáticos (cohesion, ageDays, etc.)
                const enrichedAtoms = purposeEnriched.map(atom => enrichAtomVectors(atom));
                parsedFile.atoms = enrichedAtoms;

                // Acumular para bulk insert en lugar de guardar uno por uno
                allExtractedAtoms.push(...enrichedAtoms.filter(atom => atom.name));
            }

            batchTimer.onItemProcessed(1);
        } catch (error) {
            logger.warn(`  ⚠️ Failed to extract atoms from ${relativeFilePath}: ${error.message}`);
            parsedFile.atoms = [];
            parsedFile.atomCount = 0;
        }
    }));

    // 🚀 BULK INSERT: Guardar todos los átomos de una vez
    if (allExtractedAtoms.length > 0) {
        const timerBulkSave = startTimer('Bulk save atoms');
        const repo = getRepository(absoluteRootPath);

        if (repo.saveManyBulk) {
            repo.saveManyBulk(allExtractedAtoms, 500);
            if (verbose) {
                logger.info(`  ✓ ${allExtractedAtoms.length} atoms saved via bulk insert`);
            }
        } else {
            // Fallback al método antiguo
            await Promise.allSettled(
                allExtractedAtoms.map(atom => saveAtom(absoluteRootPath, atom.filePath || '', atom.name, atom))
            );
        }

        timerBulkSave.end(verbose);
    }

    batchTimer.end(verbose);

    if (verbose) {
        logger.info(`  ✓ ${totalAtomsExtracted} rich atoms extracted and saved`);
        logger.info(`  ✓ Individual atoms saved to .omnysysdata/atoms/\n`);
    }

    return totalAtomsExtracted;
}
