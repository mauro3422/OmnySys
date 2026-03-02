/**
 * @fileoverview JS/TS Semantic Analyzer — LanguageAnalyzer implementation
 *
 * Implements the LanguageAnalyzer contract from core.js for JavaScript and TypeScript.
 * All data is derived from the OmnySys atom metadata — no source code re-parsing needed.
 *
 * Data sources used:
 *   • atom.dataFlow.inputs     — declared parameters
 *   • atom.dataFlow.outputs    — return/side-effect nodes
 *   • atom.callGraph.callsList — list of functions called by this atom
 *   • atom.params              — Tree-sitter fallback params array
 *   • atom.typeContracts       — JSDoc-inferred return types
 *   • atom.hasSideEffects      — pre-computed side-effect flag
 *
 * @module generate-tests/atom-semantic-analyzer/js-analyzer
 */

// ── Void return detection ─────────────────────────────────────────────────────

// Precompiled regex for performance
const REGEX_VOID_METHODS = /^(set|init|register|add|push|emit|dispatch|mount|bind|attach|handle|load|save|delete|remove|reset|clear|update|notify)/;

/**
 * Detects whether a JS function is void (no return value).
 * Priority chain:
 *   1. `dataFlow.outputs` has a `return` type node → not void
 *   2. `typeContracts.returns` is 'void' or missing → void
 *   3. DNA operation sequence doesn't include 'return' → void
 *   4. Function name patterns that are structurally setters/mutators → void
 */
export function detectVoidReturn(atom) {
    const outputs = atom.dataFlow?.outputs || atom.dataFlow?.real?.outputs || [];
    const hasReturnNode = outputs.some(o => o.type === 'return' && o.value !== undefined);

    if (hasReturnNode) return false;  // definitely has a return

    // typeContracts from JSDoc
    const returnType = (atom.typeContracts?.returns?.type || '').toLowerCase();
    if (returnType === 'void' || returnType === '') {
        // Confirm with DNA
        const dnaOps = atom.dna?.operationSequence || [];
        if (!dnaOps.includes('return')) {
            return true;  // DNA agrees: no return
        }
    }

    // Name patterns for structural setters and initializers that never return
    const name = atom.name || '';
    if (REGEX_VOID_METHODS.test(name)) {
        // Only void if also no outputs
        if (outputs.length === 0) return true;
    }

    // If outputs exist but none are 'return' type → void (only side effects)
    if (outputs.length > 0 && outputs.every(o => o.isSideEffect || o.type === 'side_effect')) {
        return true;
    }

    return false;
}

// ── Return literal extraction ────────────────────────────────────────────────

