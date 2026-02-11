/**
 * Circular Imports Analysis - Entry Point
 * 
 * Re-exporta desde el sistema molecular de clasificación.
 * Mantiene backwards compatibility.
 * 
 * @module circular-imports
 */

export { findCircularImports, classifyCycle } from './cycle-classifier.js';
