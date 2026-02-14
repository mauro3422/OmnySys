// Initialization
export { initialize, startBackgroundIndexing } from './init/index.js';

// Shutdown
export { stop } from './shutdown/index.js';

// Health checking
export { _startLLMHealthChecker } from './health/index.js';

// Watchers
export { _initializeFileWatcher, _initializeWebSocket } from './watchers/index.js';

// State management
export { _loadState, _monitorIndexingProgress } from './state/index.js';
