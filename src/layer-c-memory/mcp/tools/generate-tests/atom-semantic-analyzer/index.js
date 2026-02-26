/**
 * @fileoverview Atom Semantic Analyzer — Public API
 *
 * Entry point for the `atom-semantic-analyzer` module.
 * Selects the correct language-specific analyzer based on file extension
 * and exposes the enriched `AtomSemantics` object to the test generator.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 * import { getAtomSemantics, buildAssertionFromSemantics } from './atom-semantic-analyzer/index.js';
 *
 * const semantics = getAtomSemantics(atom);
 * // semantics.hasReturnValue → false for void functions
 * // semantics.returnLiterals → ['HEALTHY', 'CRITICAL']
 * // semantics.mutatedParams  → ['change']
 * // semantics.paramHints     → [{ name: 'node', type: 'ast-node', methods: ['parent', 'type'] }]
 *
 * ── Adding a new language ────────────────────────────────────────────────────
 * 1. Create `{lang}-analyzer.js` implementing the LanguageAnalyzer contract.
 * 2. Add entry to ANALYZER_REGISTRY below.
 * 3. Done — no other file changes needed.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @module generate-tests/atom-semantic-analyzer
 */

import { analyzeAtomSemantics, buildAssertionFromSemantics } from './core.js';
import { JsAnalyzer } from './js-analyzer.js';

// ── Language analyzer registry ───────────────────────────────────────────────
// Map of file extensions (or language IDs) to their LanguageAnalyzer implementations.
// Add new entries here when supporting a new language.

const ANALYZER_REGISTRY = new Map([
    ['.js', JsAnalyzer],
    ['.mjs', JsAnalyzer],
    ['.cjs', JsAnalyzer],
    ['.ts', JsAnalyzer],  // TypeScript — same heuristics, richer type contracts
    ['.tsx', JsAnalyzer],
    // ['.py', PyAnalyzer],   ← future: Python
    // ['.go', GoAnalyzer],   ← future: Go
]);

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the enriched AtomSemantics object for a given atom.
 * The language is auto-detected from atom.filePath.
 *
 * @param {Object} atom — Raw OmnySys atom metadata
 * @returns {import('./core.js').AtomSemantics}
 */
export function getAtomSemantics(atom) {
    const ext = getExtension(atom?.filePath || '');
    const analyzer = ANALYZER_REGISTRY.get(ext) || null;
    return analyzeAtomSemantics(atom, analyzer);
}

/**
 * Convenience wrapper: returns the best assertion string given an atom.
 *
 * @param {Object} atom
 * @param {'happy'|'edge'|'branch'} testType
 * @returns {string}
 */
export function getAssertionForAtom(atom, testType = 'happy') {
    const semantics = getAtomSemantics(atom);
    return buildAssertionFromSemantics(semantics, atom, testType);
}

/**
 * Returns the analyzer that would be selected for a given filePath.
 * Useful for testing or debugging.
 *
 * @param {string} filePath
 * @returns {import('./core.js').LanguageAnalyzer | null}
 */
export function getAnalyzerForFile(filePath) {
    const ext = getExtension(filePath);
    return ANALYZER_REGISTRY.get(ext) || null;
}

// Re-export core utilities for direct use
export { analyzeAtomSemantics, buildAssertionFromSemantics } from './core.js';
export { JsAnalyzer } from './js-analyzer.js';

// ── Internal helpers ─────────────────────────────────────────────────────────

function getExtension(filePath) {
    const idx = filePath.lastIndexOf('.');
    return idx >= 0 ? filePath.slice(idx).toLowerCase() : '';
}
