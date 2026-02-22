/**
 * @fileoverview lifecycle.js (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular lifecycle directory.
 * Please update your imports to use the new structure:
 * 
 * Before:
 *   import { initialize, startWatching } from './lifecycle.js';
 * 
 * After:
 *   import { initialize, startWatching } from './lifecycle/index.js';
 *   or
 *   import { initialize } from './lifecycle/initialization.js';
 * 
 * @deprecated Use ./lifecycle/index.js or specific lifecycle modules
 * @module file-watcher/lifecycle-deprecated
 */

export {
  initialize,
  loadCurrentState,
  startWatching,
  notifyChange,
  _processWithBatchProcessor,
  _processBatchChanges,
  processPendingChanges,
  processChange,
  stop
} from './lifecycle/index.js';
