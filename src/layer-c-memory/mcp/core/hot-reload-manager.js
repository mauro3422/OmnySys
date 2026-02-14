/**
 * @fileoverview Hot Reload Manager - Backward Compatibility Layer
 * 
 * This file provides backward compatibility for the refactored module.
 * All functionality has been moved to the modular architecture.
 * 
 * @deprecated Use './hot-reload-manager/index.js' instead
 * @module mcp/core/hot-reload-manager
 */

import {
  HotReloadManager,
  FileWatcher,
  ModuleClassifier,
  ReloadHandler
} from './hot-reload-manager/index.js';

// Re-export all public APIs for backward compatibility
export {
  HotReloadManager,
  FileWatcher,
  ModuleClassifier,
  ReloadHandler
};

export default HotReloadManager;
