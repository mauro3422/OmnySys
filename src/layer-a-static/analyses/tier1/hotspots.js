/**
 * Hotspots Analyzer
 *
 * Responsabilidad:
 * - Identificar funciones llamadas desde muchos lugares (puntos críticos)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de hotspots
 */
export function findHotspots(systemMap) {
  const callCounts = new Map();

  // Handle edge case: missing or empty function_links
  if (!systemMap?.function_links) {
    return {
      total: 0,
      functions: [],
      criticalCount: 0
    };
  }

  // Contar cuántos links apuntan a cada función
  for (const link of systemMap.function_links) {
    const current = callCounts.get(link.to) || { count: 0, callers: [] };
    current.count++;
    current.callers.push(link.from);
    callCounts.set(link.to, current);
  }

  // Filtrar hotspots (>= 5 callers)
  const hotspots = Array.from(callCounts.entries())
    .filter(([id, data]) => data.count >= 5)
    .map(([id, data]) => ({
      functionId: id,
      callers: data.count,
      callersList: [...new Set(data.callers)],
      severity: data.count >= 15 ? 'CRITICAL' : data.count >= 10 ? 'HIGH' : 'MEDIUM',
      recommendation: `Edit carefully - affects ${data.count} function(s)`
    }))
    .sort((a, b) => b.callers - a.callers);

  return {
    total: hotspots.length,
    functions: hotspots,
    criticalCount: hotspots.filter(h => h.severity === 'CRITICAL').length
  };
}
