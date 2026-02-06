/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes para extractores estáticos
 * 
 * @module extractors/static/constants
 */

/**
 * Propiedades nativas de window/global que deben ignorarse
 * @constant {string[]}
 */
export const NATIVE_WINDOW_PROPS = [
  // Browser APIs
  'document', 'location', 'history', 'navigator', 'screen', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage',
  'addEventListener', 'removeEventListener', 'dispatchEvent',
  
  // Dimensiones/scroll
  'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight',
  'scrollX', 'scrollY', 'pageXOffset', 'pageYOffset',
  
  // Diálogos
  'alert', 'confirm', 'prompt', 'open', 'close', 'print',
  
  // Animation
  'requestAnimationFrame', 'cancelAnimationFrame',
  
  // Constructores globales
  'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean',
  'Date', 'Math', 'JSON', 'RegExp', 'Error', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect'
];

/**
 * Patrones regex para extracción de localStorage
 * @constant {Object}
 */
export const STORAGE_PATTERNS = {
  writes: [
    /localStorage\.setItem\s*\(\s*['"]([^'"]+)['"]/g,
    /localStorage\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=/g,
    /sessionStorage\.setItem\s*\(\s*['"]([^'"]+)['"]/g,
    /sessionStorage\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=/g
  ],
  reads: [
    /localStorage\.getItem\s*\(\s*['"]([^'"]+)['"]/g,
    /localStorage\s*\[\s*['"]([^'"]+)['"]\s*\]/g,
    /sessionStorage\.getItem\s*\(\s*['"]([^'"]+)['"]/g,
    /sessionStorage\s*\[\s*['"]([^'"]+)['"]\s*\]/g
  ]
};

/**
 * Patrones regex para extracción de eventos
 * @constant {Object}
 */
export const EVENT_PATTERNS = {
  listeners: [
    /\.addEventListener\s*\(\s*['"]([^'"]+)['"]/g,
    /\.on\s*\(\s*['"]([^'"]+)['"]/g,
    /\.once\s*\(\s*['"]([^'"]+)['"]/g
  ],
  emitters: [
    /\.dispatchEvent\s*\(/g,
    /\.emit\s*\(\s*['"]([^'"]+)['"]/g,
    /new\s+CustomEvent\s*\(\s*['"]([^'"]+)['"]/g,
    /new\s+Event\s*\(\s*['"]([^'"]+)['"]/g
  ]
};

/**
 * Patrones regex para acceso a globales
 * @constant {Object}
 */
export const GLOBAL_PATTERNS = {
  reads: [
    /window\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /global\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /globalThis\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g
  ],
  writes: [
    /window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    /global\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    /globalThis\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g
  ]
};

/**
 * Tipos de conexiones semánticas
 * @constant {Object}
 */
export const ConnectionType = {
  LOCAL_STORAGE: 'localStorage',
  GLOBAL_VARIABLE: 'globalVariable',
  EVENT_LISTENER: 'eventListener'
};

/**
 * Confianza por defecto para extracciones regex
 * @constant {number}
 */
export const DEFAULT_CONFIDENCE = 1.0;
