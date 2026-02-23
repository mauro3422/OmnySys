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
      const placeholders = filter.ids.map(() => '?').join(',');
      sql += ` AND id IN (${placeholders})`;
      params.push(...filter.ids);
    }
    
    if (filter.name) {
      sql += ' AND name LIKE ?';
      params.push(`%${filter.name}%`);
    }
    
    const sortField = options.sortBy || 'id';
    const sortOrder = options.sortOrder || 'ASC';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;
    
    // 0 = sin límite (cargar todos), default 50000 para evitar overflow
    const limit = options.limit === 0 ? Infinity : (options.limit || 50000);
    const offset = options.offset || 0;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    
    return rows.map(rowToAtom);
  }

  getAll(options = {}) {
    // 0 = sin límite (cargar todos), default 50000 para evitar overflow
    const limit = options.limit === 0 ? Infinity : (options.limit || 50000);
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

  updateVectors(id, vectors) {
    const fields = Object.keys(vectors);
    const values = Object.values(vectors);
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    
    const stmt = this.db.prepare(
      `UPDATE atoms SET ${setClause}, updated_at = ? WHERE id = ?`
    );
    
    stmt.run(...values, new Date().toISOString(), id);
  }
}
