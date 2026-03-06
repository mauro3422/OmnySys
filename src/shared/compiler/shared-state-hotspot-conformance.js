/**
 * @fileoverview Canonical shared-state hotspot conformance heuristics.
 *
 * Detects compiler/runtime modules that bind too directly to shared/global
 * state keys or contention-heavy primitives instead of going through a
 * canonical shared-state reporting layer.
 *
 * @module shared/compiler/shared-state-hotspot-conformance
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

function countMatches(source = '', pattern) {
  return (source.match(pattern) || []).length;
}

function countSharedStateSignals(source = '') {
  return countMatches(
    source,
    /process\.env|window\.|globalThis\.|global\.|localStorage|sessionStorage|sharedState|shares_state|topContentionKeys|contention|global\.fetch/g
  );
}

function importsCanonicalSharedStateLayer(source = '') {
  return /shared[- ]state contention|topContentionKeys|buildCompilerStandardizationReport|summarizeSemanticCoverage|get_server_status|sharedState\./i.test(source);
}

function referencesHotspotKeys(source = '') {
  return /window\.PR_SHOULD_USE_CONTINUATION|process\.env|global\.fetch/.test(source);
}

export function detectSharedStateHotspotConformanceFromSource(filePath, source = '', options = {}) {
  const {
    severity = 'medium',
    policyArea = 'shared_state_hotspots'
  } = options;

  const normalizedPath = normalizePath(filePath);
  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  const findings = [];
  const sharedStateSignals = countSharedStateSignals(source);
  const usesCanonicalLayer = importsCanonicalSharedStateLayer(source);

  if (referencesHotspotKeys(source) && !usesCanonicalLayer) {
    findings.push(createFinding(
      'manual_shared_state_hotspot_key',
      severity,
      policyArea,
      'Module references known shared-state hotspot keys directly',
      'Read hotspot/shared-state contention through a canonical reporting API instead of hardcoding hot keys inline.'
    ));
  }

  if (
    sharedStateSignals >= 4 &&
    /sharedState|contention|global|window\.|process\.env/.test(source) &&
    !usesCanonicalLayer
  ) {
    findings.push(createFinding(
      'manual_shared_state_hotspot_scan',
      severity,
      policyArea,
      `Module performs shared-state hotspot logic with ${sharedStateSignals} shared-state signals`,
      'Promote shared-state hotspot analysis to a canonical compiler API before more runtime modules consume shared state ad hoc.'
    ));
  }

  return findings;
}
