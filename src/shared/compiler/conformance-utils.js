/**
 * @fileoverview conformance-utils.js
 * 
 * Shared utilities for compiler policy conformance checks.
 * Consolidates path normalization, file filtering, finding creation,
 * and source code cleaning to eliminate redundancy across the compiler layer.
 * 
 * @module shared/compiler/conformance-utils
 */

import {
    COMPILER_TARGET_DIRS,
    isCompilerRuntimeFile
} from './file-discovery.js';

/**
 * Normalizes a file path for consistent OS-agnostic comparison.
 * @param {string} filePath 
 * @returns {string}
 */
export function normalizePath(filePath = '') {
    return String(filePath || '').replace(/\\/g, '/');
}

/**
 * Determines if a file belongs to the compiler/runtime target directories.
 * @param {string} filePath 
 * @returns {boolean}
 */
export function shouldScanCompilerFile(filePath = '') {
    return isCompilerRuntimeFile(normalizePath(filePath), COMPILER_TARGET_DIRS);
}

/**
 * Creates a standard finding object for policy violations.
 * @param {Object} params
 */
export function createFinding({ rule, severity, policyArea, message, recommendation }) {
    return {
        rule,
        severity,
        policyArea,
        message,
        recommendation
    };
}

/**
 * Creates a standard finding object for policy violations using positional arguments.
 * (Legacy wrapper for consolidation)
 */
export function createPositionalFinding(rule, severity, policyArea, message, recommendation) {
    return createFinding({ rule, severity, policyArea, message, recommendation });
}

/**
 * Strips comments from JS source code.
 * @param {string} source 
 * @returns {string}
 */
export function stripComments(source = '') {
    return String(source || '')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Strips strings from JS source code to avoid false positives in regex checks.
 * @param {string} source 
 * @returns {string}
 */
export function stripStrings(source = '') {
    return String(source || '')
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

/**
 * Counts occurrences of a pattern in text.
 * @param {string} source 
 * @param {RegExp} pattern 
 * @returns {number}
 */
export function countMatches(source = '', pattern) {
    if (!pattern) return 0;
    return (source.match(pattern) || []).length;
}

/**
 * Count typical async pressure signals in source code.
 */
export function countAsyncPressureSignals(source = '') {
    return countMatches(
        source,
        /\bawait\b|Promise\.all|Promise\.race|Promise\.allSettled|setTimeout\(|setInterval\(|queueMicrotask\(|restartPromise|reconnectPromise|fetch\(|StreamableHTTP|spawn\(/g
    );
}

/**
 * Check if source has an explicit error boundary.
 */
export function hasExplicitErrorBoundary(source = '') {
    return (
        /\btry\s*\{/.test(source) ||
        /\.catch\s*\(/.test(source) ||
        /Promise\.allSettled/.test(source) ||
        /\bwithRetry\b|\bretryable\b|buildRestartLifecycleGuidance|buildCompilerReadinessStatus/.test(source)
    );
}

/**
 * Check if source looks like an async runtime flow.
 */
export function looksLikeAsyncRuntimeFlow(source = '') {
    return (
        /\basync\b/.test(source) ||
        /\bawait\b/.test(source) ||
        /Promise\./.test(source) ||
        /setTimeout\(|setInterval\(/.test(source)
    );
}
