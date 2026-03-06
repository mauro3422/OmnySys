/**
 * @fileoverview Canonical remediation helpers for suspicious dead-code atoms.
 *
 * @module shared/compiler/dead-code-remediation
 */

import {
  getDeadCodeSqlPredicate,
  normalizeDeadCodeAtom
} from './dead-code-heuristics.js';
import {
  getSuspiciousDeadCodeCount
} from './dead-code-reporting.js';

function getDeadCodeActions(atom) {
  const actions = [];

  if (atom.isExported) {
    actions.push('Verify whether the export lost its import site during a refactor.');
    actions.push('If the export is intentionally dormant, mark it as deprecated with a removal owner.');
  } else {
    actions.push('Delete the atom if it is no longer referenced by production code.');
    actions.push('Wire the atom into the intended call path if it should still be active.');
  }

  if ((atom.linesOfCode || 0) >= 20) {
    actions.push('Check whether a duplicated implementation replaced this atom elsewhere in the graph.');
  }

  return actions;
}

export function loadSuspiciousDeadCodeCandidates(db, options = {}) {
  const {
    limit = 10,
    minLines = 5,
    allowExported = false
  } = options;

  return db.prepare(`
    SELECT
      a.id,
      a.name,
      a.file_path,
      a.atom_type,
      a.purpose_type,
      a.lines_of_code,
      a.is_exported,
      a.is_removed,
      a.is_dead_code,
      a.is_test_callback,
      a.callers_count,
      a.callees_count,
      a.called_by_json,
      a.calls_json
    FROM atoms a
    WHERE ${getDeadCodeSqlPredicate('a', { minLines, allowExported })}
    ORDER BY a.lines_of_code DESC, a.name ASC
    LIMIT ?
  `).all(limit);
}

export function buildDeadCodeRemediation(atom = {}) {
  const normalized = normalizeDeadCodeAtom(atom);

  return {
    id: normalized.id,
    name: normalized.name,
    file: normalized.filePath,
    linesOfCode: normalized.linesOfCode,
    isExported: normalized.isExported,
    diagnosis: normalized.isExported
      ? 'Exported atom appears disconnected from the live graph.'
      : 'Non-exported atom has no observed callers or callees in production code.',
    recommendedActions: getDeadCodeActions(normalized)
  };
}

export function buildDeadCodeRemediationPlan(db, options = {}) {
  const {
    limit = 10,
    minLines = 5,
    allowExported = false
  } = options;

  const items = loadSuspiciousDeadCodeCandidates(db, {
    limit,
    minLines,
    allowExported
  }).map(buildDeadCodeRemediation);

  return {
    totalCandidates: getSuspiciousDeadCodeCount(db, {
      alias: 'atoms',
      minLines,
      allowExported
    }),
    items,
    recommendation: items.length > 0
      ? 'Review suspicious dead-code atoms before deleting or rewiring them.'
      : 'No suspicious dead-code atoms detected.'
  };
}
