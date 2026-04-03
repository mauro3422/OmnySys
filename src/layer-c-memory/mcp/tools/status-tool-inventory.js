/**
 * Compact MCP tool inventory payloads for status output.
 */

import { takeSample } from './status-summary-helpers.js';

function compactInventorySnapshot(snapshot = {}) {
  return {
    totalTools: snapshot.summary?.totalTools || 0,
    categories: snapshot.summary?.categories || []
  };
}

function compactInventoryReport(report = {}) {
  return {
    dominantCategory: report.dominantCategory || null,
    dominantSubgroup: report.dominantSubgroup || null,
    categoryConcentration: report.categoryConcentration || 0,
    concentration: report.subgroupConcentration || report.concentration || 0,
    subgroupConcentration: report.subgroupConcentration || 0,
    subgroupStats: takeSample(report.subgroupStats || [], 5),
    recommendations: takeSample(report.recommendations || [], 3)
  };
}

export function compactToolInventory(toolInventory) {
  if (!toolInventory || typeof toolInventory !== 'object') return null;

  const snapshot = toolInventory.snapshot || {};
  const report = toolInventory.report || {};

  return {
    ...compactInventorySnapshot(snapshot),
    ...compactInventoryReport(report)
  };
}
