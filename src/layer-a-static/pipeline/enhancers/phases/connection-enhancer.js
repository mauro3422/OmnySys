/**
 * @fileoverview connection-enhancer.js
 * 
 * Fase de enriquecimiento de conexiones
 * 
 * @module pipeline/enhancers/phases/connection-enhancer
 */

import { detectAllSemanticConnections } from '#layer-a/extractors/static/index.js';
import { detectAllReduxContextConnections } from '#layer-a/extractors/state-management/index.js';
import { detectAllAdvancedConnections } from '#layer-a/extractors/communication/index.js';
import { extractAllMetadata } from '#layer-a/extractors/metadata/index.js';

/**
 * Enriquece conexiones en los resultados estáticos
 * @param {object} staticResults - Resultados estáticos
 * @returns {Promise<void>}
 */
export async function enhanceConnections(staticResults) {
  const fileSourceCode = extractSourceCode(staticResults);
  
  // Detectar conexiones semánticas
  const semanticConnections = detectAllSemanticConnections(fileSourceCode);
  
  // Detectar conexiones Redux/Context
  const reduxConnections = detectAllReduxContextConnections(fileSourceCode);
  
  // Detectar conexiones avanzadas
  const advancedConnections = detectAllAdvancedConnections(fileSourceCode);
  
  // Extraer metadata
  const metadata = extractAllMetadata(fileSourceCode);
  
  // Agregar a cada archivo
  for (const [filePath, fileData] of Object.entries(staticResults.files || {})) {
    fileData.semanticConnections = [
      ...(semanticConnections.all || []),
      ...(reduxConnections.connections || []),
      ...(advancedConnections.all || [])
    ].filter(c => 
      c.sourceFile === filePath || c.targetFile === filePath
    );
    
    fileData.metadata = metadata[filePath] || {};
  }
}

/**
 * Extrae código fuente de los resultados
 * @private
 */
function extractSourceCode(staticResults) {
  const sourceCode = {};
  for (const [filePath, fileData] of Object.entries(staticResults.files || {})) {
    if (fileData.sourceCode) {
      sourceCode[filePath] = fileData.sourceCode;
    }
  }
  return sourceCode;
}
