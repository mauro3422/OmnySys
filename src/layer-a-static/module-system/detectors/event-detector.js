/**
 * @fileoverview Event Handler Detector
 *
 * Detects event handlers in modules.
 *
 * @module module-system/detectors/event-detector
 * @phase 3
 */

import path from 'path';
import { getAllAtoms, camelToKebab } from '../utils.js';

const EVENT_HANDLER_PATTERN = /^(on[A-Z]|handleEvent|processEvent)/i;

/**
 * Search event handlers in project modules.
 * @param {Array} modules - Project modules
 * @returns {Array} - Found handlers
 */
export function findEventHandlers(modules) {
  return (modules || []).flatMap(module =>
    (getAllAtoms(module) || [])
      .filter(atom => atom?.name && isEventHandlerName(atom.name))
      .map(atom => buildEventHandler(module, atom))
  );
}

function isEventHandlerName(name) {
  return EVENT_HANDLER_PATTERN.test(name);
}

function buildEventHandler(module, atom) {
  return {
    type: 'event',
    event: inferEventName(atom.name),
    handler: {
      module: module.moduleName,
      file: atom.filePath ? path.basename(atom.filePath) : 'unknown',
      function: atom.name
    }
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
