import fs from 'fs/promises';
import path from 'path';
import { readJSON, fileExists } from './readers/json-reader.js';
import { getDataDirectory } from '../storage/storage-manager/index.js';

/**
 * Exporta el sistema completo a un archivo JSON unificado
 *
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} [outputPath] - Ruta de salida (opcional)
 * @returns {Promise<{filePath: string, sizeKB: number, filesExported: number}>}
 */
export async function exportFullSystemMapToFile(projectPath, outputPath = null) {
  const dataPath = getDataDirectory(projectPath);

  const outputFilePath = outputPath || path.join(dataPath, 'debug', 'system-map-full.json');

  await fs.mkdir(path.dirname(outputFilePath), { recursive: true });

  const indexData = await readJSON(path.join(dataPath, 'index.json'));

  const filesDir = path.join(dataPath, 'files');

  const files = {};

  const analyzedFiles = Object.keys(indexData.fileIndex || {});

  for (const file of analyzedFiles) {
    const fileJsonPath = path.join(filesDir, `${file}.json`);
    if (await fileExists(fileJsonPath)) {
      files[file] = await readJSON(fileJsonPath);
    }
  }

  const connectionsPath = path.join(dataPath, 'connections', 'shared-state.json');
  const connectionsData = await fileExists(connectionsPath)
    ? await readJSON(connectionsPath)
    : { connections: [], total: 0 };

  const eventListenersPath = path.join(dataPath, 'connections', 'event-listeners.json');
  const eventListenersData = await fileExists(eventListenersPath)
    ? await readJSON(eventListenersPath)
    : { connections: [], total: 0 };

  const risksPath = path.join(dataPath, 'risks', 'assessment.json');
  const risksData = await fileExists(risksPath)
    ? await readJSON(risksPath)
    : {};

  const fullSystemMap = {
    metadata: indexData.metadata,
    files: files,
    connections: {
      sharedState: connectionsData.connections,
      eventListeners: eventListenersData.connections,
      total: connectionsData.total + eventListenersData.total
    },
    risks: risksData,
    exportedAt: new Date().toISOString()
  };

  const jsonContent = JSON.stringify(fullSystemMap, null, 2);
  await fs.writeFile(outputFilePath, jsonContent, 'utf-8');

  const stats = await fs.stat(outputFilePath);

  return {
    filePath: outputFilePath,
    sizeKB: (stats.size / 1024).toFixed(2),
    filesExported: Object.keys(files).length
  };
}
