import { matchesNamedPolicySurface } from '../transformers.js';
import {
  LAYER_A_PIPELINE_CANONICAL_FILE_MARKERS,
  LAYER_A_PIPELINE_CANONICAL_HELPER_NAMES,
  LAYER_A_PIPELINE_CANONICAL_FINGERPRINTS,
  WATCHER_ISSUE_CANONICAL_FILE_MARKERS,
  WATCHER_ISSUE_CANONICAL_HELPER_NAMES,
  WATCHER_ISSUE_CANONICAL_FINGERPRINTS,
  PIPELINE_HEALTH_CANONICAL_FILE_MARKER,
  PIPELINE_HEALTH_CANONICAL_NAMES,
  PIPELINE_HEALTH_CANONICAL_FINGERPRINTS
} from '../constants/index.js';

export function isLayerAPipelineCanonicalHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: LAYER_A_PIPELINE_CANONICAL_FILE_MARKERS,
    pathMode: 'endsWith',
    names: LAYER_A_PIPELINE_CANONICAL_HELPER_NAMES,
    fingerprints: LAYER_A_PIPELINE_CANONICAL_FINGERPRINTS
  });
}

export function isWatcherIssueCanonicalHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: WATCHER_ISSUE_CANONICAL_FILE_MARKERS,
    pathMode: 'endsWith',
    names: WATCHER_ISSUE_CANONICAL_HELPER_NAMES,
    fingerprints: WATCHER_ISSUE_CANONICAL_FINGERPRINTS
  });
}

export function isCanonicalPipelineHealthHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: [PIPELINE_HEALTH_CANONICAL_FILE_MARKER],
    pathMode: 'endsWith',
    names: PIPELINE_HEALTH_CANONICAL_NAMES,
    fingerprints: PIPELINE_HEALTH_CANONICAL_FINGERPRINTS
  });
}
