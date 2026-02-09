import fs from 'fs/promises';
import path from 'path';

import { LLMClient } from '../../ai/llm-client.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:helpers');



/**
 * Check if a file has been analyzed
 */
export async function isAnalyzed(filePath) {
  try {
    const fileData = await this._getFileData(filePath);
    return !!fileData;
  } catch {
    return false;
  }
}

/**
 * Get current status
 */
export function getStatus() {
  return {
    isRunning: this.isRunning,
    isIndexing: this.isIndexing,
    indexingProgress: this.indexingProgress,
    currentJob: this.currentJob,
    queueSize: this.queue.size(),
    stats: this.stats,
    uptime: Date.now() - this.startTime
  };
}

export async function _hasExistingAnalysis() {
  try {
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

export async function _getFileData(filePath) {
  // Try to read from .OmnySysData
  try {
    const relativePath = path.relative(this.projectPath, filePath);
    const fileDataPath = path.join(
      this.OmnySysDataPath,
      'files',
      relativePath + '.json'
    );
    const content = await fs.readFile(fileDataPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function _ensureLLMAvailable() {
  try {
    const client = new LLMClient({ llm: { enabled: true } });
    const health = await client.healthCheck();
    return health.gpu || health.cpu;
  } catch {
    return false;
  }
}

export function _calculateChangePriority(change) {
  if (change.changeType === 'deleted') return 'critical';
  if (change.changeType === 'created') return 'high';
  if (change.priority >= 4) return 'critical';
  if (change.priority === 3) return 'high';
  if (change.priority === 2) return 'medium';
  return 'low';
}

/**
 * Sincroniza archivos del proyecto con el análisis existente
 * Agrega archivos nuevos o modificados a la cola
 */
export async function _syncProjectFiles() {
  try {
    // Importar scanner dinámicamente
    const { scanProject } = await import('../../layer-a-static/scanner.js');
    const projectFiles = await scanProject(this.projectPath);

    if (projectFiles.length === 0) return;

    // Obtener lista de archivos ya analizados desde el índice
    const analyzedFiles = new Set();
    try {
      const indexPath = path.join(this.OmnySysDataPath, 'index.json');
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);
      for (const file of index.files || []) {
        analyzedFiles.add(file.filePath);
      }
    } catch {
      // No hay índice, todos los archivos son nuevos
    }

    // Normalizar rutas del proyecto (scanProject ya devuelve rutas relativas)
    const normalizedProjectFiles = projectFiles.map(file =>
      path.relative(this.projectPath, path.resolve(this.projectPath, file)).replace(/\\/g, '/')
    );

    // Encontrar archivos faltantes
    const missingFiles = normalizedProjectFiles.filter(filePath => {
      return !analyzedFiles.has(filePath);
    });

    if (missingFiles.length > 0) {
      logger.info(`ðŸ“‹ Found ${missingFiles.length} new files to analyze`);

      // Agregar a la cola con prioridad baja
      for (const filePath of missingFiles) {
        this.queue.enqueue(filePath, 'low');
        this.stats.totalQueued++;
      }

      logger.info(`âœ… Added ${missingFiles.length} files to analysis queue`);
    }

    // Reportar estado
    const queueSize = this.queue.size();
    if (queueSize > 0) {
      logger.info(`ðŸ“Š Queue: ${queueSize} files pending analysis`);
    }
  } catch (error) {
    logger.warn('âš ï¸  Failed to sync project files:', error.message);
  }
}
