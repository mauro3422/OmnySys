/**
 * @fileoverview Canonical data-gateway conformance heuristics.
 *
 * Detects when runtime modules bypass the canonical DB-first data gateway and
 * inspect compiler support surfaces directly.
 *
 * Architecture:
 *   PRODUCERS (not audited — they ARE the surfaces):
 *     - shared/compiler/** → canonical surface implementations
 *     - layer-c-memory/storage/** → persistence layer
 *     - layer-c-memory/query/** → query API layer
 *
 *   GOVERNANCE (not audited — they ARE the auditors):
 *     - core/file-watcher/guards/** → audit mechanisms
 *     - core/meta-detector/** → integrity detectors
 *
 *   CONSUMERS (AUDITED — they should use the gateway):
 *     - layer-c-memory/mcp/tools/** → MCP tool implementations
 *     - layer-c-memory/mcp/*.js → HTTP server, bridge, workers
 *     - core/orchestrator/** → orchestration decisions
 *     - core/file-watcher/handlers/** → watcher handlers
 *     - cli/** → CLI command implementations
 *
 * @module shared/compiler/data-gateway-conformance
 */

import { createPositionalFinding } from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';

// ─── What we audit ───────────────────────────────────────────────────────────
// Only consumer modules should be checked. Producers and governance are excluded
// at the directory level, not with infinite per-file lists.

const CONSUMER_PREFIXES = [
  'src/layer-c-memory/mcp/tools/',
  'src/layer-c-memory/mcp/',
  'src/core/orchestrator/',
  'src/core/file-watcher/handlers/',
  'src/cli/',
];

/**
 * Returns true if a file is a consumer that should use the data gateway.
 */
function isConsumerModule(normalizedPath = '') {
  // Governance/diagnostic modules are auditors, not consumers
  if (normalizedPath.includes('governance-alerts')
    || normalizedPath.includes('detect-db-access')
    || normalizedPath.includes('pipeline-health')) {
    return false;
  }
  return CONSUMER_PREFIXES.some(prefix => normalizedPath.includes(prefix));
}

// ─── Heuristics ──────────────────────────────────────────────────────────────

function importsDataGatewayContract(source = '') {
  return /from\s+['"][^'"]*shared\/compiler\/(?:index\.js|contract\.js)['"]/.test(source);
}

function touchesCanonicalGatewaySurfaces(source = '') {
  return /system_files|file_dependencies|semantic_connections|compiler_scanned_files|metadataExtractionCoverage|fileImportEvidenceCoverage|systemMapPersistenceCoverage|semanticSurfaceGranularity|metadataSurfaceParity/.test(source);
}

function usesManualGatewayRead(source = '') {
  return (
    /db\.prepare\([\s\S]{0,260}?(system_files|file_dependencies|semantic_connections|compiler_scanned_files)/.test(source) ||
    /SELECT[\s\S]{0,260}?(system_files|file_dependencies|semantic_connections|compiler_scanned_files)/.test(source) ||
    /FROM\s+(system_files|file_dependencies|semantic_connections|compiler_scanned_files)/.test(source)
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function detectDataGatewayConformanceFromSource(filePath, source = '', options = {}) {
  // Only audit consumer modules — producers and governance are infrastructure
  if (!isConsumerModule(filePath)) {
    return [];
  }

  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'data_gateway' },
    ({ normalizedPath, source: currentSource, severity, policyArea, findings }) => {
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
