/**
 * @fileoverview connection-sync.js
 * 
 * Sincroniza conexiones semánticas con el campo usedBy de archivos
 * Resuelve el desfase entre connections/ y files/ (SSOT violation)
 * 
 * @module verification/validators/connection-sync
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:verification:connection-sync');

/**
 * Sincroniza todas las conexiones semánticas con usedBy
 * @param {string} projectPath - Raíz del proyecto
 * @param {boolean} dryRun - Solo reportar, no modificar
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
export async function syncConnectionsToUsedBy(projectPath, dryRun = false) {
  logger.info(`🔄 Synchronizing semantic connections to usedBy...`);

  const dataDir = path.join(projectPath, '.omnysysdata');
  const filesDir = path.join(dataDir, 'files');
  const connectionsDir = path.join(dataDir, 'connections');

  const stats = {
    filesUpdated: 0,
    connectionsAdded: 0,
    errors: []
  };

  try {
    // 1. Cargar todas las conexiones
    const allConnections = await loadAllConnections(connectionsDir);
    logger.debug(`Loaded ${allConnections.length} connections`);

    // 2. Agrupar conexiones por archivo objetivo (target)
    const connectionsByTarget = {};
    for (const conn of allConnections) {
      const targetFile = normalizeJsonPath(conn.targetFile);
      if (!connectionsByTarget[targetFile]) {
        connectionsByTarget[targetFile] = new Set();
      }
      connectionsByTarget[targetFile].add(normalizeJsonPath(conn.sourceFile));
    }

    // 3. Procesar cada archivo
    const fileEntries = await fs.readdir(filesDir, { withFileTypes: true, recursive: true });
    const fileJsons = fileEntries.filter(e => e.isFile() && e.name.endsWith('.json'));

    for (const entry of fileJsons) {
      const relativePath = path.relative(filesDir, path.join(entry.parentPath || entry.path, entry.name));
      const filePath = relativePath.replace(/\\/g, '/').replace(/\.json$/, '');
      const fullPath = path.join(filesDir, relativePath);

      try {
        // Leer archivo
        const content = await fs.readFile(fullPath, 'utf-8');
        const fileData = JSON.parse(content);

        // Obtener conexiones semánticas para este archivo
        const semanticSources = connectionsByTarget[filePath] || new Set();

        // Obtener usedBy actual
        const currentUsedBy = new Set(fileData.usedBy || []);
        const originalSize = currentUsedBy.size;

        // Agregar conexiones semánticas que faltan
        for (const source of semanticSources) {
          if (!currentUsedBy.has(source)) {
            currentUsedBy.add(source);
            stats.connectionsAdded++;

            if (!dryRun) {
              logger.debug(`Adding ${source} to usedBy of ${filePath}`);
            }
          }
        }

        // Si hay cambios, guardar
        if (currentUsedBy.size > originalSize && !dryRun) {
          fileData.usedBy = Array.from(currentUsedBy).sort();
          await fs.writeFile(fullPath, JSON.stringify(fileData, null, 2));
          stats.filesUpdated++;
        }

      } catch (error) {
        stats.errors.push({ file: filePath, error: error.message });
      }
    }

    logger.info(`✅ Sync complete: ${stats.filesUpdated} files updated, ${stats.connectionsAdded} connections added`);

    return {
      success: stats.errors.length === 0,
      dryRun,
      stats,
      summary: dryRun
        ? `Would update ${stats.filesUpdated} files with ${stats.connectionsAdded} connections`
        : `Updated ${stats.filesUpdated} files with ${stats.connectionsAdded} connections`
    };

  } catch (error) {
    logger.error('Sync failed:', error);
    return {
      success: false,
      error: error.message,
      stats
    };
  }
}

/**
 * Carga todas las conexiones del directorio connections/
 */
async function loadAllConnections(connectionsDir) {
  const connections = [];

  try {
    const entries = await fs.readdir(connectionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const fullPath = path.join(connectionsDir, entry.name);
        const content = await fs.readFile(fullPath, 'utf-8');
        const data = JSON.parse(content);

        if (data.connections && Array.isArray(data.connections)) {
          connections.push(...data.connections);
        }
      }
    }
  } catch (error) {
    logger.warn('Could not load connections:', error.message);
  }

  return connections;
}

/**
 * Normaliza un path para comparación (específico para JSON connections)
 */
function normalizeJsonPath(filePath) {
  if (!filePath) return '';
  return filePath
    .replace(/\\/g, '/')
    .replace(/^\//, '')
    .replace(/\.json$/, '');
}

/**
 * Verifica si la sincronización es necesaria
 */
export async function checkSyncNeeded(projectPath) {
  logger.info('Checking if connection sync is needed...');

  const result = await syncConnectionsToUsedBy(projectPath, true);

  return {
    needed: result.stats.connectionsAdded > 0,
    connectionsToAdd: result.stats.connectionsAdded,
    filesToUpdate: result.stats.filesUpdated
  };
}

export default { syncConnectionsToUsedBy, checkSyncNeeded };
