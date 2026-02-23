import fs from 'fs/promises';
import path from 'path';
import { readJSON, fileExists } from './readers/json-reader.js';
import { getDataDirectory } from '#layer-c/storage/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

/**
 * Exporta el sistema completo a un archivo JSON unificado
 * MIGRADO: Puede exportar desde SQLite o JSON legacy
 *
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} [outputPath] - Ruta de salida (opcional)
 * @returns {Promise<{filePath: string, sizeKB: number, filesExported: number}>}
 */
export async function exportFullSystemMapToFile(projectPath, outputPath = null) {
  const dataPath = getDataDirectory(projectPath);
  const outputFilePath = outputPath || path.join(dataPath, 'debug', 'system-map-full.json');

  await fs.mkdir(path.dirname(outputFilePath), { recursive: true });

  let fullSystemMap;
  
  // PRIORIDAD: SQLite si está disponible
  try {
    const repo = getRepository(projectPath);
    if (repo && repo.db) {
      // Export from SQLite
      const atoms = repo.db.prepare('SELECT * FROM atoms LIMIT 10000').all();
      const files = repo.db.prepare('SELECT * FROM system_files').all();
      const connections = repo.db.prepare('SELECT * FROM semantic_connections').all();
      const risks = repo.db.prepare('SELECT * FROM risk_assessments').all();
      const deps = repo.db.prepare('SELECT * FROM file_dependencies').all();
      
      fullSystemMap = {
        source: 'sqlite',
        metadata: {
          exportedAt: new Date().toISOString(),
          totalAtoms: atoms.length,
          totalFiles: files.length,
          totalConnections: connections.length,
          totalRisks: risks.length
        },
        atoms: atoms.slice(0, 100), // Sample for export
        files: files.slice(0, 50),
        connections: {
          sharedState: connections.filter(c => c.connection_type === 'sharedState'),
          eventListeners: connections.filter(c => c.connection_type === 'eventListeners'),
          total: connections.length
        },
        risks: risks.slice(0, 20),
        dependencies: deps.slice(0, 50),
        exportedAt: new Date().toISOString()
      };
    }
  } catch (err) {
    console.error(`[exportFullSystemMapToFile] SQLite error: ${err.message}`);
  }
  
  // Fallback: JSON legacy
  if (!fullSystemMap) {
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
    fullSystemMap = {
      source: 'json',
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
  }

  const jsonContent = JSON.stringify(fullSystemMap, null, 2);
  await fs.writeFile(outputFilePath, jsonContent, 'utf-8');

  const stats = await fs.stat(outputFilePath);

  return {
    filePath: outputFilePath,
    sizeKB: (stats.size / 1024).toFixed(2),
    filesExported: fullSystemMap.files?.length || 0
  };
}
