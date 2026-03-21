/**
 * @fileoverview Dead-code normalization and suspicion heuristics.
 *
 * @module shared/compiler/dead-code-normalization
 */

import { LOW_SIGNAL_PATTERNS } from './dead-code-taxonomy.js';

function asBool(value) {
    return value === true || value === 1 || value === '1';
}

export function isLowSignalDeadCodeName(name = '') {
    return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(name));
}

export function normalizeDeadCodeAtom(atom = {}) {
    const calledBy = Array.isArray(atom.calledBy) ? atom.calledBy : [];
    const calls = Array.isArray(atom.calls) ? atom.calls : [];

    return {
        id: atom.id || null,
        name: atom.name || '',
        type: atom.type || atom.atom_type || null,
        purpose: atom.purpose || atom.purpose_type || null,
        filePath: atom.filePath || atom.file_path || '',
        linesOfCode: atom.linesOfCode || atom.lines_of_code || atom.loc || 0,
        isExported: asBool(atom.isExported ?? atom.is_exported),
        isRemoved: asBool(atom.isRemoved ?? atom.is_removed),
        isDeadCode: asBool(atom.isDeadCode ?? atom.is_dead_code),
        isTestCallback: asBool(atom.isTestCallback ?? atom.is_test_callback),
        callersCount: atom.callersCount ?? atom.callers_count ?? 0,
        calleesCount: atom.calleesCount ?? atom.callees_count ?? 0,
        calledBy,
        calls
    };
}
