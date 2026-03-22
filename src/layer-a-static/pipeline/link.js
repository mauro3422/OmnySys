import { startTimer } from '../../utils/performance-tracker.js';
import { calculateFieldHashes } from '#layer-c/storage/atoms/atom-version-manager.js';
import { buildCanonicalAtomIdVariants, normalizeCanonicalAtomId } from '../../layer-c-memory/storage/repository/adapters/helpers/canonical-atom-id.js';
import { persistCallRelations as persistCallRelationsHelper } from './call-relations-linkage.js';
import { persistSharedStateLinkage as persistSharedStateLinkageHelper, persistSharedStateLinkageIncrementally as persistSharedStateLinkageIncrementallyHelper } from './shared-state-linkage.js';
import { resolveClassInstantiationCalledBy } from './phases/calledby/class-instantiation-tracker.js';
import { enrichWithCallerPattern } from './phases/atom-extraction/metadata/caller-pattern.js';
import { buildAtomIndex, linkFunctionCalledBy } from './phases/calledby/function-linker.js';
import { linkVariableCalledBy } from './phases/calledby/variable-linker.js';
import { linkMixinNamespaceCalledBy } from './phases/calledby/mixin-namespace-linker.js';
import { linkExportObjectReferences } from './phases/calledby/export-object-references.js';
import { createLogger } from '../../utils/logger.js';
import { chunkArray } from '../../shared/utils/array-utils.js';

const logger = createLogger('OmnySys:link');

function readStoredCallsHash(row) {
    if (!row?.field_hashes_json) {
        return null;
    }

    try {
        const parsed = JSON.parse(row.field_hashes_json);
        return parsed?.calls ?? null;
    } catch {
        return null;
    }
}

function collectCallRelationSyncAtoms(repo, allAtoms, absoluteRootPath) {
    try {
        if (!repo?.db || !Array.isArray(allAtoms) || allAtoms.length === 0) {
            return [];
        }

        const candidates = [];
        for (const atom of allAtoms) {
            if (!atom?.id) {
                continue;
            }

            const normalizedId = normalizeCanonicalAtomId(atom.id, absoluteRootPath);
            const fieldHashes = calculateFieldHashes(atom);
            candidates.push({
                atom: { ...atom, id: normalizedId },
                atomId: normalizedId,
                callsHash: fieldHashes?.calls ?? null
            });
        }

        if (candidates.length === 0) {
            return [];
        }

        const storedCallsHashes = new Map();
        const atomIds = candidates.map((candidate) => candidate.atomId);

        for (const chunk of chunkArray(atomIds, 500)) {
            const placeholders = chunk.map(() => '?').join(', ');
            const rows = repo.db.prepare(`
                SELECT atom_id, field_hashes_json
                FROM atom_versions
                WHERE atom_id IN (${placeholders})
            `).all(...chunk);

            for (const row of rows || []) {
                storedCallsHashes.set(row.atom_id, readStoredCallsHash(row));
            }
        }

        return candidates
            .filter(({ atomId, callsHash }) => storedCallsHashes.get(atomId) !== callsHash)
            .map(({ atom }) => atom);
    } catch {
        return [];
    }
}

/**
 * Orquesta los 4 pasos de calledBy linkage delegando a módulos especializados.
 * TODOS los cambios se acumulan y se guardan en BULK al final.
 */
