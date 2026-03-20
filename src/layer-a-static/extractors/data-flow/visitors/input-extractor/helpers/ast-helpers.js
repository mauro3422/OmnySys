/**
 * @fileoverview AST Helpers
 * 
 * Utilidades para manipular y consultar nodos AST.
 * 
 * @module data-flow/input-extractor/helpers/ast-helpers
 * @version 1.0.0
 */

import { text } from '../../../../../parser/extractors/utils.js';

/**
 * Encuentra el nodo de función en el AST
 * @param {Object} ast - AST completo
 * @returns {Object|null}
 */
const FUNCTION_NODE_TYPES = new Set([
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'generator_function_declaration',
  'generator_function',
]);

function isFunctionNodeType(type) {
  return FUNCTION_NODE_TYPES.has(type);
}

function findFunctionNodeInExportStatement(node) {
  return (node.namedChildren || []).find((child) => isFunctionNodeType(child.type)) || null;
}

function findFunctionNodeInVariableDeclaration(node) {
  for (const decl of node.namedChildren || []) {
    if (decl.type !== 'variable_declarator') continue;

    const init = decl.childForFieldName('value');
    if (init && isFunctionNodeType(init.type)) {
      return init;
    }
  }

  return null;
}

function findFunctionNodeInProgram(node) {
  for (const child of node.namedChildren || []) {
    if (isFunctionNodeType(child.type)) {
      return child;
    }

    if (child.type === 'export_statement') {
      const exported = findFunctionNodeInExportStatement(child);
      if (exported) return exported;
    }

    if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
      const declared = findFunctionNodeInVariableDeclaration(child);
      if (declared) return declared;
    }
  }

  return null;
}

/**
 * Encuentra el nodo de función en el AST (Tree-sitter)
 * @param {Object} node - Nodo Tree-sitter
 * @returns {Object|null}
 */
export function findFunctionNode(node) {
  if (!node) return null;

  if (isFunctionNodeType(node.type)) {
    return node;
  }

  // Si es un root node (program), buscar la primera función
  if (node.type === 'program') {
    return findFunctionNodeInProgram(node);
  }

  return null;
}

/**
 * Obtiene el nombre de un identifier
 * @param {Object} node - Nodo AST
 * @returns {string|null}
 */
/**
 * Obtiene el nombre de un identifier
 * @param {Object} node - Nodo Tree-sitter
 * @param {string} code - Código fuente
 * @returns {string|null}
 */
export function getIdentifierName(node, code) {
  if (!node) return null;
  if (node.type === 'identifier') {
    return text(node, code);
  }
  if (node.type === 'this') {
    return 'this';
  }
  return null;
}

export default {
  findFunctionNode,
  getIdentifierName
};
