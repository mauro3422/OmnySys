/**
 * @fileoverview Type Inferrer - Infiere tipos a través del grafo
 * 
 * Propaga tipos desde inputs hasta outputs, aplicando reglas
 * de transformación para determinar tipos intermedios.
 * 
 * @module data-flow-v2/analyzers/type-inferrer
 * @deprecated Use modular version: type-inferrer/index.js
 */

// Re-export from modular version for backward compatibility
export { TypeInferrer, default } from './type-inferrer/index.js';
