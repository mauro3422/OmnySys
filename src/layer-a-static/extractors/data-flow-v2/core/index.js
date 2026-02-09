/**
 * @fileoverview Data Flow Extractor v2 - Entry Point
 * 
 * Orquesta la extracción exhaustiva de data flow:
 * 1. Recorre AST con visitors especializados
 * 2. Construye grafo de transformaciones
 * 3. Detecta invariantes
 * 4. Genera output en múltiples formatos
 * 
 * @module data-flow-v2/core/index
 * @version 2.0.0
 */

import { GraphBuilder } from './graph-builder.js';
import { detectSideEffectTransform, detectFunctionalTransform, getTransformByOperator } from './transform-registry.js';

// Visitors
import { ExpressionVisitor } from '../visitors/expression-visitor.js';
import { CallVisitor } from '../visitors/call-visitor.js';
import { ControlFlowVisitor } from '../visitors/control-flow-visitor.js';
import { DataStructuresVisitor } from '../visitors/data-structures-visitor.js';

// Analyzers
import { InvariantDetector } from '../analyzers/invariant-detector.js';
import { TypeInferrer } from '../analyzers/type-inferrer.js';

// Output formatters
import { RealFormatter } from '../output/real-formatter.js';
import { StandardizedFormatter } from '../output/standardized-formatter.js';
import { GraphFormatter } from '../output/graph-formatter.js';

// Utils
import { ScopeManager } from '../utils/scope-manager.js';
import { PatternIndexManager } from '../utils/pattern-index-manager.js';

/**
 * Extrae data flow completo de una función
 * 
 * @param {Object} ast - AST de Babel
 * @param {string} code - Código fuente
 * @param {string} functionName - Nombre de la función
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - Data flow completo con múltiples formatos
 */
export async function extractDataFlow(ast, code, functionName, filePath) {
  const startTime = Date.now();
  
  // Inicializar componentes
  const builder = new GraphBuilder();
  const scopeManager = new ScopeManager();
  const context = {
    builder,
    scope: scopeManager,
    code,
    functionName,
    filePath,
    transforms: [],
    invariants: []
  };

  // PASO 1: Recorrer AST con visitors
  const visitors = [
    new ExpressionVisitor(context),
    new CallVisitor(context),
    new ControlFlowVisitor(context),
    new DataStructuresVisitor(context)
  ];

  // Ejecutar cada visitor
  for (const visitor of visitors) {
    visitor.visit(ast);
  }

  // PASO 2: Construir grafo
  const graph = builder.build();

  // PASO 3: Detectar invariantes
  const invariantDetector = new InvariantDetector(graph);
  const invariants = invariantDetector.detect();

  // PASO 4: Inferir tipos
  const typeInferrer = new TypeInferrer(graph);
  const typeFlow = typeInferrer.infer();

  // PASO 5: Generar outputs en múltiples formatos
  const realFormatter = new RealFormatter(graph, invariants, typeFlow);
  const standardizedFormatter = new StandardizedFormatter(graph, functionName);
  const graphFormatter = new GraphFormatter(graph);

  const result = {
    // Formato 1: Datos reales (para humanos/debugging)
    real: realFormatter.format(),
    
    // Formato 2: Estandarizado (para ML/entrenamiento)
    standardized: standardizedFormatter.format(),
    
    // Formato 3: Grafo completo (para análisis profundo)
    graph: graphFormatter.format(),
    
    // Metadata
    _meta: {
      version: '2.0.0',
      extractedAt: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      confidence: calculateConfidence(graph, invariants),
      stats: {
        totalTransforms: graph.meta.totalNodes,
        totalEdges: graph.meta.totalEdges,
        invariantsDetected: invariants.length,
        hasSideEffects: graph.meta.hasSideEffects,
        hasAsync: graph.meta.hasAsync
      }
    }
  };

  // PASO 6: Actualizar índice de patrones (async, no bloquea)
  const patternManager = new PatternIndexManager();
  patternManager.updateIndex(result.standardized, {
    atomId: `${filePath}::${functionName}`,
    graph: result.graph
  });

  return result;
}

/**
 * Calcula confidence score del análisis
 */
function calculateConfidence(graph, invariants) {
  let confidence = 0.5; // Base

  // +0.2 si tenemos grafo completo
  if (graph.meta.totalNodes > 0) confidence += 0.2;

  // +0.1 si detectamos invariantes
  if (invariants.length > 0) confidence += 0.1;

  // +0.1 si no hay side effects (más fácil de analizar)
  if (!graph.meta.hasSideEffects) confidence += 0.1;

  // +0.1 si no hay async (más determinístico)
  if (!graph.meta.hasAsync) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

export default extractDataFlow;
