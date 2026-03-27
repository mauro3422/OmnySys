/**
 * @fileoverview Dead-code reporting, remediation and DB-backed summaries.
 *
 * @module shared/compiler/dead-code-reporting
 */

export {
  getFlaggedDeadCodeCount,
  getSuspiciousDeadCodeCount,
  getDeadCodePlausibilitySummary
} from './dead-code-reporting-summary.js';

export {
  loadSuspiciousDeadCodeCandidates,
  buildDeadCodeRemediation,
  buildDeadCodeRemediationPlan
} from './dead-code-reporting-remediation.js';
