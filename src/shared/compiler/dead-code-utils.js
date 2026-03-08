/**
 * @fileoverview Canonical heuristics, reporting, and remediation for suspicious 
 * dead-code atoms (orphaned functions/arrows).
 *
 * @module shared/compiler/dead-code-utils
 */

import {
    buildStandardPlan,
    buildStandardItem
} from './remediation-plan-builder.js';
import {
    stripComments,
    stripStrings
} from './conformance-utils.js';

const LOW_SIGNAL_PATTERNS = [
    /^anonymous(_\d+)?$/i,
    /^.*_callback$/i,
    /_arg\d+$/i,
    /^(then|catch|map|filter|some|reduce|find)_callback$/i
];

const SQLITE_LOW_SIGNAL_GLOBS = [
    "name NOT GLOB 'anonymous*'",
    "name NOT GLOB '*_callback'",
    "name NOT GLOB '*_arg*'",
    "name NOT GLOB 'then_callback'",
    "name NOT GLOB 'catch_callback'",
    "name NOT GLOB 'map_callback'",
    "name NOT GLOB 'filter_callback'",
    "name NOT GLOB 'some_callback'",
    "name NOT GLOB 'reduce_callback'",
    "name NOT GLOB 'find_callback'"
];

const EXCLUDED_PURPOSES = new Set([
    'ENTRY_POINT',
    'WORKER_ENTRY',
    'SERVER_HANDLER',
    'EVENT_HANDLER',
    'TIMER_ASYNC',
    'NETWORK_HANDLER',
    'SCRIPT_MAIN',
    'ANALYSIS_SCRIPT',
    'TEST_HELPER',
    'FACTORY',
    'WRAPPER'
]);

const EXCLUDED_FILE_PATTERNS = [
    /mcp-.*proxy/i,
    /mcp-.*server/i,
    /mcp-.*bridge/i,
    /error-guardian/i,
    /initialization\/steps/i
];

const MANUAL_DEAD_CODE_PATTERNS = [
    /(callers_count|callees_count|called_by_json|calls_json)/,
    /(dead code|orphan|unused function|suspicious atoms|suspicious dead)/i
];

const CANONICAL_DEAD_CODE_RESOURCES = [
    /getSuspiciousDeadCodeCount/,
    /getDeadCodePlausibilitySummary/,
    /getDeadCodeSqlPredicate/,
    /deadCodeSummary\.(flaggedDeadCode|suspiciousDeadCandidates|warning)/
];

function asBool(value) {
    return value === true || value === 1 || value === '1';
}

function parseArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || value === '[]') return [];
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

export function isLowSignalDeadCodeName(name = '') {
    return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(name));
}

export function normalizeDeadCodeAtom(atom = {}) {
    const calledBy = parseArray(atom.calledBy ?? atom.called_by_json);
    const calls = parseArray(atom.calls ?? atom.calls_json);

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
        callersCount: atom.callersCount ?? atom.callers_count ?? calledBy.length ?? 0,
        calleesCount: atom.calleesCount ?? atom.callees_count ?? calls.length ?? 0,
        calledBy,
        calls
    };
}

export function isSuspiciousDeadCodeAtom(atom, options = {}) {
    const {
        minLines = 0,
        allowExported = false
    } = options;

    const normalized = normalizeDeadCodeAtom(atom);

    if (!['function', 'arrow'].includes(normalized.type)) return false;
    if (normalized.isRemoved || normalized.isDeadCode) return false;
    if (normalized.isTestCallback) return false;
    if (normalized.linesOfCode < minLines) return false;
    if (normalized.name === 'constructor') return false;
    if (isLowSignalDeadCodeName(normalized.name)) return false;
    if (EXCLUDED_PURPOSES.has(normalized.purpose)) return false;
    if (EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(normalized.filePath))) return false;
    if (normalized.isExported && !allowExported) return false;
    if (normalized.callersCount > 0 || normalized.calleesCount > 0) return false;
    if (normalized.calledBy.length > 0 || normalized.calls.length > 0) return false;

    return true;
}

export function getDeadCodeSqlPredicate(alias = 'a', { minLines = 0, allowExported = false } = {}) {
    const prefix = `${alias}.`;
    const exportClause = allowExported ? '' : `AND COALESCE(${prefix}is_exported, 0) = 0`;
    const lineClause = minLines > 0 ? `AND COALESCE(${prefix}lines_of_code, 0) >= ${minLines}` : '';
    const excludedPurposes = [...EXCLUDED_PURPOSES].map((value) => `'${value}'`).join(',');
    const lowSignalClause = SQLITE_LOW_SIGNAL_GLOBS
        .map((condition) => condition.replaceAll('name', `${prefix}name`))
        .join('\n          AND ');

    return `
      ${prefix}file_path LIKE 'src/%'
      AND ${prefix}atom_type IN ('function', 'arrow')
      AND (${prefix}is_removed IS NULL OR ${prefix}is_removed = 0)
      AND (${prefix}is_dead_code IS NULL OR ${prefix}is_dead_code = 0)
      AND COALESCE(${prefix}is_test_callback, 0) = 0
      ${exportClause}
      ${lineClause}
      AND (${prefix}purpose_type IS NULL OR ${prefix}purpose_type NOT IN (${excludedPurposes}))
      AND ${lowSignalClause}
      AND COALESCE(${prefix}callers_count, 0) = 0
      AND COALESCE(${prefix}callees_count, 0) = 0
      AND (${prefix}called_by_json IS NULL OR ${prefix}called_by_json = '' OR ${prefix}called_by_json = '[]')
      AND (${prefix}calls_json IS NULL OR ${prefix}calls_json = '' OR ${prefix}calls_json = '[]')
  `;
}

/**
 * Detecta si un código está reimplementando lógica de escaneo de dead code
 * de forma manual en lugar de usar las APIs canónicas.
 */
export function detectDeadCodeDrift(source = '', filePath = '') {
    const findings = [];
    const sanitizedSource = stripStrings(stripComments(source));
    const hasManualLogic = MANUAL_DEAD_CODE_PATTERNS.every((pattern) => pattern.test(sanitizedSource));
    const hasCanonicalUse = CANONICAL_DEAD_CODE_RESOURCES.some((pattern) => pattern.test(sanitizedSource));

    if (hasManualLogic && !hasCanonicalUse && !filePath.endsWith('/dead-code-utils.js')) {
        findings.push({
            rule: 'manual_dead_code_scan',
            severity: 'medium',
            policyArea: 'dead_code',
            message: 'Manual dead-code candidate scan detected',
            recommendation: 'Use getSuspiciousDeadCodeCount / getDeadCodePlausibilitySummary from shared/compiler instead of rebuilding dead-code heuristics inline.'
        });
    }

    return findings;
}

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

    return buildStandardItem({
        id: normalized.id,
        name: normalized.name,
        file: normalized.filePath,
        diagnosis: normalized.isExported
            ? 'Exported atom appears disconnected from the live graph.'
            : 'Non-exported atom has no observed callers or callees in production code.',
        actions: getDeadCodeActions(normalized),
        linesOfCode: normalized.linesOfCode,
        isExported: normalized.isExported
    });
}

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

    return buildStandardPlan({
        total: getSuspiciousDeadCodeCount(db, {
            alias: 'atoms',
            minLines,
            allowExported
        }),
        items,
        recommendation: 'Review suspicious dead-code atoms before deleting or rewiring them.',
        emptyRecommendation: 'No suspicious dead-code atoms detected.'
    });
}
