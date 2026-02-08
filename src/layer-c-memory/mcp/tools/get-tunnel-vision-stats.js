/**
 * @fileoverview get-tunnel-vision-stats.js
 *
 * MCP Tool: Obtiene estadísticas de eventos de Tunnel Vision detectados
 *
 * USO:
 * - Ver cuántos casos de tunnel vision se han detectado
 * - Analizar patrones (archivos problemáticos, severidades, etc.)
 * - Validar efectividad del detector (false positive rate)
 * - Identificar oportunidades de refactoring
 *
 * @module layer-c-memory/mcp/tools/get-tunnel-vision-stats
 */

import { getStats, analyzePatterns, readAllEvents } from '../../../../core/tunnel-vision-logger.js';

/**
 * MCP Tool: get_tunnel_vision_stats
 *
 * Retorna estadísticas y análisis de eventos de tunnel vision
 */
export default async function getTunnelVisionStats(args = {}) {
  try {
    const { includePatterns = true, includeEvents = false, limit = 10 } = args;

    // Cargar estadísticas base
    const stats = await getStats();

    // Análisis de patrones (opcional)
    let patterns = null;
    if (includePatterns) {
      patterns = await analyzePatterns();
    }

    // Eventos recientes (opcional)
    let recentEvents = null;
    if (includeEvents) {
      recentEvents = await readAllEvents({ limit });
    }

    // Construir respuesta
    const response = {
      success: true,
      stats: {
        totalDetected: stats.totalEvents,
        bySeverity: stats.eventsBySeverity,
        avgAffectedFiles: parseFloat(stats.avgAffectedFiles.toFixed(2)),
        lastUpdated: stats.lastUpdated
      }
    };

    if (patterns) {
      response.patterns = patterns;
    }

    if (recentEvents) {
      response.recentEvents = recentEvents.map(event => ({
        timestamp: event.timestamp,
        severity: event.severity,
        file: event.modifiedFile,
        affectedCount: event.affectedFiles.unmodified,
        userAction: event.context?.userAction || 'unknown',
        preventedBug: event.context?.preventedBug
      }));
    }

    // Generar resumen legible
    response.summary = generateSummary(stats, patterns);

    return response;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stats: {
        totalDetected: 0,
        bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
        avgAffectedFiles: 0
      },
      summary: 'No hay datos de tunnel vision aún. El detector comenzará a recolectar datos cuando modifiques archivos.'
    };
  }
}

/**
 * Genera un resumen legible en español
 */
function generateSummary(stats, patterns) {
  const lines = [];

  if (stats.totalEvents === 0) {
    return 'No se han detectado casos de tunnel vision aún. Modifica algunos archivos para comenzar a recolectar datos.';
  }

  lines.push(`📊 Total de casos detectados: ${stats.totalEvents}`);
  lines.push(`📈 Promedio de archivos afectados: ${stats.avgAffectedFiles.toFixed(1)}`);

  // Severidad más común
  const severities = Object.entries(stats.eventsBySeverity)
    .sort((a, b) => b[1] - a[1]);

  if (severities.length > 0 && severities[0][1] > 0) {
    lines.push(`⚠️  Severidad más común: ${severities[0][0]} (${severities[0][1]} casos)`);
  }

  // Archivos problemáticos
  const topFiles = Object.entries(stats.mostFrequentFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topFiles.length > 0) {
    lines.push(`\n🔥 Archivos más problemáticos:`);
    topFiles.forEach(([file, count]) => {
      lines.push(`   - ${file}: ${count} casos`);
    });
  }

  // Insights de patterns si están disponibles
  if (patterns && patterns.insights) {
    lines.push(`\n💡 Insights:`);
    patterns.insights.forEach(insight => {
      lines.push(`   - ${insight}`);
    });
  }

  // Recomendaciones
  if (patterns && patterns.recommendations && patterns.recommendations.length > 0) {
    lines.push(`\n🎯 Recomendaciones:`);
    patterns.recommendations.forEach(rec => {
      const priority = rec.priority === 'high' ? '🔴' : '🟡';
      lines.push(`   ${priority} [${rec.type}] ${rec.message}`);
    });
  }

  return lines.join('\n');
}
