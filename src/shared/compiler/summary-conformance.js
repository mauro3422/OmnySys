/**
 * @fileoverview Canonical summary conformance heuristics.
 *
 * Detects when modules outside the status/snapshot layer recompute canonical
 * summary payloads instead of going through the shared summary surfaces.
 *
 * @module shared/compiler/summary-conformance
 */

import { createPositionalFinding } from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';

function isCanonicalSummaryModule(normalizedPath = '') {
  return [
    '/shared/compiler/snapshot.js',
    '/shared/compiler/status-summary-helpers.js',
    '/shared/compiler/status-system-table.js',
    '/shared/compiler/status-summary-payload.js',
    '/shared/compiler/surface-audit.js',
    '/shared/compiler/status-summary.js',
    '/shared/compiler/compiler-explainability-loader.js',
    '/shared/compiler/compiler-metrics-current.js',
    '/shared/compiler/metrics-current/index.js',
    '/shared/compiler/metrics-current/helpers.js',
    '/shared/compiler/metrics-current/summaries.js',
    '/shared/compiler/metrics/snapshot.js',
    '/shared/compiler/metrics/snapshot-summary.js',
    '/shared/compiler/metrics/history.js',
    '/shared/compiler/dashboard.js',
    '/shared/compiler/cache-policy-summary.js',
    '/shared/compiler/system-inventory-summary.js',
    '/layer-c-memory/mcp/tools/status.js',
    '/layer-c-memory/mcp/tools/status-server-details.js',
    '/layer-c-memory/mcp/core/initialization/dashboard-reporter.js',
    '/layer-c-memory/mcp/core/initialization/dashboard-reporter-helpers.js'
  ].some((segment) => normalizedPath.endsWith(segment));
}

function usesCanonicalSummarySurface(source = '') {
  return /summarizeStatus\s*\(|summarizeSurfaceAuditForStatus\s*\(|compactCompilerExplainabilitySummary\s*\(|buildServerStatusEnvelope\s*\(/.test(source);
}

function recomposesStatusPayload(source = '') {
  return /compilerExplainability\s*:|surfaceAudit\s*:|databaseHealth\s*:|telemetryProvenance\s*:|recentErrors\s*:|nodeVitals\s*:/.test(source);
}

export function detectSummaryConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'summary_presentation' },
    ({ normalizedPath, source: currentSource, severity, policyArea, findings }) => {
      if (isCanonicalSummaryModule(normalizedPath)) {
        return;
      }

      if (usesCanonicalSummarySurface(currentSource) && recomposesStatusPayload(currentSource)) {
        findings.push(createPositionalFinding(
          'manual_summary_recomposition',
          severity,
          policyArea,
          'Module recomposes canonical status/summary payloads outside the summary layer',
          'Route status and explainability output through the canonical summary modules before assembling payload fields inline.'
        ));
      }
    }
  );
}
