/**
 * @fileoverview Atom Semantic Analyzer — Language-Agnostic Core
 *
 * Enriches a raw atom object (from OmnySys metadata) with semantic properties
 * required by the test generator to produce accurate, non-trivial tests.
 *
 * This module is LANGUAGE-AGNOSTIC. Language-specific heuristics are injected
 * via the `analyzer` contract (see js-analyzer.js for the JS/TS implementation).
 *
 * The result of `analyzeAtomSemantics(atom, analyzer)` is a pure data object
 * (AtomSemantics) that is consumed by code-generator.js and test-utils.js.
 *
 * ── Adding a new language ─────────────────────────────────────────────────────
 * 1. Create `{lang}-analyzer.js` implementing the LanguageAnalyzer contract below.
 * 2. In `index.js`, select the analyzer based on atom.filePath extension.
 * 3. No changes needed in this file or any consumer.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @module generate-tests/atom-semantic-analyzer/core
 */

/**
 * LanguageAnalyzer contract — implement this for each language.
 *
 * @typedef {Object} LanguageAnalyzer
 * @property {(atom: Object) => boolean}         detectVoidReturn    — true if fn never returns a value
 * @property {(atom: Object) => string[]}        extractReturnLiterals — string/bool/num literals in return stmts
 * @property {(atom: Object) => string[]}        detectMutatedParams  — param names that are mutated (push/set/assign)
 * @property {(atom: Object) => boolean}         detectThisContext    — true if uses `this.xxx`
 * @property {(atom: Object) => ParamHint[]}     inferParamHints      — richer type/shape hints per param
 */

/**
 * @typedef {Object} ParamHint
 * @property {string}   name      — parameter name
 * @property {string}   type      — inferred type: 'object', 'string', 'boolean', 'number', 'function', 'ast-node', 'array', 'unknown'
 * @property {string[]} methods   — methods expected to be called on this param (e.g. ['addDependency', 'filePath'])
 * @property {boolean}  isMutated — true if the function mutates this param
 * @property {boolean}  isOptional — true if has a default or is used with optional chaining
 */

/**
 * @typedef {Object} AtomSemantics
 * @property {boolean}   hasReturnValue   — false for void functions
 * @property {string[]}  returnLiterals   — e.g. ['true', 'false', 'HEALTHY', 'null']
 * @property {string[]}  mutatedParams    — names of params that are mutated in-place
 * @property {boolean}   usesThisContext  — true if uses `this.xxx` (needs instance mock)
 * @property {ParamHint[]} paramHints     — enriched per-param info for argument generation
 * @property {boolean}   isVoidSideEffect — true if void AND has side effects (mutations+network)
 */

// ── Fallback no-op analyzer (used when no language match) ───────────────────

const NULL_ANALYZER = {
    detectVoidReturn: () => false,
    extractReturnLiterals: () => [],
    detectMutatedParams: () => [],
    detectThisContext: () => false,
    inferParamHints: (atom) =>
        (atom.dataFlow?.inputs || (atom.params || []).map(p => ({ name: p })))
            .map(p => ({ name: p.name || p, type: p.type || 'unknown', methods: [], isMutated: false, isOptional: false }))
};

// ── Core enrichment ─────────────────────────────────────────────────────────

/**
 * Enriches the atom with semantic properties for test generation.
 *
 * @param {Object}           atom     — Raw atom from OmnySys MCP
 * @param {LanguageAnalyzer} analyzer — Language-specific implementation
 * @returns {AtomSemantics}
 */
export function analyzeAtomSemantics(atom, analyzer = NULL_ANALYZER) {
    const hasReturnValue = !analyzer.detectVoidReturn(atom);
    const returnLiterals = analyzer.extractReturnLiterals(atom);
    const mutatedParams = analyzer.detectMutatedParams(atom);
    const usesThisContext = analyzer.detectThisContext(atom);
    const paramHints = analyzer.inferParamHints(atom);

    // A function that returns nothing and mutates/emits is a "void side-effect" function.
    // Tests for it should call it and inspect side effects (spy calls, state changes).
    const isVoidSideEffect = !hasReturnValue && (
        mutatedParams.length > 0 ||
        atom.hasSideEffects ||
        atom.hasNetworkCalls
    );

    return {
        hasReturnValue,
        returnLiterals,
        mutatedParams,
        usesThisContext,
        paramHints,
        isVoidSideEffect
    };
}

/**
 * Utility: Given AtomSemantics, build the most appropriate test assertion string.
 *
 * @param {AtomSemantics} semantics
 * @param {Object}        atom           — Raw atom (for name-based heuristics)
 * @param {'happy'|'edge'|'branch'} testType
 * @returns {string} — Vitest assertion code
 */
export function buildAssertionFromSemantics(semantics, atom, testType = 'happy') {
    const name = (atom.name || '').toLowerCase();

    // ── VOID functions ────────────────────────────────────────────────────────
    if (!semantics.hasReturnValue) {
        if (semantics.mutatedParams.length > 0) {
            // The test body should spy on the mutated param method — return a marker
            return `/* VOID_MUTATION:${semantics.mutatedParams.join(',')} */`;
        }
        return `expect(() => ${atom.name}).not.toThrow()`;
    }

    // ── Return literal contraction ────────────────────────────────────────────
    if (semantics.returnLiterals.length > 0) {
        const boolLits = semantics.returnLiterals.filter(l => l === 'true' || l === 'false');
        if (boolLits.length > 0) {
            return testType === 'happy'
                ? `expect(typeof result).toBe('boolean')`
                : `expect(result).toBe(false)`;
        }
        const stringLits = semantics.returnLiterals.filter(l => l !== 'null' && l !== 'undefined');
        if (stringLits.length > 0) {
            if (testType === 'happy') {
                // Use the first literal as the expected happy-path value
                return `expect([${stringLits.map(l => `'${l}'`).join(', ')}]).toContain(result)`;
            }
        }
    }

    // ── Name-based contracts ─────────────────────────────────────────────────
    if (/^(is|has|can|should|check|validate|verify)/.test(name)) {
        return `expect(typeof result).toBe('boolean')`;
    }
    if (/^(count|size|length|total|num)/.test(name)) {
        return `expect(typeof result).toBe('number')`;
    }
    if (/^(get|find|fetch|read|load|retrieve|select)/.test(name)) {
        if (testType === 'edge') return `expect(result).toBeNull()`;
        return `expect(result).toBeDefined()`;
    }
    if (/^(create|build|make|construct|generate|produce)/.test(name)) {
        return `expect(result).toEqual(expect.objectContaining({}))`;
    }

    return `expect(result).toBeDefined()`;
}
