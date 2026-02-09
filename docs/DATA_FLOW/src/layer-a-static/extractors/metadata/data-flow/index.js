/**
 * @fileoverview Extractor de Data Flow Atómico - Fase 1
 * 
 * SIGUE PATRÓN A-B-C:
 * A: Extraer inputs (parámetros)
 * B: Extraer transforms (operaciones)  
 * C: Extraer outputs (returns/side effects)
 * 
 * Genera DOS versiones:
 * - dataFlow: valores reales del código (para debugging)
 * - standardized: tokens genéricos (para pattern matching/ML)
 * 
 * ENFOQUE HÍBRIDO:
 * - Datos van en el átomo (runtime)
 * - Índice de patrones se actualiza en storage (ML/training)
 * 
 * @module layer-a-static/extractors/metadata/data-flow
 * @version 1.0.0
 * @phase 1
 */

import { aInputsVisitor } from './visitors/a-inputs-visitor.js';
import { bTransformsVisitor } from './visitors/b-transforms-visitor.js';
import { cOutputsVisitor } from './visitors/c-outputs-visitor.js';
import { RealValuesAnalyzer } from './analyzers/real-values-analyzer.js';
import { StandardizerAnalyzer } from './analyzers/standardizer-analyzer.js';
import { ScopeTracker } from './utils/scope-tracker.js';
import { PatternIndexManager } from './utils/pattern-index-manager.js';

/**
 * Extrae el data flow de una función (átomo)
 * 
 * @param {Object} functionAst - AST de la función (de Babel)
 * @param {string} functionCode - Código fuente de la función
 * @param {string} functionName - Nombre de la función
 * @param {string} filePath - Ruta del archivo padre
 * @returns {Object} - { dataFlow, standardized, _meta }
 */
export function extractDataFlow(functionAst, functionCode, functionName, filePath) {
  // PASO A: Setup y contexto
  const tracker = new ScopeTracker();
  tracker.setFunctionInfo(functionName, filePath);
  
  // Contexto acumulador
  const context = {
    inputs: [],
    transforms: [],
    outputs: [],
    scope: tracker,
    code: functionCode,
    functionName,
    filePath
  };
  
  // PASO B: Recorrer AST con visitors (A-B-C)
  // Nota: traverse viene de @babel/traverse, debe pasarse como parámetro
  // o importarse globalmente
  traverseAst(functionAst, {
    ...aInputsVisitor(context),
    ...bTransformsVisitor(context),
    ...cOutputsVisitor(context)
  });
  
  // PASO C: Generar ambas versiones (real + estandarizada)
  const realAnalyzer = new RealValuesAnalyzer(context);
  const standardizer = new StandardizerAnalyzer(context, functionName);
  
  const dataFlow = realAnalyzer.build();
  const standardized = standardizer.build();
  
  // Actualizar índice de patrones (async, no bloquea)
  const patternManager = new PatternIndexManager();
  patternManager.updatePatternIndex(standardized.patternHash, {
    atomId: `${filePath}::${functionName}`,
    standardized,
    dataFlow
  });
  
  return {
    // Para runtime del sistema
    dataFlow,
    
    // Para ML y pattern matching
    standardized,
    
    // Metadata
    _meta: {
      version: '1.0.0',
      extractedAt: new Date().toISOString(),
      confidence: calculateConfidence(context),
      processingTime: Date.now() // Medir performance
    }
  };
}

/**
 * Calcula confidence score basado en qué tan completo es el análisis
 */
function calculateConfidence(context) {
  let confidence = 0.5; // Base
  
  // +0.2 si detectamos inputs
  if (context.inputs.length > 0) confidence += 0.2;
  
  // +0.2 si detectamos transforms
  if (context.transforms.length > 0) confidence += 0.2;
  
  // +0.1 si detectamos outputs
  if (context.outputs.length > 0) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

/**
 * Wrapper para traverse (compatibilidad con sistema existente)
 */
function traverseAst(ast, visitors) {
  // Usar la misma traverse que el resto del sistema
  // Esto debe importarse desde el sistema de Babel existente
  const { default: traverse } = await import('@babel/traverse').catch(() => null);
  
  if (traverse) {
    traverse(ast, visitors);
  } else {
    // Fallback: usar traverse global si está disponible
    if (typeof globalThis.traverse === 'function') {
      globalThis.traverse(ast, visitors);
    } else {
      console.warn('[@babel/traverse] No disponible, data flow parcial');
    }
  }
}
