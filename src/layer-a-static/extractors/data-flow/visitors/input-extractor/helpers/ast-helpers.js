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
const FUNCTION_NODE_TYPES = [
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'generator_function_declaration',
  'generator_function',
];

/**
 * Encuentra el nodo de función en el AST (Tree-sitter)
 * @param {Object} node - Nodo Tree-sitter
 * @returns {Object|null}
 */
export function findFunctionNode(node) {
  if (!node) return null;

  if (FUNCTION_NODE_TYPES.includes(node.type)) {
    return node;
  }

  // Si es un root node (program), buscar la primera función
  if (node.type === 'program') {
    for (const child of node.namedChildren) {
      if (FUNCTION_NODE_TYPES.includes(child.type)) {
        return child;
      }
      // Buscar en export statements
      if (child.type === 'export_statement') {
        const decl = child.namedChildren.find(c => FUNCTION_NODE_TYPES.includes(c.type));
        if (decl) return decl;
      }
      // Buscar en variable declarations (const fn = ...)
      if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
        for (const decl of child.namedChildren) {
          if (decl.type === 'variable_declarator') {
            const init = decl.childForFieldName('value');
            if (init && FUNCTION_NODE_TYPES.includes(init.type)) {
              return init;
            }
          }
        }
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
/**
 * Obtiene el nombre de un identifier
 * @param {Object} node - Nodo Tree-sitter
 * @param {string} code - Código fuente
 * @returns {string|null}
 */
export function getIdentifierName(node, code) {
  if (!node) return null;
  if (node.type === 'identifier') {
    return code.slice(node.startIndex, node.endIndex);
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
