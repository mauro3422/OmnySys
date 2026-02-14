/**
 * @fileoverview Transformation Extractor - Module Index
 * 
 * Extractor modular de transformaciones de data flow.
 * 
 * @module transformation-extractor
 * @version 2.0.0
 */

export { TransformationExtractor } from './transformation-extractor.js';

// Core
export {
  classifyOperation,
  OPERATION_TYPES,
  getOperationTypes
} from './core/operation-classifier.js';

export {
  extractSources,
  extractSourcesWithContext,
  containsSource,
  filterInputSources
} from './core/source-extractor.js';

// Processors
export {
  processStatement,
  processIfStatement,
  processTryStatement,
  processLoop,
  processBlock,
  createProcessingContext,
  processVariableDeclaration,
  processAssignment,
  processUpdateExpression,
  processExpressionStatement,
  processImplicitReturn
} from './processors/index.js';

// Handlers
export {
  handleDestructuring,
  handleObjectDestructuring,
  handleArrayDestructuring,
  handleMutatingCall,
  isMutatingMethod,
  getAllMutatingMethods,
  analyzeMutationImpact
} from './handlers/index.js';

// Utils
export {
  getMemberPath,
  getCalleeName,
  getIdentifierName,
  getAssignmentTarget,
  findFunctionNode,
  isImplicitReturn
} from './utils/index.js';

// Version
export const VERSION = '2.0.0';
