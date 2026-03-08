export function getFileId(filePath) {
    let normalized = filePath.replace(/\\/g, '/');
    const markers = ['/src/', '/lib/', '/app/', '/packages/'];
    for (const marker of markers) {
        const idx = normalized.indexOf(marker);
        if (idx !== -1) { normalized = normalized.slice(idx + 1); break; }
    }
    return normalized
        .replace(/\.[^.]+$/, '')
        .replace(/\//g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .replace(/^_|_$/g, '') || 'unknown';
}

export function normalizeExtractorFilePath(filePath) {
    return String(filePath || '').replace(/\\/g, '/');
}

/**
 * Clase para estandarizar la creación de Átomos en OmnySys.
 */
export class AtomBuilder {
    constructor(filePath) {
        this.filePath = normalizeExtractorFilePath(filePath);
        this.fileId = getFileId(filePath);
    }

    createAtom(name, type, node, meta = {}) {
        return {
            id: `${this.filePath}::${name}_L${startLine(node)}`,
            name,
            type,
            lineStart: startLine(node),
            lineEnd: endLine(node),
            lines_of_code: (endLine(node) - startLine(node)) + 1,
            complexity: 1, // Default, será actualizado por complexity-strategy
            parameter_count: meta.parameter_count || 0,
            calls: meta.calls || [],
            calledBy: [],
            className: meta.className || null,
            externalCallCount: 0,
            isExported: meta.isExported || false,
            isAsync: meta.isAsync || false,
            isDeadCode: false,
            extracted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _meta: meta
        };
    }
}

export function text(node, code) {
    return code.slice(node.startIndex, node.endIndex);
}

export function startLine(node) {
    return node.startPosition.row + 1;
}

export function endLine(node) {
    return node.endPosition.row + 1;
}

export function walk(node, types, cb) {
    if (!node) return;
    const cursor = node.walk();

    function traverse() {
        if (types.includes(cursor.nodeType)) {
            cb(cursor.currentNode);
        }

        if (cursor.gotoFirstChild()) {
            do {
                traverse();
            } while (cursor.gotoNextSibling());
            cursor.gotoParent();
        }
    }

    traverse();
    if (typeof cursor.delete === 'function') cursor.delete();
}

function buildCallEntry(name, type, line, isNew) {
    return {
        name,
        type,
        line,
        ...(isNew ? { isNew: true } : {})
    };
}

function addSeenCall(calls, seen, key, entry) {
    if (seen.has(key)) return;
    seen.add(key);
    calls.push(entry);
}

function readMemberCall(fnNameNode, code) {
    const obj = fnNameNode.childForFieldName('object');
    const prop = fnNameNode.childForFieldName('property');
    if (!obj || !prop) return null;

    const objectName = text(obj, code);
    const propertyName = text(prop, code);
    return {
        objectName,
        propertyName,
        fullName: `${objectName}.${propertyName}`
    };
}

function collectMemberCall(calls, seen, memberCall, line, isNewExpression) {
    addSeenCall(
        calls,
        seen,
        memberCall.objectName,
        buildCallEntry(memberCall.objectName, 'namespace_access', line, false)
    );
    addSeenCall(
        calls,
        seen,
        `${memberCall.fullName}:${line}`,
        buildCallEntry(
            memberCall.fullName,
            isNewExpression ? 'constructor_call' : 'member_call',
            line,
            isNewExpression
        )
    );
}

function collectDirectCall(calls, seen, name, line, isNewExpression) {
    addSeenCall(
        calls,
        seen,
        `${name}:${line}`,
        buildCallEntry(
            name,
            isNewExpression ? 'constructor_call' : 'direct_call',
            line,
            isNewExpression
        )
    );
}

export function findCallsInScope(fnNode, code) {
    const calls = [];
    const seen = new Set();

    walk(fnNode, ['call_expression', 'new_expression'], (callNode) => {
        const isNewExpression = callNode.type === 'new_expression';
        const targetField = isNewExpression ? 'constructor' : 'function';
        const fnNameNode = callNode.childForFieldName(targetField);
        if (!fnNameNode) return;

        const line = startLine(callNode);
        if (fnNameNode.type === 'identifier') {
            collectDirectCall(calls, seen, text(fnNameNode, code), line, isNewExpression);
            return;
        }

        if (fnNameNode.type !== 'member_expression') return;

        const memberCall = readMemberCall(fnNameNode, code);
        if (memberCall) {
            collectMemberCall(calls, seen, memberCall, line, isNewExpression);
        }
    });

    return calls;
}

export const FUNCTION_NODE_TYPES = [
    'function_declaration',
    'function_expression',
    'arrow_function',
    'method_definition',
    'generator_function_declaration',
    'generator_function',
];
