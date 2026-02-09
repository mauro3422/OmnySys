/**
 * @fileoverview Tunnel Vision Logger
 *
 * Recolecta y almacena eventos de tunnel vision detectados
 * para análisis posterior y entrenamiento de Artificial Intuition.
 *
 * DATOS RECOLECTADOS:
 * - Qué archivo se modificó
 * - Qué archivos dependientes NO se modificaron
 * - Severidad del riesgo
 * - Si el usuario hizo caso o ignoró la alerta
 * - Tiempo de resolución
 *
 * @module core/tunnel-vision-logger
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Ruta del log de eventos de tunnel vision
 */
const TUNNEL_VISION_LOG = path.join(
  PROJECT_ROOT,
  '.omnysysdata',
  'tunnel-vision-events.jsonl'
);

/**
 * Ruta del resumen de estadísticas
 */
const TUNNEL_VISION_STATS = path.join(
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:tunnel:vision:logger');


  PROJECT_ROOT,
  '.omnysysdata',
  'tunnel-vision-stats.json'
);

/**
 * Guarda un evento de tunnel vision detectado
 *
 * Formato JSONL (JSON Lines): cada línea es un JSON completo
 * Esto permite append eficiente y procesamiento stream
 */
export async function logTunnelVisionEvent(alert, context = {}) {
  try {
    // Enriquecer alerta con contexto adicional
    const event = {
      ...alert,
      context: {
        sessionId: context.sessionId || generateSessionId(),
        userAction: context.userAction || 'unknown', // 'reviewed', 'ignored', 'committed_anyway'
        timeToResolve: context.timeToResolve || null,
        preventedBug: context.preventedBug || null, // true/false/null (desconocido)
        ...context
      },
      loggedAt: new Date().toISOString()
    };

    // Append al archivo JSONL
    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(TUNNEL_VISION_LOG, line, 'utf-8');

    // Actualizar estadísticas
    await updateStats(event);

    return event;
  } catch (error) {
    logger.error('[TunnelVisionLogger] Error logging event:', error.message);
    return null;
  }
}

/**
 * Actualiza las estadísticas agregadas
 */
