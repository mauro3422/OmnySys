/**
 * @fileoverview Data Flow Extractor - Fase 1: Data Flow Atómico
 * 
 * Extrae el flujo de datos de una función:
 * - INPUTS: Parámetros y sus usos
 * - TRANSFORMATIONS: Asignaciones y operaciones
 * - OUTPUTS: Returns y side effects
 * 
 * Parte del Data Flow Fractal - Nivel Átomo
 * 
 * @module extractors/data-flow
 * @version 1.0.0
 * @phase 1 (Atomic Data Flow)
 * 
 * @version 0.9.4 - Consolidado con data-flow-v2
 */

import path from 'path';
import { parseFile, getTree } from '../../parser/index.js';
import { createLogger } from '#utils/logger.js';
import { InputExtractor } from './visitors/input-extractor/index.js';
import { TransformationExtractor } from './visitors/transformation-extractor/index.js';
import { OutputExtractor } from './visitors/output-extractor/index.js';
import { DataFlowAnalyzer } from './core/data-flow-analyzer.js';
import { GraphBuilder } from './core/graph-builder.js';
import { InvariantDetector } from './analyzers/invariant-detector.js';
import { TypeInferrer } from './analyzers/type-inferrer/index.js';
import { ScopeManager } from './utils/scope-manager.js';
import { PatternIndexManager } from './utils/managers/index.js';

const logger = createLogger('OmnySys:data-flow');

// Configuration
// ✅ node-tree-sitter nativo no requiere PARSER_OPTIONS manuales


/**
 * Extracts data flow from a function (synchronous when node is provided).
 * @param {string|Object} codeOrNode - Function source code string OR Tree-sitter node
 * @param {Object} options - Extraction options
 * @returns {Object} Data flow analysis result
 */
export function extractDataFlow(codeOrNode, options = {}) {
  logger.debug('Extracting data flow...');

  let localTree = null;
  let shouldDeleteTree = false;

  try {
    // Accept either a source code string or an already-parsed Tree-sitter node
    let code = typeof codeOrNode === 'string' ? codeOrNode : (options.code || '');
    let node = typeof codeOrNode !== 'string' ? codeOrNode : null;

    const filePath = options.filePath || 'snippet.js';

    if (!node && code) {
      // En el pipeline de workers, siempre se pasa functionInfo.node (ya parseado)
      // y este branch no se ejecuta. Para callers legacy sin nodo, retornamos vacío.
      logger.debug(`extractDataFlow called without a pre-parsed node for ${options.filePath || 'unknown'} - data flow will be empty. Use extractDataFlow(functionInfo.node, ...) instead.`);
      return { inputs: [], outputs: [], transformations: [], graph: null, analysis: { invariants: [], inferredTypes: {} } };
    }

    const functionName = options.functionName || '<anonymous>';

    // Extract components in order — each step feeds the next
    const inputExtractor = new InputExtractor(code, functionName);
    const inputs = inputExtractor.extract(node);

    const transformationExtractor = new TransformationExtractor(code, inputs);
    const transformations = transformationExtractor.extract(node);

    const outputExtractor = new OutputExtractor(code, transformations);
    const outputs = outputExtractor.extract(node);

    // Build the transformation graph from extracted inputs/transformations/outputs
    const graphBuilder = new GraphBuilder();

    for (const input of inputs) {
      graphBuilder.addNode({
        type: 'INPUT',
        category: 'input',
        inputs: [],
        output: { name: input.name },
        properties: { paramPosition: input.position, hasDefault: input.hasDefault }
      });
    }

    for (const t of transformations) {
      const fromSources = Array.isArray(t.from) ? t.from : (t.from ? [t.from] : []);
      graphBuilder.addNode({
        type: t.operation || 'TRANSFORM',
        category: 'transform',
        inputs: fromSources.map(s => ({ sourceType: 'variable', name: typeof s === 'string' ? s : s.name })),
        output: t.to ? { name: t.to } : null,
        properties: { operation: t.operation, via: t.via, line: t.line },
        location: t.line ? { line: t.line } : null
      });
    }

    for (const output of outputs) {
      const isSideEffect = output.type === 'side_effect' || output.isSideEffect === true;
      graphBuilder.addNode({
        type: isSideEffect ? 'SIDE_EFFECT' : (output.type === 'return' ? 'RETURN' : 'OUTPUT'),
        category: isSideEffect ? 'side_effect' : 'output',
        inputs: [],
        output: null,
        properties: { line: output.line },
        location: output.line ? { line: output.line } : null
      });
    }

    const graph = graphBuilder.build();

    // Run flow coherence analysis
    const flowAnalysis = options.analyzeFlow
      ? new DataFlowAnalyzer(inputs, transformations, outputs).analyze()
      : null;

    // Run advanced analysis (from data-flow-v2)
    const invariants = options.detectInvariants
      ? new InvariantDetector(graph).detect()
      : [];

    const inferredTypes = options.inferTypes
      ? new TypeInferrer(graph).infer()
      : {};

    // En node-tree-sitter no existe .delete(), el GC se encarga


    return {
      graph,
      inputs,
      transformations,
      outputs,
      analysis: {
        ...(flowAnalysis && { flow: flowAnalysis }),
        invariants,
        inferredTypes
      },
      _meta: {
        extractedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  } catch (error) {
    // El GC se encarga del árbol

    const functionName = options.functionName || '<anonymous>';
    const filePath = options.filePath || 'unknown';
    logger.warn(`Data flow extraction failed for ${functionName} in ${filePath}:`, error.message);
    return { error: error.message };
  }
}

// Export all components
export { InputExtractor } from './visitors/input-extractor/index.js';
export { TransformationExtractor } from './visitors/transformation-extractor/index.js';
export { OutputExtractor } from './visitors/output-extractor/index.js';
export { DataFlowAnalyzer } from './core/data-flow-analyzer.js';
export { GraphBuilder } from './core/graph-builder.js';
export { InvariantDetector } from './analyzers/invariant-detector.js';
export { TypeInferrer } from './analyzers/type-inferrer/index.js';
export { ScopeManager } from './utils/scope-manager.js';
export { PatternIndexManager } from './utils/managers/index.js';

export default extractDataFlow;
