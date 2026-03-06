/**
 * @fileoverview Canonical centrality coverage conformance heuristics.
 *
 * Detects modules that reason about graph centrality coverage or derived
 * graph physics inline instead of using a shared coverage policy.
 *
 * @module shared/compiler/centrality-coverage-conformance
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

function importsCoverageApi(source = '') {
  return /summarizeDerivedScoreCoverage|summarizePhysicsCoverageRow|classifyFieldCoverage/.test(source);
}

function looksLikeManualCentralityCoverage(source = '') {
  return (
    /(centralityPct|centrality_score|centralityScore|avgCentrality|centralityClassification)/.test(source) &&
    /(coverage|missingSignals|missingAtoms|nonZero|all zero|physics)/i.test(source)
  );
}

export function detectCentralityCoverageConformanceFromSource(filePath, source = '', options = {}) {
  const {
    severity = 'medium',
    policyArea = 'centrality_coverage'
  } = options;

  const normalizedPath = normalizePath(filePath);
  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  const findings = [];

  if (
    looksLikeManualCentralityCoverage(source) &&
    !importsCoverageApi(source) &&
    !normalizedPath.endsWith('/signal-coverage.js')
  ) {
    findings.push(createFinding(
      'manual_centrality_coverage_scan',
      severity,
      policyArea,
      'Manual centrality coverage/physics scan detected',
      'Use the canonical signal coverage APIs for centrality/physics coverage instead of rebuilding coverage heuristics inline.'
    ));
  }

  return findings;
}