export async function buildCalledByLinks(parsedFiles, absoluteRootPath, verbose) {
    const timerTotal = startTimer('6a. Build atom index');
    const allAtoms = [];
    for (const parsedFile of Object.values(parsedFiles)) {
        if (parsedFile.atoms) {
            for (let j = 0; j < parsedFile.atoms.length; j++) {
                allAtoms.push(parsedFile.atoms[j]);
            }
        }
    }

    const index = buildAtomIndex(allAtoms);
    timerTotal.end(verbose);

    // Set para trackear átomos modificados (evita duplicados)
    const modifiedAtoms = new Set();

    // 3.6a: Function calledBy
    try {
        const timerFunc = startTimer('6b. Function calledBy links');
        if (verbose) logger.info('🔗 Building cross-file calledBy index...');
        const { updatedAtoms } = await linkFunctionCalledBy(allAtoms, parsedFiles, absoluteRootPath, index, verbose);
        updatedAtoms.forEach(a => modifiedAtoms.add(a));
        timerFunc.end(verbose);
    } catch (err) {
        logger.warn(`  ⚠️ function-linker failed: ${err.message}`);
    }

    // 3.6b: Variable reference calledBy
    try {
        const timerVar = startTimer('6c. Variable calledBy links');
        if (verbose) logger.info('🔗 Building cross-file variable reference index...');
        const { updatedAtoms } = await linkVariableCalledBy(allAtoms, parsedFiles, absoluteRootPath, verbose);
        updatedAtoms.forEach(a => modifiedAtoms.add(a));
        timerVar.end(verbose);
    } catch (err) {
        logger.warn(`  ⚠️ variable-linker failed: ${err.message}`);
    }

    // 3.6c: Mixin + namespace import calledBy
    try {
        const timerMixin = startTimer('6d. Mixin/namespace links');
        if (verbose) logger.info('🔗 Resolving mixin/namespace import calledBy links...');
        const { namespaceLinks, mixinLinks, updatedAtoms } = await linkMixinNamespaceCalledBy(allAtoms, parsedFiles, absoluteRootPath, verbose);
        if (verbose) logger.info(`  ✓ ${namespaceLinks} namespace + ${mixinLinks} mixin this.* links\n`);
        updatedAtoms.forEach(a => modifiedAtoms.add(a));
        timerMixin.end(verbose);
    } catch (err) {
        logger.warn(`  ⚠️ mixin-linker failed: ${err.message}`);
    }

    // 3.7: Class instantiation calledBy
    try {
        const timerClass = startTimer('6e. Class instantiation links');
        if (verbose) logger.info('🏗️  Resolving class instantiation calledBy links...');
        const { resolved: classResolved, classesTracked } = resolveClassInstantiationCalledBy(allAtoms);
        if (verbose) logger.info(`  ✓ ${classResolved} class method calledBy links resolved (${classesTracked} classes tracked)\n`);
        if (classResolved > 0) {
            // Acumular átomos modificados (sin guardar individualmente)
            allAtoms
                .filter(a => a.calledBy?.length > 0 && a.filePath && a.name)
                .forEach(a => modifiedAtoms.add(a));
        }
        timerClass.end(verbose);
    } catch (err) {
        logger.warn(`  ⚠️ class-instantiation-tracker failed: ${err.message}`);
    }

    // 3.7b: Export object references (e.g., export const handlers = { func1, func2 })
    try {
        const timerExportObj = startTimer('6f. Export object references');
        if (verbose) logger.info('🔗 Resolving export object function references...');
        const { referenceLinks, updatedAtoms } = await linkExportObjectReferences(allAtoms, parsedFiles, absoluteRootPath, verbose);
        if (verbose) logger.info(`  ✓ ${referenceLinks} export object reference links\n`);
        updatedAtoms.forEach(a => modifiedAtoms.add(a));
        timerExportObj.end(verbose);
    } catch (err) {
        logger.warn(`  ⚠️ export-object-references failed: ${err.message}`);
    }

    // 3.8: Caller Pattern Detection
    const timerPattern = startTimer('6f. Caller pattern detection');
    if (verbose) logger.info('🏷️  Detecting caller patterns...');
    enrichWithCallerPattern(allAtoms);

    // Todos los átomos tienen callerPattern ahora
    allAtoms.forEach(a => modifiedAtoms.add(a));

    if (verbose) {
        const patternStats = {};
        for (const atom of allAtoms) {
            const id = atom.callerPattern?.id || 'unknown';
            patternStats[id] = (patternStats[id] || 0) + 1;
        }
        const topPatterns = Object.entries(patternStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => `${id}: ${count}`);
        logger.info(`  ✓ Caller patterns: ${topPatterns.join(', ')}\n`);
    }
    timerPattern.end(verbose);

    // 🚀 BULK SAVE: Guardar TODOS los átomos modificados de una vez
    const timerBulkUpdate = startTimer('6f-bulk. Bulk update modified atoms');
    const repo = getRepository(absoluteRootPath);
    const callRelationSyncAtoms = collectCallRelationSyncAtoms(repo, allAtoms, absoluteRootPath);
    if (modifiedAtoms.size > 0) {
        if (repo.saveManyBulk) {
            const uniqueAtoms = Array.from(modifiedAtoms);
            repo.saveManyBulk(uniqueAtoms, 500);
            if (verbose) {
                logger.info(`  ✓ ${uniqueAtoms.length} modified atoms saved via bulk update`);
            }
        }
    }
    timerBulkUpdate.end(verbose);

    // 3.9: Guardar relaciones entre átomos en atom_relations
    const timerRelations = startTimer('6g. Save atom relations');
    if (verbose) logger.info('🔗 Saving atom relations to database...');
    await saveAtomRelations(allAtoms, absoluteRootPath, verbose, callRelationSyncAtoms);
    timerRelations.end(verbose);

    // 🚀 NEW: 3.10: Guardar relaciones de estado compartido (Sprint 10)
    const timerSharedState = startTimer('6h. Save shared state relations');
    if (verbose) logger.info('🧠 Linking shared state dependencies...');
    await saveSharedStateRelations(allAtoms, absoluteRootPath, verbose);
    timerSharedState.end(verbose);

    timerTotal.end(verbose);
}

/**
 * Guarda las relaciones calls de todos los átomos en la tabla atom_relations
 */
export async function saveAtomRelations(allAtoms, absoluteRootPath, verbose, relationSyncAtoms = null) {
    return persistCallRelationsHelper(allAtoms, absoluteRootPath, verbose, relationSyncAtoms, logger);
}

/**
 * Detecta y guarda relaciones de estado compartido entre átomos (global.*, process.env.*)
 */
export async function saveSharedStateRelations(allAtoms, absoluteRootPath, verbose) {
    return persistSharedStateLinkageHelper(allAtoms, absoluteRootPath, verbose, logger);
}

/**
 * Detecta y guarda relaciones de estado compartido de forma incremental.
 * Útil para el FileWatcher cuando solo cambia un archivo limitado.
 */
export async function saveSharedStateRelationsIncrementally(targetAtoms, absoluteRootPath, verbose) {
    return persistSharedStateLinkageIncrementallyHelper(targetAtoms, absoluteRootPath, verbose, logger);
}

/**
 * Construye el índice de átomos para análisis molecular.
 */
export function buildAtomsIndex(normalizedParsedFiles) {
    const atomsIndex = {};
    for (const [filePath, fileInfo] of Object.entries(normalizedParsedFiles)) {
        if (fileInfo.atoms && fileInfo.atoms.length > 0) {
            atomsIndex[filePath] = { atoms: fileInfo.atoms, atomCount: fileInfo.atomCount };
        }
    }
    return atomsIndex;
}
