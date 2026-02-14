/**
 * @fileoverview Audit Reporter
 * 
 * Generates audit reports
 * 
 * @module audit/reporters/audit-reporter
 */

import { SCORE_THRESHOLDS } from '../constants.js';

/**
 * Generate file audit report
 * @param {string} filePath - File path
 * @param {Object} checkResult - Field check result
 * @returns {Object} Audit report
 */
export function generateFileReport(filePath, checkResult) {
  const score = checkResult.maxScore > 0 
    ? Math.round((checkResult.score / checkResult.maxScore) * 100)
    : 0;

  return {
    file: filePath.split('/').pop(),
    path: filePath,
    missingFields: checkResult.missingFields,
    presentFields: checkResult.presentFields,
    hasCompleteContext: checkResult.missingFields.length === 0,
    score,
    maxScore: 100,
    rating: getRating(score)
  };
}

/**
 * Generate summary report
 * @param {Array} fileReports - File audit reports
 * @returns {Object} Summary
 */
export function generateSummary(fileReports) {
  const total = fileReports.length;
  const complete = fileReports.filter(r => r.hasCompleteContext).length;
  const incomplete = total - complete;
  const averageScore = total > 0 
    ? fileReports.reduce((sum, r) => sum + r.score, 0) / total
    : 0;

  return {
    total,
    complete,
    incomplete,
    averageScore: Math.round(averageScore * 10) / 10,
    completeness: total > 0 ? Math.round((complete / total) * 100) : 0,
    byRating: countByRating(fileReports)
  };
}

/**
 * Get rating from score
 */
function getRating(score) {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'GOOD';
  if (score >= SCORE_THRESHOLDS.ACCEPTABLE) return 'ACCEPTABLE';
  if (score >= SCORE_THRESHOLDS.POOR) return 'POOR';
  return 'CRITICAL';
}

/**
 * Count files by rating
 */
function countByRating(fileReports) {
  const counts = {};
  for (const report of fileReports) {
    counts[report.rating] = (counts[report.rating] || 0) + 1;
  }
  return counts;
}
