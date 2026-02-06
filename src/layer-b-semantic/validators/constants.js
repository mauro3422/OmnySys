/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes para validación de respuestas LLM
 * 
 * @module validators/constants
 */

/**
 * Métodos de localStorage que NO deben considerarse keys
 * @constant {string[]}
 */
export const LOCALSTORAGE_METHODS = [
  'setItem', 'getItem', 'removeItem', 'clear', 'key', 'length'
];

/**
 * Métodos del DOM/Eventos que NO deben considerarse event names
 * @constant {string[]}
 */
export const DOM_METHODS = [
  'addEventListener', 'removeEventListener', 'dispatchEvent',
  'click', 'submit', 'change', 'input', 'keydown', 'keyup', 'keypress',
  'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave',
  'load', 'unload', 'error', 'resize', 'scroll', 'focus', 'blur'
];

/**
 * Placeholders genéricos a rechazar
 * @constant {string[]}
 */
export const GENERIC_PLACEHOLDERS = [
  'key1', 'key2', 'key3', 'key4',
  'event1', 'event2', 'event3', 'event4'
];

/**
 * Patrones de extracción de localStorage keys
 * @constant {RegExp[]}
 */
export const LOCALSTORAGE_PATTERNS = [
  /localStorage\.setItem\(['"`]([^'"`]+)['"`]/g,
  /localStorage\.getItem\(['"`]([^'"`]+)['"`]/g,
  /localStorage\.removeItem\(['"`]([^'"`]+)['"`]/g,
  /localStorage\['([^']+)']\s*=/g,
  /localStorage\.(\w+)\s*=/g
];

/**
 * Patrones de extracción de event names
 * @constant {RegExp[]}
 */
export const EVENT_PATTERNS = [
  /addEventListener\(['"`]([^'"`]+)['"`]/g,
  /removeEventListener\(['"`]([^'"`]+)['"`]/g,
  /dispatchEvent\(['"`]?(?:new\s+)?\w*Event\(['"`]([^'"`]+)['"`]/g,
  /\.emit\(['"`]([^'"`]+)['"`]/g,
  /\.on\(['"`]([^'"`]+)['"`]/g,
  /\.once\(['"`]([^'"`]+)['"`]/g
];

/**
 * Patrones de extracción de variables globales
 * @constant {RegExp[]}
 */
export const GLOBAL_PATTERNS = [
  /(window|globalThis|global)\.([A-Za-z_$][\w$]*)/g,
  /(window|globalThis|global)\[['"`]([^'"`]+)['"`]\]/g
];

/**
 * Configuración de timeouts
 * @constant {Object}
 */
export const TIMEOUT_CONFIG = {
  baseTimeout: 20000,      // 20 segundos base
  sizeFactor: 500,         // +1s por cada 500 chars
  maxTimeout: 120000       // Máximo 120 segundos
};

/**
 * Tipos de conexión válidos
 * @readonly
 * @enum {string}
 */
export const ConnectionType = {
  NONE: 'none',
  LOCALSTORAGE: 'localStorage',
  EVENT: 'event',
  MIXED: 'mixed'
};

/**
 * Razón por defecto para respuestas validadas
 * @constant {string}
 */
export const DEFAULT_REASONING = 'Validated connections';

/**
 * Longitud máxima del reasoning
 * @constant {number}
 */
export const MAX_REASONING_LENGTH = 200;
