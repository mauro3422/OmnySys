/**
 * @fileoverview Pattern Analyzer
 * 
 * Single Responsibility: Analyze tunnel vision patterns
 * 
 * @module tunnel-vision-logger/analysis/pattern-analyzer
 */

import path from 'path';
import { readAllEvents } from '../events/event-logger.js';
import { loadStats } from '../stats/stats-manager.js';

/**
 * Analyze patterns in tunnel vision events
 * @returns {Promise<Object>} Pattern analysis
 */
export async function analyzePatterns() {
  const events = await readAllEvents();

  if (events.length === 0) {
    return {
      patterns: [],
      insights: 'No hay suficientes datos para análisis'
    };
  }

  const stats = await loadStats();
  
  return {
    summary: calculateSummary(events, stats),
    patterns: {
      byExtension: analyzeByExtension(events),
      bySeverity: stats.eventsBySeverity,
      problematicFiles: getProblematicFiles(stats)
    },
    insights: generateInsights(events, stats),
    recommendations: generateRecommendations(stats, events)
  };
}

/**
 * Calculate summary statistics
 */
function calculateSummary(events, stats) {
  const eventsWithAction = events.filter(e => e.context?.userAction !== 'unknown');
  const ignoredCount = eventsWithAction.filter(e => e.context?.userAction === 'ignored').length;
  const preventedBugs = events.filter(e => e.context?.preventedBug === true).length;

  return {
    totalEvents: events.length,
    avgAffectedFiles: stats.avgAffectedFiles.toFixed(1),
    falsePositiveRate: eventsWithAction.length > 0
      ? ((ignoredCount / eventsWithAction.length) * 100).toFixed(2) + '%'
      : 'N/A',
    bugsPrevent: preventedBugs
  };
}

/**
 * Analyze events by file extension
 */
function analyzeByExtension(events) {
  const frequency = {};
  events.forEach(event => {
    const ext = path.extname(event.modifiedFile);
    frequency[ext] = (frequency[ext] || 0) + 1;
  });
  return frequency;
}

/**
 * Get most problematic files
 */
function getProblematicFiles(stats) {
  return Object.entries(stats.mostFrequentFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
}

/**
 * Generate insights
 */
function generateInsights(events, stats) {
  const insights = [
    `Detectados ${events.length} casos de tunnel vision`,
    `Promedio de ${stats.avgAffectedFiles.toFixed(1)} archivos afectados por caso`
  ];
  
  const preventedBugs = events.filter(e => e.context?.preventedBug === true).length;
  if (preventedBugs > 0) {
    insights.push(`Prevenidos ${preventedBugs} bugs potenciales`);
  }
  
  return insights;
}

/**
 * Generate recommendations based on patterns
 */
function generateRecommendations(stats, events) {
  const recommendations = [];

  const topFiles = Object.entries(stats.mostFrequentFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topFiles.length > 0 && topFiles[0][1] > 5) {
    recommendations.push({
      type: 'refactor',
      priority: 'high',
      message: `Archivo ${topFiles[0][0]} tiene ${topFiles[0][1]} casos de tunnel vision - considerar refactoring`
    });
  }

  if (stats.eventsBySeverity.CRITICAL > stats.totalEvents * 0.3) {
    recommendations.push({
      type: 'process',
      priority: 'high',
      message: 'Alto porcentaje de casos CRITICAL - considerar code review obligatorio'
    });
  }

  if (stats.avgAffectedFiles > 7) {
    recommendations.push({
      type: 'architecture',
      priority: 'medium',
      message: `Promedio de ${stats.avgAffectedFiles.toFixed(1)} archivos afectados - considerar mejor separación de responsabilidades`
    });
  }

  return recommendations;
}
