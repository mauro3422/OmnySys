/**
 * @fileoverview constants.js
 *
 * SSOT - Constantes del contrato de metadatos
 *
 * NOTA: Los campos en OPTIONAL_METADATA_FIELDS son metadata informativa de Layer A.
 * No todos son usados por arquetipos. Campos como hasTypeScript y hasCSSInJS son
 * datos utiles para contexto pero NO tienen arquetipo asociado porque no describen
 * patrones de conexion entre archivos. Ver PROMPT_REGISTRY.js para las reglas.
 *
 * @module metadata-contract/constants
 */

/**
 * Campos requeridos mínimos para el sistema de prompts
 * Estos campos DEBEN estar presentes para que los detectores funcionen
 * @constant {string[]}
 */
export const REQUIRED_METADATA_FIELDS = [
  'filePath',
  'exportCount',
  'dependentCount',
  'importCount',
  'functionCount'
];

/**
 * Campos opcionales que pueden usarse para detección avanzada
 * @constant {string[]}
 */
export const OPTIONAL_METADATA_FIELDS = [
  'exports',
  'dependents',
  'hasDynamicImports',
  'hasTypeScript',
  'hasCSSInJS',
  'hasLocalStorage',
  'hasEventListeners',
  'hasEventEmitters',
  'hasGlobalAccess',
  'hasAsyncPatterns',
  'hasJSDoc',
  'hasSingletonPattern',
  'localStorageKeys',
  'eventNames',
  'envVars',
  'semanticDependentCount',
  'definesGlobalState',
  'usesGlobalState',
  'globalStateWrites',
  'globalStateReads',
  'semanticConnections',
  'colocatedFiles',
  'hasTestCompanion',
  'routeStrings',
  'hasRoutes',
  // New metadata fields from advanced extractors
  'hasSideEffects',
  'hasNetworkCalls',
  'hasDomManipulation',
  'hasStorageAccess',
  'callGraphDepth',
  'externalCallCount',
  'hasDataFlow',
  'inferredTypeCount',
  'hasLifecycleHooks',
  'hasCleanupPatterns',
  'importDepth',
  'hasNestedLoops',
  'hasBlockingOps',
  'estimatedComplexity',
  'gitChurnRate',
  'gitHotspotScore',
  'networkEndpoints'
];

/**
 * Todos los campos del contrato
 * @constant {string[]}
 */
export const ALL_METADATA_FIELDS = [
  ...REQUIRED_METADATA_FIELDS,
  ...OPTIONAL_METADATA_FIELDS
];

/**
 * Umbrales arquitectónicos para detección de patrones
 * @constant {Object}
 */
export const ARCHITECTURAL_THRESHOLDS = {
  GOD_OBJECT: {
    // Criterio original: muchos exports + muchos dependents
    MIN_EXPORTS: 5,
    MIN_DEPENDENTS: 5,
    // Criterio adicional: muy alto acoplamiento (incluso con pocos exports)
    HIGH_DEPENDENTS: 10,
    // Criterio relativo: ratio de acoplamiento
    // Si dependents >= 3 * exports, es un hotspot crítico
    COUPLING_RATIO: 3
  },
  ORPHAN_MODULE: {
    MAX_DEPENDENTS: 0,
    MIN_EXPORTS: 1
  }
};

/**
 * Límites para arrays en metadatos
 * @constant {Object}
 */
export const ARRAY_LIMITS = {
  EXPORTS: 10,
  DEPENDENTS: 10,
  EVENT_NAMES: 10,
  GLOBAL_WRITES: 10,
  GLOBAL_READS: 10,
  ENV_VARS: 10,
  SEMANTIC_CONNECTIONS: 5,
  LOCAL_STORAGE_KEYS: 5,
  COLOCATED_FILES: 5,
  ROUTE_STRINGS: 10
};

/**
 * Extensiones de archivos TypeScript
 * @constant {string[]}
 */
export const TYPESCRIPT_EXTENSIONS = ['.ts', '.tsx'];

/**
 * Nombres que indican patrón Singleton
 * @constant {string[]}
 */
export const SINGLETON_INDICATORS = ['singleton', 'getinstance', 'instance'];
