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

function hasLiveConceptualDuplicate(db, relativePath, finding) {
  if (!db) {
    return null;
  }

  const symbol = String(finding?.symbol || '').trim();
  const fingerprint = String(finding?.semanticFingerprint || '').trim();
  if (!symbol || !fingerprint) {
    return false;
  }

  const rows = db.prepare(`
    SELECT a.name, a.file_path
    FROM atoms a
    WHERE a.file_path != ?
      AND json_extract(a.dna_json, '$.semanticFingerprint') = ?
      AND a.atom_type IN ('function', 'method', 'arrow')
      AND (a.is_removed IS NULL OR a.is_removed = 0)
      AND COALESCE(a.purpose_type, '') != 'REMOVED'
      AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
    ORDER BY a.file_path
    LIMIT 10
  `).all(relativePath, fingerprint);

  return rows.some((row) => {
    const peerSymbol = String(row?.name || '').trim();
    return (
      peerSymbol &&
      !shouldIgnoreConceptualDuplicateFinding(
        String(row?.file_path || '').trim(),
        peerSymbol,
        fingerprint
      )
    );
  });
}

function hasLiveStructuralDuplicate(db, relativePath, finding) {
  if (!db) {
    return null;
  }

  const symbol = String(finding?.symbol || '').trim();
  if (!symbol) {
    return false;
  }

  const rows = db.prepare(`
    SELECT a.name
    FROM atoms a
    WHERE a.file_path != ?
      AND a.name = ?
      AND a.atom_type IN ('function', 'method', 'arrow')
      AND (a.is_removed IS NULL OR a.is_removed = 0)
      AND COALESCE(a.purpose_type, '') != 'REMOVED'
      AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
    LIMIT 10
  `).all(relativePath, symbol);

  return rows.some((row) => {
    const peerSymbol = String(row?.name || '').trim();
    return peerSymbol && !shouldIgnoreStructuralDuplicateFinding(relativePath, peerSymbol);
  });
}

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

function isDuplicateAlertIssue(issueType) {
  return issueType.startsWith('code_duplicate') || issueType.startsWith('code_conceptual_duplicate');
}

function getAlertFindings(alert) {
  const context = (alert?.context && typeof alert.context === 'object') ? alert.context : {};
  return Array.isArray(context.findings) ? context.findings : [];
}

function isConceptualAlertFinding(issueType, finding) {
  return finding?.duplicateType === 'CONCEPTUAL_DUPLICATE' || issueType.startsWith('code_conceptual_duplicate');
}

function hasActionableLiveConceptualDuplicate(relativePath, finding, db) {
  if (!isConceptualFindingActionable(relativePath, finding)) {
    return false;
  }

  const hasLiveDuplicate = hasLiveConceptualDuplicate(db, relativePath, finding);
  return hasLiveDuplicate === null ? true : hasLiveDuplicate;
}

function hasActionableLiveStructuralDuplicate(relativePath, finding, db) {
  if (!isStructuralFindingActionable(relativePath, finding)) {
    return false;
  }

  const hasLiveDuplicate = hasLiveStructuralDuplicate(db, relativePath, finding);
  return hasLiveDuplicate === null ? true : hasLiveDuplicate;
}

function isActionableDuplicateFinding(issueType, relativePath, finding, db) {
  if (isConceptualAlertFinding(issueType, finding)) {
    return hasActionableLiveConceptualDuplicate(relativePath, finding, db);
  }

  if (finding?.duplicateType === 'LOGIC_DUPLICATE') {
    return hasActionableLiveStructuralDuplicate(relativePath, finding, db);
  }

  return true;
}

export function isAlertOutdatedByDuplicatePolicy(alert, relativePath, db = null) {
  const issueType = String(alert?.issueType || '');
  if (!isDuplicateAlertIssue(issueType)) {
    return false;
  }

  const findings = getAlertFindings(alert);
  if (findings.length === 0) {
    return false;
  }

  const actionableFindings = findings.filter((finding) => (
    isActionableDuplicateFinding(issueType, relativePath, finding, db)
  ));

  return actionableFindings.length === 0;
}
