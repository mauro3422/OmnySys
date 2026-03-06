/**
 * @fileoverview Canonical testability conformance heuristics.
 *
 * Detects compiler/runtime modules that start reasoning about low
 * testability, exported complexity or test-hostile helpers inline instead of
 * using a shared compiler policy.
 *
 * @module shared/compiler/testability-conformance
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

function importsCanonicalTestabilityApi(source = '') {
  return /testabilityScore|generate_tests|generate_batch_tests|suggest_refactoring|buildDeadCodeRemediation|buildCompilerDiagnostics/i.test(source);
}

function looksLikeManualTestabilityScan(source = '') {
  return (
    /(testability|testabilityScore|untestable|hard to test|low testability)/i.test(source) &&
    /(complexity|linesOfCode|isExported|archetype|god-function|pure|side effect)/i.test(source)
  );
}

function looksLikeExportedComplexityHeuristic(source = '') {
  return (
    /(isExported|exported)/.test(source) &&
    /(complexity|linesOfCode|god-function|untestable|test helper)/i.test(source)
  );
}

export function detectTestabilityConformanceFromSource(filePath, source = '', options = {}) {
  const {
    severity = 'medium',
    policyArea = 'testability'
  } = options;

  const normalizedPath = normalizePath(filePath);
  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  const findings = [];
  const usesCanonicalLayer = importsCanonicalTestabilityApi(source);

  if (looksLikeManualTestabilityScan(source) && !usesCanonicalLayer) {
    findings.push(createFinding(
      'manual_testability_scan',
      severity,
      policyArea,
      'Manual testability heuristic detected',
      'Promote testability checks to a canonical compiler API before watcher/MCP tools keep reimplementing low-testability logic inline.'
    ));
  }

  if (looksLikeExportedComplexityHeuristic(source) && !usesCanonicalLayer) {
    findings.push(createFinding(
      'manual_exported_complexity_testability',
      severity,
      policyArea,
      'Module mixes exported-API and complexity heuristics without a canonical testability policy',
      'Use a shared testability/reporting API instead of hardcoding exported complexity heuristics per consumer.'
    ));
  }

  return findings;
}
