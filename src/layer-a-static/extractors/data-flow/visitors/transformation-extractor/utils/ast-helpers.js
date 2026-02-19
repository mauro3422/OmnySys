/**
 * @fileoverview AST Helpers
 * 
 * Funciones utilitarias para trabajar con nodos AST de Babel.
 * 
 * @module transformation-extractor/utils/ast-helpers
 * @version 1.0.0
 */

/**
 * Obtiene el path de un member expression
 * @param {Object} node - Nodo AST
 * @returns {string|null} - Path en formato "obj.prop" o null
 */
export function getMemberPath(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'ThisExpression') {
    return 'this';
  }
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
 * Obtiene nombre de callee (función llamada)
 * @param {Object} node - Nodo callee
 * @returns {string} - Nombre de la función o '<anonymous>'
 */
export function getCalleeName(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression') {
    return getMemberPath(node);
  }
  return '<anonymous>';
}

/**
 * Obtiene nombre de identifier
 * @param {Object} node - Nodo AST
 * @returns {string|null} - Nombre o null
 */
export function getIdentifierName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ThisExpression') return 'this';
  return null;
}

/**
 * Obtiene target de asignación
 * @param {Object} node - Nodo left de AssignmentExpression
 * @returns {string|null} - Nombre del target o null
 */
export function getAssignmentTarget(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression') {
    return getMemberPath(node);
  }
  return null;
}

/**
 * Verifica si un nodo es una función
 * @param {Object} node - Nodo AST
 * @returns {boolean} - True si es función
 */
export function isFunctionNode(node) {
  if (!node) return false;
  return node.type === 'FunctionDeclaration' || 
         node.type === 'FunctionExpression' || 
         node.type === 'ArrowFunctionExpression';
}

/**
 * Encuentra el nodo de función en un AST
 * @param {Object} ast - AST completo o nodo
 * @returns {Object|null} - Nodo de función o null
 */
export function findFunctionNode(ast) {
  if (isFunctionNode(ast)) {
    return ast;
  }

  if (ast?.type === 'File' && ast.program) {
    const body = ast.program.body || [];
    for (const node of body) {
      if (node.type === 'FunctionDeclaration') return node;
      // const fn = () => {} or const fn = function() {}
      if (node.type === 'VariableDeclaration') {
        for (const decl of node.declarations) {
          if (isFunctionNode(decl.init)) return decl.init;
        }
      }
      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration?.type === 'FunctionDeclaration') {
          return node.declaration;
        }
        // export const fn = () => {}
        if (node.declaration?.type === 'VariableDeclaration') {
          for (const decl of node.declaration.declarations) {
            if (isFunctionNode(decl.init)) return decl.init;
          }
        }
      }
      if (node.type === 'ExportDefaultDeclaration') {
        const decl = node.declaration;
        if (isFunctionNode(decl)) return decl;
      }
    }
  }

  return null;
}

/**
 * Obtiene el cuerpo de una función
 * @param {Object} functionNode - Nodo de función
 * @returns {Object|null} - Body o null
 */
export function getFunctionBody(functionNode) {
  return functionNode?.body || null;
}

/**
 * Verifica si es arrow function con expresión implícita
 * @param {Object} functionNode - Nodo de función
 * @returns {boolean} - True si es expresión implícita
 */
export function isImplicitReturn(functionNode) {
  return functionNode?.type === 'ArrowFunctionExpression' && 
         functionNode.body?.type !== 'BlockStatement';
}
