/**
 * @fileoverview sqlite-query-operations.js
 *
 * Operaciones de query y busqueda para SQLite Adapter.
 * Extension para consultas complejas y filtros.
 *
 * @module storage/repository/adapters/sqlite-query-operations
 */

import { SQLiteCrudOperations } from './sqlite-crud-operations.js';
import { rowToAtom } from './helpers/converters.js';
import { shouldIgnoreConceptualDuplicateFinding } from '../../../../shared/compiler/index.js';
import { buildSoftDeletePredicate } from './helpers/storage-predicate.js';
import { appendAtomQueryFilters } from './helpers/query-filter-builder.js';
import { isValidAtomVectorField, validateAtomSortField } from './helpers/query-field-policy.js';

/**
 * Mixin/Clase base para operaciones de query
 * Extiende CRUD con capacidades de busqueda
 */
export class SQLiteQueryOperations extends SQLiteCrudOperations {

  query(filter = {}, options = {}) {
    const whereClauses = [buildSoftDeletePredicate('', options.includeRemoved)];
    const params = [];

    appendAtomQueryFilters(whereClauses, params, filter, (id) => this._normalizeId(id));

    const sortField = validateAtomSortField(options.sortBy || 'id');
    const sortOrder = (options.sortOrder || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // 0 = sin limite (cargar todos), default 50000 para evitar overflow
    const limit = options.limit === 0 ? -1 : (options.limit || 50000);
    const offset = options.offset || 0;
    params.push(limit, offset);

    const sql = [
      'SELECT * FROM atoms',
      `WHERE ${whereClauses.join(' AND ')}`,
      `ORDER BY ${sortField} ${sortOrder}`,
      'LIMIT ? OFFSET ?'
    ].join(' ');

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);

    return rows.map(rowToAtom);
  }

  getAll(options = {}) {
    // 0 = sin limite (cargar todos), default 50000 para evitar overflow
    const limit = options.limit === 0 ? -1 : (options.limit || 50000);
    const offset = options.offset || 0;

    const rows = this.statements.getAll.all(limit, offset);
    return rows.map(rowToAtom);
  }

  findByName(name) {
    const stmt = this.db.prepare('SELECT * FROM atoms WHERE name LIKE ?');
    const rows = stmt.all(`%${name}%`);
    return rows.map(rowToAtom);
  }

  findByArchetype(archetypeType, options = {}) {
    return this.query({ archetype: archetypeType }, options);
  }

  findByPurpose(purposeType) {
    return this.query({ purpose: purposeType });
  }

  findSimilar(id, options = {}) {
    const threshold = options.threshold || 0.8;
    const limit = options.limit || 10;

    const refAtom = this.getById(id);
    if (!refAtom || !refAtom.dna) return [];

    const refHash = refAtom.dna.structuralHash || '';
    const prefix = refHash.slice(0, 8);

    const stmt = this.db.prepare(`
      SELECT * FROM atoms
      WHERE id != ?
        AND json_extract(dna_json, '$.structuralHash') LIKE ?
      LIMIT ?
    `);

    const rows = stmt.all(id, `${prefix}%`, limit);

    return rows.map((row) => {
      const atom = rowToAtom(row);
      const atomHash = atom.dna?.structuralHash || '';
      const similarity = refHash === atomHash ? 1.0 :
        refHash.slice(0, 8) === atomHash.slice(0, 8) ? 0.8 : 0.5;

      return { ...atom, similarity };
    }).filter((atom) => atom.similarity >= threshold);
  }

  /**
   * Find conceptual duplicates - functions with same semantic purpose but different implementations
   * Groups by semanticFingerprint (format: verb:domain:entity)
   * Optimized: Single query with in-memory grouping
   * @param {Object} options - Query options
   * @param {number} options.minCount - Minimum number of implementations to report (default: 2)
   * @param {number} options.limit - Max groups to return (default: 50)
   * @returns {Array} Groups of conceptually similar functions
   */
  findConceptualDuplicates(options = {}) {
    const minCount = options.minCount || 2;
    const limit = options.limit || 50;
    const minEntitySpecificity = options.minEntitySpecificity || 3;

    const stmt = this.db.prepare(`
      SELECT
        id, name, file_path, atom_type, complexity, is_exported,
        json_extract(dna_json, '$.semanticFingerprint') as fingerprint,
        json_extract(dna_json, '$.semanticHash') as semanticHash,
        json_extract(dna_json, '$.structuralHash') as structuralHash
      FROM atoms
      WHERE atom_type IN ('function', 'method', 'arrow')
        AND (is_removed IS NULL OR is_removed = 0)
        AND (is_dead_code IS NULL OR is_dead_code = 0)
        AND fingerprint IS NOT NULL
        AND fingerprint != 'unknown:unknown:unknown'
        AND fingerprint != 'unknown:unknown:unknown:unknown'
      ORDER BY fingerprint, file_path
    `);

    const rows = stmt.all()
      .filter((row) => !shouldIgnoreConceptualDuplicateFinding(row.file_path, row.name, row.fingerprint));

    const groups = new Map();
    for (const row of rows) {
      const fingerprint = row.fingerprint;
      if (!groups.has(fingerprint)) {
        groups.set(fingerprint, []);
      }

      groups.get(fingerprint).push({
        id: row.id,
        name: row.name,
        filePath: row.file_path,
        atomType: row.atom_type,
        complexity: row.complexity,
        isExported: row.is_exported === 1,
        semanticHash: row.semanticHash,
        structuralHash: row.structuralHash
      });
    }

    return Array.from(groups.entries())
      .filter(([, atoms]) => atoms.length >= minCount)
      .sort((left, right) => right[1].length - left[1].length)
      .slice(0, limit)
      .map(([fingerprint, atoms]) => {
        const filePaths = [...new Set(atoms.map((atom) => atom.filePath))];
        const parts = fingerprint.split(':');
        const [verb, chest, domain, entity] = parts.length === 4 ? parts : [parts[0], 'legacy', parts[1], parts[2]];

        // Centralized Risk Policy by Chest
        let risk = 'medium';
        if (chest === 'lifecycle' || chest === 'telemetry') {
          risk = 'low';
        } else if (chest === 'logic' || chest === 'orchestration') {
          risk = atoms.length >= 3 ? 'high' : 'medium';
        }

        return {
          semanticFingerprint: fingerprint,
          chest,
          concept: { verb, chest, domain, entity },
          implementationCount: atoms.length,
          fileCount: filePaths.length,
          files: filePaths,
          implementations: atoms,
          hasStructuralVariations: new Set(atoms.map((atom) => atom.structuralHash)).size > 1,
          allExported: atoms.every((atom) => atom.isExported),
          risk
        };
      });
  }

  updateVectors(id, vectors) {
    const fields = Object.keys(vectors).filter((field) => isValidAtomVectorField(field));
    if (fields.length === 0) return;

    const values = fields.map((field) => vectors[field]);
    const setClause = fields.map((field) => `${field} = ?`).join(', ');

    const stmt = this.db.prepare(
      `UPDATE atoms SET ${setClause}, updated_at = ? WHERE id = ?`
    );

    stmt.run(...values, new Date().toISOString(), id);
  }
}
