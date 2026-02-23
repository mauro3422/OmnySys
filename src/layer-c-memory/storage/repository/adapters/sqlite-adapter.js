/**
 * @fileoverview sqlite-adapter.js
 * 
 * Implementacion de AtomRepository usando SQLite (better-sqlite3).
 * REFACTORIZADO: Dividido en módulos especializados manteniendo API pública.
 * 
 * ESTRUCTURA:
 * - sqlite-adapter-core.js: Core base, inicialización, statements
 * - sqlite-crud-operations.js: CRUD básico (getById, save, delete)
 * - sqlite-query-operations.js: Queries y búsquedas (query, findByName, findSimilar)
 * - sqlite-relation-operations.js: Relaciones entre átomos (getCallers, saveCalls)
 * - sqlite-bulk-operations.js: Operaciones bulk (saveMany, saveManyBulk, saveRelationsBulk)
 * 
 * IMPORTANTE: La API pública se mantiene idéntica para compatibilidad.
 * 
 * @module storage/repository/adapters/sqlite-adapter
 */

import { SQLiteBulkOperations } from './sqlite-bulk-operations.js';

// Re-exportar para compatibilidad
export { SQLiteAdapterCore } from './sqlite-adapter-core.js';
export { SQLiteCrudOperations } from './sqlite-crud-operations.js';
export { SQLiteQueryOperations } from './sqlite-query-operations.js';
export { SQLiteRelationOperations } from './sqlite-relation-operations.js';
export { SQLiteBulkOperations } from './sqlite-bulk-operations.js';

/**
 * SQLite Adapter completo - Fachada (Facade Pattern)
 * 
 * Extiende todas las capacidades en una sola clase manteniendo
 * la API pública exactamente igual para no romper código existente.
 * 
 * Herencia:
 *   SQLiteBulkOperations
 *     → SQLiteRelationOperations
 *       → SQLiteQueryOperations
 *         → SQLiteCrudOperations
 *           → SQLiteAdapterCore
 *             → AtomRepository
 */
export class SQLiteAdapter extends SQLiteBulkOperations {
  // No se necesita código adicional, hereda todo de SQLiteBulkOperations
  // La API pública se mantiene idéntica:
  // 
  // Métodos CRUD:
  //   - getById(id), getByFile(filePath), getByFileAndName(filePath, name)
  //   - save(atom), saveMany(atoms)
  //   - delete(id), deleteByFile(filePath), exists(id)
  //
  // Métodos Query:
  //   - query(filter, options), getAll(options)
  //   - findByName(name), findByArchetype(type, options), findByPurpose(type)
  //   - findSimilar(id, options), updateVectors(id, vectors)
  //
  // Métodos Relaciones:
  //   - getCallers(id), getCallees(id), getCallGraph(id, options)
  //   - saveRelation(sourceId, targetId, type, metadata)
  //   - saveCalls(atomId, calls)
  //
  // Métodos Bulk:
  //   - saveMany(atoms), saveManyBulk(atoms, batchSize)
  //   - saveRelationsBulk(relations, batchSize)
  //
  // Métodos System Map:
  //   - saveSystemMap(systemMap), loadSystemMap()
  //   - getStats(), close(), checkpoint()
}

export default SQLiteAdapter;
