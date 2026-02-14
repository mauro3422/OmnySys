/**
 * @fileoverview calculator.js
 * 
 * Statistics calculation and management
 * 
 * @module core/tunnel-vision-logger/stats/calculator
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { TUNNEL_VISION_STATS } from '../storage/paths.js';

const logger = createLogger('OmnySys:tunnel:vision:logger');

/**
 * Carga estadísticas o crea nuevas si no existen
 */
export async function loadStats() {
  try {
    const content = await fs.readFile(TUNNEL_VISION_STATS, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      totalEvents: 0,
      eventsBySeverity: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      },
      avgAffectedFiles: 0,
      mostFrequentFiles: {},
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}

/**
 * Actualiza las estadísticas agregadas
 */
export async function updateStats(event) {
  try {
    let stats = await loadStats();

    // Incrementar contadores
    stats.totalEvents++;
    stats.eventsBySeverity[event.severity] =
      (stats.eventsBySeverity[event.severity] || 0) + 1;

    // Promedios
    stats.avgAffectedFiles =
      (stats.avgAffectedFiles * (stats.totalEvents - 1) +
        event.affectedFiles.unmodified) /
      stats.totalEvents;

    // Archivos más frecuentes
    if (!stats.mostFrequentFiles[event.modifiedFile]) {
      stats.mostFrequentFiles[event.modifiedFile] = 0;
    }
    stats.mostFrequentFiles[event.modifiedFile]++;

    // Última actualización
    stats.lastUpdated = new Date().toISOString();

    // Guardar
    await fs.writeFile(TUNNEL_VISION_STATS, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (error) {
    logger.error('[TunnelVisionLogger] Error updating stats:', error.message);
  }
}

/**
 * Obtiene estadísticas de tunnel vision
 */
export async function getStats() {
  return await loadStats();
}
