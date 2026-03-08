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
  createPositionalFinding as createFinding,
  stripComments,
  stripStrings
} from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';


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
  const hasTestabilitySignal =
    /(testability|testabilityScore|untestable|hard to test|test helper|test-hostile)/i.test(sanitized);
  const hasDecisionSignal =
    /(severity|threshold|recommendation|warning|issue|score|rank|classify|evaluate|untestable|hard to test)/i.test(sanitized) ||
    /(complexity|linesOfCode)\s*(>=|<=|>|<|===|!==)/.test(sanitized);

  return (
    hasTestabilitySignal &&
    /(isExported|exported)/.test(sanitized) &&
    /(complexity|linesOfCode|god-function|untestable|test helper)/i.test(sanitized) &&
    hasDecisionSignal
  );
}

export function detectTestabilityConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'testability' },
    ({ source: currentSource, severity, policyArea, findings }) => {
      const usesCanonicalLayer = importsCanonicalTestabilityApi(currentSource);

      if (looksLikeManualTestabilityScan(currentSource) && !usesCanonicalLayer) {
        findings.push(createFinding(
          'manual_testability_scan',
          severity,
          policyArea,
          'Manual testability heuristic detected',
          'Promote testability checks to a canonical compiler API before watcher/MCP tools keep reimplementing low-testability logic inline.'
        ));
      }

      if (looksLikeExportedComplexityHeuristic(currentSource) && !usesCanonicalLayer) {
        findings.push(createFinding(
          'manual_exported_complexity_testability',
          severity,
          policyArea,
          'Module mixes exported-API and complexity heuristics without a canonical testability policy',
          'Use a shared testability/reporting API instead of hardcoding exported complexity heuristics per consumer.'
        ));
      }
    }
  );
}
