/**
 * @fileoverview Tree-sitter Integration
 *
 * Puente estandarizado entre Tree-sitter (Layer A avanzado) y el schema de átomos MCP.
 * 
 * PROPÓSITO:
 * - Tree-sitter extrae metadata de alta calidad (scope real, variables locales, etc.)
 * - Esta metadata se integra al schema de átomos para que TODAS las herramientas la usen
 * - Elimina la necesidad de trackers duplicados en race-detector
 *
 * @module extractors/metadata/tree-sitter-integration
 */

import { detectGlobalState } from '../../analyses/tier3/shared-state/parsers/state-parser.js';
import { detectEventPatterns } from '../../analyses/tier3/event-detector/detector.js';

/**
 * Extrae metadata de Tree-sitter para un átomo específico
 * 
 * @param {string} functionCode - Código de la función
 * @param {Object} functionInfo - Información del parser (line, endLine, etc.)
 * @param {string} filePath - Ruta del archivo
 * @param {string} fullFileCode - Código completo del archivo (para contexto)
 * @returns {Promise<Object>} - Metadata de Tree-sitter para este átomo
 */
export async function extractTreeSitterMetadata(functionCode, functionInfo, filePath, fullFileCode) {
  // Solo analizar una vez por archivo (cacheable)
  const fileAnalysis = await analyzeFileWithTreeSitter(fullFileCode, filePath);
  
  // Filtrar resultados para este átomo específico
  const atomLineStart = functionInfo.line;
  const atomLineEnd = functionInfo.endLine;
  
  return {
    // Shared state access (window.*, global.*, etc.)
    sharedStateAccess: filterAccessesByLineRange(
      fileAnalysis.sharedState?.globalAccess || [],
      atomLineStart,
      atomLineEnd
    ),
    
    // Event emitters (emit, dispatch, etc.)
    eventEmitters: filterAccessesByLineRange(
      fileAnalysis.events?.emitters || [],
      atomLineStart,
      atomLineEnd
    ),
    
    // Event listeners (addEventListener, on*, etc.)
    eventListeners: filterAccessesByLineRange(
      fileAnalysis.events?.listeners || [],
      atomLineStart,
      atomLineEnd
    ),
    
    // Side effects detectados por Tree-sitter
    treeSitterSideEffects: filterAccessesByLineRange(
      fileAnalysis.sideEffects || [],
      atomLineStart,
      atomLineEnd
    )
  };
}

/**
 * Analiza un archivo completo con Tree-sitter (con cache)
 * @private
 */
const fileAnalysisCache = new Map();

async function analyzeFileWithTreeSitter(code, filePath) {
  if (fileAnalysisCache.has(filePath)) {
    return fileAnalysisCache.get(filePath);
  }

  try {
    const [sharedState, events] = await Promise.all([
      detectGlobalState(code, filePath),
      detectEventPatterns(code, filePath)
    ]);

    const result = {
      sharedState,
      events: {
        emitters: events.eventEmitters || [],
        listeners: events.eventListeners || []
      },
      sideEffects: [] // TODO: integrar side-effects-detector
    };

    fileAnalysisCache.set(filePath, result);
    return result;
  } catch (error) {
    console.warn(`[TreeSitter] Error analyzing ${filePath}:`, error.message);
    return { sharedState: {}, events: { emitters: [], listeners: [] }, sideEffects: [] };
  }
}

/**
 * Filtra accesos por rango de líneas (para un átomo específico)
 * @private
 */
function filterAccessesByLineRange(accesses, lineStart, lineEnd) {
  if (!Array.isArray(accesses)) return [];
  
  return accesses.filter(access => {
    const accessLine = access.line || 0;
    return accessLine >= lineStart && accessLine <= lineEnd;
  });
}

/**
 * Determina si un acceso es de variable local o global
 * Usa el scope de Tree-sitter para precisión
 * @param {Object} access - Acceso de Tree-sitter
 * @returns {string} - 'local', 'module', 'global', 'closure'
 */
export function determineScopeType(access) {
  // Tree-sitter ya proporciona functionContext
  if (access.functionContext === 'module-level') {
    return 'module';
  }
  
  // Si es una variable declarada dentro de la función, es local
  if (access.isLocalDeclaration) {
    return 'local';
  }
  
  // Si accede a window/global/globalThis, es global
  if (access.objectName && ['window', 'global', 'globalThis'].includes(access.objectName)) {
    return 'global';
  }
  
  // Si captura variables del closure, es closure
  if (access.isCaptured) {
    return 'closure';
  }
  
  // Por defecto, asumir module
  return 'module';
}

export default extractTreeSitterMetadata;
