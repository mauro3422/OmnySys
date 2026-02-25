/**
 * @fileoverview extractor.js
 *
 * Extrae FileInfo desde el árbol Tree-sitter.
 * Produce exactamente el mismo shape que el parser Babel:
 *   { imports, exports, definitions, calls, functions, identifierRefs, ... }
 *
 * Key improvement over Babel: `findCallsInFunction` es scope-aware —
 * rastrea correctamente funciones referenciadas dentro de closures/callbacks.
 *
 * @module parser-v2/extractor
 */

import path from 'path';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Genera el ID canónico del archivo (relativo al proyecto)
 * @param {string} filePath
 * @returns {string}
 */
function getFileId(filePath) {
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
 * Texto literal del nodo
 * @param {import('web-tree-sitter').SyntaxNode} node
 * @param {string} code
 * @returns {string}
 */
function text(node, code) {
    return code.slice(node.startIndex, node.endIndex);
}

/**
 * Número de línea (1-indexed) de un nodo
 * @param {import('web-tree-sitter').SyntaxNode} node
 * @returns {number}
 */
function startLine(node) {
    return node.startPosition.row + 1;
}

function endLine(node) {
    return node.endPosition.row + 1;
}

// ─── Walkers ────────────────────────────────────────────────────────────────

/**
 * Recorre el árbol en DFS, llamando cb en cada nodo que coincida con types
 * @param {import('web-tree-sitter').SyntaxNode} node
 * @param {string[]} types
 * @param {Function} cb
 */
function walk(node, types, cb) {
    if (types.includes(node.type)) cb(node);
    for (const child of node.children) walk(child, types, cb);
}

/**
 * Recorre dentro de un subárbol (scope de una función) para extraer calls
 * @param {import('web-tree-sitter').SyntaxNode} fnNode
 * @param {string} code
 * @returns {Array<{name:string, type:string, line:number}>}
 */
function findCallsInScope(fnNode, code) {
    const calls = [];
    const seen = new Set();

    walk(fnNode, ['call_expression'], (callNode) => {
        const fnNameNode = callNode.childForFieldName('function');
        if (!fnNameNode) return;

        let name = null;
        if (fnNameNode.type === 'identifier') {
            name = text(fnNameNode, code);
        } else if (fnNameNode.type === 'member_expression') {
            // obj.method() → capture both "obj" and "obj.method"
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

// ─── Import extraction ───────────────────────────────────────────────────────

/**
 * Extrae imports (ESM, CommonJS, Dynamic) desde el árbol
 * @param {import('web-tree-sitter').SyntaxNode} root
 * @param {string} code
 * @returns {Array}
 */
function extractImports(root, code) {
    const imports = [];

    walk(root, ['import_statement', 'call_expression'], (node) => {
        // ESM: import ... from '...'
        if (node.type === 'import_statement') {
            const sourceNode = node.childForFieldName('source');
            const source = sourceNode ? text(sourceNode, code).replace(/['"`]/g, '') : null;
            if (!source) return;

            const specifiers = [];
            for (const child of node.children) {
                if (child.type === 'identifier') {
                    specifiers.push({ name: text(child, code), type: 'default', local: text(child, code) });
                } else if (child.type === 'namespace_import') {
                    const id = child.children.find(c => c.type === 'identifier');
                    if (id) specifiers.push({ name: text(child, code), type: 'namespace', local: text(id, code) });
                } else if (child.type === 'named_imports') {
                    walk(child, ['import_specifier'], (spec) => {
                        const alias = spec.childForFieldName('alias') || spec.childForFieldName('name');
                        const imported = spec.childForFieldName('name');
                        if (alias) {
                            specifiers.push({
                                name: text(alias, code),
                                type: 'named',
                                local: text(alias, code),
                                imported: imported ? text(imported, code) : text(alias, code)
                            });
                        }
                    });
                }
            }
            imports.push({ type: 'esm', source, specifiers, line: startLine(node) });
        }
        // CommonJS: require('...') or Dynamic: import('...')
        else if (node.type === 'call_expression') {
            const fnNode = node.childForFieldName('function');
            if (!fnNode) return;
            const fnName = text(fnNode, code);

            if (fnName === 'require' || fnName === 'import') {
                const argsNode = node.childForFieldName('arguments');
                if (argsNode && argsNode.namedChildCount > 0) {
                    const arg = argsNode.namedChild(0);
                    if (arg.type === 'string' || arg.type === 'string_fragment') {
                        const source = text(arg, code).replace(/['"`]/g, '');
                        imports.push({
                            type: fnName === 'require' ? 'commonjs' : 'dynamic',
                            source,
                            line: startLine(node)
                        });
                    }
                }
            }
        }
    });

    return imports;
}

// ─── Export extraction ───────────────────────────────────────────────────────

/**
 * Extrae exports desde el árbol
 * @param {import('web-tree-sitter').SyntaxNode} root
 * @param {string} code
 * @returns {Array}
 */
function extractExports(root, code) {
    const exports = [];

    walk(root, ['export_statement'], (node) => {
        // export default ...
        const defaultKw = node.children.find(c => c.type === 'default');
        if (defaultKw) {
            exports.push({ name: 'default', type: 'default', line: startLine(node) });
            return;
        }

        // export { a, b } or export function x() or export const x = ...
        for (const child of node.children) {
            if (child.type === 'export_clause') {
                walk(child, ['export_specifier'], (spec) => {
                    const name = spec.childForFieldName('name');
                    const alias = spec.childForFieldName('alias');
                    if (name) {
                        exports.push({
                            name: text(alias || name, code),
                            type: 'named',
                            local: text(name, code),
                            line: startLine(spec)
                        });
                    }
                });
            } else if (child.type === 'function_declaration' || child.type === 'class_declaration') {
                const nameNode = child.childForFieldName('name');
                if (nameNode) exports.push({ name: text(nameNode, code), type: 'declaration', line: startLine(child) });
            } else if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
                walk(child, ['variable_declarator'], (decl) => {
                    const name = decl.childForFieldName('name');
                    if (name) exports.push({ name: text(name, code), type: 'declaration', line: startLine(decl) });
                });
            }
        }
    });

    return exports;
}

/**
 * Extrae tipos de TypeScript (interfaces, types, enums)
 * @param {import('web-tree-sitter').SyntaxNode} root
 * @param {string} code
 * @param {object} fileInfo
 */
function extractTypeScriptMetadata(root, code, fileInfo) {
    walk(root, ['interface_declaration', 'type_alias_declaration', 'enum_declaration', 'type_identifier'], (node) => {
        if (node.type === 'interface_declaration') {
            const nameNode = node.childForFieldName('name');
            if (nameNode) {
                fileInfo.typeDefinitions.push({
                    type: 'interface',
                    name: text(nameNode, code),
                    line: startLine(node),
                    isExported: node.parent?.type === 'export_statement',
                    properties: node.childForFieldName('body')?.namedChildCount || 0
                });
            }
        } else if (node.type === 'type_alias_declaration') {
            const nameNode = node.childForFieldName('name');
            if (nameNode) {
                fileInfo.typeDefinitions.push({
                    type: 'type',
                    name: text(nameNode, code),
                    line: startLine(node),
                    isExported: node.parent?.type === 'export_statement'
                });
            }
        } else if (node.type === 'enum_declaration') {
            const nameNode = node.childForFieldName('name');
            if (nameNode) {
                const body = node.childForFieldName('body');
                const members = [];
                if (body) {
                    walk(body, ['enum_assignment'], (m) => {
                        const id = m.childForFieldName('name');
                        if (id) members.push(text(id, code));
                    });
                }
                fileInfo.enumDefinitions.push({
                    type: 'enum',
                    name: text(nameNode, code),
                    line: startLine(node),
                    isExported: node.parent?.type === 'export_statement',
                    members
                });
            }
        } else if (node.type === 'type_identifier') {
            // Type Usage
            const name = text(node, code);
            if (!fileInfo.typeUsages.some(u => u.name === name && u.line === startLine(node))) {
                fileInfo.typeUsages.push({ name, line: startLine(node) });
            }
        }
    });
}

// ─── Function extraction ─────────────────────────────────────────────────────

const FUNCTION_NODE_TYPES = [
    'function_declaration',
    'function_expression',
    'arrow_function',
    'method_definition',
    'generator_function_declaration',
    'generator_function',
];

/**
 * Extrae todas las funciones desde el árbol
 * @param {import('web-tree-sitter').SyntaxNode} root
 * @param {string} code
 * @param {string} filePath
 * @param {Set<string>} exportedNames - nombres exportados
 * @returns {Array}
 */
function extractFunctions(root, code, filePath, exportedNames) {
    const fileId = getFileId(filePath);
    const functions = [];
    const definitions = [];

    walk(root, FUNCTION_NODE_TYPES, (node) => {
        const parent = node.parent;

        // Determinar nombre
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
            // Buscar clase contenedora
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
            // const name = () => {}  →  parent es variable_declarator
            if (parent?.type === 'variable_declarator') {
                const nameNode = parent.childForFieldName('name');
                if (nameNode) functionName = text(nameNode, code);
            }
        }

        const fullName = className ? `${className}.${functionName}` : functionName;
        const functionId = `${fileId}::${fullName}`;

        // Parámetros
        const paramsNode = node.childForFieldName('parameters') || node.childForFieldName('parameter');
        const params = [];
        if (paramsNode) {
            walk(paramsNode, ['identifier', 'shorthand_property_identifier_pattern'], (pn) => {
                params.push(text(pn, code));
            });
        }

        // Async / generator
        const isAsync = node.children.some(c => c.type === 'async');
        const isGenerator = node.type.includes('generator');
        const isExported = exportedNames.has(functionName) || exportedNames.has(fullName);

        // Calls dentro de esta función (scope-aware)
        const calls = findCallsInScope(node, code);

        // Identificadores usados dentro de esta función
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
            identifierRefs, // Nuevo
            node: null, // no pasar el nodo AST (memory)
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

// ─── Class extraction ────────────────────────────────────────────────────────

/**
 * Extrae clases y las agrega a definitions
 * @param {import('web-tree-sitter').SyntaxNode} root
 * @param {string} code
 * @param {Array} definitions
 */
function extractClasses(root, code, definitions) {
    walk(root, ['class_declaration', 'class'], (node) => {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
            definitions.push({
                type: 'class',
                name: text(nameNode, code),
                params: 0,
            });
        }
    });
}

/**
 * Extrae referencias a identificadores (usos de variables)
 * @param {import('web-tree-sitter').SyntaxNode} root
 * @param {string} code
 * @param {object} fileInfo
 */
function extractIdentifierRefs(root, code, fileInfo) {
    walk(root, ['identifier'], (node) => {
        const parent = node.parent;
        if (!parent) return;

        // Ignorar si es una definición o parte de una ruta de acceso (member property)
        // tree-sitter labels some identifiers as property/key in specific nodes
        const isDefinition = [
            'variable_declarator', 'function_declaration', 'class_declaration',
            'method_definition', 'import_specifier', 'parameter'
        ].includes(parent.type);

        const isPropertyAccess = parent.type === 'member_expression' && parent.childForFieldName('property') === node;
        const isObjectKey = parent.type === 'pair' && parent.children[0] === node;

        if (!isDefinition && !isPropertyAccess && !isObjectKey) {
            const name = text(node, code);
            if (name !== 'undefined' && name !== 'null' && name !== 'console' && !fileInfo.identifierRefs.includes(name)) {
                fileInfo.identifierRefs.push(name);
            }
        }
    });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extrae FileInfo desde el árbol Tree-sitter.
 * Misma interfaz que el parser Babel — drop-in compatible.
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

    // 7. Top-level calls (fuera de funciones)
    const topLevelCalls = [];
    const seen = new Set();
    walk(root, ['call_expression'], (callNode) => {
        // Solo calls de nivel top — no dentro de funciones
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

