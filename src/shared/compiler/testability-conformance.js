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

import {
  normalizePath,
  shouldScanCompilerFile,
  createPositionalFinding as createFinding,
  stripComments
} from './conformance-utils.js';


function importsCanonicalTestabilityApi(source = '') {
  return /evaluateAtomTestability|evaluateAtomRefactoringSignals|summarizeAtomTestability|compilerEvaluation\?\.(testability|testabilityScore)|testabilityScore|generate_tests|generate_batch_tests|suggest_refactoring|buildDeadCodeRemediation|buildCompilerDiagnostics/i.test(source);
}

function looksLikeManualTestabilityScan(source = '') {
  const sanitized = stripStrings(stripComments(source));
  return (
    /(testability|testabilityScore|untestable|hard to test|low testability)/i.test(sanitized) &&
    /(complexity|linesOfCode|isExported|archetype|god-function|pure|side effect)/i.test(sanitized)
  );
}

function looksLikeExportedComplexityHeuristic(source = '') {
  const sanitized = stripStrings(stripComments(source));
  return (
    /(isExported|exported)/.test(sanitized) &&
    /(complexity|linesOfCode|god-function|untestable|test helper)/i.test(sanitized)
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
