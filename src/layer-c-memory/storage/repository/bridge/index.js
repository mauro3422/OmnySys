/**
 * @fileoverview repository-bridge.js
 *
 * Canonical bridge between runtime subsystems and the SQLite repository.
 *
 * Rule:
 * - Rebuildable reads/writes should skip when SQLite is unavailable.
 * - Durable mutations should queue in-memory and flush once the repository becomes ready again.
 *
 * @module storage/repository/repository-bridge
 */

import { REPOSITORY_MUTATION_DURABILITY } from './constants.js';
import { getRepositoryStatus } from './status.js';
import {
  enqueueRepositoryMutation,
  flushRepositoryMutationJournal,
  getRepositoryMutationJournalSnapshot
} from './queue.js';
import { runRepositoryMutation } from './mutation.js';
import { isRepositoryReady } from '../repository-bridge-utils.js';
import { normalizeProjectPath } from './state.js';

export { REPOSITORY_MUTATION_DURABILITY } from './constants.js';
export { getRepositoryStatus } from './status.js';
export {
  enqueueRepositoryMutation,
  flushRepositoryMutationJournal,
  getRepositoryMutationJournalSnapshot
} from './queue.js';
export { runRepositoryMutation } from './mutation.js';
export { isRepositoryReady } from '../repository-bridge-utils.js';
export { normalizeProjectPath } from './state.js';
