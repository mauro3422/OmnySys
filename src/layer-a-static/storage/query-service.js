import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { getDataDirectory } from './storage-manager.js';

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
  const dataPath = getDataDirectory(rootPath);
  const indexPath = path.join(dataPath, 'index.json');

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
  const dataPath = getDataDirectory(rootPath);

  // Construir ruta al archivo particionado
  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);
  const targetPath = path.join(dataPath, 'files', fileDir, `${fileName}.json`);

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
    const dataPath = getDataDirectory(rootPath);
    const sharedStatePath = path.join(dataPath, 'connections', 'shared-state.json');
    const eventListenersPath = path.join(dataPath, 'connections', 'event-listeners.json');

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
  const dataPath = getDataDirectory(rootPath);
  const assessmentPath = path.join(dataPath, 'risks', 'assessment.json');

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
 * DEPRECADO: reconstructFullSystemMap()
 *
 * Esta función cargaba TODO en memoria - ineficiente y no escalable.
 * En su lugar, usa:
 * - exportFullSystemMapToFile() → para generar un JSON completo en disco (debugging)
 * - getProjectMetadata() → metadata rápida
 * - getFileAnalysis() → archivos individuales bajo demanda
 * - getAllConnections() → conexiones
 * - getRiskAssessment() → evaluación de riesgos
 *
 * @deprecated Use exportFullSystemMapToFile() instead
 */
export async function reconstructFullSystemMap(rootPath) {
  console.warn(
    'WARNING: reconstructFullSystemMap() is deprecated. Use exportFullSystemMapToFile() instead.\n' +
    'This function loads everything into memory, which is inefficient.\n' +
    'Instead, use the partitioned query API: getProjectMetadata(), getFileAnalysis(), etc.'
  );

  throw new Error(
    'reconstructFullSystemMap() has been deprecated to prevent memory overflow.\n' +
    'Use exportFullSystemMapToFile(rootPath, outputPath) to export a complete system map to disk.\n' +
    'This is a debug-only function - for normal usage, query individual components.'
  );
}

/**
 * Exporta el enhanced system map COMPLETO a un archivo JSON (DEBUG ONLY)
 *
 * Esta función escribe el system map COMPLETO a un archivo sin cargar TODO en memoria.
 * Usa un enfoque de escritura progresiva (streaming) para evitar sobrecarga.
 *
 * ⚠️ IMPORTANTE: Este es un archivo de DEBUG - puede ser muy grande
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} outputPath - Ruta donde guardar el JSON (ej: '.OmnySystemData/debug/system-map-full.json')
 * @returns {Promise<object>} - { success: true, filePath: string, sizeKB: number, filesExported: number }
 */
export async function exportFullSystemMapToFile(rootPath, outputPath = null) {
  // Ruta por defecto: .OmnySystemData/debug/system-map-full.json
  if (!outputPath) {
    const dataPath = getDataDirectory(rootPath);
    const debugPath = path.join(dataPath, 'debug');
    await fs.mkdir(debugPath, { recursive: true });
    outputPath = path.join(debugPath, 'system-map-full.json');
  }

  // Crear directorio si no existe
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  // Leer metadata
  const metadata = await getProjectMetadata(rootPath);
  const allFilePaths = Object.keys(metadata.fileIndex);

  // Abrir stream de escritura
  const writeStream = createWriteStream(outputPath, { encoding: 'utf8' });

  return new Promise((resolve, reject) => {
    writeStream.on('error', reject);

    // Escribir inicio del JSON
    writeStream.write('{\n  "metadata": ');
    writeStream.write(JSON.stringify(metadata.metadata, null, 2));
    writeStream.write(',\n\n  "files": {\n');

    // Escribir archivos conforme se cargan (NO todo en memoria)
    (async () => {
      try {
        let fileCount = 0;
        const totalFiles = allFilePaths.length;

        for (const filePath of allFilePaths) {
          try {
            const fileData = await getFileAnalysis(rootPath, filePath);

            // Escribir coma separadora (excepto para el primero)
            if (fileCount > 0) {
              writeStream.write(',\n');
            }

            writeStream.write(`    "${filePath}": `);
            writeStream.write(JSON.stringify(fileData, null, 2).replace(/\n/g, '\n    '));

            fileCount++;

            // Log de progreso cada 10 archivos
            if (fileCount % 10 === 0) {
              console.log(`  Exported ${fileCount}/${totalFiles} files...`);
            }
          } catch (error) {
            console.warn(`  Warning: Could not export ${filePath}: ${error.message}`);
          }
        }

        // Escribir cierre de files
        writeStream.write('\n  },\n\n  "connections": ');

        // Escribir conexiones
        const connections = await getAllConnections(rootPath);
        writeStream.write(JSON.stringify(connections, null, 2).replace(/\n/g, '\n  '));

        // Escribir risk assessment
        writeStream.write(',\n\n  "riskAssessment": ');
        const assessment = await getRiskAssessment(rootPath);
        writeStream.write(JSON.stringify(assessment, null, 2).replace(/\n/g, '\n  '));

        // Escribir cierre del JSON
        writeStream.write('\n}\n');

        // Finalizar stream
        writeStream.end();

        // Obtener tamaño del archivo
        writeStream.on('finish', async () => {
          try {
            const stats = await fs.stat(outputPath);
            const sizeKB = Math.round(stats.size / 1024);

            resolve({
              success: true,
              filePath: outputPath,
              sizeKB: sizeKB,
              filesExported: fileCount,
              message: `System map exported: ${sizeKB} KB (${fileCount} files)`
            });
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        writeStream.destroy();
        reject(error);
      }
    })();
  });
}
