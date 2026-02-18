/**
 * @fileoverview index.js - API Pública del módulo graph
 * 
 * Fachada que exporta toda la funcionalidad del grafo.
 * Punto de entrada único para consumidores externos.
 * 
 * @module graph
 * 
 * @example
 * // Uso básico
 * import { buildGraph, getImpactMap } from './graph/index.js';
 * 
 * const systemMap = buildGraph(parsedFiles, resolvedImports);
 * const impact = getImpactMap(filePath, systemMap.files);
 * 
 * @example
 * // Uso avanzado - acceso a módulos específicos
 * import { algorithms, utils } from './graph/index.js';
 * 
 * const cycles = algorithms.detectCycles(systemMap.files);
 * const normalized = utils.normalizePath('./some\\path');
 */

// ============================================
// Funciones principales (API pública)
// ============================================

/**
 * Construye el grafo de dependencias del sistema
 * @type {Function}
 */
export { buildSystemMap, buildSystemMap as buildGraph } from './builders/system-map.js';

/**
 * Obtiene el mapa de impacto de un archivo
 * @type {Function}
 */
export { getImpactMap } from './algorithms/impact-analyzer.js';

// ============================================
// Tipos y estructuras de datos (SSOT)
// ============================================

export {
  createEmptySystemMap,
  createFileNode,
  createDependency,
  createFunctionLink,
  createImpactInfo
} from './types.js';

// ============================================
// Builders (para uso avanzado)
// ============================================

export { buildExportIndex } from './builders/export-index.js';
export { buildFunctionLinks } from './builders/function-links.js';

// ============================================
// Algoritmos (para uso avanzado)
// ============================================

export { detectCycles } from './algorithms/cycle-detector.js';
export { 
  calculateTransitiveDependencies,
  calculateTransitiveDependents 
} from './algorithms/transitive-deps.js';
export { 
  calculateRiskLevel,
  generateRecommendation,
  findHighImpactFiles,
  RISK_LEVELS
} from './algorithms/impact-analyzer.js';

// ============================================
// Resolvers (para uso avanzado)
// ============================================

export { findFunctionInResolution } from './resolvers/function-resolver.js';

// ============================================
// Utilidades (para uso avanzado)
// ============================================

export { 
  normalizePath,
  getDisplayPath,
  resolveImportPath,
  uniquePaths,
  pathsEqual,
  getFileExtension,
  isRelativePath
} from './utils/path-utils.js';

export { 
  countTotalFunctions,
  countTotalItems,
  countUnresolvedImports,
  countFiles,
  countDependencies
} from './utils/counters.js';

// ============================================
// Namespaces organizados (para importaciones limpias)
// ============================================

import * as typesModule from './types.js';
import * as algorithmsModule from './algorithms/cycle-detector.js';
import * as transitiveDepsModule from './algorithms/transitive-deps.js';
import * as impactAnalyzerModule from './algorithms/impact-analyzer.js';
import * as utilsPathModule from './utils/path-utils.js';
import * as utilsCountersModule from './utils/counters.js';
import * as resolversModule from './resolvers/function-resolver.js';
import * as buildersExportIndex from './builders/export-index.js';
import * as buildersFunctionLinks from './builders/function-links.js';

/**
 * Namespace con todas las operaciones de tipos/estructuras
 */
export const types = typesModule;

/**
 * Namespace con todos los algoritmos del grafo
 */
export const algorithms = {
  ...algorithmsModule,
  ...transitiveDepsModule,
  ...impactAnalyzerModule
};

/**
 * Namespace con todas las utilidades
 */
export const utils = {
  path: utilsPathModule,
  counters: utilsCountersModule
};

/**
 * Namespace con todos los resolvers
 */
export const resolvers = resolversModule;

/**
 * Namespace con todos los builders
 */
export const builders = {
  ...buildersExportIndex,
  ...buildersFunctionLinks
};
