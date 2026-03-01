/**
 * @fileoverview index.js
 * 
 * Barrel exports para el sistema de repositorio.
 * Facilita la importacion de adaptadores y factory.
 * 
 * @module storage/repository
 */

// Interface base
export { AtomRepository } from './atom-repository.js';

// Adaptadores
export { SQLiteAdapter } from './adapters/sqlite-adapter.js';

// Factory
export { RepositoryFactory, getRepository } from './repository-factory.js';

// Utilidades
export {
  calculateAtomVectors,
  calculateImportance,
  calculateCoupling,
  calculateCohesion,
  calculatePropagation
} from './utils/vector-calculator.js';