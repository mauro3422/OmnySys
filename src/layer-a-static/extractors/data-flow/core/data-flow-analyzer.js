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
    const coverage = this.calculateCoverage();
    const coherence = this.calculateCoherence(unusedInputs, deadVariables, coverage);

    return {
      coherence,
      coverage,
      unusedInputs,
      deadVariables,
      // Métricas adicionales
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
    // Revisar usos registrados
    if (input.usages && input.usages.length > 0) {
      return true;
    }

    // Para inputs destructurados, revisar si alguna propiedad se usa
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

    // Buscar en transformaciones
    const usedInTransformations = this.transformations.some(t => {
      const from = Array.isArray(t.from) ? t.from : [t.from];
      return from.includes(input.name) || from.includes(input.name);
    });

    if (usedInTransformations) return true;

    // Buscar en outputs
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

    // Recolectar todas las variables definidas
    for (const t of this.transformations) {
      if (t.to && !t.to.startsWith('<')) {
        definedVars.add(t.to);
      }
    }

    // Recolectar todas las variables usadas
    for (const t of this.transformations) {
      const from = Array.isArray(t.from) ? t.from : [t.from];
      from.forEach(f => {
        if (f && typeof f === 'string' && !f.startsWith('<')) {
          usedVars.add(f.split('.')[0]); // Solo nombre base
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

    // También incluir inputs como usados
    for (const input of this.inputs) {
      usedVars.add(input.name);
    }

    // Encontrar definiciones no usadas
    for (const defined of definedVars) {
      if (!usedVars.has(defined)) {
        // Buscar la transformación que definió esta variable
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

  /**
   * Calcula cobertura del flujo
   */
  calculateCoverage() {
    if (this.inputs.length === 0 && this.transformations.length === 0 && this.outputs.length === 0) {
      return 0;
    }

    const unusedCount = this.findUnusedInputs().length;
    const totalInputs = this.inputs.length || 1;
    const inputCoverage = ((totalInputs - unusedCount) / totalInputs) * 100;

    const hasOutput = this.outputs.length > 0;
    const outputScore = hasOutput ? 100 : 0;

    const hasFlow = this.transformations.length > 0;
    const flowScore = hasFlow ? 100 : 0;

    // Promedio ponderado
    return Math.round((inputCoverage * 0.4 + outputScore * 0.3 + flowScore * 0.3) * 100) / 100;
  }

  /**
   * Calcula coherencia general (0-100)
   */
  calculateCoherence(unusedInputs, deadVariables, coverage) {
    let score = 100;

    // Penalizar inputs no usados
    const inputPenalty = unusedInputs.length * 10;
    score -= Math.min(inputPenalty, 30);

    // Penalizar variables muertas
    const deadPenalty = deadVariables.length * 5;
    score -= Math.min(deadPenalty, 20);

    // Bonus por buena cobertura
    if (coverage > 80) score += 10;
    if (coverage > 90) score += 5;

    // Penalizar flujos vacíos
    if (this.inputs.length === 0 && this.outputs.length === 0) {
      score = 0;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcula tasa de uso de inputs
   */
  calculateUsageRate(total, unused) {
    if (total === 0) return 100;
    return Math.round(((total - unused) / total) * 100 * 100) / 100;
  }

  /**
   * Calcula productividad de transformaciones
   */
  calculateProductivity() {
    if (this.transformations.length === 0) return 0;

    // Transformaciones que producen outputs útiles
    const productiveTransforms = this.transformations.filter(t => {
      // Revisar si el 'to' es usado en algún output
      return this.outputs.some(o => 
        o.sources?.includes(t.to) || 
        o.value?.includes(t.to)
      );
    });

    return Math.round((productiveTransforms.length / this.transformations.length) * 100 * 100) / 100;
  }

  /**
   * Calcula diversidad de outputs
   */
  calculateOutputDiversity() {
    if (this.outputs.length === 0) return 0;

    const types = new Set(this.outputs.map(o => o.type));
    const operations = new Set(this.outputs.map(o => o.operation));

    // Score basado en variedad
    const typeScore = types.size * 20;
    const operationScore = operations.size * 10;

    return Math.min(100, typeScore + operationScore);
  }

  /**
   * Detecta patrones de flujo
   */
  detectPatterns() {
    const patterns = [];

    // Pattern: read-transform-persist
    const hasRead = this.inputs.length > 0;
    const hasTransform = this.transformations.length > 0;
    const hasPersist = this.outputs.some(o => 
      o.type === 'side_effect' && o.operation === 'persistence'
    );

    if (hasRead && hasTransform && hasPersist) {
      patterns.push('read-transform-persist');
    }

    // Pattern: pure-function
    const hasSideEffects = this.outputs.some(o => o.type === 'side_effect');
    if (!hasSideEffects && this.outputs.some(o => o.type === 'return')) {
      patterns.push('pure-function');
    }

    // Pattern: event-handler
    const emitsEvents = this.outputs.some(o => 
      o.type === 'side_effect' && o.operation === 'event_emission'
    );
    if (emitsEvents) {
      patterns.push('event-handler');
    }

    // Pattern: validator
    const hasEarlyReturn = this.outputs.filter(o => o.type === 'return').length > 1;
    if (hasEarlyReturn && this.inputs.length > 0) {
      patterns.push('validator');
    }

    return patterns;
  }

  /**
   * Genera sugerencias de mejora
   */
  generateSuggestions() {
    const suggestions = [];

    const analysis = this.analyze();

    if (analysis.unusedInputs.length > 0) {
      suggestions.push({
        type: 'unused-inputs',
        severity: 'warning',
        message: `${analysis.unusedInputs.length} input(s) not used`,
        suggestion: 'Remove unused parameters or use them in the function'
      });
    }

    if (analysis.deadVariables.length > 0) {
      suggestions.push({
        type: 'dead-code',
        severity: 'info',
        message: `${analysis.deadVariables.length} variable(s) defined but not used`,
        suggestion: 'Remove unused variables to simplify the code'
      });
    }

    if (analysis.coverage < 50) {
      suggestions.push({
        type: 'low-coverage',
        severity: 'warning',
        message: `Data flow coverage is ${analysis.coverage}%`,
        suggestion: 'Review function logic for incomplete data usage'
      });
    }

    const patterns = this.detectPatterns();
    if (patterns.includes('pure-function')) {
      suggestions.push({
        type: 'pattern-detected',
        severity: 'info',
        message: 'Pure function detected',
        suggestion: 'This function has no side effects - good for testing and memoization'
      });
    }

    return suggestions;
  }
}

export default DataFlowAnalyzer;
