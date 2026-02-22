/**
 * @fileoverview Assignment Checker - Verifica si un nodo es parte de asignación izquierda
 */

/**
 * Verifica si el nodo actual es parte de la mano izquierda de una asignación
 * @param {Object} nodePath - Path del nodo en el AST
 * @returns {boolean} - true si es parte de asignación izquierda
 */
export function isPartOfAssignmentLeft(nodePath) {
  let current = nodePath;
  while (current) {
    const currentNode = current.node;
    const parentNode = current.parent;

    // Si encontramos AssignmentExpression y estamos en el lado izquierdo
    if (parentNode?.type === 'AssignmentExpression' && parentNode.left === currentNode) {
      return true;
    }

    // Si el parent es MemberExpression, seguir subiendo (puede ser parte de propiedad anidada)
    if (parentNode?.type === 'MemberExpression') {
      current = current.parentPath;
    } else {
      break;
    }
  }
  return false;
}
