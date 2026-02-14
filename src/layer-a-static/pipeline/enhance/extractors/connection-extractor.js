/**
 * @fileoverview Connection Extractor - Extracción de conexiones semánticas
 * 
 * @module pipeline/enhance/extractors
 */

import { generateSharedStateConnections } from '../../../analyses/tier3/shared-state-detector.js';
import { generateEventConnections } from '../../../analyses/tier3/event-pattern-detector.js';
import { detectAllSemanticConnections } from '../../../extractors/static/index.js';
import { detectAllAdvancedConnections } from '../../../extractors/communication/index.js';
import { detectAllCSSInJSConnections } from '../../../extractors/css-in-js-extractor/index.js';
import { detectAllTypeScriptConnections } from '../../../extractors/typescript/index.js';
import { detectAllReduxContextConnections } from '../../../extractors/state-management/index.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:enhance:connections');

/**
 * Extrae todas las conexiones semánticas del proyecto
 * @param {Object} enhancedFiles - Archivos analizados
 * @param {Object} fileSourceCode - Código fuente por archivo
 * @returns {Object} Todas las conexiones encontradas
 */
export function extractAllConnections(enhancedFiles, fileSourceCode) {
  logger.debug('Extracting connections...');

  // Conexiones de shared state
  const sharedStateConnections = generateSharedStateConnections(
    Object.entries(enhancedFiles).reduce((acc, [file, analysis]) => {
      acc[file] = analysis.semanticAnalysis.sharedState;
      return acc;
    }, {})
  );

  // Conexiones de eventos
  const eventConnections = generateEventConnections(
    Object.entries(enhancedFiles).reduce((acc, [file, analysis]) => {
      acc[file] = {
        eventListeners: analysis.semanticAnalysis.eventPatterns.eventListeners,
        eventEmitters: analysis.semanticAnalysis.eventPatterns.eventEmitters
      };
      return acc;
    }, {})
  );

  // Extracción estática
  const staticConnections = detectAllSemanticConnections(fileSourceCode);
  const advancedConnections = detectAllAdvancedConnections(fileSourceCode);

  // Nuevos extractores
  const cssInJSConnections = detectAllCSSInJSConnections(fileSourceCode);
  const tsConnections = detectAllTypeScriptConnections(fileSourceCode);
  const reduxConnections = detectAllReduxContextConnections(fileSourceCode);

  return {
    sharedState: sharedStateConnections,
    events: eventConnections,
    static: staticConnections,
    advanced: advancedConnections,
    cssInJS: cssInJSConnections,
    typescript: tsConnections,
    reduxContext: reduxConnections
  };
}

/**
 * Deduplica conexiones
 * @param {Array} connections - Conexiones a deduplicar
 * @returns {Array} Conexiones únicas
 */
export function dedupeConnections(connections) {
  const seen = new Set();
  const result = [];

  for (const conn of connections) {
    const keyParts = [
      conn.type,
      conn.sourceFile,
      conn.targetFile,
      conn.property,
      conn.globalProperty,
      conn.key,
      conn.event,
      conn.eventName,
      conn.connectionType,
      conn.via
    ].map(value => value ?? '');
    const key = keyParts.join('|');

    if (!seen.has(key)) {
      seen.add(key);
      result.push(conn);
    }
  }

  return result;
}
