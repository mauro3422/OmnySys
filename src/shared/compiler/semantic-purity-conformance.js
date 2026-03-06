/**
 * @fileoverview Canonical semantic purity conformance heuristics.
 *
 * Detects inline purity/side-effect heuristics in compiler/runtime modules so
 * helper classification can converge on one shared semantic policy.
 *
 * @module shared/compiler/semantic-purity-conformance
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

function importsCanonicalSemanticLayer(source = '') {
  return /evaluateAtomSemanticPurity|evaluateAtomRefactoringSignals|compilerEvaluation\?\.(semanticPurity|testability)|summarizeSemanticCoverage|semantic\.isPure|mutatesParams|usesThisContext|hasReturnValue|paramHints/.test(source);
}

function looksLikeManualPurityScan(source = '') {
  return (
    /(isPure|purity|side effect|side-effect|mutatesParams|usesThisContext|hasReturnValue)/i.test(source) &&
    /(semantic|helper|transformer|utility|return value|pure function)/i.test(source)
  );
}

function looksLikeManualMutationClassification(source = '') {
  return (
    /(mutatesParams|mutation|side effect|impure|this context)/i.test(source) &&
    /(classify|detect|summarize|heuristic|score)/i.test(source)
  );
}

export function detectSemanticPurityConformanceFromSource(filePath, source = '', options = {}) {
  const {
    severity = 'medium',
    policyArea = 'semantic_purity'
  } = options;

  const normalizedPath = normalizePath(filePath);
  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  const findings = [];
  const usesCanonicalLayer = importsCanonicalSemanticLayer(source);

  if (looksLikeManualPurityScan(source) && !usesCanonicalLayer) {
    findings.push(createFinding(
      'manual_semantic_purity_scan',
      severity,
      policyArea,
      'Manual semantic purity/side-effect scan detected',
      'Use a canonical semantic purity policy instead of reclassifying pure vs impure helpers inline.'
    ));
  }

  if (looksLikeManualMutationClassification(source) && !usesCanonicalLayer) {
    findings.push(createFinding(
      'manual_mutation_semantic_classification',
      severity,
      policyArea,
      'Manual mutation/side-effect classification detected',
      'Route mutation and side-effect classification through a shared semantic policy layer before more tools diverge.'
    ));
  }

  return findings;
}
