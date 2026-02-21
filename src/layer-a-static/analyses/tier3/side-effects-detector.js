/**
 * Side Effects Detector - Detecta operaciones con efectos secundarios
 *
 * Categorías detectadas:
 * - hasGlobalAccess: window.*, global.*, globalThis.*
 * - modifiesDOM: document, querySelector, appendChild, etc.
 * - makesNetworkCalls: fetch, XMLHttpRequest, axios, etc.
 * - usesLocalStorage: localStorage, sessionStorage, indexedDB
 * - accessesWindow: window object usage
 * - modifiesGlobalState: window.x = ..., global.x = ...
 * - hasEventListeners: addEventListener, on(), subscribe()
 * - usesTimers: setTimeout, setInterval, requestAnimationFrame
 *
 * @module side-effects-detector
 */

import _traverse from '@babel/traverse';
import { parse } from '@babel/parser';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:side:effects:detector');

// ── API sets (module-level constants) ─────────────────────────────────────────
const GLOBAL_OBJECTS = new Set(['window', 'global', 'globalThis']);
const STORAGE_OBJECTS = new Set(['localStorage', 'sessionStorage', 'indexedDB']);
const NETWORK_APIS = new Set(['fetch', 'axios', 'request', 'post', 'get', 'put', 'delete', 'patch', 'XMLHttpRequest']);
const LISTENER_APIS = new Set(['addEventListener', 'on', 'once', 'subscribe', 'addListener']);
const TIMER_APIS = new Set(['setTimeout', 'setInterval', 'setImmediate', 'requestAnimationFrame']);
const DOM_APIS = new Set(['appendChild', 'removeChild', 'insertBefore', 'replaceChild', 'innerHTML', 'textContent', 'setAttribute', 'classList', 'style']);

// ── Visitor handlers ──────────────────────────────────────────────────────────

function visitMemberExpression(nodePath, currentFunction, sideEffects, details) {
  const node = nodePath.node;
  const objName = node.object.name;

  if (GLOBAL_OBJECTS.has(objName)) {
    sideEffects.hasGlobalAccess = true;
    sideEffects.accessesWindow = true;
    details.globalAccessLocations.push({ line: node.loc?.start?.line || 0, function: currentFunction, object: objName, property: node.property.name });
    if (nodePath.parent.type === 'AssignmentExpression' && nodePath.parent.left === node) {
      sideEffects.modifiesGlobalState = true;
      details.globalStateModificationLocations.push({ line: node.loc?.start?.line || 0, function: currentFunction, target: `${objName}.${node.property.name}` });
    }
  }

  if (objName === 'document') {
    sideEffects.modifiesDOM = true;
    details.domModificationLocations.push({ line: node.loc?.start?.line || 0, function: currentFunction, method: node.property.name });
  }

  if (STORAGE_OBJECTS.has(objName)) {
    sideEffects.usesLocalStorage = true;
    details.storageAccessLocations.push({ line: node.loc?.start?.line || 0, function: currentFunction, storage: objName });
  }
}

function visitCallExpression(nodePath, currentFunction, sideEffects, details) {
  const node = nodePath.node;
  const callee = node.callee;
  const funcName = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' ? callee.property.name : '';
  if (!funcName) return;

  const line = node.loc?.start?.line || 0;

  if (NETWORK_APIS.has(funcName)) {
    sideEffects.makesNetworkCalls = true;
    details.networkCallLocations.push({ line, function: currentFunction, api: funcName });
  }
  if (LISTENER_APIS.has(funcName)) {
    sideEffects.hasEventListeners = true;
    details.eventListenerLocations.push({ line, function: currentFunction, method: funcName });
  }
  if (TIMER_APIS.has(funcName)) {
    sideEffects.usesTimers = true;
    details.timerLocations.push({ line, function: currentFunction, timer: funcName });
  }
  if (DOM_APIS.has(funcName)) {
    sideEffects.modifiesDOM = true;
    details.domModificationLocations.push({ line, function: currentFunction, method: funcName });
  }
}

function buildParserPlugins(filePath) {
  const plugins = [
    'jsx', 'objectRestSpread', 'decorators', 'classProperties', 'exportExtensions',
    'asyncGenerators', ['pipelineOperator', { proposal: 'minimal' }],
    'nullishCoalescingOperator', 'optionalChaining', 'partialApplication'
  ];
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    plugins.push(['typescript', { isTSX: filePath.endsWith('.tsx') }]);
  }
  return plugins;
}

/**
 * Detecta side effects en un archivo
 *
 * @param {string} code - Código fuente del archivo
 * @param {string} filePath - Ruta del archivo para debugging
 * @returns {object} - { sideEffects: {...}, details: {...} }
 */
export function detectSideEffects(code, filePath = '') {
  const sideEffects = {
    hasGlobalAccess: false, modifiesDOM: false, makesNetworkCalls: false,
    usesLocalStorage: false, accessesWindow: false, modifiesGlobalState: false,
    hasEventListeners: false, usesTimers: false
  };
  const details = {
    globalAccessLocations: [], domModificationLocations: [], networkCallLocations: [],
    storageAccessLocations: [], windowAccessLocations: [], globalStateModificationLocations: [],
    eventListenerLocations: [], timerLocations: []
  };

  try {
    const ast = parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: buildParserPlugins(filePath)
    });

    let currentFunction = 'module-level';
    const traverseFn = _traverse.default ?? _traverse;

    traverseFn(ast, {
      FunctionDeclaration(np) { currentFunction = np.node.id?.name || 'anonymous-function'; },
      ArrowFunctionExpression(np) { currentFunction = np.node.id?.name || 'anonymous-arrow'; },
      MemberExpression(np) { visitMemberExpression(np, currentFunction, sideEffects, details); },
      CallExpression(np) { visitCallExpression(np, currentFunction, sideEffects, details); }
    });
  } catch (error) {
    logger.warn(`⚠️  Error parsing ${filePath}:`, error.message);
  }

  return {
    sideEffects,
    details,
    severity: calculateSideEffectSeverity(sideEffects),
    count: Object.values(sideEffects).filter(Boolean).length
  };
}

/**
 * Calcula severidad basada en cantidad y tipo de side effects
 *
 * @param {object} sideEffects - Objeto con booleanos
 * @returns {string} - 'low' | 'medium' | 'high' | 'critical'
 */
function calculateSideEffectSeverity(sideEffects) {
  const count = Object.values(sideEffects).filter(Boolean).length;

  // Criticalidad: network + global state modifications
  if (sideEffects.makesNetworkCalls && sideEffects.modifiesGlobalState) {
    return 'critical';
  }

  // Alto: múltiples side effects
  if (count >= 4) {
    return 'high';
  }

  // Medio: algunos side effects
  if (count >= 2) {
    return 'medium';
  }

  // Bajo: uno o ninguno
  return 'low';
}

/**
 * Genera análisis de side effects para todos los archivos
 *
 * @param {object} fileAnalysisMap - Mapa de filePath -> code
 * @returns {object} - Mapa de filePath -> análisis
 */
export function analyzeSideEffectsForAllFiles(fileAnalysisMap) {
  const results = {};

  for (const [filePath, code] of Object.entries(fileAnalysisMap)) {
    results[filePath] = detectSideEffects(code, filePath);
  }

  return results;
}

export default {
  detectSideEffects,
  analyzeSideEffectsForAllFiles
};
