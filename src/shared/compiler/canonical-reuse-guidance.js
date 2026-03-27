/**
 * @fileoverview Canonical reuse guidance for compiler policy drift findings.
 *
 * Turns abstract drift findings into actionable reuse hints so agents and
 * watcher diagnostics can reconnect code to the canonical entrypoint instead
 * of only reporting that a policy was bypassed.
 *
 * @module shared/compiler/canonical-reuse-guidance
 */

import { AREA_FALLBACK_GUIDANCE, RULE_GUIDANCE } from './canonical-reuse-guidance-rules.js';

export function buildCanonicalReuseGuidance(finding = {}) {
  const byRule = RULE_GUIDANCE[finding?.rule];
  const byArea = AREA_FALLBACK_GUIDANCE[finding?.policyArea];
  const guidance = byRule || byArea || null;

  if (!guidance) {
    return null;
  }

  return {
    existingCanonicalEntryPoint: guidance.existingCanonicalEntryPoint,
    recommendedImport: guidance.recommendedImport,
    recommendedReplacement: guidance.recommendedReplacement
  };
}
