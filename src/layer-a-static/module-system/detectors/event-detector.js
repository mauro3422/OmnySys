/**
 * @fileoverview Event Handler Detector
 *
 * Detects event handlers in modules.
 *
 * @module module-system/detectors/event-detector
 * @phase 3
 */

import { camelToKebab } from '../utils.js';
import { buildHandlerContext, scanModuleAtoms } from './detector-helpers.js';

const EVENT_HANDLER_PATTERN = /^(on[A-Z]|handleEvent|processEvent)/i;

/**
 * Search event handlers in project modules.
 * @param {Array} modules - Project modules
 * @returns {Array} - Found handlers
 */
export function findEventHandlers(modules) {
  return scanModuleAtoms(
    modules,
    atom => atom?.name && isEventHandlerName(atom.name),
    buildEventHandler
  );
}

function isEventHandlerName(name) {
  return EVENT_HANDLER_PATTERN.test(name);
}

function buildEventHandler(module, atom) {
  return {
    type: 'event',
    event: inferEventName(atom.name),
    handler: buildHandlerContext(module, atom)
  };
}

/**
 * Infer event name from function name.
 * @param {string} functionName - Function name
 * @returns {string} - Event name
 */
function inferEventName(functionName) {
  const match = functionName.match(/^on(.+)$/);
  if (match) {
    return camelToKebab(match[1]);
  }
  return 'unknown';
}
