/**
 * @fileoverview Main Preprocessor Engine
 * Main preprocessor engine that coordinates processing
 * 
 * @module preprocessor/engine/main-engine
 */

import { ContextModel } from '../context-model.js';
import { TokenClassifier } from '../token-classifier.js';
import { createHandler } from './language-handlers.js';
import { processCode } from './code-processor.js';
import { 
  validateTransformations, 
  createSnapshot, 
  needsPreprocessing, 
  getFeatures 
} from './validation-utils.js';

/**
 * PreprocessorEngine - Preprocessing engine
 * 
 * @example
 * const engine = new PreprocessorEngine('javascript');
 * const result = engine.preprocess(code);
 * // result.code - transformed code for Babel
 * // result.transformations - change log
 */
export class PreprocessorEngine {
  /**
   * @param {string} language - Language ('javascript', 'typescript')
   * @param {Object} options - Configuration options
   * @param {boolean} options.debug - Enable debug mode
   * @param {number} options.maxBufferSize - Max buffer size for lookahead
   */
  constructor(language = 'javascript', options = {}) {
    this.language = language;
    this.options = {
      debug: false,
      maxBufferSize: 100,
      ...options
    };
    
    // Main components
    this.context = new ContextModel();
    this.handler = createHandler(language);
    this.classifier = new TokenClassifier(language, this.context, this.handler.getRules());
    
    // Internal state
    this.transformations = [];
    this.warnings = [];
  }
  
  /**
   * Preprocesses code to be parsed by Babel
   * 
   * @param {string} code - Original source code
   * @param {Object} options - Processing options
   * @returns {{ code: string, transformations: Array, warnings: Array, features: Array }}
   */
  preprocess(code, options = {}) {
    // Reset state
    this.context.reset();
    this.transformations = [];
    this.warnings = [];
    
    // Detect features first (optimization)
    const featureDetection = getFeatures(code, this.handler);
    
    // If no problematic features, return code unchanged
    if (!featureDetection.needsPreprocessing) {
      return {
        code,
        transformations: [],
        warnings: [],
        features: featureDetection.features,
        originalCode: code
      };
    }
    
    // Preprocess
    const result = processCode(code, this.context, this.classifier, this.handler, {
      ...this.options,
      ...options
    });
    
    // Store transformations and warnings
    this.transformations = result.transformations;
    this.warnings = result.warnings;
    
    return {
      code: result.code,
      transformations: this.transformations,
      warnings: this.warnings,
      features: featureDetection.features,
      originalCode: code,
      debug: result.debug
    };
  }
  
  /**
   * Validates that transformations are reversible
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate() {
    return validateTransformations(this.transformations);
  }
  
  /**
   * Creates snapshot of current preprocessor state
   * @returns {Object}
   */
  snapshot() {
    return createSnapshot(this.context, this.transformations, this.warnings);
  }
  
  /**
   * Detects if code needs preprocessing
   * @param {string} code
   * @returns {boolean}
   */
  needsPreprocessing(code) {
    return needsPreprocessing(code, this.handler);
  }
  
  /**
   * Gets feature detection info for code
   * @param {string} code
   * @returns {Object}
   */
  getFeatures(code) {
    return getFeatures(code, this.handler);
  }
}

export default PreprocessorEngine;
