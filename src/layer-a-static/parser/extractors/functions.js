import { walk, text, startLine, endLine, getFileId, findCallsInScope, FUNCTION_NODE_TYPES } from './utils.js';

export function extractFunctions(root, code, filePath, exportedNames) {
    const fileId = getFileId(filePath);
    const functions = [];
    const definitions = [];

    walk(root, FUNCTION_NODE_TYPES, (node) => {
        const parent = node.parent;

        let functionName = 'anonymous';
        let functionType = node.type.includes('arrow') ? 'arrow'
            : node.type.includes('method') ? 'method'
                : node.type.includes('generator') ? 'function'
                    : 'function';
        let className = null;

        if (node.type === 'function_declaration' || node.type === 'generator_function_declaration') {
            const nameNode = node.childForFieldName('name');
            if (nameNode) functionName = text(nameNode, code);
        } else if (node.type === 'method_definition') {
            const nameNode = node.childForFieldName('name');
            if (nameNode) functionName = text(nameNode, code);
            let p = node.parent;
            while (p) {
                if (p.type === 'class_declaration' || p.type === 'class') {
                    const cn = p.childForFieldName('name');
                    if (cn) className = text(cn, code);
                    break;
                }
                p = p.parent;
            }
        } else if (node.type === 'arrow_function' || node.type === 'function_expression') {
            if (parent?.type === 'variable_declarator') {
                const nameNode = parent.childForFieldName('name');
                if (nameNode) functionName = text(nameNode, code);
            }
        }

        const fullName = className ? `${className}.${functionName}` : functionName;
        const functionId = `${fileId}::${fullName}`;

        const paramsNode = node.childForFieldName('parameters') || node.childForFieldName('parameter');
        const params = [];
        if (paramsNode) {
            walk(paramsNode, ['identifier', 'shorthand_property_identifier_pattern'], (pn) => {
                params.push(text(pn, code));
            });
        }

        const isAsync = node.children.some(c => c.type === 'async');
        const isGenerator = node.type.includes('generator');
        const isExported = exportedNames.has(functionName) || exportedNames.has(fullName);

        const calls = findCallsInScope(node, code);

        const identifierRefs = [];
        const seenRefs = new Set();
        walk(node, ['identifier'], (idNode) => {
            const idParent = idNode.parent;
            if (!idParent) return;
            const isDef = ['variable_declarator', 'function_declaration', 'parameter', 'method_definition'].includes(idParent.type);
            const isProp = idParent.type === 'member_expression' && idParent.childForFieldName('property') === idNode;
            if (!isDef && !isProp) {
                const idName = text(idNode, code);
                if (idName !== 'undefined' && idName !== 'null' && idName !== 'console' && !seenRefs.has(idName)) {
                    seenRefs.add(idName);
                    identifierRefs.push(idName);
                }
            }
        });

        const fnInfo = {
            id: functionId,
            name: functionName,
            fullName,
            type: functionType,
            className,
            line: startLine(node),
            endLine: endLine(node),
            params,
            isExported,
            isAsync,
            isGenerator,
            calls,
            identifierRefs,
            node: null,
        };

        functions.push(fnInfo);
        definitions.push({
            type: functionType,
            name: fullName,
            className,
            params: params.length,
        });
    });

    return { functions, definitions };
}
