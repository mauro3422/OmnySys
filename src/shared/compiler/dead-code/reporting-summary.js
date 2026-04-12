/**
 * @fileoverview Dead-code counts and plausibility summaries.
 *
 * @module shared/compiler/dead-code-reporting-summary
 */

import { getDeadCodeSqlPredicate } from './core.js';

export function getFlaggedDeadCodeCount(db, options = {}) {
  const { fileGlob = 'src/%' } = options;

  return db.prepare(`
    SELECT COUNT(*) AS total
    FROM atoms
    WHERE is_dead_code = 1
      AND file_path LIKE ?
  `).get(fileGlob)?.total || 0;
}

export function getSuspiciousDeadCodeCount(db, options = {}) {
  const {
    alias = 'atoms',
    minLines = 5,
    allowExported = false
  } = options;

  return db.prepare(`
    SELECT COUNT(*) AS total
    FROM atoms
    WHERE ${getDeadCodeSqlPredicate(alias, { minLines, allowExported })}
  `).get()?.total || 0;
}

export function getDeadCodePlausibilitySummary(db, options = {}) {
  const {
    suspiciousThreshold = 50,
    minLines = 5,
    allowExported = false
  } = options;

  const flaggedDeadCode = getFlaggedDeadCodeCount(db, options);
  const suspiciousDeadCandidates = getSuspiciousDeadCodeCount(db, {
    alias: 'atoms',
    minLines,
    allowExported
  });

  return {
    flaggedDeadCode,
    suspiciousDeadCandidates,
    hasCoverageGap: flaggedDeadCode === 0 && suspiciousDeadCandidates > suspiciousThreshold,
    warning: flaggedDeadCode === 0 && suspiciousDeadCandidates > suspiciousThreshold
      ? {
          field: 'dead_code',
          coverage: `${suspiciousDeadCandidates} suspicious atoms`,
          issue: 'Dead code detector reports zero dead atoms, but many production atoms look fully disconnected'
        }
      : null
  };
}
