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

/**
 * Clase para estandarizar la creación de Átomos en OmnySys.
 */
export class AtomBuilder {
    constructor(filePath) {
        this.filePath = filePath;
        this.fileId = getFileId(filePath);
    }

    createAtom(name, type, node, meta = {}) {
        return {
            id: `${this.fileId}::${name}_L${startLine(node)}`,
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

export function findCallsInScope(fnNode, code) {
    const calls = [];
    const seen = new Set();

    walk(fnNode, ['call_expression'], (callNode) => {
        const fnNameNode = callNode.childForFieldName('function');
        if (!fnNameNode) return;

        let name = null;
        if (fnNameNode.type === 'identifier') {
            name = text(fnNameNode, code);
        } else if (fnNameNode.type === 'member_expression') {
            const obj = fnNameNode.childForFieldName('object');
            const prop = fnNameNode.childForFieldName('property');
            if (obj && prop) {
                const objName = text(obj, code);
                const propName = text(prop, code);
                const key = `${objName}.${propName}:${startLine(callNode)}`;
                if (!seen.has(objName)) {
                    seen.add(objName);
                    calls.push({ name: objName, type: 'namespace_access', line: startLine(callNode) });
                }
                if (!seen.has(key)) {
                    seen.add(key);
                    calls.push({ name: `${objName}.${propName}`, type: 'member_call', line: startLine(callNode) });
                }
                return;
            }
        }

        if (name) {
            const key = `${name}:${startLine(callNode)}`;
            if (!seen.has(key)) {
                seen.add(key);
                calls.push({ name, type: 'direct_call', line: startLine(callNode) });
            }
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
