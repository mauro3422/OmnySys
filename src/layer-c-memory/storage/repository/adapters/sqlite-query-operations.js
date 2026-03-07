/**
 * @fileoverview sqlite-query-operations.js
 * 
 * Operaciones de query y búsqueda para SQLite Adapter.
 * Extensión para consultas complejas y filtros.
 * 
 * @module storage/repository/adapters/sqlite-query-operations
 */

import { SQLiteCrudOperations } from './sqlite-crud-operations.js';
import { rowToAtom } from './helpers/converters.js';

/**
 * Mixin/Clase base para operaciones de query
 * Extiende CRUD con capacidades de búsqueda
 */
export class SQLiteQueryOperations extends SQLiteCrudOperations {

  query(filter = {}, options = {}) {
    let sql = 'SELECT * FROM atoms WHERE 1=1';
    const params = [];

    if (filter.filePath) {
      sql += ' AND file_path = ?';
      params.push(filter.filePath);
    }

    if (filter.atomType) {
      sql += ' AND atom_type = ?';
      params.push(filter.atomType);
    }

    if (filter.archetype) {
      sql += ' AND archetype_type = ?';
      params.push(filter.archetype);
    }

    if (filter.purpose) {
      sql += ' AND purpose_type = ?';
      params.push(filter.purpose);
    }

    if (filter.isExported !== undefined) {
      sql += ' AND is_exported = ?';
      params.push(filter.isExported ? 1 : 0);
    }

    if (filter.isDeadCode !== undefined) {
      sql += ' AND is_dead_code = ?';
      params.push(filter.isDeadCode ? 1 : 0);
    }

    if (filter.minComplexity !== undefined) {
      sql += ' AND complexity >= ?';
      params.push(filter.minComplexity);
    }

    if (filter.maxComplexity !== undefined) {
      sql += ' AND complexity <= ?';
      params.push(filter.maxComplexity);
    }

    if (filter.ids && filter.ids.length > 0) {
      const normalizedIds = filter.ids.map(id => this._normalizeId(id));
      const placeholders = normalizedIds.map(() => '?').join(',');
      sql += ` AND id IN (${placeholders})`;
      params.push(...normalizedIds);
    }

    if (filter.name) {
      sql += ' AND name LIKE ?';
      params.push(`%${filter.name}%`);
    }

    const sortField = this._validateSortField(options.sortBy || 'id');
    const sortOrder = (options.sortOrder || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    // 0 = sin límite (cargar todos), default 50000 para evitar overflow
    const limit = options.limit === 0 ? -1 : (options.limit || 50000);
    const offset = options.offset || 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);

    return rows.map(rowToAtom);
  }

  getAll(options = {}) {
    // 0 = sin límite (cargar todos), default 50000 para evitar overflow
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

    return rows.map(row => {
      const atom = rowToAtom(row);
      const atomHash = atom.dna?.structuralHash || '';
      const similarity = refHash === atomHash ? 1.0 :
        refHash.slice(0, 8) === atomHash.slice(0, 8) ? 0.8 : 0.5;

      return { ...atom, similarity };
    }).filter(a => a.similarity >= threshold);
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

    // Single optimized query: Get all atoms with valid fingerprints
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
        AND fingerprint NOT LIKE '%:unknown'
        AND fingerprint NOT LIKE '%:_callback'
        AND fingerprint NOT LIKE '%:constructor'
        AND length(fingerprint) > ?
      ORDER BY fingerprint, file_path
    `);

    const rows = stmt.all(minEntitySpecificity + 10);

    // Group by fingerprint in memory (faster than GROUP_CONCAT + N+1 queries)
    const groups = new Map();
    for (const row of rows) {
      const fp = row.fingerprint;
      if (!groups.has(fp)) {
        groups.set(fp, []);
      }
      groups.get(fp).push({
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

    // Filter to groups with minCount+ implementations and build result
    return Array.from(groups.entries())
      .filter(([, atoms]) => atoms.length >= minCount)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, limit)
      .map(([fingerprint, atoms]) => {
        const filePaths = [...new Set(atoms.map(a => a.filePath))];
        const [verb, domain, entity] = fingerprint.split(':');
        
        return {
          semanticFingerprint: fingerprint,
          concept: { verb, domain, entity },
          implementationCount: atoms.length,
          fileCount: filePaths.length,
          files: filePaths,
          implementations: atoms,
          hasStructuralVariations: new Set(atoms.map(a => a.structuralHash)).size > 1,
          allExported: atoms.every(a => a.isExported),
          risk: atoms.length >= 3 ? 'high' : atoms.length >= 2 ? 'medium' : 'low'
        };
      });
  }

  updateVectors(id, vectors) {
    const fields = Object.keys(vectors).filter(f => this._isValidVectorField(f));
    if (fields.length === 0) return;

    const values = fields.map(f => vectors[f]);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    const stmt = this.db.prepare(
      `UPDATE atoms SET ${setClause}, updated_at = ? WHERE id = ?`
    );

    stmt.run(...values, new Date().toISOString(), id);
  }

  /**
   * Valida campo de ordenamiento contra whitelist
   * @private
   */
  _validateSortField(field) {
    const whitelist = [
      'id', 'name', 'file_path', 'atom_type', 'complexity',
      'lines_of_code', 'importance_score', 'stability_score',
      'created_at', 'updated_at'
    ];
    return whitelist.includes(field) ? field : 'id';
  }

  /**
   * Valida campo de vector contra whitelist
   * @private
   */
  _isValidVectorField(field) {
    const whitelist = [
      'complexity', 'lines_of_code', 'importance_score', 'stability_score',
      'propagation_score', 'fragility_score', 'testability_score',
      'cohesion_score', 'coupling_score', 'archetype_weight',
      'change_frequency', 'age_days', 'callers_count', 'callees_count'
    ];
    return whitelist.includes(field);
  }
}
