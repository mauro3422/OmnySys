/**
 * @fileoverview Canonical summary conformance heuristics.
 *
 * Detects when modules outside the status/snapshot layer recompute canonical
 * summary payloads instead of going through the shared summary surfaces.
 *
 * @module shared/compiler/summary-conformance
 */

import { createGuidedFinding } from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';

function isCanonicalSummaryModule(normalizedPath = '') {
  return [
    '/shared/compiler/snapshot.js',
    '/shared/compiler/status-summary-helpers.js',
    '/shared/compiler/status-system-table.js',
    '/shared/compiler/status-summary-payload.js',
    '/shared/compiler/status-summary/index.js',
    '/shared/compiler/status-summary/summary.js',
    '/shared/compiler/status-summary/payload.js',
    '/shared/compiler/compiler-observability-contract.js',
    '/shared/compiler/status-control-plane-contracts.js',
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
    '/shared/compiler/cache-policy/summary.js',
    '/shared/compiler/system-inventory-summary.js',
    '/shared/compiler/system-inventory/index.js',
    '/shared/compiler/system-inventory/summary.js',
    '/shared/compiler/system-inventory/report.js',
    '/shared/compiler/propagation-ledger.js',
    '/shared/compiler/status-system-table/index.js',
    '/shared/compiler/status-system-table/context.js',
    '/shared/compiler/status-system-table/rows.js',
    '/layer-c-memory/mcp/tools/status.js',
    '/layer-c-memory/mcp/tools/status-server-details.js',
    '/layer-c-memory/mcp/core/initialization/dashboard-reporter.js',
    '/layer-c-memory/mcp/core/initialization/dashboard-reporter-helpers.js',
    '/layer-c-memory/mcp/tools/details.js'
  ].some((segment) => normalizedPath.endsWith(segment));
}

