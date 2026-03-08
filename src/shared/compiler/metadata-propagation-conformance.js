/**
 * @fileoverview Canonical metadata propagation conformance heuristics.
 *
 * Detects compiler/runtime modules that read multiple persistence surfaces for
 * the same conceptual entity or lean on legacy support tables without checking
 * propagation/coverage first.
 *
 * @module shared/compiler/metadata-propagation-conformance
 */

import {
  createPositionalFinding as createFinding,
  stripComments
} from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';


function usesLegacySystemMapTables(source = '') {
  const sanitized = stripComments(source);
  return /\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+(?:system_files|file_dependencies)\b|prepare\(\s*[`'"][\s\S]{0,400}?(?:system_files|file_dependencies)/.test(sanitized);
}

function usesPrimaryFileTables(source = '') {
  const sanitized = stripComments(source);
  return /\b(?:FROM|JOIN|INTO|UPDATE)\s+files\b|prepare\(\s*[`'"][\s\S]{0,400}?\b(?:FROM|JOIN|INTO|UPDATE)\s+files\b/.test(sanitized);
}

function importsCanonicalPropagationApi(source = '') {
  return /getSystemMapPersistenceCoverage|getMetadataSurfaceParity|summarizePersistedScannedFileCoverage|getFileImportEvidenceCoverage|ensureLiveRowSync/.test(source);
}

function mixesParallelMetadataUniverses(source = '') {
  return usesLegacySystemMapTables(source) && usesPrimaryFileTables(source);
}

export function detectMetadataPropagationConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'metadata_propagation' },
    ({ normalizedPath, source: currentSource, severity, policyArea, findings }) => {
      if (
        mixesParallelMetadataUniverses(currentSource) &&
        !importsCanonicalPropagationApi(currentSource) &&
        !normalizedPath.endsWith('/system-map-persistence.js')
      ) {
        findings.push(createFinding(
          'parallel_metadata_universes',
          severity,
          policyArea,
          'Module reads parallel metadata universes (files vs system-map tables) without a propagation/coverage contract',
          'Use the canonical metadata propagation coverage API before mixing `files`, `system_files`, or `file_dependencies` in the same runtime path.'
        ));
      }

      if (
        usesLegacySystemMapTables(currentSource) &&
        !importsCanonicalPropagationApi(currentSource) &&
        !normalizedPath.endsWith('/system-map-persistence.js') &&
        !normalizedPath.includes('/storage/repository/adapters/helpers/system-map/')
      ) {
        findings.push(createFinding(
          'legacy_system_map_without_coverage',
          severity,
          policyArea,
          'Module consumes legacy system-map tables without checking whether metadata propagation is healthy',
          'Call getSystemMapPersistenceCoverage before trusting `system_files` or `file_dependencies` in MCP/runtime code.'
        ));
      }
    }
  );
}
