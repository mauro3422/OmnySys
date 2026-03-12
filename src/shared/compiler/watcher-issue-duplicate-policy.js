/**
 * @fileoverview Duplicate-policy helpers for watcher alert reconciliation.
 *
 * Keeps watcher storage focused on lifecycle orchestration while duplicate
 * policy decisions reuse the canonical duplicate-signal policy.
 *
 * @module shared/compiler/watcher-issue-duplicate-policy
 */

import {
  shouldIgnoreConceptualDuplicateFinding,
  shouldIgnoreStructuralDuplicateFinding
} from './duplicate-signal-policy.js';

function isConceptualFindingActionable(relativePath, finding) {
  const symbol = String(finding?.symbol || '').trim();
  const fingerprint = String(finding?.semanticFingerprint || '').trim();
  if (!symbol) {
    return false;
  }

  return !shouldIgnoreConceptualDuplicateFinding(relativePath, symbol, fingerprint);
}

function isStructuralFindingActionable(relativePath, finding) {
  const symbol = String(finding?.symbol || '').trim();
  if (!symbol) {
    return false;
  }

  return !shouldIgnoreStructuralDuplicateFinding(relativePath, symbol);
}

export function isAlertOutdatedByDuplicatePolicy(alert, relativePath) {
  const issueType = String(alert?.issueType || '');
  if (!issueType.startsWith('code_duplicate') && !issueType.startsWith('code_conceptual_duplicate')) {
    return false;
  }

  const context = (alert?.context && typeof alert.context === 'object') ? alert.context : {};
  const findings = Array.isArray(context.findings) ? context.findings : [];
  if (findings.length === 0) {
    return false;
  }

  const actionableFindings = findings.filter((finding) => {
    if (finding?.duplicateType === 'CONCEPTUAL_DUPLICATE' || issueType.startsWith('code_conceptual_duplicate')) {
      return isConceptualFindingActionable(relativePath, finding);
    }

    if (finding?.duplicateType === 'LOGIC_DUPLICATE') {
      return isStructuralFindingActionable(relativePath, finding);
    }

    return true;
  });

  return actionableFindings.length === 0;
}