async function updateStats(event) {
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
 * Carga estadísticas o crea nuevas si no existen
 */
async function loadStats() {
  try {
    const content = await fs.readFile(TUNNEL_VISION_STATS, 'utf-8');
    return JSON.parse(content);
  } catch {
    // No existe, crear nuevo
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
 * Lee todos los eventos de tunnel vision
 */
export async function readAllEvents(options = {}) {
  try {
    const content = await fs.readFile(TUNNEL_VISION_LOG, 'utf-8');
    const lines = content.trim().split('\n');

    let events = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Filtros
    if (options.severity) {
      events = events.filter(e => e.severity === options.severity);
    }

    if (options.since) {
      const sinceDate = new Date(options.since);
      events = events.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    if (options.limit) {
      events = events.slice(-options.limit); // Últimos N
    }

    return events;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // No hay eventos aún
    }
    throw error;
  }
}

/**
 * Obtiene estadísticas de tunnel vision
 */
export async function getStats() {
  return await loadStats();
}

/**
 * Analiza eventos para encontrar patrones
 * (útil para Artificial Intuition)
 */
export async function analyzePatterns() {
  const events = await readAllEvents();

  if (events.length === 0) {
    return {
      patterns: [],
      insights: 'No hay suficientes datos para análisis'
    };
  }

  // Análisis 1: Qué tipos de cambios causan más tunnel vision
  const changeTypeFrequency = {};
  events.forEach(event => {
    const file = event.modifiedFile;
    const ext = path.extname(file);
    changeTypeFrequency[ext] = (changeTypeFrequency[ext] || 0) + 1;
  });

  // Análisis 2: Qué severidades son más comunes
  const stats = await loadStats();

  // Análisis 3: Archivos más problemáticos
  const problematicFiles = Object.entries(stats.mostFrequentFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  // Análisis 4: Tasa de false positives (si tenemos userAction)
  const eventsWithAction = events.filter(e => e.context?.userAction !== 'unknown');
  const ignoredCount = eventsWithAction.filter(e => e.context?.userAction === 'ignored').length;
  const reviewedCount = eventsWithAction.filter(e => e.context?.userAction === 'reviewed').length;
  const falsePositiveRate = eventsWithAction.length > 0
    ? (ignoredCount / eventsWithAction.length * 100).toFixed(2)
    : 'N/A';

  // Análisis 5: Impacto (bugs prevenidos)
  const preventedBugs = events.filter(e => e.context?.preventedBug === true).length;

  return {
    summary: {
      totalEvents: events.length,
      avgAffectedFiles: stats.avgAffectedFiles.toFixed(1),
      falsePositiveRate: falsePositiveRate + '%',
      bugsPrevent: preventedBugs
    },
    patterns: {
      byExtension: changeTypeFrequency,
      bySeverity: stats.eventsBySeverity,
      problematicFiles
    },
    insights: [
      `Detectados ${events.length} casos de tunnel vision`,
      `Promedio de ${stats.avgAffectedFiles.toFixed(1)} archivos afectados por caso`,
      preventedBugs > 0
        ? `Prevenidos ${preventedBugs} bugs potenciales`
        : 'No hay datos de bugs prevenidos aún'
    ],
    recommendations: generateRecommendations(stats, events)
  };
}

/**
 * Genera recomendaciones basadas en patrones detectados
 */
function generateRecommendations(stats, events) {
  const recommendations = [];

  // Si hay archivos muy frecuentes, sugerir refactor
  const topFiles = Object.entries(stats.mostFrequentFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topFiles.length > 0 && topFiles[0][1] > 5) {
    recommendations.push({
      type: 'refactor',
      priority: 'high',
      message: `Archivo ${topFiles[0][0]} tiene ${topFiles[0][1]} casos de tunnel vision - considerar refactoring para reducir acoplamiento`
    });
  }

  // Si hay muchos CRITICAL, sugerir review process
  if (stats.eventsBySeverity.CRITICAL > stats.totalEvents * 0.3) {
    recommendations.push({
      type: 'process',
      priority: 'high',
      message: 'Alto porcentaje de casos CRITICAL - considerar agregar code review obligatorio'
    });
  }

  // Si avgAffectedFiles es muy alto, sugerir modularización
  if (stats.avgAffectedFiles > 7) {
    recommendations.push({
      type: 'architecture',
      priority: 'medium',
      message: `Promedio de ${stats.avgAffectedFiles.toFixed(1)} archivos afectados - considerar mejor separación de responsabilidades`
    });
  }

  return recommendations;
}

/**
 * Genera un session ID único para trackear sesiones
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Exporta eventos a CSV para análisis externo
 */
export async function exportToCSV(outputPath) {
  const events = await readAllEvents();

  if (events.length === 0) {
    throw new Error('No hay eventos para exportar');
  }

  // Header CSV
  const headers = [
    'timestamp',
    'severity',
    'modifiedFile',
    'totalAffected',
    'unmodified',
    'hasExports',
    'exportCount',
    'riskLevel',
    'userAction',
    'preventedBug'
  ].join(',');

  // Rows
  const rows = events.map(event => {
    return [
      event.timestamp,
      event.severity,
      `"${event.modifiedFile}"`,
      event.affectedFiles.total,
      event.affectedFiles.unmodified,
      event.metadata.hasExports,
      event.metadata.exportCount,
      event.metadata.riskLevel,
      event.context?.userAction || 'unknown',
      event.context?.preventedBug !== null ? event.context.preventedBug : ''
    ].join(',');
  });

  const csv = [headers, ...rows].join('\n');

  await fs.writeFile(outputPath, csv, 'utf-8');

  return {
    exported: events.length,
    path: outputPath
  };
}
