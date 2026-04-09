/**
 * @fileoverview Canonical propagation expansion conformance heuristics.
 *
 * Detects watcher and tool surfaces that should attach or consume propagation
 * plans but still emit status, issue or reporting payloads without the
 * canonical propagation contract.
 *
 * @module shared/compiler/propagation-expansion-conformance
 */

import {
  createPositionalFinding,
  stripComments
} from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';
import { COMPILER_POLICY_AREA } from './policy-conformance-constants.js';

const PROPAGATION_CONTRACT_PATTERN = /\b(?:buildPropagationPlan|summarizePropagationPlan|build[A-Z]\w+PropagationPlan)\b/;
const PROPAGATION_PAYLOAD_PATTERN = /\bpropagation\b/;
const PROPAGATION_AWARE_SURFACE_PATTERN = /\b(?:issueContext|extraData|summaryText|payload|reporting|watcher|status|health|snapshot|driftAssessment|surfaceAudit|persistWatcherIssue|createStandardContext|emit\s*\(|build[A-Z]\w*(?:Issue|Report|Payload|Summary|Snapshot|Health))\b/;

function isPropagationExemptPath(normalizedPath = '') {
  return normalizedPath.startsWith('src/core/file-watcher/guards/guard-standards/')
    || normalizedPath.includes('/metadata-completeness/')
    || normalizedPath.startsWith('src/shared/compiler/atom-metadata-helpers.js')
    || normalizedPath.startsWith('src/shared/compiler/propagation-expansion-conformance.js')
    || normalizedPath.startsWith('src/shared/compiler/policy-conformance.js')
    || normalizedPath.startsWith('src/shared/compiler/compiler-drift-assessment.js')
    || normalizedPath.startsWith('src/shared/compiler/compiler-metrics-current.js')
    || normalizedPath.startsWith('src/shared/compiler/metrics-current/')
    || normalizedPath.startsWith('src/shared/compiler/metrics/')
    || normalizedPath.startsWith('src/shared/compiler/dashboard.js')
    || normalizedPath.startsWith('src/shared/compiler/status-system-table.js')
    || normalizedPath.startsWith('src/layer-c-memory/mcp/tools/status-server-details.js')
    || normalizedPath.startsWith('src/layer-c-memory/mcp/tools/status.js')
    || normalizedPath.startsWith('src/layer-c-memory/mcp/tools/compiler-snapshot-service.js')
    || normalizedPath.startsWith('src/layer-c-memory/mcp/tools/folderization-snapshot-service.js')
    || normalizedPath.startsWith('src/layer-c-memory/mcp/tools/technical-debt/')
    || normalizedPath.startsWith('src/layer-c-memory/mcp/core/initialization/dashboard-reporter.js')
    || normalizedPath.startsWith('src/layer-c-memory/mcp/core/initialization/dashboard-reporter-helpers.js');
}

function isPropagationSurfaceCandidate(normalizedPath = '') {
  return normalizedPath.startsWith('src/core/file-watcher/guards/')
    || normalizedPath.startsWith('src/layer-c-memory/mcp/tools/');
}

function importsPropagationContract(source = '') {
  return PROPAGATION_CONTRACT_PATTERN.test(source);
}

function exposesPropagationPayload(source = '') {
  return PROPAGATION_PAYLOAD_PATTERN.test(source)
    || /\bpropagationExpansion(?:State|Reason|Recommendation)?\b/.test(source)
    || /\bpropagation_expansion\b/.test(source);
}

function usesPropagationAwareSurface(source = '') {
  return PROPAGATION_AWARE_SURFACE_PATTERN.test(stripComments(source));
}

function usesPropagationReadyStatusSurface(source = '') {
  return /\b(?:compilerExplainability|driftAssessment|buildCompilerHealthDashboard|buildCompilerHealthPanel|buildSystemTableSummary|buildStatusSummaryPayload|summarizeCompilerExplainability|summarizeCompilerHealthDashboard|summarizeCompilerHealthPanel)\b/.test(stripComments(source));
}

export function detectPropagationExpansionConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: COMPILER_POLICY_AREA.PROPAGATION_EXPANSION },
    ({ normalizedPath, source: currentSource, severity, policyArea, findings }) => {
      if (isPropagationExemptPath(normalizedPath)) {
        return;
      }

      if (!isPropagationSurfaceCandidate(normalizedPath)) {
        return;
      }

      if (
        (usesPropagationAwareSurface(currentSource) || usesPropagationReadyStatusSurface(currentSource)) &&
        !importsPropagationContract(currentSource) &&
        !exposesPropagationPayload(currentSource)
      ) {
        findings.push(createPositionalFinding(
          'propagation_surface_without_contract',
          severity,
          policyArea,
          'Watcher or tool surface emits status or issue payloads without the canonical propagation contract',
          'Attach the propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.'
        ));
      }
    }
  );
}
