import { atomToRow } from './converters.js';
import { buildAtomInsertValues } from './atom-schema.js';
import { markRelatedTestAtoms } from './test-atom-orphaning.js';

export function softDeleteRelatedCallRelations(adapter, atomIds = [], now = new Date().toISOString()) {
  if (!adapter?.db || !Array.isArray(atomIds) || atomIds.length === 0) {
    return 0;
  }

  const uniqueAtomIds = [...new Set(atomIds.filter(Boolean))];
  if (uniqueAtomIds.length === 0) {
    return 0;
  }

  const placeholders = uniqueAtomIds.map(() => '?').join(', ');
  const result = adapter.db.prepare(`
    UPDATE atom_relations
    SET is_removed = 1,
        lifecycle_status = 'removed',
        updated_at = ?
    WHERE relation_type = 'calls'
      AND (source_id IN (${placeholders}) OR target_id IN (${placeholders}))
      AND (is_removed IS NULL OR is_removed = 0)
  `).run(now, ...uniqueAtomIds, ...uniqueAtomIds);

  return result?.changes || 0;
}

export function saveAtomRecord(adapter, atom) {
  atom.filePath = adapter._normalize(atom.file || atom.filePath);
  atom.file = atom.filePath;
  atom.id = `${atom.filePath}::${atom.name}`;

  const normalizedId = atom.id;
  const now = new Date().toISOString();
  const atomBefore = adapter.statements.getById.get(normalizedId);

  const row = atomToRow(atom);
  const values = buildAtomInsertValues(row, now);

  adapter.statements.insertAtom.run(...values);

  if (atomBefore) {
    const dnaBefore = atomBefore.dna_json;
    const dnaAfter = row.dna_json;

    if (dnaBefore !== dnaAfter) {
      try {
        adapter.db.prepare(`
          INSERT INTO atom_events (atom_id, event_type, before_state, after_state, timestamp, source)
          VALUES (?, 'updated', ?, ?, ?, 'extractor')
        `).run(normalizedId, dnaBefore, dnaAfter, now);
      } catch (error) {
        adapter._logger.warn(`[SQLiteAdapter] Failed to log update event: ${error.message}`);
      }
    }
  } else {
    try {
      adapter.db.prepare(`
        INSERT INTO atom_events (atom_id, event_type, after_state, timestamp, source)
        VALUES (?, 'created', ?, ?, 'extractor')
      `).run(normalizedId, row.dna_json, now);
    } catch (error) {
      adapter._logger.warn(`[SQLiteAdapter] Failed to log creation event: ${error.message}`);
    }
  }

  adapter._logger.debug(`[SQLiteAdapter] Saved atom: ${atom.id}`);
  return atom;
}

export function deleteAtomRecord(adapter, id) {
  const normalizedId = adapter._normalizeId(id);
  const now = new Date().toISOString();
  const atomBefore = adapter.statements.getById.get(normalizedId);

  if (atomBefore) {
    try {
      adapter.db.prepare(`
        INSERT INTO atom_events (atom_id, event_type, before_state, impact_score, timestamp, source)
        VALUES (?, 'deleted', ?, ?, ?, 'system_cleanup')
      `).run(id, JSON.stringify(atomBefore), 0.5, now);
    } catch (error) {
      adapter._logger.warn(`[SQLiteAdapter] Failed to log delete event: ${error.message}`);
    }

    markRelatedTestAtoms(adapter.db, normalizedId, atomBefore.file_path, adapter._logger);
    softDeleteRelatedCallRelations(adapter, [normalizedId], now);
  }

  const result = adapter.statements.deleteById.run(normalizedId);
  return result.changes > 0;
}
