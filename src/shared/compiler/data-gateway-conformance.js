/**
 * @fileoverview Canonical data-gateway conformance heuristics.
 *
 * Detects when runtime modules bypass the canonical DB-first data gateway and
 * inspect compiler support surfaces directly.
 *
 * @module shared/compiler/data-gateway-conformance
 */

import { createPositionalFinding } from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';

function importsDataGatewayContract(source = '') {
  return /from\s+['"][^'"]*shared\/compiler\/(?:index\.js|contract\.js)['"]/.test(source);
}

function touchesCanonicalGatewaySurfaces(source = '') {
  return /system_files|file_dependencies|semantic_connections|compiler_scanned_files|metadataExtractionCoverage|fileImportEvidenceCoverage|systemMapPersistenceCoverage|semanticSurfaceGranularity|metadataSurfaceParity/.test(source);
}

function isCanonicalGatewayModule(normalizedPath = '') {
  const canonicalSuffixes = [
    '/shared/compiler/contract.js',
    '/shared/compiler/contract-helpers.js',
    '/shared/compiler/contract-summary.js',
    '/shared/compiler/snapshot.js',
    '/shared/compiler/surface-audit.js',
    '/shared/compiler/surface-audit/audit.js',
    '/shared/compiler/surface-audit/core.js',
    '/shared/compiler/surface-audit/index.js',
    '/shared/compiler/surface-audit/summary.js',
    '/shared/compiler/compiler-contract-layer.js',
    '/shared/compiler/compiler-contract-layer-governance-invariants.js',
    '/shared/compiler/compiler-contract-layer-helpers-surface.js',
    '/shared/compiler/compiler-diagnostics-snapshot-contracts-database.js',
    '/shared/compiler/compiler-diagnostics-snapshot-contracts-snapshot.js',
    '/shared/compiler/compiler-diagnostics-snapshot-contracts-adoptions.js',
    '/shared/compiler/compiler-diagnostics-snapshot-contracts-generation.js',
    '/shared/compiler/compiler-metric-dictionary.js',
    '/shared/compiler/compiler-metric-reliability.js',
    '/shared/compiler/compiler-metrics-current.js',
    '/shared/compiler/compiler-runtime-metrics-universe.js',
    '/shared/compiler/counts.js',
    '/shared/compiler/database-health-assessment-recommendations.js',
    '/shared/compiler/file-universe-granularity.js',
    '/shared/compiler/live-row-utils-queries.js',
    '/shared/compiler/metadata-extraction-coverage/coverage.js',
    '/shared/compiler/metadata-extraction-coverage-repair.js',
    '/shared/compiler/metadata-extraction-coverage-repair-system-files.js',
    '/shared/compiler/metadata-extraction-coverage-repair-system-files-backfill.js',
    '/shared/compiler/metadata-extraction-coverage-repair-system-file-links-dependencies.js',
    '/shared/compiler/metadata-extraction-coverage-repair-system-file-links-semantic.js',
    '/shared/compiler/metadata-extraction-coverage/report-assembly.js',
    '/shared/compiler/metadata-extraction-coverage/report-tables.js',
    '/shared/compiler/metadata-propagation-conformance.js',
    '/shared/compiler/metadata-surface-parity.js',
    '/shared/compiler/pipeline-orphans-candidates.js',
    '/shared/compiler/semantic-surface-granularity-contract.js',
    '/shared/compiler/semantic-surface-granularity-conformance.js',
    '/shared/compiler/semantic-surface-granularity-legacy.js',
    '/shared/compiler/semantic-surface-granularity.js',
    '/shared/compiler/standardization-report.js',
    '/shared/compiler/standardization-report/recommendations.js',
    '/shared/compiler/system-map-persistence.js',
    '/shared/compiler/system-map-persistence-repair-dependencies.js',
    '/shared/compiler/system-map-persistence-repair-helpers.js',
    '/shared/compiler/system-map-persistence-repair-primary.js',
    '/shared/compiler/system-map-persistence-repair-resolution.js',
    '/shared/compiler/system-map-persistence-repair-semantic.js'
  ];

  return [
    ...canonicalSuffixes,
    '/shared/compiler/summary.js',
    '/shared/compiler/live-row-reconciliation.js',
    '/shared/compiler/file-import-evidence.js'
  ].some((segment) => normalizedPath.endsWith(segment));
}

function isGovernanceDiagnosticModule(normalizedPath = '') {
  const diagnosticSuffixes = [
    '/core/file-watcher/guards/pipeline-orphan/reporting-payload.js',
    '/layer-c-memory/mcp/core/governance-alerts.js',
    '/layer-c-memory/mcp/tools/detect-db-access.js',
    '/layer-c-memory/mcp/tools/handlers/pipeline-health-domain/metadata-health.js',
    '/layer-c-memory/mcp/tools/handlers/pipeline-health-handler.js',
    '/layer-c-memory/query/queries/file-query/system-map.js'
  ];

  return diagnosticSuffixes.some((segment) => normalizedPath.endsWith(segment));
}

function usesManualGatewayRead(source = '') {
  return (
    /db\.prepare\([\s\S]{0,260}?(system_files|file_dependencies|semantic_connections|compiler_scanned_files)/.test(source) ||
    /SELECT[\s\S]{0,260}?(system_files|file_dependencies|semantic_connections|compiler_scanned_files)/.test(source) ||
    /FROM\s+(system_files|file_dependencies|semantic_connections|compiler_scanned_files)/.test(source)
  );
}

export function detectDataGatewayConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'data_gateway' },
    ({ normalizedPath, source: currentSource, severity, policyArea, findings }) => {
      if (isCanonicalGatewayModule(normalizedPath) || isGovernanceDiagnosticModule(normalizedPath)) {
        return;
      }

      if (touchesCanonicalGatewaySurfaces(currentSource) && !importsDataGatewayContract(currentSource)) {
        findings.push(createPositionalFinding(
          'manual_data_gateway_bypass',
          severity,
          policyArea,
          'Module reads canonical compiler surfaces without the DB-first data gateway contract',
          'Route freshness, coverage, and drift reads through the canonical data gateway contract before inspecting support tables directly.'
        ));
      }

      if (usesManualGatewayRead(currentSource) && !importsDataGatewayContract(currentSource)) {
        findings.push(createPositionalFinding(
          'manual_data_gateway_sql_read',
          severity,
          policyArea,
          'Module queries canonical compiler support tables directly instead of using the data gateway',
          'Use the canonical data gateway contract or its summary APIs before adding another direct SQL read of compiler support tables.'
        ));
      }
    }
  );
}
