/**
 * @fileoverview Refactored entry point for function extraction.
 */

import { walk, startLine, endLine, getFileId, findCallsInScope, FUNCTION_NODE_TYPES } from '../utils.js';
import { detectTypeAndName } from './type-detector.js';
import { extractParams } from './param-extractor.js';
import { trackReferences } from './reference-tracker.js';

/**
 * Extrae funciones de un árbol tree-sitter.
 * @param {import('tree-sitter').SyntaxNode} root 
 * @param {string} code 
 * @param {string} filePath 
 * @param {Set<string>} exportedNames 
 */
export function extractFunctions(root, code, filePath, exportedNames) {
    const fileId = getFileId(filePath);
    const functions = [];
    const definitions = [];

    walk(root, FUNCTION_NODE_TYPES, (node) => {
        const { functionName, functionType, className, fullName } = detectTypeAndName(node, code);
        const params = extractParams(node, code);
        const identifierRefs = trackReferences(node, code);

        const functionId = `${fileId}::${fullName}`;
        const isAsync = node.children.some(c => c.type === 'async');
        const isGenerator = node.type.includes('generator');
        const isExported = exportedNames.has(functionName) || exportedNames.has(fullName);
        const calls = findCallsInScope(node, code);

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
            node: node, // ✅ Keep native node for unified extraction pass
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
