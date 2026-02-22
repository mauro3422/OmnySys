/**
 * @fileoverview Connection Generator - Genera conexiones de estado compartido
 */

import { calculateSeverity } from '../utils/index.js';

/**
 * Genera conexiones semánticas de estado compartido
 * @param {Object} fileAnalysisMap - Mapa de filePath -> análisis
 * @returns {Array} - Array de conexiones semánticas
 */
export function generateSharedStateConnections(fileAnalysisMap) {
  const connections = [];
  const propertyIndex = new Map();

  // Indexar todas las propiedades globales
  for (const [filePath, analysis] of Object.entries(fileAnalysisMap)) {
    if (!analysis || !analysis.globalAccess || analysis.globalAccess.length === 0) continue;

    for (const access of analysis.globalAccess) {
      const { propName, type } = access;

      if (!propertyIndex.has(propName)) {
        propertyIndex.set(propName, []);
      }

      propertyIndex.get(propName).push({
        file: filePath,
        type,
        access
      });
    }
  }

  // Generar conexiones para propiedades que tienen acceso en diferentes archivos
  for (const [propName, accesses] of propertyIndex.entries()) {
    // Skip event-related properties
    if (propName.toLowerCase().includes('bus') || propName.toLowerCase().includes('emitter') || propName.toLowerCase().includes('event')) {
      continue;
    }

    const allAccessors = [...new Set(accesses.map(a => a.file))];
    if (allAccessors.length < 2) continue;

    const uniqueWriters = [...new Set(accesses.filter(a => a.type === 'write').map(a => a.file))];
    const allFileAccessors = [...new Set(accesses.map(a => a.file))];

    // Patrón: accessor → writer
    for (const sourceFile of allFileAccessors) {
      for (const writerFile of uniqueWriters) {
        if (sourceFile !== writerFile) {
          const forwardConnId = `shared_state_${propName}_${writerFile}_to_${sourceFile}`;
          const backwardConnId = `shared_state_${propName}_${sourceFile}_to_${writerFile}`;

          if (!connections.some(c => c.id === forwardConnId) && !connections.some(c => c.id === backwardConnId)) {
            const sourceAccess = accesses.find(a => a.file === sourceFile);
            const writerAccess = accesses.find(a => a.file === writerFile && a.type === 'write');
            let reason = '';

            if (sourceAccess?.type === 'read') {
              reason = `${sourceFile} reads ${propName} modified by ${writerFile}.`;
            } else if (sourceAccess?.type === 'write') {
              reason = `Both files access ${propName}. ${sourceFile} writes, ${writerFile} writes.`;
            }

            if (reason) {
              connections.push({
                id: backwardConnId,
                type: 'shared_state',
                sourceFile: sourceFile,
                targetFile: writerFile,
                globalProperty: propName,
                reason,
                confidence: sourceAccess?.type === 'read' ? 0.95 : 1.0,
                severity: calculateSeverity(sourceFile, writerFile, accesses, propName),
                evidence: {
                  sourceAccess: sourceAccess?.access,
                  writerAccess: writerAccess?.access
                }
              });
            }
          }
        }
      }
    }
  }

  return connections;
}