/**
 * @fileoverview Data Flow Analyzer - Analiza coherencia del flujo de datos
 * 
 * Verifica:
 * - Inputs no usados
 * - Variables muertas (definidas pero no usadas)
 * - Cobertura del flujo
 * - Coherencia general
 * 
 * @module extractors/data-flow/core/data-flow-analyzer
 */

import { createLogger } from '../../../../utils/logger.js';
import { findUnusedInputs } from './analyzer/input-analyzer.js';
import { findDeadVariables } from './analyzer/dead-variable-finder.js';
import { 
  calculateCoverage, 
  calculateUsageRate, 
  calculateProductivity, 
  calculateOutputDiversity 
} from './analyzer/metrics-calculator.js';
import { calculateCoherence } from './analyzer/coherence-calculator.js';
import { detectPatterns, generateSuggestions } from './analyzer/pattern-detector.js';

const logger = createLogger('OmnySys:data-flow:analyzer');

/**
 * Analiza la coherencia de un data flow
 */
export class DataFlowAnalyzer {
  constructor(inputs, transformations, outputs) {
    this.inputs = inputs || [];
    this.transformations = transformations || [];
    this.outputs = outputs || [];
  }

  analyze() {
    const unusedInputs = this.findUnusedInputs();
    const deadVariables = this.findDeadVariables();
    const coverage = this.calculateCoverage();
    const coherence = this.calculateCoherence(unusedInputs, deadVariables, coverage);

    return {
      coherence,
      coverage,
      unusedInputs,
      deadVariables,
      metrics: {
        totalInputs: this.inputs.length,
        totalTransformations: this.transformations.length,
        totalOutputs: this.outputs.length,
        inputUsageRate: this.calculateUsageRate(this.inputs.length, unusedInputs.length),
        transformationProductivity: this.calculateProductivity(),
        outputDiversity: this.calculateOutputDiversity()
      }
    };
  }

  findUnusedInputs() {
    return findUnusedInputs(this.inputs, this.transformations, this.outputs);
  }

  findDeadVariables() {
    return findDeadVariables(this.transformations, this.outputs, this.inputs);
  }

  calculateCoverage() {
    return calculateCoverage(this.inputs, this.transformations, this.outputs);
  }

  calculateCoherence(unusedInputs, deadVariables, coverage) {
    return calculateCoherence(unusedInputs, deadVariables, coverage, this.inputs, this.outputs);
  }

  calculateUsageRate(total, unused) {
    return calculateUsageRate(total, unused);
  }

  calculateProductivity() {
    return calculateProductivity(this.transformations, this.outputs);
  }

  calculateOutputDiversity() {
    return calculateOutputDiversity(this.outputs);
  }

  detectPatterns() {
    return detectPatterns(this.inputs, this.transformations, this.outputs);
  }

  generateSuggestions() {
    const analysis = this.analyze();
    return generateSuggestions(analysis, detectPatterns, this.inputs, this.outputs);
  }
}

export default DataFlowAnalyzer;
