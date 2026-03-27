import { DERIVED_SCORE_SIGNALS, summarizeFieldCoverageRow } from './signal-coverage-helpers.js';

export function summarizePhysicsCoverageRow(row = {}) {
  const total = Number(row.total) || 0;
  const coverage = {};
  const missingSignals = [];

  for (const signal of DERIVED_SCORE_SIGNALS) {
    const nonZero = Number(row[`${signal.name}_nonzero`]) || 0;
    coverage[`${signal.name}Pct`] = total > 0 ? Math.round((nonZero / total) * 100) : 0;
    if (nonZero === 0 && ['fragility', 'coupling', 'cohesion'].includes(signal.name)) {
      missingSignals.push(signal.name);
    }
  }

  return { total, coverage, missingSignals };
}

export function summarizeCentralityCoverageRow(row = {}, options = {}) {
  return summarizeFieldCoverageRow(row, 'centrality', options);
}
