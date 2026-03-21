/**
 * @fileoverview Canonical entrypoint for dead-code heuristics.
 *
 * @module shared/compiler/dead-code-core
 */

export {
    isLowSignalDeadCodeName,
    normalizeDeadCodeAtom
} from './dead-code-normalization.js';

export {
    isSuspiciousDeadCodeAtom
} from './dead-code-suspicion.js';

export {
    getDeadCodeSqlPredicate
} from './dead-code-sql.js';

export {
    detectDeadCodeDrift
} from './dead-code-drift.js';
