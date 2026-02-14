/**
 * @fileoverview index.js
 * 
 * Data Flow Analyzer - Main entry point (backward compatible)
 * 
 * Analiza coherencia del flujo de datos
 * Verifica:
 * - Inputs no usados
 * - Variables muertas (definidas pero no usadas)
 * - Cobertura del flujo
 * - Coherencia general
 * 
 * @module extractors/data-flow/core/data-flow-analyzer
 */

import { DataFlowAnalyzer } from './analysis/analyzer.js';
import { detectPatterns, generateSuggestions } from './validators/patterns.js';

// Extend DataFlowAnalyzer with pattern methods
DataFlowAnalyzer.prototype.detectPatterns = function() {
  return detectPatterns(this.inputs, this.transformations, this.outputs);
};

DataFlowAnalyzer.prototype.generateSuggestions = function() {
  const analysis = this.analyze();
  return generateSuggestions(analysis, this.inputs, this.transformations, this.outputs);
};

export { DataFlowAnalyzer };
export default DataFlowAnalyzer;
