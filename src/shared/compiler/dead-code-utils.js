/**
 * @fileoverview Canonical dead-code helper barrel.
 *
 * @module shared/compiler/dead-code-utils
 */

export {
    isLowSignalDeadCodeName,
    normalizeDeadCodeAtom,
    getDeadCodeSqlPredicate,
    detectDeadCodeDrift
} from './dead-code-core.js';

export {
    getFlaggedDeadCodeCount,
    getSuspiciousDeadCodeCount,
    getDeadCodePlausibilitySummary,
    loadSuspiciousDeadCodeCandidates,
    buildDeadCodeRemediation,
    buildDeadCodeRemediationPlan
} from './dead-code-reporting.js';
