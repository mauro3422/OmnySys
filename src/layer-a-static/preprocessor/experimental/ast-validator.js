/**
 * @fileoverview AST Validator - Validación del AST después de restauración
 * 
 * Este módulo maneja la validación del AST y búsqueda de placeholders.
 * 
 * @module preprocessor/experimental/ast-validator
 * @experimental
 */

/**
 * Valida el AST después de restaurar
 * @param {Object} ast - AST de Babel
 * @param {Object} options - Opciones de validación
 * @param {boolean} options.preservePositions - Mantener posiciones originales
 * @returns {{ valid: boolean, errors: string[], warnings: Array }} - Resultado de validación
 */
export function validateAST(ast, options = {}) {
  const errors = [];
  const warnings = [];
  
  // Verificar que no quedan placeholders sin restaurar
  const remainingPlaceholders = findRemainingPlaceholders(ast);
  if (remainingPlaceholders.length > 0) {
    errors.push(`Placeholders sin restaurar: ${remainingPlaceholders.join(', ')}`);
    warnings.push({
      type: 'remaining_placeholders',
      placeholders: remainingPlaceholders
    });
  }
  
  // Verificar consistencia de posiciones
  if (options.preservePositions) {
    const positionErrors = validatePositions(ast);
    errors.push(...positionErrors);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Busca placeholders que no fueron restaurados
 * @param {Object} node - Nodo raíz del AST
 * @returns {string[]} - Lista de placeholders encontrados
 */
export function findRemainingPlaceholders(node) {
  const found = new Set();
  const pattern = /__OMNY_\w+__/g;
  
  const search = (n) => {
    if (!n || typeof n !== 'object') return;
    
    if (Array.isArray(n)) {
      n.forEach(search);
      return;
    }
    
    for (const [key, value] of Object.entries(n)) {
      if (typeof value === 'string') {
        const matches = value.match(pattern);
        if (matches) {
          matches.forEach(m => found.add(m));
        }
      } else if (typeof value === 'object') {
        search(value);
      }
    }
  };
  
  search(node);
  return Array.from(found);
}

/**
 * Valida consistencia de posiciones en el AST
 * @param {Object} ast - AST de Babel
 * @returns {string[]} - Lista de errores de posición
 */
export function validatePositions(ast) {
  const errors = [];
  
  // TODO: Implementar validación de source positions
  // Esto requeriría comparar node.loc con las transformaciones
  
  return errors;
}

/**
 * Obtiene un reporte de las restauraciones realizadas
 * @param {Array} restorations - Registro de restauraciones
 * @param {Array} warnings - Warnings generados
 * @returns {Object} - Reporte completo
 */
export function getReport(restorations, warnings) {
  return {
    restorations,
    warnings,
    summary: {
      totalRestored: restorations.length,
      warningsCount: warnings.length
    }
  };
}
