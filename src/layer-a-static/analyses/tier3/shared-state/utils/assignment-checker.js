/**
 * @fileoverview Assignment Checker - Verifica si un nodo es parte de asignación izquierda
 */

/**
 * Verifica si el nodo actual es parte de la mano izquierda de una asignación
 * @param {Object} nodePath - Path del nodo en el AST
 * @returns {boolean} - true si es parte de asignación izquierda
 */
export function isPartOfAssignmentLeft(node) {
  let current = node;
  while (current && current.parent) {
    const parent = current.parent;

    // Si encontramos assignment_expression y estamos en el lado izquierdo
    if (parent.type === 'assignment_expression') {
      const left = parent.childForFieldName('left');
      if (left && (left.id === current.id || (left.startIndex === current.startIndex && left.endIndex === current.endIndex))) {
        return true;
      }
    }

    // Si el parent es member_expression, seguir subiendo (puede ser parte de propiedad anidada)
    if (parent.type === 'member_expression') {
      current = parent;
    } else {
      break;
    }
  }
  return false;
}
