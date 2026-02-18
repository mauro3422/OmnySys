/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes para detección de eventos
 * 
 * @module analyses/tier3/event-detector/constants
 */

/**
 * Patrones de métodos de eventos
 * @constant {Object}
 */
export const EVENT_PATTERNS = {
  listeners: ['on', 'addEventListener', 'once', 'subscribe'],
  emitters: ['emit', 'dispatchEvent', 'trigger', 'publish'],
  removers: ['off', 'removeEventListener', 'unsubscribe']
};

/**
 * Tipos de conexiones de eventos
 * @readonly
 * @enum {string}
 */
export const ConnectionType = {
  EVENT_LISTENER: 'event_listener'
};

/**
 * Niveles de severidad
 * @readonly
 * @enum {string}
 */
export const Severity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Plugins de Babel parser por defecto
 * @constant {Array}
 */
export const DEFAULT_BABEL_PLUGINS = [
  'jsx',
  'objectRestSpread',
  'decorators',
  'classProperties',
  'exportExtensions',
  'asyncGenerators',
  // NOTE: pipelineOperator removed - conflicts with shebangs and private fields
  'nullishCoalescingOperator',
  'optionalChaining',
  'partialApplication'
];

/**
 * Opciones de parser por defecto
 * @constant {Object}
 */
export const DEFAULT_PARSER_OPTIONS = {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true
};

/**
 * Patrones de nombres de archivos que indican propietario de bus
 * @constant {string[]}
 */
export const BUS_OWNER_PATTERNS = [
  'eventbus',
  'event-bus',
  '/events.js'
];

/**
 * Patrones de eventos críticos
 * @constant {string[]}
 */
export const CRITICAL_EVENT_PATTERNS = [
  'auth',
  'login',
  'logout',
  'error',
  'crash',
  'fatal'
];

/**
 * Threshold de confianza mínima para crear conexión
 * @constant {number}
 */
export const MIN_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Threshold de listeners para severidad alta
 * @constant {number}
 */
export const HIGH_SEVERITY_LISTENER_THRESHOLD = 3;
