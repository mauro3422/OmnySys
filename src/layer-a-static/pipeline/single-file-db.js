import { getRepository } from '#layer-c/storage/repository/repository-factory.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:single:file:db');

/**
 * Carga el mapa de analisis previo si no es iterativo
 */
export async function loadExistingMap(absoluteRootPath, incremental, verbose) {
    if (incremental) return null;

    try {
        const repo = getRepository(absoluteRootPath);
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
        const repo = getRepository(absoluteRootPath);

        const atomsWithId = atoms.map(atom => ({
            ...atom,
            id: atom.id || `${singleFile}::${atom.name}`,
            file_path: singleFile
        }));

        repo.saveMany(atomsWithId);

        logger.debug(`💾 Saved ${atoms.length} atoms to SQLite for ${singleFile}`);
    } catch (error) {
        logger.warn(`⚠️ Error saving atoms for ${singleFile}: ${error.message}`);
    }
}

/**
 * Guarda los resultados finales del analisis
 */
export async function saveFileResult(absoluteRootPath, singleFile, fileAnalysis, existingMap, incremental, verbose) {
    try {
        const repo = getRepository(absoluteRootPath);

        if (repo.db) {
            const now = new Date().toISOString();

            repo.db.prepare(`
        INSERT OR REPLACE INTO files (path, imports_json, exports_json, module_name, atom_count, last_analyzed)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
                singleFile,
                JSON.stringify(fileAnalysis.imports || []),
                JSON.stringify(fileAnalysis.exports || []),
                null,
                fileAnalysis.totalAtoms || 0,
                now
            );

            if (verbose) logger.info(`  ✓ Saved file metadata to SQLite\n`);
        }
    } catch (error) {
        logger.warn(`⚠️ Error saving file result to SQLite: ${error.message}`);
    }

    return singleFile;
}
