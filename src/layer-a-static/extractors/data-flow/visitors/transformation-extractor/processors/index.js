/**
 * @fileoverview Transformation Extractor Processors - Index
 * 
 * @module transformation-extractor/processors
 * @version 1.0.0
 */

export {
  processStatement,
  processIfStatement,
  processTryStatement,
  processLoop,
  processBlock,
  processSwitchStatement,
  createProcessingContext
} from './statement-processor.js';

export {
  processVariableDeclaration,
  processAssignment,
  processUpdateExpression,
  processFunctionVariable
} from './variable-processor.js';

export {
  processExpressionStatement,
  processImplicitReturn
} from './expression-processor.js';
