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

import traverse from '@babel/traverse';
import { parse } from '@babel/parser';

/**
 * Detecta side effects en un archivo
 *
 * @param {string} code - Código fuente del archivo
 * @param {string} filePath - Ruta del archivo para debugging
 * @returns {object} - { sideEffects: {...}, details: {...} }
 */
export function detectSideEffects(code, filePath = '') {
  const sideEffects = {
    hasGlobalAccess: false,
    modifiesDOM: false,
    makesNetworkCalls: false,
    usesLocalStorage: false,
    accessesWindow: false,
    modifiesGlobalState: false,
    hasEventListeners: false,
    usesTimers: false
  };

  const details = {
    globalAccessLocations: [],
    domModificationLocations: [],
    networkCallLocations: [],
    storageAccessLocations: [],
    windowAccessLocations: [],
    globalStateModificationLocations: [],
    eventListenerLocations: [],
    timerLocations: []
  };

  try {
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const plugins = [
      'jsx',
      'objectRestSpread',
      'decorators',
      'classProperties',
      'exportExtensions',
      'asyncGenerators',
      ['pipelineOperator', { proposal: 'minimal' }],
      'nullishCoalescingOperator',
      'optionalChaining',
      'partialApplication'
    ];

    if (isTypeScript) {
      plugins.push(['typescript', { isTSX: filePath.endsWith('.tsx') }]);
    }

    const ast = parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins
    });

    let currentFunction = 'module-level';

    traverse.default(ast, {
      FunctionDeclaration(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-function';
      },
      ArrowFunctionExpression(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-arrow';
      },

      // Detectar acceso a window/global
      MemberExpression(nodePath) {
        const node = nodePath.node;

        // window.*, global.*, globalThis.*
        if (['window', 'global', 'globalThis'].includes(node.object.name)) {
          sideEffects.hasGlobalAccess = true;
          sideEffects.accessesWindow = true;

          details.globalAccessLocations.push({
            line: node.loc?.start?.line || 0,
            function: currentFunction,
            object: node.object.name,
            property: node.property.name
          });

          // Si es asignación -> modifiesGlobalState
          if (nodePath.parent.type === 'AssignmentExpression' && nodePath.parent.left === node) {
            sideEffects.modifiesGlobalState = true;
            details.globalStateModificationLocations.push({
              line: node.loc?.start?.line || 0,
              function: currentFunction,
              target: `${node.object.name}.${node.property.name}`
            });
          }
        }

        // document.*, querySelector, etc. -> DOM
        if (node.object.name === 'document') {
          sideEffects.modifiesDOM = true;
          details.domModificationLocations.push({
            line: node.loc?.start?.line || 0,
            function: currentFunction,
            method: node.property.name
          });
        }

        // localStorage, sessionStorage, indexedDB
        if (['localStorage', 'sessionStorage', 'indexedDB'].includes(node.object.name)) {
          sideEffects.usesLocalStorage = true;
          details.storageAccessLocations.push({
            line: node.loc?.start?.line || 0,
            function: currentFunction,
            storage: node.object.name
          });
        }
      },

      // Detectar llamadas a funciones (fetch, XMLHttpRequest, setTimeout, etc.)
      CallExpression(nodePath) {
        const node = nodePath.node;
        const callee = node.callee;

        // Nombre de la función/método
        let funcName = '';

        if (callee.type === 'Identifier') {
          funcName = callee.name;
        } else if (callee.type === 'MemberExpression') {
          funcName = callee.property.name;
        }

        // Network APIs
        const networkAPIs = ['fetch', 'axios', 'request', 'post', 'get', 'put', 'delete', 'patch'];
        if (networkAPIs.includes(funcName)) {
          sideEffects.makesNetworkCalls = true;
          details.networkCallLocations.push({
            line: node.loc?.start?.line || 0,
            function: currentFunction,
            api: funcName
          });
        }

        // XMLHttpRequest constructor
        if (funcName === 'XMLHttpRequest') {
          sideEffects.makesNetworkCalls = true;
          details.networkCallLocations.push({
            line: node.loc?.start?.line || 0,
            function: currentFunction,
            api: 'XMLHttpRequest'
          });
        }

        // Event listeners
        const listenerAPIs = ['addEventListener', 'on', 'once', 'subscribe', 'addListener'];
        if (listenerAPIs.includes(funcName)) {
          sideEffects.hasEventListeners = true;
          details.eventListenerLocations.push({
            line: node.loc?.start?.line || 0,
            function: currentFunction,
            method: funcName
          });
        }

        // Timers
        const timerAPIs = ['setTimeout', 'setInterval', 'setImmediate', 'requestAnimationFrame'];
        if (timerAPIs.includes(funcName)) {
          sideEffects.usesTimers = true;
          details.timerLocations.push({
            line: node.loc?.start?.line || 0,
            function: currentFunction,
            timer: funcName
          });
        }

        // DOM methods
        const domAPIs = [
          'appendChild', 'removeChild', 'insertBefore', 'replaceChild',
          'innerHTML', 'textContent', 'setAttribute', 'classList', 'style'
        ];
        if (domAPIs.includes(funcName)) {
          sideEffects.modifiesDOM = true;
          details.domModificationLocations.push({
            line: node.loc?.start?.line || 0,
            function: currentFunction,
            method: funcName
          });
        }
      }
    });
  } catch (error) {
    console.warn(`⚠️  Error parsing ${filePath}:`, error.message);
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
