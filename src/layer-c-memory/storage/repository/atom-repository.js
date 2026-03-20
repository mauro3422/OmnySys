import { statsPool } from '../../../shared/utils/stats-pool.js';

/**
 * @fileoverview atom-repository.js
 *
 * Base interface for atom repositories.
 * Defines the contract implemented by SQLite, JSON, Hybrid, etc.
 *
 * @module storage/repository/atom-repository
 */

function createAbstractMethod(methodName) {
  return async function abstractRepositoryMethod() {
    throw new Error(`Method ${methodName}() must be implemented`);
  };
}

const ABSTRACT_METHODS = [
  'initialize',
  'getById',
  'getByFileAndName',
  'getByFile',
  'delete',
  'deleteFile',
  'deleteByFile',
  'query',
  'getAll',
  'findByName',
  'findByArchetype',
  'findByPurpose',
  'getCallGraph',
  'getCallers',
  'getCallees',
  'saveRelation',
  'updateVectors',
  'findSimilar',
  'exists',
  'close'
];

/**
 * Interface: AtomRepository
 *
 * All adapters must implement these methods.
 * This keeps JSON/SQLite consumers stable.
 */
export class AtomRepository {
  /**
   * Gets repository statistics.
   * @returns {Object}
   */
  getStats() {
    return statsPool.getStats('atom-repository');
  }
}

for (const methodName of ABSTRACT_METHODS) {
  Object.defineProperty(AtomRepository.prototype, methodName, {
    value: createAbstractMethod(methodName),
    writable: true,
    configurable: true
  });
}

export default AtomRepository;
