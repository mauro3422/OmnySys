/**
 * @fileoverview Validation Utilities
 * Validation utilities for preprocessor
 * 
 * @module preprocessor/engine/validation-utils
 */

/**
 * Validates that transformations are reversible
 * @param {Array} transformations - Transformations array
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTransformations(transformations) {
  const errors = [];
  
  for (let i = 0; i < transformations.length; i++) {
    const t = transformations[i];
    
    if (!t.placeholder) {
      errors.push(`Transformación ${i}: falta placeholder`);
    }
    
    if (!t.original) {
      errors.push(`Transformación ${i}: falta original`);
    }
    
    // Check placeholder uniqueness
    const duplicates = transformations.filter(t2 => t2.placeholder === t.placeholder);
    if (duplicates.length > 1) {
      errors.push(`Transformación ${i}: placeholder duplicado "${t.placeholder}"`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates snapshot of preprocessor state
 * @param {Object} context - Context model
 * @param {Array} transformations - Transformations array
 * @param {Array} warnings - Warnings array
 * @returns {Object}
 */
export function createSnapshot(context, transformations, warnings) {
  return {
    context: context.snapshot ? context.snapshot() : {},
    transformations: [...transformations],
    warnings: [...warnings]
  };
}

/**
 * Checks if code needs preprocessing
 * @param {string} code - Source code
 * @param {Object} handler - Language handler
 * @returns {boolean}
 */
export function needsPreprocessing(code, handler) {
  return handler.detectFeatures(code).needsPreprocessing;
}

/**
 * Gets feature information for code
 * @param {string} code - Source code
 * @param {Object} handler - Language handler
 * @returns {Object}
 */
export function getFeatures(code, handler) {
  return handler.detectFeatures(code);
}
