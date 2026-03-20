/**
 * @fileoverview ts-ast-utils.js
 *
 * Compatibility shim for shared Tree-sitter AST helpers.
 */

export {
  FUNCTION_NODE_TYPES,
  endLine,
  findFunctionNode,
  getAssignmentTarget,
  getCalleeName,
  getIdentifierName,
  getMemberPath,
  startLine,
  text
} from '../visitors/shared/tree-sitter-ast-helpers.js';

export { default } from '../visitors/shared/tree-sitter-ast-helpers.js';
