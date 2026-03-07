import fs from 'fs/promises';
import path from 'path';
import { readJSON, fileExists } from './readers/json-reader.js';
import { getDataDirectory } from '#layer-c/storage/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import {
  getSemanticSurfaceGranularity,
  getSystemMapPersistenceCoverage,
  shouldTrustSystemMapDependencies
} from '../../shared/compiler/index.js';

function buildSQLiteExport(repo) {
  const systemMapCoverage = getSystemMapPersistenceCoverage(repo.db);
  const trustSystemMapDeps = shouldTrustSystemMapDependencies(systemMapCoverage);
  const semanticSurface = getSemanticSurfaceGranularity(repo.db);
  const atoms = repo.db.prepare('SELECT * FROM atoms LIMIT 10000').all();
  const files = repo.db.prepare('SELECT * FROM system_files').all();
  const risks = repo.db.prepare('SELECT * FROM risk_assessments').all();
  const dependencies = trustSystemMapDeps
    ? repo.db.prepare('SELECT * FROM file_dependencies').all()
    : [];

  return {
    source: 'sqlite',
    metadata: {
      exportedAt: new Date().toISOString(),
      totalAtoms: atoms.length,
      totalFiles: files.length,
      totalConnections: semanticSurface.fileLevel.total,
      totalRisks: risks.length,
      systemMapCoverage,
      semanticSurfaceGranularity: semanticSurface.contract
    },
    atoms: atoms.slice(0, 100),
    files: files.slice(0, 50),
    connections: {
      sharedState: semanticSurface.legacyView.sharedState,
      eventListeners: semanticSurface.legacyView.eventListeners,
      semanticByType: semanticSurface.fileLevel.byType,
      granularity: semanticSurface.contract,
      total: semanticSurface.legacyView.total
    },
    risks: risks.slice(0, 20),
    dependencies: dependencies.slice(0, 50),
    exportedAt: new Date().toISOString()
  };
}

async function buildLegacyFileMap(filesDir, analyzedFiles) {
  const files = {};

  for (const file of analyzedFiles) {
    const fileJsonPath = path.join(filesDir, `${file}.json`);
    if (await fileExists(fileJsonPath)) {
      files[file] = await readJSON(fileJsonPath);
    }
  }

  return files;
}

async function readLegacyConnectionData(dataPath, fileName) {
  const filePath = path.join(dataPath, 'connections', fileName);
  if (!(await fileExists(filePath))) {
    return { connections: [], total: 0 };
  }

  return readJSON(filePath);
}

async function buildLegacyExport(dataPath) {
  const indexData = await readJSON(path.join(dataPath, 'index.json'));
  const filesDir = path.join(dataPath, 'files');
  const analyzedFiles = Object.keys(indexData.fileIndex || {});
  const files = await buildLegacyFileMap(filesDir, analyzedFiles);
  const sharedStateData = await readLegacyConnectionData(dataPath, 'shared-state.json');
  const eventListenerData = await readLegacyConnectionData(dataPath, 'event-listeners.json');
  const risksPath = path.join(dataPath, 'risks', 'assessment.json');
  const risksData = await fileExists(risksPath)
    ? await readJSON(risksPath)
    : {};

  return {
    source: 'json',
    metadata: indexData.metadata,
    files,
    connections: {
      sharedState: sharedStateData.connections,
      eventListeners: eventListenerData.connections,
      total: sharedStateData.total + eventListenerData.total
    },
    risks: risksData,
    exportedAt: new Date().toISOString()
  };
}

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

  try {
    const repo = getRepository(projectPath);
    if (repo && repo.db) {
      fullSystemMap = buildSQLiteExport(repo);
    }
  } catch (err) {
    console.error(`[exportFullSystemMapToFile] SQLite error: ${err.message}`);
  }

  if (!fullSystemMap) {
    fullSystemMap = await buildLegacyExport(dataPath);
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
