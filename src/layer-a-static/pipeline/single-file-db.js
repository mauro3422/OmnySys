import { getRepository } from '#layer-c/storage/repository/repository-factory.js';
import {
    REPOSITORY_MUTATION_DURABILITY,
    runRepositoryMutation
} from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../utils/logger.js';
import { saveFileSummariesBatch } from './file-summary-storage.js';
import { deriveModuleName } from './single-file-utils.js';
import { syncIncrementalSystemMapSurface } from '#layer-c/storage/repository/adapters/helpers/system-map-incremental.js';

const logger = createLogger('OmnySys:single:file:db');

function buildFileSummaryEntry(singleFile, fileAnalysis, _fileHash, absoluteRootPath) {
    return [
        singleFile,
        {
            imports: fileAnalysis.imports || [],
            exports: fileAnalysis.exports || [],
            moduleName: fileAnalysis.moduleName || deriveModuleName(singleFile, absoluteRootPath),
            atomCount: fileAnalysis.totalAtoms || 0,
            totalLines: fileAnalysis.totalLines || 0
        }
    ];
}

/**
 * Carga el mapa de analisis previo si no es iterativo
 */
export async function loadExistingMap(absoluteRootPath, incremental, verbose) {
    if (incremental) return null;

    try {
        const repo = getRepository(absoluteRootPath);
        if (!repo?.initialized || !repo?.db || repo.db.open === false) {
            if (verbose) logger.info('  ℹ️  SQLite unavailable, starting fresh\n');
            return null;
        }
        const allAtoms = repo.query({ limit: 10000 });

        if (allAtoms && allAtoms.length > 0) {
            if (verbose) logger.info('  ✓ Loaded existing project context from SQLite\n');
            return {
                files: {},
                atoms: allAtoms,
                metadata: { lastUpdated: new Date().toISOString() }
            };
        }
    } catch {
        // SQLite no inicializado
    }

    if (verbose) logger.info('  ℹ️  No existing analysis found, starting fresh\n');
    return null;
}

/**
 * Guarda un array de atomos parseados
 */
export async function saveAtoms(absoluteRootPath, singleFile, atoms) {
    try {
        const atomList = Array.isArray(atoms) ? atoms : [];
        const atomsWithId = atomList.map(atom => ({
            ...atom,
            id: atom.id || `${singleFile}::${atom.name}`,
            file_path: singleFile
        }));

        const isDeepScan = atomList.some(a => a.isPhase2Complete);
        const result = await runRepositoryMutation(
            absoluteRootPath,
            {
                key: `single-file-atoms:${singleFile}`,
                label: `saveAtoms:${singleFile}`,
                durability: REPOSITORY_MUTATION_DURABILITY.DURABLE,
                metadata: { filePath: singleFile, atomCount: atomsWithId.length },
                run: (repo) => {
                    if (isDeepScan) {
                        repo.deleteByFile(singleFile);
                    }

                    repo.saveMany(atomsWithId);
                    logger.debug(`💾 Saved ${atomList.length} atoms to SQLite for ${singleFile}`);
                    return true;
                }
            },
            { durability: REPOSITORY_MUTATION_DURABILITY.DURABLE }
        );

        if (result.queued) {
            logger.debug(`Queued atom save for ${singleFile} until SQLite is ready`);
        }
    } catch (error) {
        logger.warn(`⚠️ Error saving atoms for ${singleFile}: ${error.message}`);
    }
}

/**
 * Guarda los resultados finales del analisis
 */
export async function saveFileResult(absoluteRootPath, singleFile, fileAnalysis, fileHash, existingMap, incremental, verbose) {
    try {
        const safeFileAnalysis = fileAnalysis || {
            totalAtoms: 0,
            imports: [],
            exports: [],
            moduleName: null
        };

        const result = await runRepositoryMutation(
            absoluteRootPath,
            {
                key: `single-file-summary:${singleFile}`,
                label: `saveFileResult:${singleFile}`,
                durability: REPOSITORY_MUTATION_DURABILITY.DURABLE,
                metadata: { filePath: singleFile, atomCount: safeFileAnalysis.totalAtoms || 0 },
                run: async (repo) => {
                    if (!repo?.db || typeof repo.db.prepare !== 'function') {
                        if (verbose) logger.info(`  ℹ️  SQLite unavailable, skipped file metadata save for ${singleFile}\n`);
                        return true;
                    }

                    saveFileSummariesBatch(repo, [buildFileSummaryEntry(singleFile, safeFileAnalysis, fileHash, absoluteRootPath)]);
                    await syncIncrementalSystemMapSurface(repo, safeFileAnalysis, Date.now());
                    if (verbose) logger.info(`  ✓ Saved file metadata to SQLite\n`);
                    return true;
                }
            },
            { durability: REPOSITORY_MUTATION_DURABILITY.DURABLE }
        );

        if (result.queued && verbose) {
            logger.info(`  ℹ️  SQLite unavailable, queued file metadata save for ${singleFile}\n`);
        }
    } catch (error) {
        logger.warn(`⚠️ Error saving file result to SQLite: ${error.message}`);
    }

    return singleFile;
}
