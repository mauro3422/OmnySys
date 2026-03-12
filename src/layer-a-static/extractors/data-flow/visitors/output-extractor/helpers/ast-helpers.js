/**
 * @fileoverview Tree-sitter AST helpers for output extraction.
 *
 * @module data-flow/output-extractor/helpers/ast-helpers
 */

export {
  findFunctionNode,
  getAssignmentTarget,
  getCalleeName,
  getIdentifierName,
  getMemberPath,
  isFunctionNode,
  nodeToString
} from '../../shared/tree-sitter-ast-helpers.js';

import {
  findFunctionNode,
  getAssignmentTarget,
  getCalleeName,
  getIdentifierName,
  getMemberPath,
  isFunctionNode,
  nodeToString
} from '../../shared/tree-sitter-ast-helpers.js';

export default {
  getMemberPath,
  getCalleeName,
  getIdentifierName,
  isFunctionNode,
  getAssignmentTarget,
  nodeToString,
  findFunctionNode
};
