/**
 * @fileoverview extractor.js
 *
 * Extrae FileInfo desde el árbol Tree-sitter utilizando módulos especializados.
 * Produce exactamente el mismo shape que de costumbre: 
 *   { imports, exports, definitions, calls, functions, identifierRefs, ... }
 *
 * @module parser-v2/extractor
 */

import path from 'path';
import { extractImports } from './extractors/imports.js';
import { extractExports } from './extractors/exports.js';
import { extractTypeScriptMetadata } from './extractors/typescript.js';
import { extractFunctions } from './extractors/functions/index.js';
import { extractClasses } from './extractors/classes.js';
import { extractIdentifierRefs } from './extractors/identifiers.js';
import { extractVariables } from './extractors/variables.js';
import { walk, text, FUNCTION_NODE_TYPES } from './extractors/utils.js';

/**
 * Extrae FileInfo desde el árbol Tree-sitter.
 * 
 * @param {import('web-tree-sitter').SyntaxNode} tree - Root del árbol
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta absoluta del archivo
 * @returns {object} FileInfo
 */
export function extractFileInfo(tree, code, filePath) {
    const fileInfo = {
        filePath,
        fileName: path.basename(filePath),
        ext: path.extname(filePath),
        imports: [],
        exports: [],
        definitions: [],
        calls: [],
        functions: [],
        identifierRefs: [],
        typeDefinitions: [],
        enumDefinitions: [],
        constantExports: [],
        objectExports: [],
        typeUsages: [],
    };

    const root = tree.rootNode;

    // 1. Imports (ESM, CJS, Dynamic)
    fileInfo.imports = extractImports(root, code);

    // 2. Exports
    fileInfo.exports = extractExports(root, code);

    // 3. TypeScript Metadata
    extractTypeScriptMetadata(root, code, fileInfo);

    // 4. Functions + definitions (con scope-aware call tracking)
    const exportedNames = new Set(fileInfo.exports.map(e => e.name));
    const { functions, definitions } = extractFunctions(root, code, filePath, exportedNames);
    fileInfo.functions = functions;
    fileInfo.definitions = definitions;

    // 5. Classes
    extractClasses(root, code, fileInfo.definitions);

    // 6. Identifiers
    extractIdentifierRefs(root, code, fileInfo);

    // 7. Constants and Variables (ESM + Global)
    const { constantExports, objectExports } = extractVariables(root, code, exportedNames);
    fileInfo.constantExports = constantExports;
    fileInfo.objectExports = objectExports;

    // 8. Top-level calls (fuera de funciones)
    const topLevelCalls = [];
    const seen = new Set();
    walk(root, ['call_expression'], (callNode) => {
        let p = callNode.parent;
        let inFn = false;
        while (p) {
            if (FUNCTION_NODE_TYPES.includes(p.type)) { inFn = true; break; }
            p = p.parent;
        }
        if (inFn) return;

        const fnNameNode = callNode.childForFieldName('function');
        if (!fnNameNode) return;
        let name = fnNameNode.type === 'identifier' ? text(fnNameNode, code) : null;
        if (name && !seen.has(name)) {
            seen.add(name);
            topLevelCalls.push({ name, type: 'function' });
        }
    });
    fileInfo.calls = topLevelCalls;

    return fileInfo;
}
