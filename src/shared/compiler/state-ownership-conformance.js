/**
 * @fileoverview Canonical state ownership conformance heuristics.
 *
 * Detects when compiler/runtime modules start owning mutable state, singleton
 * lifecycles or ad-hoc registries inline instead of flowing through the
 * canonical ownership APIs.
 *
 * @module shared/compiler/state-ownership-conformance
 */

import {
  createPositionalFinding as createFinding
} from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';

function importsStateOwnershipApi(source = '') {
  return /getDaemonOwnerLockPath|writeDaemonOwnerLockSync|removeDaemonOwnerLockSync|readDaemonOwnerLock|waitForDaemonOwner|buildCompilerReadinessStatus|buildRestartLifecycleGuidance/.test(source);
}

function looksLikeManualSingletonLifecycle(source = '') {
  return (
    /let\s+\w+(Singleton|Instance|Manager|Registry|Cache)\s*=\s*null/.test(source) ||
    /if\s*\(!\w+(Singleton|Instance|Manager|Registry|Cache)\)/.test(source) ||
    /\bgetInstance\s*\(/.test(source)
  );
}

function looksLikeManualGlobalState(source = '') {
  return (
    /globalThis\.__|process\.__|global\.__/.test(source) ||
    /sharedCache\s*=\s*new\s+Map|sharedState\s*=\s*new\s+Map/.test(source)
  );
}

function looksLikeManualRegistryOwnership(source = '') {
  return (
    /const\s+\w+(Registry|Store|Index|Cache|State)\s*=\s*new\s+(Map|Set)\(/.test(source) &&
    /(set\(|get\(|delete\(|clear\()/.test(source)
  );
}

export function detectStateOwnershipConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'state_ownership' },
    ({ source: currentSource, severity, policyArea, findings }) => {
      const usesCanonicalApi = importsStateOwnershipApi(currentSource);

      if (looksLikeManualSingletonLifecycle(currentSource) && !usesCanonicalApi) {
        findings.push(createFinding(
          'manual_singleton_lifecycle',
          severity,
          policyArea,
          'Manual singleton/instance lifecycle detected',
          'Prefer canonical state ownership APIs or a dedicated ownership helper instead of introducing inline singleton state.'
        ));
      }

      if (looksLikeManualGlobalState(currentSource) && !usesCanonicalApi) {
        findings.push(createFinding(
          'manual_global_state',
          severity,
          policyArea,
          'Manual global/shared mutable state detected',
          'Route shared mutable state through canonical ownership APIs instead of ad-hoc globals or process-level bags.'
        ));
      }

      if (looksLikeManualRegistryOwnership(currentSource) && !usesCanonicalApi) {
        findings.push(createFinding(
          'manual_registry_ownership',
          severity,
          policyArea,
          'Manual registry/cache ownership detected',
          'Promote shared registries/caches to a canonical ownership layer before more modules start mutating them directly.'
        ));
      }
    }
  );
}
