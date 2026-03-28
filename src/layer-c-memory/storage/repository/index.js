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

// Bridge canonical between runtime subsystems and SQLite repository
export {
  REPOSITORY_MUTATION_DURABILITY,
  enqueueRepositoryMutation,
  flushRepositoryMutationJournal,
  getRepositoryMutationJournalSnapshot,
  getRepositoryStatus,
  isRepositoryReady,
  runRepositoryMutation
} from './repository-bridge.js';

export { getRepositoryDiagnostics } from './repository-diagnostics.js';

// Utilidades
export {
  calculateAtomVectors,
  calculateImportance,
  calculateCoupling,
  calculateCohesion,
  calculatePropagation
} from './utils/vector-calculator.js';
