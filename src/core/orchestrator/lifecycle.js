/**
 * @deprecated Use ./lifecycle/index.js directly
 * 
 * This file is a backward compatibility wrapper.
 * Import from './lifecycle/' submodules for better tree-shaking.
 */

export {
  initialize,
  startBackgroundIndexing,
  stop,
  _startLLMHealthChecker,
  _initializeFileWatcher,
  _initializeWebSocket,
  _loadState,
  _monitorIndexingProgress
} from './lifecycle/index.js';
