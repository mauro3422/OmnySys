/**
 * @fileoverview AST Helpers
 * 
 * Utilidades para manipular y consultar nodos AST.
 * 
 * @module data-flow/output-extractor/helpers/ast-helpers
 * @version 1.0.0
 */

/**
 * Obtiene el path completo de un MemberExpression
 * @param {Object} node - Nodo AST
 * @returns {string|null}
 */
export function getMemberPath(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'MemberExpression') {
    const object = getMemberPath(node.object);
    const property = node.computed 
      ? getIdentifierName(node.property) || '[computed]'
      : (node.property.name || node.property.value);
    return object ? `${object}.${property}` : null;
  }
  return null;
}

/**
 * Obtiene el nombre de la función llamada
 * @param {Object} node - Nodo callee
 * @returns {string}
 */
export function getCalleeName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return getMemberPath(node);
  return '<anonymous>';
}

/**
 * Obtiene el nombre de un identificador
 * @param {Object} node - Nodo AST
 * @returns {string|null}
 */
export function getIdentifierName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ThisExpression') return 'this';
  return null;
}

/**
 * Obtiene el target de una asignación
 * @param {Object} node - Nodo AST (left side de assignment)
 * @returns {string|null}
 */
export function getAssignmentTarget(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return getMemberPath(node);
  return null;
}

/**
 * Convierte un nodo AST a string representativo
 * @param {Object} node - Nodo AST
 * @returns {string}
 */
export function nodeToString(node) {
  if (!node) return 'undefined';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'StringLiteral') return `"${node.value}"`;
  if (node.type === 'NumericLiteral') return String(node.value);
  if (node.type === 'BooleanLiteral') return String(node.value);
  if (node.type === 'NullLiteral') return 'null';
  if (node.type === 'CallExpression') return `<${getCalleeName(node.callee)}()>`;
  if (node.type === 'AwaitExpression') return `<Promise>`;
  return `<${node.type}>`;
}

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

  if (ast?.type === 'File' && ast.program) {
    const body = ast.program.body || [];
    for (const node of body) {
      if (node.type === 'FunctionDeclaration') return node;
      // const fn = () => {} or const fn = function() {}
      if (node.type === 'VariableDeclaration') {
        for (const decl of node.declarations) {
          if (decl.init?.type === 'ArrowFunctionExpression' ||
              decl.init?.type === 'FunctionExpression') {
            return decl.init;
          }
        }
      }
      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration?.type === 'FunctionDeclaration') {
          return node.declaration;
        }
        // export const fn = () => {}
        if (node.declaration?.type === 'VariableDeclaration') {
          for (const decl of node.declaration.declarations) {
            if (decl.init?.type === 'ArrowFunctionExpression' ||
                decl.init?.type === 'FunctionExpression') {
              return decl.init;
            }
          }
        }
      }
      if (node.type === 'ExportDefaultDeclaration') {
        const decl = node.declaration;
        if (decl?.type === 'FunctionDeclaration' ||
            decl?.type === 'FunctionExpression' ||
            decl?.type === 'ArrowFunctionExpression') {
          return decl;
        }
      }
    }
  }

  return null;
}

export default {
  getMemberPath,
  getCalleeName,
  getIdentifierName,
  getAssignmentTarget,
  nodeToString,
  findFunctionNode
};
