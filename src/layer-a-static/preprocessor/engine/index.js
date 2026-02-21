/**
 * @fileoverview Preprocessor Engine - Barrel Export
 * 
 * Main preprocessing engine module
 * 
 * @module preprocessor/engine
 */

// Main engine
export { PreprocessorEngine } from './main-engine.js';

// Language handlers
export { 
  LANGUAGE_HANDLERS, 
  createHandler, 
  isLanguageSupported, 
  getSupportedLanguages 
} from './language-handlers.js';

// Lookahead
export { createLookahead, createInitialLookahead } from './lookahead-creator.js';

// Context
export { 
  updateBracketDepths, 
  applyTransitions, 
  updateContext 
} from './context-updater.js';

// Token tracking
export { trackToken, getRecentTokens } from './token-tracker.js';

// Code processing
export { processCode } from './code-processor.js';

// Validation
export { 
  validateTransformations, 
  createSnapshot, 
  needsPreprocessing, 
  getFeatures 
} from './validation-utils.js';
