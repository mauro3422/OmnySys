/**
 * @fileoverview Status Tools
 * 
 * Herramientas para estado y reporting del servidor
 * 
 * @module unified-server/tools/status-tools
 */

import { getProjectMetadata } from '../../../layer-a-static/query/apis/project-api.js';

/**
 * Obtiene estado completo del servidor
 * @returns {Promise<Object>} - Estado completo
 */
export async function getFullStatus() {
  return {
    server: {
      version: '2.0.0',
      initialized: this.initialized,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      ports: this.ports
    },
    orchestrator: {
      status: this.isRunning ? 'running' : 'paused',
      currentJob: this.currentJob,
      queue: this.queue.getAll(),
      stats: this.stats
    },
    project: {
      path: this.projectPath,
      totalFiles: this.metadata?.metadata?.totalFiles || 0,
      totalFunctions: this.metadata?.metadata?.totalFunctions || 0
    },
    cache: this.cache.getCacheStats()
  };
}

/**
 * Obtiene estado de archivos
 * @returns {Promise<Object>} - Estado de archivos
 */
export async function getFilesStatus() {
  try {
    const metadata = await getProjectMetadata(this.projectPath);
    const files = Object.keys(metadata.files || {}).map(filePath => ({
      path: filePath,
      analyzed: true,
      riskScore: metadata.files[filePath].riskScore?.total || 0,
      riskSeverity: metadata.files[filePath].riskScore?.severity || 'low',
      exports: metadata.files[filePath].exports?.length || 0,
      imports: metadata.files[filePath].imports?.length || 0,
      subsystem: metadata.files[filePath].subsystem
    }));

    return { files, total: files.length };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Obtiene información de un archivo específico
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Información del archivo
 */
export async function getFileTool(filePath) {
  try {
    const { getFileAnalysis } = await import('../../../layer-a-static/query/apis/file-api.js');
    const fileData = await getFileAnalysis(this.projectPath, filePath);
    return {
      path: filePath,
      exists: !!fileData,
      analysis: fileData
    };
  } catch (error) {
    return { error: error.message };
  }
}
