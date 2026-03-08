/**
 * @fileoverview Canonical duplicate signal policy helpers.
 *
 * Separates low-signal / contractual duplicate classification from duplicate
 * coordination so the compiler duplicate surface stays explicit.
 *
 * @module shared/compiler/duplicate-signal-policy
 */

import { normalizeFilePath } from './path-normalization.js';

const LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX = /^(anonymous(_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|sort_callback|get_arg\d+)$/i;
const LOW_SIGNAL_GENERATED_FINGERPRINT_ENTITY_REGEX = /:(anonymous(?:_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|sort_callback|get_arg\d+)$/i;

const LOW_SIGNAL_DATA_ACCESS_FINGERPRINTS = new Set([
    'get:core:atoms',
    'get:core:relations',
    'get:core:imports',
    'get:core:context',
    'get:core:count',
    'get:core:rows',
    'get:core:issue',
    'get:core:issues',
    'load:core:rows',
    'load:core:issue',
    'load:core:issues',
    'load:core:connections',
    'normalize:core:message'
]);

const DATA_ACCESS_PATH_MARKERS = [
    '/repository/',
    '/query/',
    '/storage/',
    '/guards/'
];

const DATA_ACCESS_NAME_PREFIXES = [
    'get',
    'load',
    'fetch',
    'list',
    'find',
    'select',
    'normalize'
];

const REPOSITORY_SURFACE_PATH_MARKERS = [
    '/storage/repository/',
    '/query/queries/file-query/',
    '/mcp/tools/semantic/'
];

const REPOSITORY_SURFACE_NAMES = new Set([
    'query',
    'getall',
    'findbyname',
    'findbyarchetype',
    'findbypurpose',
    'findsimilar',
    'updatevectors'
]);

const REPOSITORY_SURFACE_FINGERPRINTS = new Set([
    'process:core:query',
    'get:core:all',
    'find:core:name',
    'find:core:archetype',
    'find:core:purpose',
    'find:core:similar',
    'update:core:vectors'
]);

const GUARD_UTILITY_PATH_MARKERS = [
    '/file-watcher/guards/',
    '/shared/compiler/',
    '/logger',
    '/logging/'
];

const LOW_SIGNAL_GUARD_UTILITY_FINGERPRINTS = new Set([
    'detect:core:risk',
    'load:core:atoms',
    'load:core:rows',
    'process:core:log',
    'generate:core:recommendations',
    'build:core:context',
    'process:core:findings',
    'process:core:finding',
    'run:core:guard'
]);

const LOW_SIGNAL_GUARD_UTILITY_NAME_PREFIXES = [
    'detect',
    'debug',
    'log',
    'generate',
    'build',
    'collect',
    'coordinate',
    'persist',
    'run'
];

const STRUCTURAL_GUARD_PATH_MARKERS = [
    '/file-watcher/guards/',
    '/shared/compiler/'
];

function matchesAnyPrefix(value, prefixes) {
    return prefixes.some((prefix) => value.startsWith(prefix));
}

function normalizeDuplicateSignalInputs(filePath, atomName, semanticFingerprint) {
    return {
        normalizedPath: normalizeFilePath(filePath).toLowerCase(),
        normalizedName: String(atomName || '').toLowerCase(),
        fingerprint: String(semanticFingerprint || '').toLowerCase()
    };
}

export function isLowSignalGeneratedAtom(atomName, semanticFingerprint) {
    const normalizedName = String(atomName || '').toLowerCase();
    const fingerprint = String(semanticFingerprint || '').toLowerCase();

    return LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX.test(normalizedName) ||
        LOW_SIGNAL_GENERATED_FINGERPRINT_ENTITY_REGEX.test(fingerprint);
}

export function isLowSignalConceptualFingerprint(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    const isDataAccessPath = DATA_ACCESS_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    const isDataAccessName = matchesAnyPrefix(normalizedName, DATA_ACCESS_NAME_PREFIXES);

    return isDataAccessPath && isDataAccessName && LOW_SIGNAL_DATA_ACCESS_FINGERPRINTS.has(fingerprint);
}

export function isRepositoryContractSurface(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    const isRepositoryPath = REPOSITORY_SURFACE_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    if (!isRepositoryPath) return false;

    return REPOSITORY_SURFACE_NAMES.has(normalizedName) ||
        REPOSITORY_SURFACE_FINGERPRINTS.has(fingerprint);
}

export function isGuardUtilityConceptualFingerprint(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    const isGuardUtilityPath = GUARD_UTILITY_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    const isGuardUtilityName = matchesAnyPrefix(normalizedName, LOW_SIGNAL_GUARD_UTILITY_NAME_PREFIXES);

    return isGuardUtilityPath &&
        isGuardUtilityName &&
        LOW_SIGNAL_GUARD_UTILITY_FINGERPRINTS.has(fingerprint);
}

export function isCanonicalMcpToolRouter(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    const isMcpToolPath = normalizedPath.includes('/layer-c-memory/mcp/tools/') ||
        normalizedPath.includes('/layer-c-memory/mcp/core/shared/base-tools/');

    return isMcpToolPath &&
        normalizedName === 'performaction' &&
        fingerprint === 'process:core:action';
}

export function isLowSignalGuardStructuralHelper(filePath, atomName) {
    const normalizedPath = normalizeFilePath(filePath).toLowerCase();
    const normalizedName = String(atomName || '').toLowerCase();

    const isGuardPath = STRUCTURAL_GUARD_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    if (!isGuardPath) return false;

    return /^detect[a-z0-9]+risk$/i.test(normalizedName) ||
        /^load[a-z0-9]+(rows|atoms)$/i.test(normalizedName);
}

export function shouldIgnoreConceptualDuplicateFinding(filePath, atomName, semanticFingerprint) {
    return isLowSignalGeneratedAtom(atomName, semanticFingerprint) ||
        isCanonicalMcpToolRouter(filePath, atomName, semanticFingerprint) ||
        isRepositoryContractSurface(filePath, atomName, semanticFingerprint) ||
        isLowSignalConceptualFingerprint(filePath, atomName, semanticFingerprint) ||
        isGuardUtilityConceptualFingerprint(filePath, atomName, semanticFingerprint);
}

export function shouldIgnoreStructuralDuplicateFinding(filePath, atomName) {
    return isRepositoryContractSurface(filePath, atomName, null) ||
        isLowSignalGuardStructuralHelper(filePath, atomName);
}
