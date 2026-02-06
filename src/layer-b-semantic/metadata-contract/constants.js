/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes del contrato de metadatos
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
  'semanticConnections'
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
    MIN_EXPORTS: 5,
    MIN_DEPENDENTS: 5,
    HIGH_DEPENDENTS: 10
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
  LOCAL_STORAGE_KEYS: 5
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
