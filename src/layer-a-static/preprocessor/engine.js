/**
 * @fileoverview Preprocessor Engine (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular engine directory.
 * Please update your imports to use the new structure.
 * 
 * @deprecated Use ./engine/index.js or specific modules
 * @module preprocessor/engine-deprecated
 */

export {
  // Main engine
  PreprocessorEngine,
  // Language handlers
  LANGUAGE_HANDLERS,
  createHandler,
  isLanguageSupported,
  getSupportedLanguages,
  // Lookahead
  createLookahead,
  createInitialLookahead,
  // Context
  updateBracketDepths,
  applyTransitions,
  updateContext,
  // Token tracking
  trackToken,
  getRecentTokens,
  // Code processing
  processCode,
  // Validation
  validateTransformations,
  createSnapshot,
  needsPreprocessing,
  getFeatures
} from './engine/index.js';
