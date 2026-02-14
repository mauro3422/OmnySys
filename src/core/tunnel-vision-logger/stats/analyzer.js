/**
 * @fileoverview analyzer.js
 * 
 * Pattern analysis and recommendations
 * 
 * @module core/tunnel-vision-logger/stats/analyzer
 */

import path from 'path';
import { readAllEvents } from '../events/logger.js';
import { loadStats } from './calculator.js';

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

  // Análisis 4: Tasa de false positives
  const eventsWithAction = events.filter(e => e.context?.userAction !== 'unknown');
  const ignoredCount = eventsWithAction.filter(e => e.context?.userAction === 'ignored').length;
  const eventsWithActionLength = eventsWithAction.length;
  const falsePositiveRate = eventsWithActionLength > 0
    ? (ignoredCount / eventsWithActionLength * 100).toFixed(2)
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
