/**
 * @fileoverview shared-state-detector (Barrel Export - DEPRECATED)
 *
 * This file re-exports from the new modular shared-state directory.
 * Please update your imports to use the new structure:
 *
 * Before:
 *   import { parseGlobalState } from './shared-state-detector.js';
 *
 * After:
 *   import { parseGlobalState } from './shared-state/index.js';
 *
 * @deprecated Use ./shared-state/index.js
 * @module analyses/tier3/shared-state-detector-deprecated
 */

export {
  parseGlobalState,
  generateSharedStateConnections
} from './shared-state/index.js';

export { default } from './shared-state/index.js';