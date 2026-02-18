import { calculateFileHash } from '../utils/hash.js';
import { saveMetadata } from './metadata.js';
import { saveFileAnalysis } from './file-analysis.js';
import { saveConnections } from './connections.js';
import { saveRiskAssessment } from './risks.js';

/**
 * Guarda el system map completo (particionado)
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {object} systemMap - Enhanced system map completo
 * @returns {object} - Rutas de todos los archivos guardados
 */
export async function savePartitionedSystemMap(rootPath, systemMap) {
  const savedPaths = {
    metadata: null,
    files: [],
    connections: null,
    risks: null
  };

  // 1. Crear file index (metadata ligera por archivo)
  const fileIndex = {};
  for (const [filePath, fileData] of Object.entries(systemMap.files || {})) {
    fileIndex[filePath] = {
      hash: calculateFileHash(filePath),
      exports: fileData.exports?.length || 0,
      imports: fileData.imports?.length || 0,
      semanticConnections: fileData.semanticConnections?.length || 0,
      riskLevel: fileData.riskScore?.severity || 'low',
      lastAnalyzed: new Date().toISOString()
    };
  }

  // 2. Guardar metadata + índice
  savedPaths.metadata = await saveMetadata(rootPath, systemMap.metadata, fileIndex);

  // 3. Guardar cada archivo individual
  for (const [filePath, fileData] of Object.entries(systemMap.files || {})) {
    const savedPath = await saveFileAnalysis(rootPath, filePath, fileData);
    savedPaths.files.push(savedPath);
  }

  // 4. Guardar conexiones
  savedPaths.connections = await saveConnections(
    rootPath,
    systemMap.connections?.sharedState || [],
    systemMap.connections?.eventListeners || []
  );

  // 5. Guardar risk assessment
  savedPaths.risks = await saveRiskAssessment(rootPath, systemMap.riskAssessment || {});

  return savedPaths;
}
