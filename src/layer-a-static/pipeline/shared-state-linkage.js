import { getRepository } from '#layer-c/storage/repository/index.js';
import { syncSemanticConnectionsFromRelations } from '#layer-c/storage/repository/adapters/helpers/system-map/handlers/semantic-handler.js';
import { rowToAtom } from '#layer-c/storage/repository/adapters/helpers/converters.js';

function buildSharedStateMap(atoms) {
  const stateMap = new Map();
  const sharedAtoms = atoms.filter((atom) => atom.sharedStateAccess && atom.sharedStateAccess.length > 0);

  for (const atom of sharedAtoms) {
    for (const access of atom.sharedStateAccess) {
      const key = access.fullReference || `${access.objectName}.${access.propName}`;
      if (!stateMap.has(key)) {
        stateMap.set(key, {
          writers: [],
          readers: [],
          writerIds: new Set(),
          readerIds: new Set()
        });
      }

      const bucket = stateMap.get(key);
      const targetIds = access.type === 'write' ? bucket.writerIds : bucket.readerIds;
      const targetList = access.type === 'write' ? bucket.writers : bucket.readers;

      if (targetIds.has(atom.id)) {
        continue;
      }

      targetIds.add(atom.id);
      targetList.push({ id: atom.id, line: access.line });
    }
  }

  return stateMap;
}

function buildSharedStateRelations(stateMap) {
  const relations = [];

  for (const [key, bucket] of stateMap.entries()) {
    const writers = bucket.writers;
    const readers = bucket.readers;

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

  return relations;
}

function writeSharedStateRelations(db, relations, verbose, logger) {
  if (relations.length === 0) return;

  const insertRelation = db.prepare(`
      INSERT OR IGNORE INTO atom_relations (source_id, target_id, relation_type, weight, line_number, context_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

  const insertBatch = db.transaction((rels) => {
    for (const relation of rels) {
      insertRelation.run(relation.sourceId, relation.targetId, relation.type, relation.weight, relation.line, relation.context);
    }
  });

  insertBatch(relations);
  if (verbose) logger.info(`  ✓ ${relations.length} shares_state relations saved (AI Impact Map ready)`);
}

async function processSharedStateLinkage(db, allAtoms, verbose, logger) {
  try {
    const stateMap = buildSharedStateMap(allAtoms);
    const relations = buildSharedStateRelations(stateMap);
    writeSharedStateRelations(db, relations, verbose, logger);
  } catch (error) {
    logger.warn(`  ⚠️ shared-state linkage failed: ${error.message}`);
  }
}

export async function persistSharedStateLinkage(allAtoms, absoluteRootPath, verbose, logger) {
  const repo = getRepository(absoluteRootPath);
  const db = repo.db || repo.getDatabase?.();
  if (!db) {
    if (verbose) logger.warn('  ⚠️ Repository/DB not available for shared state links');
    return;
  }

  await processSharedStateLinkage(db, allAtoms, verbose, logger);
  const syncResult = syncSemanticConnectionsFromRelations(db);
  if (verbose) logger.info(`  ✓ ${syncResult.total} semantic_connections rows synchronized from atom_relations`);
  if (verbose) logger.info(`  ✓ ${syncResult.systemFilesUpdated || 0} system_files semantic summaries synchronized`);
}

export async function persistSharedStateLinkageIncrementally(targetAtoms, absoluteRootPath, verbose, logger) {
  try {
    const repo = getRepository(absoluteRootPath);
    const db = repo.db || repo.getDatabase?.();
    if (!db) return;

    const sharedTargetAtoms = targetAtoms.filter((atom) => atom.sharedStateAccess && atom.sharedStateAccess.length > 0);

    const deleteStmt = db.prepare(`
      UPDATE atom_relations
      SET is_removed = 1, updated_at = datetime('now')
      WHERE (source_id = ? OR target_id = ?) AND relation_type = 'shares_state'
    `);
    db.transaction(() => {
      for (const atom of targetAtoms) deleteStmt.run(atom.id, atom.id);
    })();

    if (sharedTargetAtoms.length === 0) return;

    const rows = db.prepare(`
      SELECT * FROM atoms
      WHERE shared_state_json IS NOT NULL
        AND (shared_state_json != '[]' AND shared_state_json != '')
        AND is_removed = 0
    `).all();

    const existingSharedAtoms = rows.map(rowToAtom);
    const targetIds = new Set(targetAtoms.map((atom) => atom.id));
    const allRelevantAtoms = [
      ...existingSharedAtoms.filter((atom) => !targetIds.has(atom.id)),
      ...targetAtoms
    ];

    await processSharedStateLinkage(db, allRelevantAtoms, verbose, logger);
    const syncResult = syncSemanticConnectionsFromRelations(db);
    if (verbose) logger.info(`  ✓ ${syncResult.total} semantic_connections rows synchronized from atom_relations`);
    if (verbose) logger.info(`  ✓ ${syncResult.systemFilesUpdated || 0} system_files semantic summaries synchronized`);
  } catch (error) {
    logger.warn(`  ⚠️ shared-state incremental linkage failed: ${error.message}`);
  }
}
