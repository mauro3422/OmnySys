/**
 * @fileoverview index.js
 * 
 * Facade del detector de patrones de eventos
 * 
 * @module analyses/tier3/event-detector
 */

// Constantes
export {
  EVENT_PATTERNS,
  ConnectionType,
  Severity,
  DEFAULT_BABEL_PLUGINS,
  DEFAULT_PARSER_OPTIONS,
  BUS_OWNER_PATTERNS,
  CRITICAL_EVENT_PATTERNS,
  MIN_CONFIDENCE_THRESHOLD,
  HIGH_SEVERITY_LISTENER_THRESHOLD
} from './constants.js';

// Parser
export { getBabelPlugins, parseCodeToAST, isParseableFile } from './parser.js';

// AST Utils
export {
  extractEventName,
  getConfidence,
  getObjectName,
  getMethodName,
  isMethodCall
} from './ast-utils.js';

// Detector
export { detectEventPatterns, detectListeners, detectEmitters } from './detector.js';

// Indexer
export {
  indexEventsByName,
  indexBusObjects,
  getBusAccessors,
  getEventStats
} from './event-indexer.js';

// Bus Owner Detector
export {
  detectBusOwners,
  isPossibleBusOwner,
  getBusOwner,
  getOrphanBuses
} from './bus-owner-detector.js';

// Severity Calculator
export {
  calculateEventSeverity,
  isCriticalEventName,
  calculateAverageConfidence,
  determineConnectionSeverity
} from './severity-calculator.js';

// Connection Generator
export { generateEventConnections } from './connection-generator.js';

/**
 * Analiza múltiples archivos y genera conexiones
 * @param {Object} fileSourceCode - Mapa de filePath -> código
 * @returns {Object} - { connections: [], fileResults: {} }
 */
export function analyzeEventPatterns(fileSourceCode) {
  const fileResults = {};
  
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = detectEventPatterns(code, filePath);
  }
  
  const connections = generateEventConnections(fileResults);
  
  return {
    connections,
    fileResults
  };
}

// Import for default export
import { detectEventPatterns as dep } from './detector.js';
import { generateEventConnections as gec } from './connection-generator.js';

// Default export
export default {
  detectEventPatterns: dep,
  generateEventConnections: gec
};
