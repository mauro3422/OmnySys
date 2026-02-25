import { createLogger } from '../../../utils/logger.js';
import { startLine, text } from '../../utils/ts-ast-utils.js';
import { getTree } from '../../parser/index.js';
import { isPartOfAssignmentLeft } from './shared-state/utils/assignment-checker.js';

const logger = createLogger('OmnySys:side:effects:detector');

// ── API sets (module-level constants) ─────────────────────────────────────────
const GLOBAL_OBJECTS = new Set(['window', 'global', 'globalThis']);
const STORAGE_OBJECTS = new Set(['localStorage', 'sessionStorage', 'indexedDB']);
const NETWORK_APIS = new Set(['fetch', 'axios', 'request', 'post', 'get', 'put', 'delete', 'patch', 'XMLHttpRequest']);
const LISTENER_APIS = new Set(['addEventListener', 'on', 'once', 'subscribe', 'addListener']);
const TIMER_APIS = new Set(['setTimeout', 'setInterval', 'setImmediate', 'requestAnimationFrame']);
const DOM_APIS = new Set(['appendChild', 'removeChild', 'insertBefore', 'replaceChild', 'innerHTML', 'textContent', 'setAttribute', 'classList', 'style', 'querySelector', 'getElementById']);

const FUNCTION_NODE_TYPES = [
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'generator_function_declaration',
  'generator_function',
];

/**
 * Detecta side effects en un archivo usando Tree-sitter
 *
 * @param {string} code - Código fuente del archivo
 * @param {string} filePath - Ruta del archivo para debugging
 * @returns {Promise<Object>} - { sideEffects: {...}, details: {...} }
 */
export async function detectSideEffects(code, filePath = '') {
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
    const tree = await getTree(filePath, code);
    if (!tree) return { sideEffects, details, severity: 'low', count: 0 };

    let currentFunction = 'module-level';

    function walk(node) {
      let isFunction = FUNCTION_NODE_TYPES.includes(node.type);
      let oldContext = currentFunction;

      if (isFunction) {
        const nameNode = node.childForFieldName('name');
        currentFunction = nameNode ? text(nameNode, code) : 'anonymous';
      }

      const line = startLine(node);

      // Handle Member Expressions
      if (node.type === 'member_expression') {
        const objectNode = node.childForFieldName('object');
        const propertyNode = node.childForFieldName('property');

        if (objectNode && propertyNode) {
          const objName = text(objectNode, code);
          const propName = text(propertyNode, code);

          if (GLOBAL_OBJECTS.has(objName)) {
            sideEffects.hasGlobalAccess = true;
            sideEffects.accessesWindow = true;
            details.globalAccessLocations.push({ line, function: currentFunction, object: objName, property: propName });

            if (isPartOfAssignmentLeft(node)) {
              sideEffects.modifiesGlobalState = true;
              details.globalStateModificationLocations.push({ line, function: currentFunction, target: `${objName}.${propName}` });
            }
          }

          if (objName === 'document' || DOM_APIS.has(propName)) {
            sideEffects.modifiesDOM = true;
            details.domModificationLocations.push({ line, function: currentFunction, method: propName });
          }

          if (STORAGE_OBJECTS.has(objName)) {
            sideEffects.usesLocalStorage = true;
            details.storageAccessLocations.push({ line, function: currentFunction, storage: objName });
          }
        }
      }

      // Handle Call Expressions
      if (node.type === 'call_expression') {
        const functionNode = node.childForFieldName('function');
        if (functionNode) {
          let funcName = '';
          if (functionNode.type === 'identifier') {
            funcName = text(functionNode, code);
          } else if (functionNode.type === 'member_expression') {
            const propNode = functionNode.childForFieldName('property');
            if (propNode) funcName = text(propNode, code);
          }

          if (funcName) {
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
        }
      }

      for (const child of node.namedChildren) {
        walk(child);
      }

      if (isFunction) {
        currentFunction = oldContext;
      }
    }

    walk(tree.rootNode);
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
 */
function calculateSideEffectSeverity(sideEffects) {
  const count = Object.values(sideEffects).filter(Boolean).length;
  if (sideEffects.makesNetworkCalls && sideEffects.modifiesGlobalState) return 'critical';
  if (count >= 4) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

/**
 * Genera análisis de side effects para todos los archivos
 */
export async function analyzeSideEffectsForAllFiles(fileAnalysisMap) {
  const results = {};
  for (const [filePath, code] of Object.entries(fileAnalysisMap)) {
    results[filePath] = await detectSideEffects(code, filePath);
  }
  return results;
}

export default {
  detectSideEffects,
  analyzeSideEffectsForAllFiles
};
