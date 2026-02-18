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

import { parse } from '@babel/parser';
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
const PARSER_OPTIONS = {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  // Allow shebang (#!/usr/bin/env node) at the start of files
  allowHashBang: true,
  plugins: [
    'jsx',
    'typescript',
    'decorators-legacy',
    'classProperties',
    'asyncGenerators',
    'dynamicImport',
    'optionalChaining',
    'nullishCoalescing',
    'topLevelAwait'
    // NOTE: pipelineOperator removed - conflicts with shebangs and private fields (#)
    // The hack proposal's topicToken '#' collides with:
    // - Shebangs: #!/usr/bin/env node
    // - Private fields: #field
    // Since data-flow extracts from ALL files, it must be generic
  ]
};

/**
 * Extracts data flow from a function
 * @param {string} code - Function source code
 * @param {Object} options - Extraction options
 * @returns {Object} Data flow analysis result
 */
export function extractDataFlow(code, options = {}) {
  logger.debug('Extracting data flow...');
  
  try {
    // Parse the code
    const ast = parse(code, PARSER_OPTIONS);
    
    // Build the transformation graph
    const graphBuilder = new GraphBuilder();
    const graph = graphBuilder.build(ast);
    
    // Extract components
    const inputExtractor = new InputExtractor();
    const transformationExtractor = new TransformationExtractor();
    const outputExtractor = new OutputExtractor();
    
    const inputs = inputExtractor.extract(ast);
    const transformations = transformationExtractor.extract(ast);
    const outputs = outputExtractor.extract(ast);
    
    // Run advanced analysis (from data-flow-v2)
    const invariants = options.detectInvariants 
      ? new InvariantDetector(graph).detect() 
      : [];
    
    const inferredTypes = options.inferTypes
      ? new TypeInferrer(graph).infer()
      : {};
    
    return {
      graph,
      inputs,
      transformations,
      outputs,
      analysis: {
        invariants,
        inferredTypes
      },
      _meta: {
        extractedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  } catch (error) {
    logger.warn('Data flow extraction failed:', error.message);
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
