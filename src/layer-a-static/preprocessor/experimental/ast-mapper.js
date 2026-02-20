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
    const placeholderMap = this.createPlaceholderMap(transformations);
    
    // Visitar nodos del AST
    this.visitAST(ast, placeholderMap);
    
    // Validar si está habilitado
    if (this.options.validateAfterRestore) {
      this.validateAST(ast);
    }
    
    return ast;
  }
  
  /**
   * Crea mapa de placeholders para búsqueda O(1)
   * @param {Array} transformations
   * @returns {Map<string, Object>}
   */
  createPlaceholderMap(transformations) {
    const map = new Map();
    
    for (const t of transformations) {
      map.set(t.placeholder, t);
      
      // También indexar por tipo para búsquedas especializadas
      if (!map.has(t.type)) {
        map.set(`__TYPE_${t.type}__`, []);
      }
      map.get(`__TYPE_${t.type}__`).push(t);
    }
    
    return map;
  }
  
  /**
   * Visita nodos del AST buscando placeholders
   * @param {Object} node - Nodo actual
   * @param {Map} placeholderMap
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
    
    // Visitar propiedades del nodo
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('_') || key === 'loc') {
        continue;  // Skip propiedades internas de Babel
      }
      
      if (typeof value === 'string') {
        // Buscar placeholders en strings
        this.restoreInString(node, key, value, placeholderMap);
      } else if (typeof value === 'object') {
        this.visitAST(value, placeholderMap);
      }
    }
  }
  
  /**
   * Restaura placeholders dentro de un string
   * @param {Object} node
   * @param {string} key
   * @param {string} value
   * @param {Map} placeholderMap
   */
  restoreInString(node, key, value, placeholderMap) {
    // Buscar placeholders de shebang
    if (value.includes('__OMNY_SHEBANG__')) {
      const t = placeholderMap.get('__OMNY_SHEBANG__');
      if (t) {
        // Shebangs típicamente no aparecen en el AST
        // pero pueden estar en comments
        this.restorations.push({
          node,
          key,
          from: value,
          to: value.replace('__OMNY_SHEBANG__', t.original)
        });
        node[key] = value.replace('__OMNY_SHEBANG__', t.original);
      }
    }
    
    // Buscar placeholders de private fields
    const privateMatch = value.match(/__OMNY_PRIVATE_(\w+)__/);
    if (privateMatch) {
      const placeholder = `__OMNY_PRIVATE_${privateMatch[1]}__`;
      const t = placeholderMap.get(placeholder);
      if (t) {
        // Para private fields, el AST usa PrivateName nodes
        // Este es un enfoque simplificado
        this.restorations.push({
          node,
          key,
          from: value,
          to: value.replace(placeholder, t.original)
        });
        node[key] = value.replace(placeholder, t.original);
      }
    }
    
    // Buscar placeholders de private field access
    const privateAccessMatch = value.match(/__OMNY_PRIVATE_ACCESS_(\w+)__/);
    if (privateAccessMatch) {
      const placeholder = `__OMNY_PRIVATE_ACCESS_${privateAccessMatch[1]}__`;
      const t = placeholderMap.get(placeholder);
      if (t) {
        this.restorations.push({
          node,
          key,
          from: value,
          to: value.replace(placeholder, t.original)
        });
        node[key] = value.replace(placeholder, t.original);
      }
    }
  }
  
  /**
   * Restaura PrivateName nodes específicamente
   * 
   * Babel representa private fields como:
   * { type: "PrivateName", id: { type: "Identifier", name: "__OMNY_PRIVATE_field__" } }
   * 
   * @param {Object} node
   * @param {Map} placeholderMap
   */
  restorePrivateName(node, placeholderMap) {
    if (node.type !== 'PrivateName' || !node.id) {
      return;
    }
    
    const name = node.id.name;
    
    // Buscar placeholder en el nombre
    const match = name.match(/__OMNY_PRIVATE_(\w+)__/);
    if (match) {
      const originalName = match[1];
      const t = placeholderMap.get(`__OMNY_PRIVATE_${originalName}__`);
      
      if (t) {
        node.id.name = originalName;
        this.restorations.push({
          node,
          key: 'id.name',
          from: name,
          to: originalName
        });
      }
    }
  }
  
  /**
   * Valida el AST después de restaurar
   * @param {Object} ast
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateAST(ast) {
    const errors = [];
    
    // Verificar que no quedan placeholders sin restaurar
    const remainingPlaceholders = this.findRemainingPlaceholders(ast);
    if (remainingPlaceholders.length > 0) {
      errors.push(`Placeholders sin restaurar: ${remainingPlaceholders.join(', ')}`);
      this.warnings.push({
        type: 'remaining_placeholders',
        placeholders: remainingPlaceholders
      });
    }
    
    // Verificar consistencia de posiciones
    if (this.options.preservePositions) {
      const positionErrors = this.validatePositions(ast);
      errors.push(...positionErrors);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Busca placeholders que no fueron restaurados
   * @param {Object} node
   * @returns {string[]}
   */
  findRemainingPlaceholders(node) {
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
   * @param {Object} ast
   * @returns {string[]}
   */
  validatePositions(ast) {
    const errors = [];
    
    // TODO: Implementar validación de source positions
    // Esto requeriría comparar node.loc con las transformaciones
    
    return errors;
  }
  
  /**
   * Obtiene un reporte de las restauraciones realizadas
   * @returns {Object}
   */
  getReport() {
    return {
      restorations: this.restorations,
      warnings: this.warnings,
      summary: {
        totalRestored: this.restorations.length,
        warningsCount: this.warnings.length
      }
    };
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