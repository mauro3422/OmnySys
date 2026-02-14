/**
 * @fileoverview analyzer.js
 * 
 * Core Data Flow Analyzer class
 * 
 * @module extractors/data-flow/core/data-flow-analyzer/analysis/analyzer
 */

import { createLogger } from '../../../../../../utils/logger.js';
import { calculateCoherence, calculateCoverage } from '../metrics/coherence.js';
import { calculateUsageRate, calculateProductivity, calculateOutputDiversity } from '../metrics/usage.js';

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

  /**
   * Ejecuta el análisis completo
   */
  analyze() {
    const unusedInputs = this.findUnusedInputs();
    const deadVariables = this.findDeadVariables();
    const coverage = calculateCoverage(this.inputs, this.transformations, this.outputs, unusedInputs);
    const coherence = calculateCoherence(unusedInputs, deadVariables, coverage, this.inputs, this.outputs);

    return {
      coherence,
      coverage,
      unusedInputs,
      deadVariables,
      metrics: {
        totalInputs: this.inputs.length,
        totalTransformations: this.transformations.length,
        totalOutputs: this.outputs.length,
        inputUsageRate: calculateUsageRate(this.inputs.length, unusedInputs.length),
        transformationProductivity: calculateProductivity(this.transformations, this.outputs),
        outputDiversity: calculateOutputDiversity(this.outputs)
      }
    };
  }

  /**
   * Encuentra inputs que no son usados
   */
  findUnusedInputs() {
    const unused = [];

    for (const input of this.inputs) {
      const isUsed = this.isInputUsed(input);
      if (!isUsed) {
        unused.push({
          name: input.name,
          position: input.position,
          type: input.type
        });
      }
    }

    return unused;
  }

  /**
   * Verifica si un input específico es usado
   */
  isInputUsed(input) {
    if (input.usages && input.usages.length > 0) {
      return true;
    }

    if (input.properties && input.properties.length > 0) {
      for (const prop of input.properties) {
        const propUsed = this.transformations.some(t => 
          (Array.isArray(t.from) && t.from.includes(prop.local)) ||
          t.from === prop.local
        ) || this.outputs.some(o => 
          o.sources?.includes(prop.local)
        );
        if (propUsed) return true;
      }
    }

    const usedInTransformations = this.transformations.some(t => {
      const from = Array.isArray(t.from) ? t.from : [t.from];
      return from.includes(input.name);
    });

    if (usedInTransformations) return true;

    const usedInOutputs = this.outputs.some(o => 
      o.sources?.includes(input.name)
    );

    return usedInOutputs;
  }

  /**
   * Encuentra variables muertas (definidas pero no usadas)
   */
  findDeadVariables() {
    const dead = [];
    const definedVars = new Set();
    const usedVars = new Set();

    for (const t of this.transformations) {
      if (t.to && !t.to.startsWith('<')) {
        definedVars.add(t.to);
      }
    }

    for (const t of this.transformations) {
      const from = Array.isArray(t.from) ? t.from : [t.from];
      from.forEach(f => {
        if (f && typeof f === 'string' && !f.startsWith('<')) {
          usedVars.add(f.split('.')[0]);
        }
      });
    }

    for (const o of this.outputs) {
      if (o.sources) {
        o.sources.forEach(s => {
          if (s && typeof s === 'string') {
            usedVars.add(s.split('.')[0]);
          }
        });
      }
    }

    for (const input of this.inputs) {
      usedVars.add(input.name);
    }

    for (const defined of definedVars) {
      if (!usedVars.has(defined)) {
        const def = this.transformations.find(t => t.to === defined);
        dead.push({
          name: defined,
          definedAt: def?.line,
          operation: def?.operation
        });
      }
    }

    return dead;
  }
}

export default DataFlowAnalyzer;
