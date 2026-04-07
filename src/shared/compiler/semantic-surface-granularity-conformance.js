/**
 * @fileoverview Canonical semantic surface granularity conformance heuristics.
 *
 * Detects runtime/compiler modules that mix file-level semantic summaries and
 * atom-level semantic relations without going through the canonical contract
 * that explains their different granularity.
 *
 * @module shared/compiler/semantic-surface-granularity-conformance
 */

import {
  createPositionalFinding as createFinding,
  stripComments
} from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';


function usesSemanticConnectionsTable(source = '') {
  const sanitized = stripComments(source);
  return /\b(?:FROM|JOIN|INTO|UPDATE)\s+semantic_connections\b|prepare\(\s*[`'"][\s\S]{0,400}?\bsemantic_connections\b/.test(sanitized);
}

function usesAtomSemanticRelations(source = '') {
  const sanitized = stripComments(source);
  return /\b(?:FROM|JOIN)\s+atom_relations\b[\s\S]{0,300}?(shares_state|emits|listens)|prepare\(\s*[`'"][\s\S]{0,400}?\batom_relations\b[\s\S]{0,300}?(shares_state|emits|listens)/.test(sanitized);
}

function importsCanonicalGranularityApi(source = '') {
  return /getSemanticSurfaceGranularity/.test(source);
}

export function detectSemanticSurfaceGranularityConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'semantic_surface_granularity' },
    ({ normalizedPath, source: currentSource, severity, policyArea, findings }) => {
      const isExempt = (
        normalizedPath.endsWith('/semantic-surface-granularity-contract.js') ||
        normalizedPath.startsWith('src/shared/compiler/semantic-surface-granularity') ||
        normalizedPath.startsWith('src/shared/compiler/metadata-extraction-coverage') ||
        normalizedPath.startsWith('src/layer-c-memory/storage/repository/adapters/helpers/system-map/handlers/semantic-handler.js') ||
        normalizedPath.startsWith('src/layer-c-memory/query/queries/connections-query.js') ||
        normalizedPath.startsWith('src/shared/compiler/live-row-utils-queries.js')
      );

      if (isExempt) return;

      if (
        usesSemanticConnectionsTable(currentSource) &&
        !importsCanonicalGranularityApi(currentSource)
      ) {
        findings.push(createFinding(
          'raw_semantic_connections_summary',
          severity,
          policyArea,
          'Module reads semantic_connections directly without the canonical granularity contract',
          'Use getSemanticSurfaceGranularity before exposing file-level semantic summaries so callers know this is a coarse surface.'
        ));
      }

      if (
        usesSemanticConnectionsTable(currentSource) &&
        usesAtomSemanticRelations(currentSource) &&
        !importsCanonicalGranularityApi(currentSource)
      ) {
        findings.push(createFinding(
          'mixed_semantic_granularity',
          severity,
          policyArea,
          'Module mixes file-level semantic summaries with atom-level semantic relations without a canonical bridge',
          'Route semantic summary/detail comparisons through getSemanticSurfaceGranularity so file-level and atom-level telemetry are not treated as equivalent.'
        ));
      }
    }
  );
}
