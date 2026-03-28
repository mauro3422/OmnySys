/**
 * Compact MCP tool inventory payloads for status output.
 */

function takeSample(items = [], limit = 3) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit);
}

export function compactToolInventory(toolInventory) {
  if (!toolInventory || typeof toolInventory !== 'object') return null;

  const snapshot = toolInventory.snapshot || {};
  const report = toolInventory.report || {};

  return {
    totalTools: snapshot.summary?.totalTools || 0,
    categories: snapshot.summary?.categories || [],
    dominantCategory: report.dominantCategory || null,
    concentration: report.concentration || 0,
    recommendations: takeSample(report.recommendations || [], 3)
  };
}
