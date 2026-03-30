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
  return [
    '/shared/compiler/contract.js',
    '/shared/compiler/contract-helpers.js',
    '/shared/compiler/snapshot.js',
    '/shared/compiler/surface-audit.js',
    '/shared/compiler/compiler-contract-layer.js',
    '/shared/compiler/standardization-report.js',
    '/shared/compiler/summary.js',
    '/shared/compiler/live-row-reconciliation.js',
    '/shared/compiler/metadata-extraction-coverage/coverage.js',
    '/shared/compiler/file-import-evidence.js',
    '/shared/compiler/system-map-persistence.js',
    '/shared/compiler/metadata-surface-parity.js',
    '/shared/compiler/semantic-surface-granularity.js',
    '/shared/compiler/file-universe-granularity.js'
  ].some((segment) => normalizedPath.endsWith(segment));
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
      if (isCanonicalGatewayModule(normalizedPath)) {
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
