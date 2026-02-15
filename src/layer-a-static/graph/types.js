/**
 * @fileoverview types.js - Single Source of Truth (SSOT)
 * 
 * Define la estructura de datos del grafo de dependencias.
 * Cualquier cambio en la estructura del SystemMap debe hacerse AQUÍ.
 * 
 * @module graph/types
 */

/**
 * Crea un SystemMap vacío con toda la estructura definida
 * @returns {SystemMap}
 */
export function createEmptySystemMap() {
  return {
    // ============ Nodos principales ============
    files: {},
    dependencies: [],
    
    // ============ Funciones ============
    functions: {},
    function_links: [],
    
    // ============ Imports ============
    unresolvedImports: {},
    
    // ============ Exports ============
    reexportChains: [],
    exportIndex: {},
    
    // ============ Tier 3: Deep Static Analysis ============
    typeDefinitions: {},
    enumDefinitions: {},
    constantExports: {},
    objectExports: {},
    typeUsages: {},
    
    // ============ Metadata del sistema ============
    metadata: {
      totalFiles: 0,
      totalDependencies: 0,
      totalFunctions: 0,
      totalFunctionLinks: 0,
      totalUnresolved: 0,
      totalReexports: 0,
      // Tier 3 metrics
      totalTypes: 0,
      totalEnums: 0,
      totalConstants: 0,
      totalSharedObjects: 0,
      cyclesDetected: []
    }
  };
}

/**
 * Crea un nodo de archivo vacío
 * @param {string} normalizedPath - Path normalizado
 * @param {string} displayPath - Path legible para mostrar
 * @param {Object} fileInfo - Info del archivo parseado
 * @returns {FileNode}
 */
export function createFileNode(normalizedPath, displayPath, fileInfo = {}) {
  return {
    path: normalizedPath,
    displayPath: displayPath,
    exports: fileInfo.exports || [],
    imports: fileInfo.imports || [],
    definitions: fileInfo.definitions || [],
    usedBy: [], // Se llena después (bidireccional)
    calls: fileInfo.calls || [],
    identifierRefs: fileInfo.identifierRefs || [],
    dependsOn: [], // Se llena después (bidireccional)
    // Se añaden después del análisis:
    transitiveDepends: [],
    transitiveDependents: []
  };
}

/**
 * Crea una dependencia entre archivos
 * @param {string} from - Archivo origen
 * @param {string} to - Archivo destino
 * @param {Object} importInfo - Info del import
 * @returns {Dependency}
 */
export function createDependency(from, to, importInfo = {}) {
  return {
    from,
    to,
    type: importInfo.type || 'import',
    symbols: importInfo.symbols || [],
    reason: importInfo.reason,
    dynamic: importInfo.dynamic || false
  };
}

/**
 * Crea un enlace de función
 * @param {string} from - ID función origen
 * @param {string} to - ID función destino
 * @param {Object} callInfo - Info de la llamada
 * @returns {FunctionLink}
 */
export function createFunctionLink(from, to, callInfo = {}) {
  return {
    from,
    to,
    type: 'call',
    line: callInfo.line,
    file_from: callInfo.fileFrom,
    file_to: callInfo.fileTo
  };
}

/**
 * Crea la información de impacto de un archivo
 * @param {string} filePath - Path del archivo
 * @param {FileNode} fileNode - Nodo del archivo
 * @returns {ImpactInfo}
 */
export function createImpactInfo(filePath, fileNode) {
  const directDependents = fileNode.usedBy || [];
  const indirectDependents = fileNode.transitiveDependents || [];
  const allAffected = [...new Set([...directDependents, ...indirectDependents])];
  
  return {
    filePath: fileNode.displayPath || filePath,
    directDependents,
    indirectDependents,
    allAffected,
    totalFilesAffected: allAffected.length
  };
}

// ============================================
// Type Definitions (JSDoc para documentación)
// ============================================

/**
 * @typedef {Object} SystemMap
 * @property {Object.<string, FileNode>} files - Mapa de archivos
 * @property {Dependency[]} dependencies - Array de dependencias
 * @property {Object.<string, Function[]>} functions - Funciones por archivo
 * @property {FunctionLink[]} function_links - Enlaces entre funciones
 * @property {Object.<string, UnresolvedImport[]>} unresolvedImports
 * @property {ReexportChain[]} reexportChains
 * @property {Object.<string, Object.<string, ExportInfo>>} exportIndex
 * @property {Object.<string, TypeDefinition[]>} typeDefinitions
 * @property {Object.<string, EnumDefinition[]>} enumDefinitions
 * @property {Object.<string, ConstantExport[]>} constantExports
 * @property {Object.<string, ObjectExport[]>} objectExports
 * @property {Object.<string, TypeUsage[]>} typeUsages
 * @property {SystemMetadata} metadata
 */

/**
 * @typedef {Object} FileNode
 * @property {string} path - Path normalizado
 * @property {string} displayPath - Path legible
 * @property {Export[]} exports
 * @property {Import[]} imports
 * @property {Definition[]} definitions
 * @property {string[]} usedBy - Archivos que usan este
 * @property {string[]} dependsOn - Archivos de los que depende
 * @property {Call[]} calls
 * @property {IdentifierRef[]} identifierRefs
 * @property {string[]} transitiveDepends
 * @property {string[]} transitiveDependents
 */

/**
 * @typedef {Object} Dependency
 * @property {string} from - Archivo origen
 * @property {string} to - Archivo destino
 * @property {string} type - Tipo de dependencia
 * @property {string[]} symbols - Símbolos importados
 * @property {string} [reason] - Razón de la dependencia
 */

/**
 * @typedef {Object} FunctionLink
 * @property {string} from - ID función origen
 * @property {string} to - ID función destino
 * @property {string} type - Tipo de enlace
 * @property {number} line - Línea de la llamada
 * @property {string} file_from - Archivo origen
 * @property {string} file_to - Archivo destino
 */

/**
 * @typedef {Object} ImpactInfo
 * @property {string} filePath
 * @property {string[]} directDependents
 * @property {string[]} indirectDependents
 * @property {string[]} allAffected
 * @property {number} totalFilesAffected
 */

/**
 * @typedef {Object} SystemMetadata
 * @property {number} totalFiles
 * @property {number} totalDependencies
 * @property {number} totalFunctions
 * @property {number} totalFunctionLinks
 * @property {number} totalUnresolved
 * @property {number} totalReexports
 * @property {number} totalTypes
 * @property {number} totalEnums
 * @property {number} totalConstants
 * @property {number} totalSharedObjects
 * @property {string[][]} cyclesDetected
 */
