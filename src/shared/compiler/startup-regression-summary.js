/**
 * @fileoverview Canonical startup regression summary helpers.
 *
 * Builds a compact startup telemetry surface that distinguishes normal
 * boot, incremental Layer A refreshes and expensive full reindex runs.
 *
 * @module shared/compiler/startup-regression-summary
 */

import { asNumber } from './core-utils.js';
import { clampScore } from './score-utils.js';

function compactPhaseTimings(phaseTimings = []) {
  if (!Array.isArray(phaseTimings)) {
    return [];
  }

  return phaseTimings
    .map((phase, index) => ({
      index,
      name: phase?.name || phase?.label || `phase-${index + 1}`,
      elapsedMs: asNumber(phase?.elapsedMs ?? phase?.elapsed ?? phase?.durationMs, 0),
      memoryDeltaMb: asNumber(phase?.memoryDeltaMb ?? phase?.memory?.heapUsed ?? phase?.memory?.rss ?? 0, 0)
    }))
    .filter((phase) => phase.elapsedMs >= 0);
}

function normalizeLayerAStrategy(layerAStrategy = null) {
  const strategy = String(layerAStrategy || '').toUpperCase();
  if (strategy === 'FULL_REINDEX') return 'full_reindex';
  if (strategy === 'INCREMENTAL') return 'incremental';
  if (strategy === 'LOAD_ONLY') return 'load_only';
  return strategy ? strategy.toLowerCase() : 'startup';
}

export function buildStartupRegressionSummary(startupTelemetry = null) {
  if (!startupTelemetry || typeof startupTelemetry !== 'object') {
    return null;
  }

  const phaseTimings = compactPhaseTimings(
    startupTelemetry.phaseTimings || startupTelemetry.initializationTimings || []
  );
  const totalDurationMs = asNumber(
    startupTelemetry.totalDurationMs
      ?? startupTelemetry.durationMs
      ?? startupTelemetry.elapsedMs
      ?? startupTelemetry.uptimeMs
      ?? 0,
    0
  );
  const readyDurationMs = asNumber(startupTelemetry.readyDurationMs, 0);
  const layerA = startupTelemetry.layerA || {};
  const layerAStrategy = normalizeLayerAStrategy(
    layerA.strategy || startupTelemetry.layerAStrategy || startupTelemetry.analysisStrategy
  );
  const layerADurationMs = asNumber(layerA.durationMs, 0);
  const layerAFilesAnalyzed = asNumber(layerA.filesAnalyzed, 0);
  const cacheLoadMs = asNumber(startupTelemetry.cacheLoadMs, 0);
  const orchestratorLoadMs = asNumber(startupTelemetry.orchestratorLoadMs, 0);
  const mcpSetupMs = asNumber(startupTelemetry.mcpSetupMs, 0);
  const slowPhaseCount = phaseTimings.filter((phase) => phase.elapsedMs >= Math.max(1000, totalDurationMs * 0.2)).length;
  const maxPhase = phaseTimings.reduce((winner, phase) => (
    phase.elapsedMs > (winner?.elapsedMs || -1) ? phase : winner
  ), null);

  const expectedSlow = layerAStrategy === 'full_reindex';
  const budgetMs = expectedSlow ? 180000 : layerAStrategy === 'incremental' ? 45000 : 15000;
  const overBudgetMs = totalDurationMs - budgetMs;
  const budgetState = totalDurationMs > budgetMs ? 'over-budget' : 'within-budget';
  const state = expectedSlow
    ? 'expected-slow'
    : totalDurationMs > (budgetMs * 1.5)
      ? 'regressing'
      : totalDurationMs > budgetMs
        ? 'watchful'
        : 'fresh';

  const reason = expectedSlow
    ? `Layer A ran as ${layerAStrategy}, so the long startup is expected.`
    : totalDurationMs > budgetMs
      ? `Startup exceeded the ${Math.round(budgetMs / 1000)}s budget by ${Math.round(overBudgetMs)}ms.`
      : 'Startup stayed within the expected budget.';

  const recommendation = expectedSlow
    ? 'Treat this startup as a reindex bootstrap and compare it against full-reindex baselines.'
    : totalDurationMs > budgetMs
      ? 'Investigate the slowest startup phases and compare the run against prior boot snapshots.'
      : 'Keep tracking the startup baseline for regressions.';

  return {
    state,
    expectedSlow,
    budgetState,
    budgetMs,
    totalDurationMs,
    readyDurationMs,
    runtimeRestartMode: startupTelemetry.runtimeRestartMode || 'manual',
    proxyManaged: startupTelemetry.proxyManaged === true,
    layerAStrategy,
    layerADurationMs,
    layerAFilesAnalyzed,
    cacheLoadMs,
    orchestratorLoadMs,
    mcpSetupMs,
    phaseCount: phaseTimings.length,
    slowPhaseCount,
    maxPhaseName: maxPhase?.name || null,
    maxPhaseMs: maxPhase ? Number(maxPhase.elapsedMs.toFixed(2)) : 0,
    reason,
    recommendation,
    summary: `${state} | startup=${Math.round(totalDurationMs)}ms | layerA=${layerAStrategy}:${Math.round(layerADurationMs)}ms | budget=${budgetState}`,
    evidence: {
      phaseTimings: phaseTimings.slice(0, 8),
      initializationTimings: Array.isArray(startupTelemetry.initializationTimings)
        ? startupTelemetry.initializationTimings.slice(0, 8)
        : [],
      startupMode: startupTelemetry.startupMode || null
    },
    score: clampScore(
      expectedSlow ? 85 - Math.min(30, slowPhaseCount * 4) : 100 - Math.min(80, Math.max(0, overBudgetMs) / 1000),
      0,
      100
    )
  };
}

export default {
  buildStartupRegressionSummary
};
