/**
 * @fileoverview Compiler explainability cache invalidation helpers.
 *
 * Detects when compiler policy source files have changed to force
 * a fresh policy drift scan instead of serving stale cached results.
 *
 * @module shared/compiler/compiler-explainability-cache
 */

import { statSync } from 'fs';
import { join } from 'path';

// Files that trigger cache invalidation when modified
const COMPILER_POLICY_FILES = [
  'src/shared/compiler/semantic-surface-granularity-conformance.js',
  'src/shared/compiler/standardization-report/recommendations.js',
  'src/shared/compiler/compiler-observability-contract.js',
  'src/shared/compiler/compiler-explainability-loader.js',
];

let _lastCompilerPolicyCodeHash = null;

/**
 * Generates a hash based on modification times of compiler policy files.
 */
export function getCompilerPolicyCodeHash(projectPath) {
  try {
    const parts = COMPILER_POLICY_FILES.map((f) => {
      const full = join(projectPath, f);
      const st = statSync(full, { throwIfNoEntry: false });
      return st ? `${f}:${st.mtimeMs}` : '';
    });
    return parts.filter(Boolean).join('|');
  } catch {
    return null;
  }
}

/**
 * Checks if a force rescan is needed based on code changes.
 */
export function shouldForceRescan(projectPath, existingExplainability) {
  if (!existingExplainability) return true;
  const currentHash = getCompilerPolicyCodeHash(projectPath);
  if (!currentHash) return false;
  const previousHash = existingExplainability._compilerPolicyCodeHash;
  if (previousHash && previousHash !== currentHash) {
    return true;
  }
  return false;
}

/**
 * Gets the last known compiler policy code hash.
 */
export function getLastPolicyCodeHash() {
  return _lastCompilerPolicyCodeHash;
}

/**
 * Updates the last known compiler policy code hash.
 */
export function setLastPolicyCodeHash(hash) {
  _lastCompilerPolicyCodeHash = hash;
}

export default {
  getCompilerPolicyCodeHash,
  shouldForceRescan,
  getLastPolicyCodeHash,
  setLastPolicyCodeHash
};
