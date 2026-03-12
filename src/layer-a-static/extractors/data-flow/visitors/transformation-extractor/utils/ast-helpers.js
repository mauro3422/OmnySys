/**
 * @fileoverview Tree-sitter AST helper wrappers for transformation extraction.
 *
 * @module transformation-extractor/utils/ast-helpers
 */

export {
  findFunctionNode,
  getAssignmentTarget,
  getCalleeName,
  getIdentifierName,
  getMemberPath,
  isFunctionNode
} from '../../shared/tree-sitter-ast-helpers.js';

export function getFunctionBody(functionNode) {
  return functionNode?.body || null;
}

export function isImplicitReturn(functionNode) {
  return functionNode?.type === 'arrow_function' &&
    functionNode.body?.type !== 'statement_block';
}
