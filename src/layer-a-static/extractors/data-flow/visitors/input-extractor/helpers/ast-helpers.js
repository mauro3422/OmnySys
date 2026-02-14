/**
 * @fileoverview AST Helpers
 * 
 * Utilidades para manipular y consultar nodos AST.
 * 
 * @module data-flow/input-extractor/helpers/ast-helpers
 * @version 1.0.0
 */

/**
 * Encuentra el nodo de función en el AST
 * @param {Object} ast - AST completo
 * @returns {Object|null}
 */
export function findFunctionNode(ast) {
  if (ast && (ast.type === 'FunctionDeclaration' ||
    ast.type === 'FunctionExpression' ||
    ast.type === 'ArrowFunctionExpression')) {
    return ast;
  }

  if (ast && ast.type === 'File' && ast.program) {
    const body = ast.program.body || [];
    for (const node of body) {
      if (node.type === 'FunctionDeclaration') {
        return node;
      }
      if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration') {
        return node.declaration;
      }
      if (node.type === 'ExportDefaultDeclaration' &&
        (node.declaration?.type === 'FunctionDeclaration' ||
          node.declaration?.type === 'FunctionExpression' ||
          node.declaration?.type === 'ArrowFunctionExpression')) {
        return node.declaration;
      }
    }
  }

  return null;
}

/**
 * Obtiene el nombre de un identifier
 * @param {Object} node - Nodo AST
 * @returns {string|null}
 */
export function getIdentifierName(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'ThisExpression') {
    return 'this';
  }
  return null;
}

export default {
  findFunctionNode,
  getIdentifierName
};
