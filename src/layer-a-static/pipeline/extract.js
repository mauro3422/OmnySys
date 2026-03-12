import path from 'path';
import { BatchTimer } from '../../utils/performance-tracker.js';
import { AtomExtractionPhase } from './phases/atom-extraction/index.js';
import { saveAtom } from '#layer-c/storage/atoms/atom.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { enrichAtom as enrichAtomPurpose } from './phases/atom-extraction/metadata/purpose-enricher.js';
import { enrichAtom as enrichAtomVectors } from '#layer-c/storage/enrichers/atom-enricher.js';
import { createLogger } from '../../utils/logger.js';
import { getGitStats } from '../../utils/git-analyzer.js';

const logger = createLogger('OmnySys:extract');
const BATCH_SIZE = 50;

function enrichAtomsWithFileMetadata(atoms, fileGitStats) {
    const purposeEnriched = atoms.map((atom) => enrichAtomPurpose(atom));

    return purposeEnriched.map((atom) => {
        const enriched = enrichAtomVectors(atom);
        enriched.ageDays = fileGitStats.ageDays;
        enriched.changeFrequency = fileGitStats.changeFrequency;
        return enriched;
    });
}

function buildLiteAtoms(enrichedAtoms) {
    return enrichedAtoms.map((atom) => {
        const lite = { ...atom };

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

        return lite;
    });
}

function pruneParsedFileMemory(parsedFile) {
    delete parsedFile.source;
    delete parsedFile.identifierRefs;
}

async function persistBatchAtoms(repo, absoluteRootPath, atoms) {
    if (atoms.length === 0) return;

    if (repo.saveManyBulk) {
        repo.saveManyBulk(atoms, 50);
        return;
    }

    await Promise.allSettled(
        atoms.map((atom) => saveAtom(absoluteRootPath, atom.filePath || '', atom.name, atom))
    );
}

async function processFileAtoms({
    absoluteFilePath,
    parsedFile,
    absoluteRootPath,
    atomPhase,
    gitStats,
    allExtractedAtoms
}) {
    const relativeFilePath = path.relative(absoluteRootPath, absoluteFilePath).replace(/\\/g, '/');
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

    if (context.atoms?.length > 0) {
        const fileGitStats = gitStats[relativeFilePath] || { ageDays: 0, changeFrequency: 0 };
        const enrichedAtoms = enrichAtomsWithFileMetadata(context.atoms, fileGitStats);
        const liteAtoms = buildLiteAtoms(enrichedAtoms);

        parsedFile.atoms = liteAtoms;
        pruneParsedFileMemory(parsedFile);

        allExtractedAtoms.push(...enrichedAtoms.filter((atom) => atom.name));
    }

    return context.atomCount || 0;
}

/**
 * Extract rich atom metadata from parsed files and persist in batches.
 * @returns {Promise<number>} Total extracted atoms
 */
export async function extractAndSaveAtoms(parsedFiles, absoluteRootPath, verbose) {
    if (verbose) logger.info('\nExtracting rich atomic metadata...');

    const gitStats = await getGitStats(absoluteRootPath);
    const atomPhase = new AtomExtractionPhase();
    let totalAtomsExtracted = 0;

    const entries = Object.entries(parsedFiles);
    const totalFiles = entries.length;
    const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);
    const batchTimer = new BatchTimer('Atom extraction', totalFiles);
    const repo = getRepository(absoluteRootPath);

    for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const allExtractedAtoms = [];
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

        if (verbose && batchIndex % 5 === 0) {
            logger.debug(`  Processing batch ${batchIndex}/${totalBatches}...`);
        }

        await Promise.allSettled(batch.map(async ([absoluteFilePath, parsedFile]) => {
            try {
                totalAtomsExtracted += await processFileAtoms({
                    absoluteFilePath,
                    parsedFile,
                    absoluteRootPath,
                    atomPhase,
                    gitStats,
                    allExtractedAtoms
                });
                batchTimer.onItemProcessed(1);
            } catch (error) {
                const relativeFilePath = path.relative(absoluteRootPath, absoluteFilePath).replace(/\\/g, '/');
                logger.warn(`  Failed to extract atoms from ${relativeFilePath}: ${error.message}`);
                parsedFile.atoms = [];
                parsedFile.atomCount = 0;
                pruneParsedFileMemory(parsedFile);
            }
        }));

        await persistBatchAtoms(repo, absoluteRootPath, allExtractedAtoms);

        const { logMemoryUsage } = await import('../../utils/memory-telemetry.js');
        logMemoryUsage(`Extract Batch ${batchIndex}/${totalBatches}`);

        if (global.gc) {
            global.gc();
        }
    }

    if (verbose) {
        logger.info(`  ${totalAtomsExtracted} rich atoms extracted and saved`);
        logger.info('  Individual atoms saved to .omnysysdata/atoms/\n');
    }

    return totalAtomsExtracted;
}