// Precompiled regex for performance
const REGEX_QUOTED_STR = /^['"]/;
const REGEX_ENUM_CAPS = /^[A-Z_]{2,}$/;
const REGEX_NUMBER = /^-?\d+(\.\d+)?$/;

/**
 * Extracts string/boolean/number literals present in return statements.
 * Used to build realistic assertions like `expect(result).toBe('HEALTHY')`.
 */
export function extractReturnLiterals(atom) {
    const outputs = atom.dataFlow?.outputs || atom.dataFlow?.real?.outputs || [];
    const literals = [];

    for (const output of outputs) {
        if (output.type !== 'return' || !output.value) continue;
        const v = String(output.value).trim();

        // Filter out non-literal patterns
        if (v === '<null()>' || v === 'undefined' || v.startsWith('<') || v.includes('(')) continue;

        // Keep: 'true', 'false', string literals, known enum-like strings
        if (v === 'true' || v === 'false' || v === 'null') {
            literals.push(v);
        } else if (REGEX_QUOTED_STR.test(v)) {
            // Quoted string literal
            literals.push(v.replace(/['"]/g, ''));
        } else if (REGEX_ENUM_CAPS.test(v)) {
            // ALL_CAPS enum constant (e.g. 'HEALTHY', 'CRITICAL', 'WARN')
            literals.push(v);
        } else if (REGEX_NUMBER.test(v)) {
            literals.push(v);
        }
    }

    // Deduplicate
    return [...new Set(literals)];
}

// ── Mutated parameter detection ──────────────────────────────────────────────

// Methods that signal in-place mutation of an object parameter
const MUTATION_METHODS = new Set([
    'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse',
    'set', 'delete', 'add', 'clear',
    'addDependency', 'addDependent', 'register', 'append',
    'assign', 'merge', 'extend', 'patch',
    'write', 'save', 'update', 'reset'
]);

/**
 * Detects which params are mutated by the function.
 * Strategy: find calls of the form `param.method(...)` where method is in MUTATION_METHODS.
 */
export function detectMutatedParams(atom) {
    const calls = atom.callGraph?.callsList || atom.calls || [];
    const inputs = getInputNames(atom);
    const mutated = new Set();

    for (const call of calls) {
        const callee = call.name || call.callee || '';
        const dotIdx = callee.indexOf('.');
        if (dotIdx === -1) continue;

        const objPart = callee.slice(0, dotIdx);
        const methodPart = callee.slice(dotIdx + 1);

        if (inputs.has(objPart) && MUTATION_METHODS.has(methodPart)) {
            mutated.add(objPart);
        }
    }

    return [...mutated];
}

// ── This-context detection ───────────────────────────────────────────────────

/**
 * Detects if atom uses `this.xxx` — indicating it needs a class instance to run.
 */
export function detectThisContext(atom) {
    const calls = atom.callGraph?.callsList || atom.calls || [];

    // Any call starting with `this.`
    if (calls.some(c => (c.name || c.callee || '').startsWith('this.'))) return true;

    // Explicit flag from metadata
    if (atom.usesThisContext) return true;

    // Archetype: method atoms always have `this`
    if (atom.type === 'method' || atom.archetype?.type === 'method') return true;

    return false;
}

// ── Param hint inference ────────────────────────────────────────────────────

/**
 * Methods that suggest a param is an AST node from Tree-sitter.
 */
const AST_NODE_METHODS = new Set([
    'parent', 'child', 'children', 'childForFieldName', 'type',
    'startIndex', 'endIndex', 'id', 'text', 'namedChildren'
]);

/**
 * Builds ParamHint[] for all params, leveraging call graph method usage.
 */
export function inferParamHints(atom) {
    const inputs = atom.dataFlow?.inputs || atom.dataFlow?.real?.inputs || [];
    const rawParams = inputs.length > 0
        ? inputs.map(i => ({ name: i.name, type: i.type || 'unknown' }))
        : (atom.params || []).map(p => ({ name: p, type: 'unknown' }));

    const calls = atom.callGraph?.callsList || atom.calls || [];
    const mutatedSet = new Set(detectMutatedParams(atom));

    return rawParams.map(param => {
        const usedMethods = calls
            .map(c => c.name || c.callee || '')
            .filter(c => c.startsWith(`${param.name}.`))
            .map(c => c.slice(param.name.length + 1).split('.')[0]);

        const isAstNode = usedMethods.some(m => AST_NODE_METHODS.has(m));
        const isMutated = mutatedSet.has(param.name);

        // Infer type from methods used
        let inferredType = param.type !== 'unknown' ? param.type : inferTypeFromMethods(param.name, usedMethods);
        if (isAstNode) inferredType = 'ast-node';

        return {
            name: param.name,
            type: inferredType,
            methods: [...new Set(usedMethods)],
            isMutated,
            isOptional: false  // could be extended with default-value detection
        };
    });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getInputNames(atom) {
    const inputs = atom.dataFlow?.inputs || atom.dataFlow?.real?.inputs || [];
    const names = inputs.map(i => i.name);
    if (names.length === 0) {
        return new Set(atom.params || []);
    }
    return new Set(names);
}

const REGEX_TYPE_STRING = /^(path|file|dir|url)/;
const REGEX_TYPE_NUMBER = /^(count|num|size|len|idx|index)/;
const REGEX_TYPE_BOOLEAN = /^(is|has|can|flag|enabled)/;
const REGEX_TYPE_ARRAY = /(list|arr|items|nodes)$/;
const REGEX_TYPE_OBJECT = /(map|graph|table|index|cache|registry)$/;
const REGEX_TYPE_FUNCTION = /(fn|func|callback|handler|cb)$/;

function inferTypeFromMethods(paramName, methods) {
    const n = paramName.toLowerCase();

    if (methods.some(m => ['push', 'pop', 'includes', 'filter', 'map', 'forEach', 'reduce'].includes(m))) return 'array';
    if (methods.some(m => ['get', 'set', 'has', 'delete', 'clear'].includes(m))) return 'map';
    if (methods.some(m => ['call', 'apply', 'bind'].includes(m))) return 'function';
    if (methods.some(m => ['startsWith', 'endsWith', 'includes', 'trim', 'split'].includes(m))) return 'string';

    // Name-based fallbacks
    if (REGEX_TYPE_STRING.test(n)) return 'string';
    if (REGEX_TYPE_NUMBER.test(n)) return 'number';
    if (REGEX_TYPE_BOOLEAN.test(n)) return 'boolean';
    if (REGEX_TYPE_ARRAY.test(n)) return 'array';
    if (REGEX_TYPE_OBJECT.test(n)) return 'object';
    if (REGEX_TYPE_FUNCTION.test(n)) return 'function';

    return 'object';
}

/**
 * The complete JS/TS analyzer object satisfying the LanguageAnalyzer contract.
 */
export const JsAnalyzer = {
    detectVoidReturn,
    extractReturnLiterals,
    detectMutatedParams,
    detectThisContext,
    inferParamHints
};

export default JsAnalyzer;
