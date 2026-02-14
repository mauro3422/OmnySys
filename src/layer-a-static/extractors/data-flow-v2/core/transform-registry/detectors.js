/**
 * @fileoverview Transform Detectors
 * 
 * Funciones de detección de tipos de transformaciones.
 * 
 * @module data-flow-v2/transform-registry/detectors
 * @version 1.0.0
 */

import { SideEffectTransforms } from './categories/side-effects.js';
import { FunctionalTransforms } from './categories/functional.js';

/**
 * Detecta si una función tiene efectos secundarios
 * @param {string} funcName - Nombre de la función
 * @returns {boolean}
 */
export function detectSideEffectTransform(funcName) {
  if (!funcName || typeof funcName !== 'string') return false;
  
  const sideEffectPatterns = [
    // DOM Manipulation
    'appendChild', 'removeChild', 'insertBefore', 'replaceChild',
    'setAttribute', 'removeAttribute', 'addEventListener', 'removeEventListener',
    'innerHTML', 'outerHTML', 'textContent', 'innerText', 'outerText',
    'style', 'className', 'id', 'name',
    
    // Console
    'console.log', 'console.error', 'console.warn', 'console.info', 'console.debug',
    
    // Storage
    'localStorage', 'sessionStorage', 'indexedDB',
    
    // Network
    'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource',
    
    // Timers
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    
    // Document
    'document.write', 'document.writeln', 'document.open', 'document.close',
    
    // Location/History
    'location.assign', 'location.replace', 'location.reload',
    'history.pushState', 'history.replaceState',
    
    // Mutation
    'delete', 'Object.assign',
    
    // I/O
    'alert', 'confirm', 'prompt',
    
    // React specific
    'setState', 'forceUpdate',
    
    // Other side effects
    'Math.random', 'Date.now', 'performance.now'
  ];
  
  const normalizedName = funcName.toLowerCase();
  return sideEffectPatterns.some(pattern => 
    normalizedName.includes(pattern.toLowerCase())
  );
}

/**
 * Detecta si un método es una transformación funcional pura
 * @param {string} methodName - Nombre del método
 * @returns {boolean}
 */
export function detectFunctionalTransform(methodName) {
  if (!methodName || typeof methodName !== 'string') return false;
  
  const functionalMethods = [
    // Array methods (pure when callback is pure)
    'map', 'filter', 'reduce', 'reduceRight', 'flatMap', 'flat',
    'slice', 'concat', 'join', 'indexOf', 'lastIndexOf',
    'find', 'findIndex', 'findLast', 'findLastIndex',
    'every', 'some', 'includes', 'toSorted', 'toReversed', 'toSpliced',
    'with', 'at',
    
    // String methods
    'split', 'slice', 'substring', 'substr', 'concat', 'trim', 'trimStart', 'trimEnd',
    'toLowerCase', 'toUpperCase', 'replace', 'replaceAll', 'match', 'matchAll',
    'search', 'indexOf', 'lastIndexOf', 'includes', 'startsWith', 'endsWith',
    'padStart', 'padEnd', 'repeat', 'charAt', 'charCodeAt', 'codePointAt',
    'normalize', 'localeCompare',
    
    // Object methods (pure)
    'Object.keys', 'Object.values', 'Object.entries', 'Object.freeze',
    'Object.seal', 'Object.getPrototypeOf', 'Object.getOwnPropertyNames',
    'Object.getOwnPropertySymbols', 'Object.getOwnPropertyDescriptor',
    'Object.getOwnPropertyDescriptors', 'Object.assign', // careful: mutates first arg
    
    // Math methods
    'Math.abs', 'Math.ceil', 'Math.floor', 'Math.round', 'Math.trunc',
    'Math.max', 'Math.min', 'Math.sqrt', 'Math.cbrt', 'Math.pow',
    'Math.exp', 'Math.log', 'Math.log10', 'Math.log2', 'Math.log1p',
    'Math.sin', 'Math.cos', 'Math.tan', 'Math.asin', 'Math.acos', 'Math.atan',
    'Math.atan2', 'Math.sinh', 'Math.cosh', 'Math.tanh',
    'Math.sign', 'Math.clz32', 'Math.imul', 'Math.fround',
    'Math.E', 'Math.PI', 'Math.LN2', 'Math.LN10', 'Math.LOG2E', 'Math.LOG10E',
    'Math.SQRT1_2', 'Math.SQRT2',
    
    // Date construction (pure for given timestamp)
    'new Date', 'Date.parse', 'Date.UTC',
    
    // JSON
    'JSON.parse', 'JSON.stringify',
    
    // Function methods
    'bind', 'call', 'apply',
    
    // RegExp
    'RegExp.prototype.test', 'RegExp.prototype.exec',
    'String.prototype.match', 'String.prototype.search',
    
    // URL
    'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent',
    'escape', 'unescape',
    
    // Type checking
    'typeof', 'instanceof', 'Array.isArray', 'Number.isNaN', 'Number.isFinite',
    'Number.isInteger', 'Number.isSafeInteger', 'Number.parseFloat', 'Number.parseInt',
    'isNaN', 'isFinite', 'parseFloat', 'parseInt',
    
    // Nullish
    '??', '?.',
    
    // Generators/Iterators
    'Symbol.iterator', 'Symbol.asyncIterator', 'next'
  ];
  
  const normalizedName = methodName.toLowerCase();
  return functionalMethods.some(method => 
    normalizedName === method.toLowerCase() ||
    normalizedName.endsWith('.' + method.toLowerCase().split('.').pop())
  );
}

/**
 * Determina la pureza de una transformación
 * @param {string} transformType - Tipo de transformación
 * @returns {boolean|'unknown'}
 */
export function determinePurity(transformType) {
  const pureTransforms = new Set([
    'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'MODULO', 'POWER',
    'UNARY_PLUS', 'UNARY_MINUS',
    'AND', 'OR', 'NOT', 'NULLISH_COALESCING', 'OPTIONAL_CHAINING',
    'EQUAL', 'NOT_EQUAL', 'GREATER', 'GREATER_EQUAL', 'LESS', 'LESS_EQUAL',
    'OBJECT_CREATE', 'OBJECT_ACCESS', 'OBJECT_SPREAD',
    'ARRAY_CREATE', 'ARRAY_ACCESS', 'ARRAY_SPREAD',
    'TEMPLATE_LITERAL',
    'ARROW_FUNCTION', 'FUNCTION_DECLARATION',
    'CURRY', 'COMPOSE', 'PIPE',
    'CONDITIONAL', 'RETURN',
    'MAP', 'FILTER', 'REDUCE', 'SLICE', 'CONCAT'
  ]);
  
  const impureTransforms = new Set([
    'INCREMENT', 'DECREMENT',
    'ASSIGNMENT', 'COMPOUND_ASSIGNMENT', 'DELETE',
    'DOM_MANIPULATION', 'NETWORK_CALL',
    'STORAGE_READ', 'STORAGE_WRITE',
    'CONSOLE_LOG', 'THROW',
    'IF_ELSE', 'SWITCH', 'TRY_CATCH',
    'LOOP_FOR', 'LOOP_WHILE'
  ]);
  
  if (pureTransforms.has(transformType)) return true;
  if (impureTransforms.has(transformType)) return false;
  return 'unknown';
}

export default {
  detectSideEffectTransform,
  detectFunctionalTransform,
  determinePurity
};
