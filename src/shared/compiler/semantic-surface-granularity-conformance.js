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
  COMPILER_TARGET_DIRS,
  isCompilerRuntimeFile
} from './file-discovery.js';

function normalizePath(filePath = '') {
  return String(filePath || '').replace(/\\/g, '/');
}

function shouldScanCompilerFile(filePath = '') {
  return isCompilerRuntimeFile(normalizePath(filePath), COMPILER_TARGET_DIRS);
}

function createFinding(rule, severity, policyArea, message, recommendation) {
  return {
    rule,
    severity,
    policyArea,
    message,
    recommendation
  };
}

function stripComments(source = '') {
  return String(source || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

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
  const {
    severity = 'medium',
    policyArea = 'semantic_surface_granularity'
  } = options;

  const normalizedPath = normalizePath(filePath);
  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  const findings = [];

  if (
    usesSemanticConnectionsTable(source) &&
    !importsCanonicalGranularityApi(source) &&
    !normalizedPath.endsWith('/semantic-surface-granularity.js')
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
    usesSemanticConnectionsTable(source) &&
    usesAtomSemanticRelations(source) &&
    !importsCanonicalGranularityApi(source) &&
    !normalizedPath.endsWith('/semantic-surface-granularity.js')
  ) {
    findings.push(createFinding(
      'mixed_semantic_granularity',
      severity,
      policyArea,
      'Module mixes file-level semantic summaries with atom-level semantic relations without a canonical bridge',
      'Route semantic summary/detail comparisons through getSemanticSurfaceGranularity so file-level and atom-level telemetry are not treated as equivalent.'
    ));
  }

  return findings;
}
