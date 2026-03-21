/**
 * @fileoverview Dead-code suspicion heuristics.
 *
 * @module shared/compiler/dead-code-suspicion
 */

import {
    isLowSignalDeadCodeName,
    normalizeDeadCodeAtom
} from './dead-code-normalization.js';
import {
    EXCLUDED_PURPOSES,
    EXCLUDED_FILE_PATTERNS
} from './dead-code-taxonomy.js';

function isAllowedDeadCodeType(type = '') {
    return ['function', 'arrow'].includes(type);
}

function isAllowedDeadCodeStatus(normalized) {
    return !normalized.isRemoved && !normalized.isDeadCode && !normalized.isTestCallback;
}

function isAllowedDeadCodeName(normalized) {
    return normalized.name !== 'constructor' && !isLowSignalDeadCodeName(normalized.name);
}

function isAllowedDeadCodePurpose(normalized) {
    return !EXCLUDED_PURPOSES.has(normalized.purpose);
}

function isAllowedDeadCodeFile(normalized) {
    return !EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(normalized.filePath));
}

function isAllowedDeadCodeConnectivity(normalized, allowExported) {
    if (normalized.isExported && !allowExported) return false;
    if (normalized.callersCount > 0 || normalized.calleesCount > 0) return false;
    if (normalized.calledBy.length > 0 || normalized.calls.length > 0) return false;
    return true;
}

export function isSuspiciousDeadCodeAtom(atom, options = {}) {
    const {
        minLines = 0,
        allowExported = false
    } = options;

    const normalized = normalizeDeadCodeAtom(atom);

    return isAllowedDeadCodeType(normalized.type) &&
        isAllowedDeadCodeStatus(normalized) &&
        normalized.linesOfCode >= minLines &&
        normalized.name !== 'constructor' &&
        isAllowedDeadCodeName(normalized) &&
        isAllowedDeadCodePurpose(normalized) &&
        isAllowedDeadCodeFile(normalized) &&
        isAllowedDeadCodeConnectivity(normalized, allowExported);
}
