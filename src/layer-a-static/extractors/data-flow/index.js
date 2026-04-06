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

import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
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
import { normalizeFilePath } from '#shared/utils/normalize-helpers.js';

const logger = createLogger('OmnySys:data-flow');

function isSupportOrTestFile(filePath = '') {
  const normalized = normalizeFilePath(filePath);
  if (!normalized) {
    return false;
  }

  return /(^|\/)(__tests__?|tests?|test|fixtures|__factories__|factories|harness|__mocks__|mocks)(\/|$)/i.test(normalized)
    || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(normalized);
}

function shouldSuppressParseFailure(targetFilePath, options = {}) {
  if (options.suppressParseWarnings === true) return true;
  if (options.suppressParseWarnings === false) return false;
  return isSupportOrTestFile(targetFilePath);
}

function createEmptyDataFlowResult() {
  return {
    inputs: [],
    outputs: [],
    transformations: [],
    graph: null,
    analysis: { invariants: [], inferredTypes: {} }
  };
}

function parseCodeToNode(code, targetFilePath) {
  const parser = new Parser();
  parser.setLanguage(TypeScript.tsx);

  const tree = parser.parse(code);
  if (tree.rootNode.hasError) {
    return {
      error: `Syntax error: invalid or unsupported JavaScript syntax in ${targetFilePath}`
    };
  }

  return { node: tree.rootNode };
}

function buildDataFlowGraph(inputs, transformations, outputs) {
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

  for (const transformation of transformations) {
    const fromSources = Array.isArray(transformation.from)
      ? transformation.from
      : (transformation.from ? [transformation.from] : []);

    graphBuilder.addNode({
      type: transformation.operation || 'TRANSFORM',
      category: 'transform',
      inputs: fromSources.map((source) => ({
        sourceType: 'variable',
        name: typeof source === 'string' ? source : source.name
      })),
      output: transformation.to ? { name: transformation.to } : null,
      properties: { operation: transformation.operation, via: transformation.via, line: transformation.line },
      location: transformation.line ? { line: transformation.line } : null
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

  return graphBuilder.build();
}

function buildDataFlowAnalysis(graph, inputs, transformations, outputs, options) {
  const flowAnalysis = options.analyzeFlow
    ? new DataFlowAnalyzer(inputs, transformations, outputs).analyze()
    : null;

  const invariants = options.detectInvariants
    ? new InvariantDetector(graph).detect()
    : [];

  const inferredTypes = options.inferTypes
    ? new TypeInferrer(graph).infer()
    : {};

  return {
    ...(flowAnalysis && { flow: flowAnalysis }),
    invariants,
    inferredTypes
  };
}

/**
 * Extracts data flow from a function (synchronous when node is provided).
 * @param {string|Object} codeOrNode - Function source code string OR Tree-sitter node
 * @param {Object} options - Extraction options
 * @returns {Object} Data flow analysis result
 */
export function extractDataFlow(codeOrNode, options = {}) {
  logger.debug('Extracting data flow...');

  const targetFilePath = options.filePath || 'snippet.js';

  try {
    const code = typeof codeOrNode === 'string' ? codeOrNode : (options.code || '');
    let node = typeof codeOrNode !== 'string' ? codeOrNode : null;

    if (!node && code) {
      const parsed = parseCodeToNode(code, targetFilePath);
      if (parsed.error) {
        if (shouldSuppressParseFailure(targetFilePath, options)) {
          logger.debug(`Synchronous parse failed in extractDataFlow for ${targetFilePath} (suppressed): ${parsed.error}`);
          return {
            ...createEmptyDataFlowResult(),
            filePath: targetFilePath,
            _meta: {
              extractedAt: new Date().toISOString(),
              version: '1.0.0',
              parseWarning: parsed.error,
              parseWarningSuppressed: true
            }
          };
        }

        logger.warn(`Synchronous parse failed in extractDataFlow for ${targetFilePath}: ${parsed.error}`);
        return { error: parsed.error, filePath: targetFilePath };
      }
      node = parsed.node;
    }

    if (!node) {
      logger.debug(`extractDataFlow called without a valid node for ${targetFilePath} - data flow will be empty.`);
      return createEmptyDataFlowResult();
    }

    const functionName = options.functionName || '<anonymous>';
    const inputExtractor = new InputExtractor(code, functionName);
    const inputs = inputExtractor.extract(node);
    const transformationExtractor = new TransformationExtractor(code, inputs);
    const transformations = transformationExtractor.extract(node);
    const outputExtractor = new OutputExtractor(code, transformations);
    const outputs = outputExtractor.extract(node);

    const graph = buildDataFlowGraph(inputs, transformations, outputs);
    const analysis = buildDataFlowAnalysis(graph, inputs, transformations, outputs, options);

    return {
      graph,
      inputs,
      transformations,
      outputs,
      analysis,
      _meta: {
        extractedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  } catch (error) {
    const functionName = options.functionName || '<anonymous>';
    logger.warn(`Data flow extraction failed for ${functionName} in ${targetFilePath}:`, error.message);
    return { error: error.message, filePath: targetFilePath };
  }
}

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
