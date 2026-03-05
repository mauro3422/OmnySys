/**
 * @fileoverview File Watcher Lifecycle - Barrel Export
 * 
 * Re-exports all lifecycle functions for the file watcher.
 * Maintains backwards compatibility with the old lifecycle.js API.
 * 
 * @module file-watcher/lifecycle
 */

export { initialize, loadCurrentState } from './initialization.js';
export { startWatching, notifyChange } from './watching.js';
export { processPendingChanges, processChange, _isPatternLogicFile, _triggerGlobalPatternRefresh } from './change-processing.js';
export { stop } from './shutdown.js';
