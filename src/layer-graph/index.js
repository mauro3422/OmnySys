/**
 * @fileoverview Layer Graph - API Pública Unificada
 * 
 * Layer Graph es la capa dedicada al sistema de grafos de OmnySys.
 * Maneja toda la lógica de construcción, análisis, consulta y persistencia
 * del grafo de dependencias y conexiones del sistema.
 * 
 * @module layer-graph
 * @version 1.0.0
 * 
 * @example
 * // Uso básico
 * import { buildSystemMap, getImpactMap, detectCycles } from '#layer-graph/index.js';
 * 
 * const systemMap = buildSystemMap(parsedFiles, resolvedImports);
 * const impact = getImpactMap(filePath, systemMap.files);
 * const cycles = detectCycles(systemMap.files);
 * 
 * @example
 * // Uso con namespaces
 * import { algorithms, builders } from '#layer-graph/index.js';
 * 
 * const cycles = algorithms.detectCycles(systemMap.files);
 * const graph = builders.systemMap.buildSystemMap(files, imports);
 */

// ============================================
// CORE: Tipos y estructuras de datos (SSOT)
// ============================================

export {
  createEmptySystemMap,
  createFileNode,
  createDependency,
  createFunctionLink,
  createImpactInfo
} from './core/types.js';

// ============================================
// BUILDERS: Construcción de grafos
// ============================================

export { buildSystemMap, buildSystemMap as buildGraph } from './builders/system-map.js';
export { buildExportIndex } from './builders/export-index.js';
export { buildFunctionLinks } from './builders/function-links.js';
export { buildSystemGraph, mapModuleConnections } from './builders/system-graph-builder.js';
export { extractCallGraph } from './builders/call-graph.js';

// ============================================
// ALGORITHMS: Algoritmos de análisis
// ============================================

export { detectCycles, isInCycle, getFilesInCycles } from './algorithms/cycle-detector.js';
export { 
  calculateTransitiveDependencies,
  calculateTransitiveDependents,
  calculateAllTransitiveDependencies,
  calculateAllTransitiveDependents
} from './algorithms/transitive-deps.js';
export { 
  getImpactMap,
  getMultipleImpactMaps,
  calculateRiskLevel,
  generateRecommendation,
  findHighImpactFiles,
  RISK_LEVELS
} from './algorithms/impact-analyzer.js';

// ============================================
// QUERY: Consultas al grafo (async - requieren layer-a)
// Nota: Estas funciones se importan directamente cuando se necesitan
// porque dependen de layer-a-storage
// ============================================

// export { getDependencyGraph, getTransitiveDependents } from './query/dependency-query.js';
// export { queryImpact, calculateImpactRisk, summarizeImpact } from './query/impact-query.js';
// export { findCallSites } from './query/call-graph-analyzer.js';

// Export async query functions for direct import
export const asyncQueries = {
  getDependencyGraph: async () => (await import('./query/dependency-query.js')).getDependencyGraph,
  getTransitiveDependents: async () => (await import('./query/dependency-query.js')).getTransitiveDependents,
  queryImpact: async () => (await import('./query/impact-query.js')).queryImpact,
  findCallSites: async () => (await import('./query/call-graph-analyzer.js')).findCallSites
};

// ============================================
// RESOLVERS: Resolución de símbolos
// ============================================

export { 
  findFunctionInResolution,
  resolveAllFunctionCalls 
} from './resolvers/function-resolver.js';

// ============================================
// UTILS: Utilidades del grafo
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
// PERSISTENCE: Persistencia del grafo
// ============================================

export { 
  serializeGraph,
  deserializeGraph,
  getGraphDelta,
  applyGraphDelta 
} from './persistence/index.js';

// ============================================
// NAMESPACES: Para uso avanzado organizado
// ============================================

import * as typesModule from './core/types.js';
import * as cycleDetectorModule from './algorithms/cycle-detector.js';
import * as transitiveDepsModule from './algorithms/transitive-deps.js';
import * as impactAnalyzerModule from './algorithms/impact-analyzer.js';
import * as systemMapBuilder from './builders/system-map.js';
import * as exportIndexBuilder from './builders/export-index.js';
import * as functionLinksBuilder from './builders/function-links.js';
import * as systemGraphBuilder from './builders/system-graph-builder.js';
import * as callGraphBuilder from './builders/call-graph.js';
import * as resolversModule from './resolvers/function-resolver.js';
import * as utilsPathModule from './utils/path-utils.js';
import * as utilsCountersModule from './utils/counters.js';
import * as persistenceModule from './persistence/index.js';

/**
 * Namespace: Tipos y estructuras de datos
 */
export const types = typesModule;

/**
 * Namespace: Algoritmos de análisis de grafos
 */
export const algorithms = {
  ...cycleDetectorModule,
  ...transitiveDepsModule,
  ...impactAnalyzerModule
};

/**
 * Namespace: Constructores de grafos
 */
export const builders = {
  systemMap: systemMapBuilder,
  exportIndex: exportIndexBuilder,
  functionLinks: functionLinksBuilder,
  systemGraph: systemGraphBuilder,
  callGraph: callGraphBuilder
};

/**
 * Namespace: Resolución de símbolos
 */
export const resolvers = resolversModule;

/**
 * Namespace: Utilidades
 */
export const utils = {
  path: utilsPathModule,
  counters: utilsCountersModule
};

/**
 * Namespace: Persistencia
 */
export const persistence = persistenceModule;
