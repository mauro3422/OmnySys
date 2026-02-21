/**
 * @fileoverview AST Mapper (EXPERIMENTAL - AISLADO)
 * 
 * ⚠️ ADVERTENCIA: Este módulo está AISLADO y NO se usa en el flujo principal.
 * 
 * Propósito: Restaurar valores originales en el AST después del parseo.
 * 
 * Por qué está aislado:
 * - Manipular el AST puede romper invariantes del parser
 * - Puede causar inconsistencias entre AST y source maps
 * - Requiere testing exhaustivo antes de integración
 * 
 * Cómo usar cuando esté listo:
 * 1. Pre-procesar código con PreprocessorEngine
 * 2. Parsear con Babel
 * 3. Llamar ASTMapper.restore(ast, transformations)
 * 
 * @module preprocessor/experimental/ast-mapper
 * @experimental
 * @since v0.9.20
 */

import {
  restoreInString,
  restorePrivateName,
  createPlaceholderMap
} from './placeholder-restorer.js';
import {
  validateAST,
  getReport
} from './ast-validator.js';

/**
 * ASTMapper - Restaura valores originales en el AST
 * 
 * @example
 * // NO USAR DIRECTAMENTE - módulo experimental
 * import { ASTMapper } from './preprocessor/experimental/ast-mapper.js';
 * 
 * const mapper = new ASTMapper();
 * const restoredAST = mapper.restore(ast, transformations);
 */
export class ASTMapper {
  constructor(options = {}) {
    this.options = {
      preservePositions: true,  // Mantener posiciones originales
      generateSourceMap: false, // Generar source map para debugging
      validateAfterRestore: true, // Validar AST después de restaurar
      ...options
    };
    
    /**
     * Registro de restauraciones realizadas
     * @type {Array}
     */
    this.restorations = [];
    
    /**
     * Warnings generados durante restauración
     * @type {Array}
     */
    this.warnings = [];
  }
  
  /**
   * Restaura valores originales en el AST
   * 
   * @param {Object} ast - AST de Babel
   * @param {Array} transformations - Transformaciones del preprocesador
   * @returns {Object} AST con valores restaurados
   */
  restore(ast, transformations) {
    if (!ast) {
      throw new Error('AST es requerido');
    }
    
    if (!transformations || transformations.length === 0) {
      return ast;  // Nada que restaurar
    }
    
    // Reset state
    this.restorations = [];
    this.warnings = [];
    
    // Crear mapa de placeholders para búsqueda rápida
    const placeholderMap = createPlaceholderMap(transformations);
    
    // Visitar nodos del AST
    this.visitAST(ast, placeholderMap);
    
    // Validar si está habilitado
    if (this.options.validateAfterRestore) {
      const validation = validateAST(ast, {
        preservePositions: this.options.preservePositions
      });
      this.warnings.push(...validation.warnings);
    }
    
    return ast;
  }
  
  /**
   * Visita nodos del AST buscando placeholders
   * @param {Object} node - Nodo actual
   * @param {Map} placeholderMap - Mapa de placeholders
   */
  visitAST(node, placeholderMap) {
    if (!node || typeof node !== 'object') {
      return;
    }
    
    // Array de nodos
    if (Array.isArray(node)) {
      for (const child of node) {
        this.visitAST(child, placeholderMap);
      }
      return;
    }
    
    // Restaurar PrivateName nodes
    restorePrivateName(node, placeholderMap, this.restorations);
    
    // Visitar propiedades del nodo
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('_') || key === 'loc') {
        continue;  // Skip propiedades internas de Babel
      }
      
      if (typeof value === 'string') {
        // Buscar placeholders en strings
        restoreInString(node, key, value, placeholderMap, this.restorations);
      } else if (typeof value === 'object') {
        this.visitAST(value, placeholderMap);
      }
    }
  }
  
  /**
   * Obtiene un reporte de las restauraciones realizadas
   * @returns {Object}
   */
  getReport() {
    return getReport(this.restorations, this.warnings);
  }
}

export default ASTMapper;

/**
 * NOTAS PARA FUTURA INTEGRACIÓN:
 * 
 * 1. Probar exhaustivamente con diferentes tipos de código
 * 2. Manejar edge cases:
 *    - Private fields en nested classes
 *    - Private fields con nombres dinámicos
 *    - Múltiples private fields en un archivo
 *    - Private fields con computed names (no soportado, pero validar)
 * 
 * 3. Source Maps:
 *    - Las transformaciones cambian las posiciones
 *    - Necesario generar source map si se quiere debugging correcto
 * 
 * 4. Performance:
 *    - Para archivos grandes, considerar lazy restoration
 *    - Solo restaurar los nodos que se van a usar
 */
