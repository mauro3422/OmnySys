/**
 * @fileoverview Propagation Completeness Scanner
 *
 * Proactively scans the codebase to detect patterns that SHOULD propagate
 * but DON'T. Unlike the reactive policy-drift system (which detects when
 * existing contracts drift), this system detects when NEW patterns need
 * expansion across the codebase.
 *
 * Works as an additional signal in the drift assessment pipeline.
 * Auto-loads source files from disk when sourceCache is not provided.
 *
 * @module shared/compiler/propagation-completeness-scanner
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

// ── Pattern Registry: defines what "should propagate" ──────────────────────

const PROPAGATION_CONTRACTS = [
  {
    id: 'delegation_wrapper_roles',
    label: 'Delegation wrapper roles',
    description: 'When a new role (wrapper, adapter, etc.) is added to atom-role-classification, it should also appear in dataflow-skip heuristics',
    sources: [
      { path: 'src/shared/compiler/atom-role-classification.js', check: 'hasRoleMatcher' },
      { path: 'src/core/file-watcher/guards/integrity-guard/dataflow-skip.js', check: 'hasRoleInSkip' }
    ]
  },
  {
    id: 'integrity_guard_patterns',
    label: 'Integrity guard skip patterns',
    description: 'When new atom patterns are added (Logger, Operation), they should be reflected in the skip logic',
    sources: [
      { path: 'src/core/file-watcher/guards/integrity-guard/dataflow-skip.js', check: 'hasPatternDetection' },
      { path: 'src/core/file-watcher/guards/integrity-guard/dataflow-context.js', check: 'hasContextRecognition' }
    ]
  }
];

// ── Source loading ─────────────────────────────────────────────────────────

function loadSourceFile(relPath) {
  try {
    const fullPath = path.join(projectRoot, relPath);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch {
    return '';
  }
}

function ensureSourceCache(sourceCache) {
  if (sourceCache && sourceCache.size > 0) return sourceCache;
  const cache = new Map();
  for (const contract of PROPAGATION_CONTRACTS) {
    for (const src of contract.sources) {
      if (!cache.has(src.path)) {
        cache.set(src.path, loadSourceFile(src.path));
      }
    }
  }
  return cache;
}

// ── Detection heuristics ───────────────────────────────────────────────────

function findRoleDefinitions(source) {
  const roles = new Set();
  const roleMatcherRegex = /role:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = roleMatcherRegex.exec(source)) !== null) {
    roles.add(match[1]);
  }
  return Array.from(roles);
}

function findRolesInSkipLogic(source) {
  const roles = new Set();
  const skipRoleRegex = /resolvedRole\.role\s*===\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = skipRoleRegex.exec(source)) !== null) {
    roles.add(match[1]);
  }
  return Array.from(roles);
}

function findPatternDetections(source) {
  const patterns = new Set();
  const patternRegex = /isLikely(\w+)Atom|\/(\w+)\$\/\.test|\/(\w+)\//g;
  let match;
  while ((match = patternRegex.exec(source)) !== null) {
    const p = match[1] || match[2] || match[3];
    if (p) patterns.add(p);
  }
  return Array.from(patterns);
}

// ── Contract violation detection ───────────────────────────────────────────

function checkRolePropagationGap(roleDefinitions, roleSkipLogic) {
  const missing = roleDefinitions.filter(r => !roleSkipLogic.includes(r));
  return missing.filter(r => !['standard', 'storage', 'adapter', 'transformer', 'bridge', 'policy'].includes(r));
}

function checkPatternExpansionGap(detectionsInSkip, detectionsInContext) {
  const missing = detectionsInSkip.filter(p => !detectionsInContext.includes(p));
  return missing;
}

// ── Main scanner ───────────────────────────────────────────────────────────

/**
 * Scans the codebase for propagation completeness gaps.
 * Auto-loads source files from disk when sourceCache is not provided.
 *
 * @param {Object} options
 * @param {Map<string, string>} [options.sourceCache] - Map of filePath → source code (auto-loaded if not provided)
 * @returns {Array} Array of propagation completeness signals
 */
export function scanPropagationCompleteness(options = {}) {
  const sourceCache = ensureSourceCache(options.sourceCache);
  const signals = [];

  // Check 1: Role propagation (atom-role-classification → dataflow-skip)
  const roleClassifierSource = sourceCache.get('src/shared/compiler/atom-role-classification.js') || '';
  const dataflowSkipSource = sourceCache.get('src/core/file-watcher/guards/integrity-guard/dataflow-skip.js') || '';

  if (roleClassifierSource && dataflowSkipSource) {
    const definedRoles = findRoleDefinitions(roleClassifierSource);
    const skipRoles = findRolesInSkipLogic(dataflowSkipSource);
    const missingRoles = checkRolePropagationGap(definedRoles, skipRoles);

    if (missingRoles.length > 0) {
      signals.push({
        key: 'propagation_completeness',
        label: 'Propagation Completeness',
        sourceOfTruth: 'propagation-completeness-scanner',
        state: 'incomplete',
        healthy: false,
        trustworthy: true,
        severity: 'medium',
        reason: `${missingRoles.length} role(s) defined in atom-role-classification but missing from dataflow-skip: ${missingRoles.join(', ')}`,
        recommendation: 'Add the missing roles to shouldSkipDataFlowViolation() in dataflow-skip.js so the watcher recognizes them as intentional delegation patterns.',
        evidence: {
          missingRoles,
          definedRoles,
          skipRoles,
          completenessPct: Math.round((skipRoles.filter(r => definedRoles.includes(r)).length / definedRoles.length) * 100)
        }
      });
    } else {
      signals.push({
        key: 'propagation_completeness',
        label: 'Propagation Completeness',
        sourceOfTruth: 'propagation-completeness-scanner',
        state: 'complete',
        healthy: true,
        trustworthy: true,
        severity: 'info',
        reason: 'All defined roles are properly propagated to skip logic.',
        recommendation: 'Keep role definitions synchronized with dataflow skip patterns.',
        evidence: {
          definedRoles,
          skipRoles,
          completenessPct: 100
        }
      });
    }
  }

  return signals;
}

/**
 * Build a propagation completeness signal for drift assessment.
 * Integrates with the existing propagationExpansionSignal pattern.
 * Auto-loads sources from disk — no caller changes needed.
 */
export function buildPropagationCompletenessSignal() {
  const signals = scanPropagationCompleteness();
  const completenessSignal = signals.find(s => s.key === 'propagation_completeness');

  if (!completenessSignal) {
    return {
      key: 'propagation_completeness',
      label: 'Propagation Completeness',
      sourceOfTruth: 'propagation-completeness-scanner',
      state: 'unknown',
      healthy: true,
      trustworthy: false,
      severity: 'info',
      reason: 'Propagation completeness scanner could not analyze sources.',
      recommendation: 'Ensure source cache includes atom-role-classification.js and dataflow-skip.js.',
      evidence: { completenessPct: null }
    };
  }

  return completenessSignal;
}
