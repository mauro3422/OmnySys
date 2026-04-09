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
  countMatches,
  createGuidedFinding
} from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';
import { getRecommendation } from './recommendations/RecommendationEngine.js';

function countSharedStateSignals(source = '') {
  return countMatches(
    source,
    /process\.env|window\.|globalThis\.|global\.|localStorage|sessionStorage|sharedState|shares_state|topContentionKeys|contention|global\.fetch/g
  );
}

function importsCanonicalSharedStateLayer(source = '') {
  return /shared[- ]state contention|topContentionKeys|buildCompilerStandardizationReport|summarizeSemanticCoverage|summarizeSharedStateHotspots|getSharedStateContentionSummary|getSemanticSurfaceGranularity|semanticSurface\.(legacyView|contract|fileLevel)|get_server_status|sharedState\./i.test(source);
}

function referencesHotspotKeys(source = '') {
  return /window\.PR_SHOULD_USE_CONTINUATION|global\.fetch|topContentionKeys|shared[- ]state contention/i.test(source);
}

function isRuntimeEnvConfigurationOnly(source = '') {
  const envReads = countMatches(source, /process\.env\.[A-Z0-9_]+|process\.env\[['"][A-Z0-9_]+['"]\]/g);
  const hotspotSpecificSignals = countMatches(source, /window\.PR_SHOULD_USE_CONTINUATION|topContentionKeys|contention|sharedState|shares_state|global\.fetch/g);
  return envReads > 0 && hotspotSpecificSignals === 0;
}

export function detectSharedStateHotspotConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'shared_state_hotspots' },
    ({ source: currentSource, severity, policyArea, findings }) => {
      const sharedStateSignals = countSharedStateSignals(currentSource);
      const usesCanonicalLayer = importsCanonicalSharedStateLayer(currentSource);
      const runtimeEnvConfigurationOnly = isRuntimeEnvConfigurationOnly(currentSource);

      if (referencesHotspotKeys(currentSource) && !usesCanonicalLayer) {
        findings.push(createGuidedFinding({
          rule: 'manual_shared_state_hotspot_key',
          severity,
          policyArea,
          message: 'Module references known shared-state hotspot keys directly',
          recommendation: getRecommendation({ type: 'shared_state_hotspot' }).message
        }));
      }

      if (
        sharedStateSignals >= 4 &&
        /sharedState|contention|global|window\.|process\.env/.test(currentSource) &&
        !usesCanonicalLayer &&
        !runtimeEnvConfigurationOnly
      ) {
        findings.push(createGuidedFinding({
          rule: 'manual_shared_state_hotspot_scan',
          severity,
          policyArea,
          message: `Module performs shared-state hotspot logic with ${sharedStateSignals} shared-state signals`,
          recommendation: getRecommendation({ type: 'shared_state_hotspot' }).message
        }));
      }
    }
  );
}
