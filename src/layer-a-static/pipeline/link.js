import { startTimer } from '../../utils/performance-tracker.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { resolveClassInstantiationCalledBy } from './phases/calledby/class-instantiation-tracker.js';
import { enrichWithCallerPattern } from './phases/atom-extraction/metadata/caller-pattern.js';
import { buildAtomIndex, linkFunctionCalledBy } from './phases/calledby/function-linker.js';
import { linkVariableCalledBy } from './phases/calledby/variable-linker.js';
import { linkMixinNamespaceCalledBy } from './phases/calledby/mixin-namespace-linker.js';
import { linkExportObjectReferences } from './phases/calledby/export-object-references.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:link');

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
    if (modifiedAtoms.size > 0) {
        const repo = getRepository(absoluteRootPath);
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
    await saveAtomRelations(allAtoms, absoluteRootPath, verbose);
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
export async function saveAtomRelations(allAtoms, absoluteRootPath, verbose) {
    const repo = getRepository(absoluteRootPath);
    if (!repo.saveCalls) {
        if (verbose) logger.warn('  ⚠️ Repository does not support saveCalls');
        return;
    }

    // 🚀 BULK INSERT: Preparar todas las relaciones y guardar en batch
    const relationsToSave = [];
    for (const atom of allAtoms) {
        if (atom.calls && atom.calls.length > 0) {
            for (const call of atom.calls) {
                relationsToSave.push({ atomId: atom.id, call });
            }
        }
    }

    const timerRelationsLog = startTimer('Bulk save relations');

    if (relationsToSave.length > 0) {
        if (repo.saveRelationsBulk) {
            repo.saveRelationsBulk(relationsToSave, 500);
            if (verbose) {
                logger.info(`  ✓ Saved ${relationsToSave.length} atom relations via bulk insert`);
            }
        } else {
            // Fallback al método antiguo
            for (const atom of allAtoms) {
                if (atom.calls && atom.calls.length > 0) {
                    try {
                        repo.saveCalls(atom.id, atom.calls);
                    } catch (err) {
                        logger.warn(`  ⚠️ Failed to save relations for ${atom.id}: ${err.message}`);
                    }
                }
            }
        }
    }

    timerRelationsLog.end(verbose);

    // 🔗 EXECUTES_SQL RELATIONS: Link parent JS atoms → SQL query atoms
    try {
        const db = repo.db || repo.getDatabase?.();
        if (db) {
            const insertRelation = db.prepare(`
                INSERT OR IGNORE INTO atom_relations (source_id, target_id, relation_type, weight, line_number, created_at)
                VALUES (?, ?, 'executes_sql', 1.0, ?, datetime('now'))
            `);
            const insertBatch = db.transaction((rels) => {
                for (const r of rels) insertRelation.run(r.sourceId, r.targetId, r.line);
            });

            const sqlRelations = [];
            for (const atom of allAtoms) {
                if (atom.type !== 'sql_query') continue;
                const meta = atom._meta || {};
                if (meta.parent_atom_id) {
                    sqlRelations.push({ sourceId: meta.parent_atom_id, targetId: atom.id, line: atom.lineStart || 0 });
                }
            }

            if (sqlRelations.length > 0) {
                insertBatch(sqlRelations);
                if (verbose) logger.info(`  ✓ ${sqlRelations.length} executes_sql relations saved`);
            }
        }
    } catch (sqlRelErr) {
        logger.warn(`  ⚠️ executes_sql relation save failed: ${sqlRelErr.message}`);
    }

    if (verbose) {
        logger.info(`  ✓ Saved ${relationsToSave.length} atom relations\n`);
    }
}

/**
 * Detecta y guarda relaciones de estado compartido entre átomos (global.*, process.env.*)
 */
export async function saveSharedStateRelations(allAtoms, absoluteRootPath, verbose) {
    const repo = getRepository(absoluteRootPath);
    const db = repo.db || repo.getDatabase?.();
    if (!db) {
        if (verbose) logger.warn('  ⚠️ Repository/DB not available for shared state links');
        return;
    }

    await _processSharedStateLinkage(db, allAtoms, verbose);
}

/**
 * Detecta y guarda relaciones de estado compartido de forma incremental.
 * Útil para el FileWatcher cuando solo cambia un archivo limitado.
 */
export async function saveSharedStateRelationsIncrementally(targetAtoms, absoluteRootPath, verbose) {
    const repo = getRepository(absoluteRootPath);
    const db = repo.db || repo.getDatabase?.();
    if (!db) return;

    const sharedTargetAtoms = targetAtoms.filter(a => a.sharedStateAccess && a.sharedStateAccess.length > 0);

    // 1. Marcar relaciones antiguas como removidas para evitar duplicados, preservando la genética
    const deleteStmt = db.prepare(`UPDATE atom_relations SET is_removed = 1, updated_at = datetime('now') WHERE (source_id = ? OR target_id = ?) AND relation_type = 'shares_state'`);
    db.transaction(() => {
        for (const atom of targetAtoms) deleteStmt.run(atom.id, atom.id);
    })();

    if (sharedTargetAtoms.length === 0) return;

    // 2. Cargar otros átomos que tienen estado compartido desde la DB para cruzar referencias
    // Filtramos por shared_state_json poblado.
    const rows = db.prepare(`
        SELECT * FROM atoms 
        WHERE shared_state_json IS NOT NULL 
          AND (shared_state_json != '[]' AND shared_state_json != '')
          AND is_removed = 0
    `).all();

    const { rowToAtom } = await import('#layer-c/storage/repository/adapters/helpers/converters.js');
    const existingSharedAtoms = rows.map(rowToAtom);

    // 3. Mezclar: Átomos frescos del archivo cambiado + átomos conocidos del resto del proyecto
    const targetIds = new Set(targetAtoms.map(a => a.id));
    const allRelevantAtoms = [
        ...existingSharedAtoms.filter(a => !targetIds.has(a.id)),
        ...targetAtoms
    ];

    // 4. Procesar vinculación (aprovechando la lógica común)
    await _processSharedStateLinkage(db, allRelevantAtoms, verbose);
}

/**
 * Lógica interna común para procesar el mapa de estado compartido
 * @private
 */
async function _processSharedStateLinkage(db, allAtoms, verbose) {
    const sharedAtoms = allAtoms.filter(a => a.sharedStateAccess && a.sharedStateAccess.length > 0);
    const stateMap = new Map();

    for (const atom of sharedAtoms) {
        for (const access of atom.sharedStateAccess) {
            const key = access.fullReference || `${access.objectName}.${access.propName}`;
            if (!stateMap.has(key)) stateMap.set(key, []);
            stateMap.get(key).push({ id: atom.id, line: access.line, type: access.type });
        }
    }

    const relations = [];
    for (const [key, accesses] of stateMap.entries()) {
        const writers = accesses.filter(a => a.type === 'write');
        const readers = accesses.filter(a => a.type === 'read');

        // Link writers to readers
        for (const writer of writers) {
            for (const reader of readers) {
                if (writer.id === reader.id) continue;
                relations.push({
                    sourceId: writer.id,
                    targetId: reader.id,
                    type: 'shares_state',
                    weight: 1.0,
                    line: writer.line,
                    context: JSON.stringify({ key, direction: 'writer_to_reader' })
                });
            }
        }

        // Link multiple writers together
        for (let i = 0; i < writers.length; i++) {
            for (let j = i + 1; j < writers.length; j++) {
                relations.push({
                    sourceId: writers[i].id,
                    targetId: writers[j].id,
                    type: 'shares_state',
                    weight: 0.8,
                    line: writers[i].line,
                    context: JSON.stringify({ key, direction: 'co_writers' })
                });
            }
        }
    }

    if (relations.length > 0) {
        const insertRelation = db.prepare(`
            INSERT OR IGNORE INTO atom_relations (source_id, target_id, relation_type, weight, line_number, context_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        const insertBatch = db.transaction((rels) => {
            for (const r of rels) {
                insertRelation.run(r.sourceId, r.targetId, r.type, r.weight, r.line, r.context);
            }
        });

        insertBatch(relations);
        if (verbose) logger.info(`  ✓ ${relations.length} shares_state relations saved (AI Impact Map ready)`);
    }
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
