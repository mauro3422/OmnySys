/**
 * @fileoverview Connection Tools
 * 
 * Herramientas para análisis de conexiones entre archivos
 * 
 * @module unified-server/tools/connection-tools
 */

import { getAllConnections } from '../../../layer-a-static/query/index.js';

/**
 * Explica la conexión entre dos archivos
 * @param {string} fileA - Primer archivo
 * @param {string} fileB - Segundo archivo
 * @returns {Promise<Object>} - Explicación de conexión
 */
export async function explainConnection(fileA, fileB) {
  try {
    const connections = this.cache.ramCacheGet('connections') ||
      await getAllConnections(this.projectPath);

    const relevant = connections.sharedState
      ?.filter(
        (c) =>
          (c.sourceFile === fileA && c.targetFile === fileB) ||
          (c.sourceFile === fileB && c.targetFile === fileA)
      )
      .slice(0, 5);

    if (!relevant || relevant.length === 0) {
      return { fileA, fileB, connected: false, reason: 'No direct connections found' };
    }

    return {
      fileA,
      fileB,
      connected: true,
      connections: relevant.map((c) => ({
        type: c.type,
        property: c.globalProperty,
        reason: c.reason,
        severity: c.severity
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}
