/**
 * @fileoverview Connection Generator - Genera conexiones de estado compartido
 */

import { calculateSeverity } from '../utils/index.js';

function isEventProperty(propName) {
  const lowerName = propName.toLowerCase();
  return lowerName.includes('bus') || lowerName.includes('emitter') || lowerName.includes('event');
}

function buildPropertyIndex(fileAnalysisMap) {
  const propertyIndex = new Map();

  for (const [filePath, analysis] of Object.entries(fileAnalysisMap)) {
    if (!analysis?.globalAccess?.length) {
      continue;
    }

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

  return propertyIndex;
}

function buildAccessMetadata(accesses) {
  const accessByFile = new Map();
  const writerFileSet = new Set();

  for (const accessEntry of accesses) {
    if (!accessByFile.has(accessEntry.file)) {
      accessByFile.set(accessEntry.file, accessEntry);
    }

    if (accessEntry.type === 'write') {
      writerFileSet.add(accessEntry.file);
    }
  }

  return {
    accessByFile,
    allFileAccessors: [...accessByFile.keys()],
    writerFiles: [...writerFileSet]
  };
}

function buildConnectionReason(sourceFile, sourceAccess, propName, writerFile) {
  if (sourceAccess?.type === 'read') {
    return `${sourceFile} reads ${propName} modified by ${writerFile}.`;
  }

  if (sourceAccess?.type === 'write') {
    return `Both files access ${propName}. ${sourceFile} writes, ${writerFile} writes.`;
  }

  return '';
}

function createSharedStateConnection({ propName, sourceFile, writerFile, accesses, sourceAccess, writerAccess }) {
  return {
    id: `shared_state_${propName}_${sourceFile}_to_${writerFile}`,
    type: 'shared_state',
    sourceFile,
    targetFile: writerFile,
    globalProperty: propName,
    reason: buildConnectionReason(sourceFile, sourceAccess, propName, writerFile),
    confidence: sourceAccess?.type === 'read' ? 0.95 : 1.0,
    severity: calculateSeverity(sourceFile, writerFile, accesses, propName),
    evidence: {
      sourceAccess: sourceAccess?.access,
      writerAccess: writerAccess?.access
    }
  };
}

function collectPropertyConnections(propName, accesses, seenConnectionIds) {
  if (isEventProperty(propName)) {
    return [];
  }

  const { accessByFile, allFileAccessors, writerFiles } = buildAccessMetadata(accesses);
  if (allFileAccessors.length < 2 || writerFiles.length === 0) {
    return [];
  }

  const propertyConnections = [];

  for (const sourceFile of allFileAccessors) {
    const sourceAccess = accessByFile.get(sourceFile);

    for (const writerFile of writerFiles) {
      if (sourceFile === writerFile) {
        continue;
      }

      const forwardConnId = `shared_state_${propName}_${writerFile}_to_${sourceFile}`;
      if (seenConnectionIds.has(forwardConnId)) {
        continue;
      }

      const writerAccess = accessByFile.get(writerFile);
      const connection = createSharedStateConnection({
        propName,
        sourceFile,
        writerFile,
        accesses,
        sourceAccess,
        writerAccess
      });

      if (!connection.reason) {
        continue;
      }

      propertyConnections.push(connection);
      seenConnectionIds.add(connection.id);
    }
  }

  return propertyConnections;
}

/**
 * Genera conexiones semánticas de estado compartido
 * @param {Object} fileAnalysisMap - Mapa de filePath -> análisis
 * @returns {Array} - Array de conexiones semánticas
 */
export function generateSharedStateConnections(fileAnalysisMap) {
  const connections = [];
  const propertyIndex = buildPropertyIndex(fileAnalysisMap);
  const seenConnectionIds = new Set();

  for (const [propName, accesses] of propertyIndex.entries()) {
    connections.push(...collectPropertyConnections(propName, accesses, seenConnectionIds));
  }

  return connections;
}
