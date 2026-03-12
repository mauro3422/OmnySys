/**
 * @fileoverview Canonical architectural recommendation mapping.
 *
 * Translates low-level watcher/policy symptoms into the architectural action
 * that should be preferred by agents. This keeps recommendation wording
 * consistent across guards, backlog scoring and future MCP surfaces.
 *
 * @module shared/compiler/architectural-recommendations
 */

import { classifyFileOperationalRole } from './atom-role-classification.js';
import { buildCanonicalReuseGuidance } from './canonical-reuse-guidance.js';

const COORDINATOR_ROLES = new Set([
  'orchestrator',
  'coordinator',
  'builder',
  'analyzer',
  'resolver',
  'bridge',
  'policy'
]);

function isCoordinatorStyleRole(role = '') {
  return COORDINATOR_ROLES.has(role);
}

function getPrimaryPolicyFinding(context = {}) {
  if (Array.isArray(context.findings) && context.findings.length > 0) {
    return context.findings[0];
  }

  if (context.byRule) {
    const [rule] = Object.keys(context.byRule);
    if (rule) {
      return {
        rule,
        policyArea: context.byPolicyArea ? Object.keys(context.byPolicyArea)[0] : null
      };
    }
  }

  return null;
}

function buildThinCoordinatorRecommendation(role) {
  const roleLabel = role && role !== 'standard' ? role : 'coordinator';
  return {
    action: `Keep a thin ${roleLabel} and move checks, handlers or strategies into dedicated cohesive modules`,
    alternatives: [
      'Extract nested workflows into dedicated modules',
      'Leave routing/coordination in the top-level file and move branches into focused collaborators',
      'Prefer named helpers/modules over growing inline orchestration'
    ],
    strategy: 'thin_coordinator'
  };
}

function buildReexportRecommendation(guidance = null) {
  const canonicalAction = guidance?.recommendedReplacement
    || 'Call the canonical entrypoint directly instead of keeping a pass-through wrapper.';

  return {
    action: 'Prefer direct canonical calls or re-export with alias instead of a pass-through wrapper',
    alternatives: [
      canonicalAction,
      'If the module only exposes an existing API, re-export it with alias instead of wrapping it',
      'Only keep a wrapper when it adds validation, compatibility or a new stable contract'
    ],
    strategy: 'reexport_instead_of_wrapper'
  };
}

function buildCanonicalSurfaceRecommendation(guidance = null) {
  return {
    action: 'Stop recomposing an existing canonical surface locally; consume the canonical API instead',
    alternatives: [
      guidance?.recommendedReplacement || 'Reconnect this module to the existing canonical API before adding more local aggregation logic.',
      'Do not mix raw tables, local heuristics and support surfaces if a canonical snapshot/helper already exists',
      'If multiple callers need a new contract, promote it into the canonical layer and migrate callers together'
    ],
    strategy: 'canonical_surface_reuse'
  };
}

export function resolveArchitecturalRecommendation({
  issueType = '',
  filePath = '',
  context = {},
  operationalRole = null
} = {}) {
  const resolvedRole = operationalRole || classifyFileOperationalRole(filePath);
  const roleName = resolvedRole?.role || 'standard';

  if (
    isCoordinatorStyleRole(roleName)
    && (
      issueType.includes('code_complexity')
      || issueType.includes('code_function_length')
      || issueType.includes('code_file_size')
      || issueType.includes('sem_data_flow')
    )
  ) {
    return buildThinCoordinatorRecommendation(roleName);
  }

  const finding = getPrimaryPolicyFinding(context);
  const guidance = finding ? buildCanonicalReuseGuidance(finding) : null;

  if (
    finding?.rule === 'local_canonical_wrapper'
    || issueType.includes('canonical_wrapper')
  ) {
    return buildReexportRecommendation(guidance);
  }

  if (
    finding?.rule === 'canonical_diagnostics_bypass'
    || String(finding?.rule || '').startsWith('manual_')
    || issueType.includes('canonical_bypass')
    || issueType.includes('policy_drift')
  ) {
    return buildCanonicalSurfaceRecommendation(guidance);
  }

  return null;
}
