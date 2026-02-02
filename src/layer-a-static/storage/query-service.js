import fs from 'fs/promises';
import path from 'path';
import { getAverPath } from './storage-manager.js';

/**
 * Query Service - API eficiente para consultar datos particionados
 *
 * Ventajas:
 * - Solo carga los datos necesarios (no todo el system map)
 * - Queries rápidos para archivos individuales
 * - Cacheable en memoria si es necesario
 */

/**
 * Lee un archivo JSON de forma segura
 */
async function readJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

/**
 * Obtiene metadata global del proyecto
 *
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>} - Metadata + file index
 */
export async function getProjectMetadata(rootPath) {
  const averPath = getAverPath(rootPath);
  const indexPath = path.join(averPath, 'index.json');

  return await readJSON(indexPath);
}

/**
 * Obtiene el análisis completo de un archivo específico
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo (ej: 'src/UI.js')
 * @returns {Promise<object>} - Datos completos del archivo
 */
export async function getFileAnalysis(rootPath, filePath) {
  const averPath = getAverPath(rootPath);

  // Construir ruta al archivo particionado
  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);
  const targetPath = path.join(averPath, 'files', fileDir, `${fileName}.json`);

  return await readJSON(targetPath);
}

/**
 * Obtiene múltiples archivos de forma eficiente
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {array} filePaths - Array de rutas relativas
 * @returns {Promise<object>} - Mapa de filePath -> fileData
 */
export async function getMultipleFiles(rootPath, filePaths) {
  const results = {};

  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        results[filePath] = await getFileAnalysis(rootPath, filePath);
      } catch (error) {
        console.warn(`Warning: Could not load ${filePath}: ${error.message}`);
      }
    })
  );

  return results;
}

/**
 * Obtiene las dependencias de un archivo (usedBy + dependsOn)
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {Promise<object>} - { dependsOn: [], usedBy: [] }
 */
export async function getFileDependencies(rootPath, filePath) {
  const fileData = await getFileAnalysis(rootPath, filePath);

  return {
    dependsOn: fileData.dependsOn || [],
    usedBy: fileData.usedBy || [],
    transitiveDepends: fileData.transitiveDepends || [],
    transitiveDependents: fileData.transitiveDependents || []
  };
}

/**
 * Obtiene las conexiones semánticas de un archivo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo (opcional)
 * @returns {Promise<array|object>} - Conexiones del archivo o todas las conexiones
 */
export async function getSemanticConnections(rootPath, filePath = null) {
  if (filePath) {
    // Obtener conexiones de un archivo específico
    const fileData = await getFileAnalysis(rootPath, filePath);
    return fileData.semanticConnections || [];
  } else {
    // Obtener todas las conexiones del proyecto
    const averPath = getAverPath(rootPath);
    const sharedStatePath = path.join(averPath, 'connections', 'shared-state.json');
    const eventListenersPath = path.join(averPath, 'connections', 'event-listeners.json');

    const [sharedState, eventListeners] = await Promise.all([
      readJSON(sharedStatePath),
      readJSON(eventListenersPath)
    ]);

    return {
      sharedState: sharedState.connections,
      eventListeners: eventListeners.connections,
      total: sharedState.total + eventListeners.total
    };
  }
}

/**
 * Obtiene todas las conexiones (shared state + event listeners)
 *
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>} - { sharedState: [], eventListeners: [], total: number }
 */
export async function getAllConnections(rootPath) {
  return await getSemanticConnections(rootPath, null);
}

/**
 * Obtiene el risk assessment completo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>} - Risk assessment con scores y report
 */
export async function getRiskAssessment(rootPath) {
  const averPath = getAverPath(rootPath);
  const assessmentPath = path.join(averPath, 'risks', 'assessment.json');

  return await readJSON(assessmentPath);
}

/**
 * Obtiene archivos de alto riesgo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} minSeverity - Severidad mínima: 'low', 'medium', 'high', 'critical'
 * @returns {Promise<array>} - Array de archivos de alto riesgo
 */
export async function getHighRiskFiles(rootPath, minSeverity = 'high') {
  const assessment = await getRiskAssessment(rootPath);
  const report = assessment.report;

  const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  const minLevel = severityOrder[minSeverity];

  const highRiskFiles = [];

  // Agregar archivos críticos
  if (minLevel <= 3) {
    highRiskFiles.push(...(report.highRiskFiles || []));
  }

  // Agregar archivos de riesgo medio si minSeverity lo permite
  if (minLevel <= 2) {
    highRiskFiles.push(...(report.mediumRiskFiles || []));
  }

  return highRiskFiles;
}

/**
 * Busca archivos por patrón de ruta
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string|RegExp} pattern - Patrón de búsqueda
 * @returns {Promise<array>} - Array de rutas que coinciden
 */
export async function findFiles(rootPath, pattern) {
  const metadata = await getProjectMetadata(rootPath);
  const allFiles = Object.keys(metadata.fileIndex);

  if (typeof pattern === 'string') {
    return allFiles.filter(f => f.includes(pattern));
  } else if (pattern instanceof RegExp) {
    return allFiles.filter(f => pattern.test(f));
  }

  return allFiles;
}

/**
 * Obtiene estadísticas resumidas del proyecto
 *
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>} - Estadísticas del proyecto
 */
export async function getProjectStats(rootPath) {
  const [metadata, connections, assessment] = await Promise.all([
    getProjectMetadata(rootPath),
    getAllConnections(rootPath),
    getRiskAssessment(rootPath)
  ]);

  return {
    totalFiles: metadata.metadata.totalFiles,
    totalDependencies: metadata.metadata.totalDependencies,
    totalFunctions: metadata.metadata.totalFunctions,
    totalSemanticConnections: connections.total,
    sharedStateConnections: connections.sharedState.length,
    eventListenerConnections: connections.eventListeners.length,
    highRiskFiles: assessment.report.summary.highCount,
    mediumRiskFiles: assessment.report.summary.mediumCount,
    averageRiskScore: assessment.report.summary.averageScore,
    analyzedAt: metadata.metadata.analyzedAt
  };
}

/**
 * Reconstruye el enhanced system map completo desde datos particionados
 * (Solo para compatibilidad - no recomendado para proyectos grandes)
 *
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>} - Enhanced system map completo
 */
export async function reconstructFullSystemMap(rootPath) {
  const [metadata, connections, assessment] = await Promise.all([
    getProjectMetadata(rootPath),
    getAllConnections(rootPath),
    getRiskAssessment(rootPath)
  ]);

  // Cargar todos los archivos
  const allFilePaths = Object.keys(metadata.fileIndex);
  const files = await getMultipleFiles(rootPath, allFilePaths);

  return {
    metadata: metadata.metadata,
    files: files,
    connections: {
      sharedState: connections.sharedState,
      eventListeners: connections.eventListeners,
      total: connections.total
    },
    riskAssessment: assessment
  };
}