function usesCanonicalSummarySurface(source = '') {
  return /summarizeStatus\s*\(|summarizeSurfaceAuditForStatus\s*\(|compactCompilerExplainabilitySummary\s*\(|buildServerStatusEnvelope\s*\(|buildStatusSummaryPayload\s*\(|buildCompilerObservabilityContract\s*\(/.test(source);
}

function recomposesStatusPayload(source = '') {
  return /compilerExplainability\s*:|surfaceAudit\s*:|databaseHealth\s*:|telemetryProvenance\s*:|recentErrors\s*:|nodeVitals\s*:/.test(source);
}

function looksLikeLegacyHelperContractModule(normalizedPath = '') {
  return /(?:^|\/)(?:helpers?|report|summary|dashboard|panel|status|contract|telemetry)(?:\/|\.|-)/.test(normalizedPath);
}

function usesCanonicalObservabilitySurface(source = '') {
  return /buildCompilerObservabilityContract\s*\(|buildStatusSummaryPayload\s*\(|buildCompilerSystemInventoryReport\s*\(|buildPropagationLedger\s*\(|resolveControlPlaneContracts\s*\(|getMetadataSurfaceParity\s*\(|getSystemMapPersistenceCoverage\s*\(|getSemanticSurfaceGranularity\s*\(/.test(source);
}

function recomposesObservabilityPayload(source = '') {
  return /metadataCoveragePct\s*:|metadataFieldCoveragePct\s*:|systemInventory\s*:|canonicalPromotion\s*:|propagationLedger\s*:|propagationExpansionState\s*:|policyCoverage\s*:|inventoryState\s*:|controlPlane\s*:|summaryText\s*:|nextAction\s*:/.test(source);
}

function isCanonicalFolderizationWorkflowModule(normalizedPath = '') {
  return [
    '/shared/compiler/folderization-report.js',
    '/shared/compiler/folderization-automation-summary.js',
    '/shared/compiler/folderization-automation-utils.js',
    '/shared/compiler/folderization-report/index.js',
    '/shared/compiler/folderization-report/report-builder.js',
    '/shared/compiler/folderization-report/summary-builder.js',
    '/shared/compiler/folderization-report/drift-signal.js',
    '/shared/compiler/folderization-report/naming-drift-signal.js',
    '/shared/compiler/folderization-report/propagation-summary.js',
    '/layer-c-memory/mcp/tools/folderize-family.js',
    '/layer-c-memory/mcp/tools/folderize-family-plan-runner.js',
    '/layer-c-memory/mcp/tools/folderize-family-plan-runner-execution.js',
    '/layer-c-memory/mcp/tools/folderize-family-plan-runner-completion.js',
    '/layer-c-memory/mcp/tools/folderize-family-plan-runner-guards.js',
    '/layer-c-memory/mcp/tools/folderize-family-plan-runner-phases.js',
    '/layer-c-memory/mcp/tools/folderize-family-plan-runner-rollback.js',
    '/layer-c-memory/mcp/tools/folderize-family-plan-runner/helpers.js',
    '/layer-c-memory/mcp/tools/folderize-family-plan-runner/move-orchestration.js',
    '/layer-c-memory/mcp/tools/folderize-family-import-rewriter.js',
    '/layer-c-memory/mcp/tools/rename-folderized-family.js',
    '/layer-c-memory/mcp/tools/normalize-folderized-family.js',
    '/layer-c-memory/mcp/core/shared/mutation-settlement.js',
    '/layer-c-memory/mcp/core/shared/mutation-settlement-core.js',
    '/layer-c-memory/mcp/core/shared/mutation-batch.js',
    '/layer-c-memory/mcp/core/shared/move-orchestrator/orchestrator-impl.js'
  ].some((segment) => normalizedPath.endsWith(segment));
}

function looksLikeFolderizationWorkflowContract(source = '') {
  return /(buildFolderizationExecutionGate|executeFolderizationPlan|executeRenamePlan|runFolderizeCompletionPhase|rollbackFolderizationTransaction|captureFolderizationRollbackSnapshot|restoreFolderizationRollbackSnapshot|buildFolderizationTransactionContext|buildFolderizationMoveSnapshot|settleMutationFiles|withMutationBatch|validateAfterMove|rollbackSnapshot|folderizationSnapshot)/.test(source);
}

function looksLikeLegacyFolderizationWorkflowModule(normalizedPath = '') {
  return /folderization|folderize-family|rename-folderized|normalize-folderized|mutation-settlement|move-orchestrator/.test(normalizedPath);
}

function hasStalePropagationAnchor(source = '') {
  return /\bvoid\s+summarizePropagationPlan\s*;/.test(source);
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
        findings.push(createGuidedFinding({
          rule: 'manual_summary_recomposition',
          severity,
          policyArea,
          message: 'Module recomposes canonical status/summary payloads outside the summary layer',
          recommendation: 'Route status and explainability output through the canonical summary modules before assembling payload fields inline.'
        }));
      }

      if (
        (looksLikeLegacyHelperContractModule(normalizedPath) && recomposesObservabilityPayload(currentSource)) ||
        (usesCanonicalObservabilitySurface(currentSource) && recomposesObservabilityPayload(currentSource))
      ) {
        findings.push(createGuidedFinding({
          rule: 'legacy_helper_contract',
          severity,
          policyArea,
          message: 'Module keeps a legacy helper contract by manually recomposing metadata, inventory, or propagation surfaces outside the canonical observability layer',
          recommendation: 'Reuse buildCompilerObservabilityContract / buildStatusSummaryPayload and keep metadata, inventory, and propagation aligned through the canonical compiler surfaces instead of reassembling them inline.'
        }));
      }

      if (
        !isCanonicalFolderizationWorkflowModule(normalizedPath) &&
        looksLikeLegacyFolderizationWorkflowModule(normalizedPath) &&
        looksLikeFolderizationWorkflowContract(currentSource)
      ) {
        findings.push(createGuidedFinding({
          rule: 'folderization_contract_drift',
          severity,
          policyArea: 'folderization_workflow',
          message: 'Module keeps a legacy folderization workflow contract outside the canonical transaction pipeline',
          recommendation: 'Route plan, execute, settlement and rollback through the canonical folderization transaction pipeline instead of duplicating workflow helpers in legacy modules.'
        }));
      }

      if (looksLikeLegacyHelperContractModule(normalizedPath) && hasStalePropagationAnchor(currentSource)) {
        findings.push(createGuidedFinding({
          rule: 'stale_propagation_anchor',
          severity,
          policyArea,
          message: 'Module keeps summarizePropagationPlan as a no-op anchor instead of threading propagation into the payload contract',
          recommendation: 'Remove the no-op summarizePropagationPlan anchor; if the surface really needs propagation, pass the canonical propagation plan into the emitted contract instead of importing it for side effects.'
        }));
      }
    }
  );
}
