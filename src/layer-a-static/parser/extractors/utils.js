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
    'class_declaration',
];
