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
import { normalizePath } from '../utils/path-utils.js';

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
    '/shared/compiler/system-map-persistence-repair-semantic.js',
    // Canonical surface registry and surfaces (need direct DB access by design)
    '/shared/compiler/canonical-surface-registry.js',
    '/shared/compiler/mcp-topology-surface.js',
    '/shared/compiler/bridge-telemetry-surface.js',
    '/shared/compiler/tool-runs-surface.js',
    '/shared/compiler/sessions-surface.js',
    '/shared/compiler/atom-events-surface.js',
    '/shared/compiler/societies-surface.js',
    '/shared/compiler/file-deps-surface.js',
    '/shared/compiler/surface-obligations-propagator.js',
    // Core system modules that legitimately query runtime tables
    '/shared/compiler/trust-investigation-report.js',
    '/shared/compiler/tool-run-telemetry/summary.js',
    '/shared/compiler/tool-health-trending.js',
    '/shared/compiler/mcp-request-delivery-telemetry.js',
    // Layer C query modules (they ARE the data access layer)
    '/layer-c-memory/query/queries/file-query/dependencies/deps.js',
    '/layer-c-memory/query/queries/dependency-query.js',
    '/layer-c-memory/query/export.js',
    '/layer-c-memory/query/apis/mcp-sessions-api.js',
    '/layer-c-memory/query/queries/connections-query.js',
    // Layer C MCP tools and core modules
    '/layer-c-memory/mcp/core/session-manager-helpers.js',
    '/layer-c-memory/mcp/core/initialization/dashboard-reporter-helpers.js',
    '/layer-c-memory/mcp-http-server.js',
    '/layer-c-memory/mcp/tools/status-metadata.js',
    '/layer-c-memory/mcp/tools/status-compiler.js',
    '/layer-c-memory/mcp/tools/suggest-architecture.js',
    '/layer-c-memory/mcp/tools/diagnose-tool-health/analysis-core.js',
    // Layer C storage and shadow registry
    '/layer-c-memory/storage/repository/adapters/helpers/system-map-incremental.js',
    '/layer-c-memory/storage/repository/adapters/helpers/system-map/handlers/dependency-handler.js',
    '/layer-c-memory/shadow-registry/storage/shadow-storage.js',
    // Layer B society manager
    '/layer-b-semantic/society-manager/SocietyPersistor.js',
    // Core orchestrator and file watcher handlers
    '/core/orchestrator/runtime-ops.js',
    '/core/file-watcher/handlers/relationships.js',
    // Layer C storage helpers (they implement the persistence layer)
    '/layer-c-memory/storage/repository/adapters/helpers/system-map-incremental.js',
    '/layer-c-memory/storage/repository/adapters/helpers/system-map/handlers/file-handler.js',
    '/layer-c-memory/storage/repository/adapters/helpers/system-map/handlers/semantic-handler.js',
    '/layer-c-memory/storage/repository/adapters/helpers/call-target-resolver.js',
    // Core meta-detector
    '/core/meta-detector/pipeline-integrity-detector/data-checks.js'
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
    '/core/meta-detector/pipeline-integrity-detector/data-checks.js',
    '/layer-c-memory/mcp/core/governance-alerts.js',
    '/layer-c-memory/mcp/tools/detect-db-access.js',
    '/layer-c-memory/mcp/tools/handlers/pipeline-health-domain/metadata-health.js',
    '/layer-c-memory/mcp/tools/handlers/pipeline-health-handler.js',
    '/layer-c-memory/query/queries/file-query/system-map.js',
    '/layer-c-memory/query/queries/file-query/dependencies/deps.js',
    '/layer-c-memory/query/queries/dependency-query.js',
    '/layer-c-memory/query/queries/connections-query.js',
    '/layer-c-memory/query/export.js',
    '/layer-c-memory/mcp/core/initialization/dashboard-reporter-helpers.js',
    '/core/file-watcher/handlers/relationships.js',
    '/core/file-watcher/guards/circular-guard/repository.js',
    // Guards need direct DB access to audit the codebase (they ARE the auditors)
    '/core/file-watcher/guards/missing-surface-audit-guard.js',
    '/core/file-watcher/guards/semantic-surface-collapse-guard.js',
    '/core/file-watcher/guards/default-semantic-guard-definitions-governance.js',
    '/core/file-watcher/guards/compiler-policy-conformance-guard.js'
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
  const normalizedPath = normalizePath(filePath);

  // Gateway implementation modules ARE the canonical surfaces — don't audit the auditors
  if (/shared\/compiler\//.test(normalizedPath)) {
    return [];
  }

  // Data access layer modules (query + storage) — they implement the gateway
  if (/layer-c-memory\/query\//.test(normalizedPath) || /layer-c-memory\/storage\//.test(normalizedPath)) {
    return [];
  }

  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'data_gateway' },
    ({ normalizedPath: np, source: currentSource, severity, policyArea, findings }) => {
      if (isCanonicalGatewayModule(np) || isGovernanceDiagnosticModule(np)) {
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
