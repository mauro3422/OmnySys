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
    '/shared/compiler/surface-audit.js',
    '/shared/compiler/status-summary.js',
    '/shared/compiler/status-compiler-explainability.js',
    '/layer-c-memory/mcp/tools/status.js'
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
