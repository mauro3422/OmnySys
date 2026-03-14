import { walk, text, startLine } from './utils.js';

/**
 * Extracts all exports from a Tree-sitter AST
 * Handles:
 * - Default exports: export default X
 * - Named exports: export { X, Y }
 * - Re-exports: export { X, Y } from './module.js'
 * - Declaration exports: export function X() {}, export class X {}
 * - Variable exports: export const X = 1
 * 
 * @param {import('tree-sitter').SyntaxNode} root - AST root node
 * @param {string} code - Source code
 * @returns {Array<{name: string, type: string, line: number, from?: string, local?: string}>}
 */
export function extractExports(root, code) {
    const exports = [];

    walk(root, ['export_statement'], (node) => {
        // Detectar export default
        const defaultKw = node.children.find(c => c.type === 'default');
        if (defaultKw) {
            exports.push({ name: 'default', type: 'default', line: startLine(node) });
            return;
        }

        // Detectar módulo de re-export (export { X } from './module')
        let exportFrom = null;
        const stringNode = node.children.find(c => c.type === 'string');
        if (stringNode) {
            // Remover comillas del string
            const fromPath = text(stringNode, code).replace(/^['"`]|['"`]$/g, '');
            exportFrom = fromPath;
        }

        for (const child of node.children) {
            if (child.type === 'export_clause') {
                // Named exports o re-exports: export { X, Y } [from './module']
                walk(child, ['export_specifier'], (spec) => {
                    const name = spec.childForFieldName('name');
                    const alias = spec.childForFieldName('alias');
                    if (name) {
                        exports.push({
                            name: text(alias || name, code),
                            type: exportFrom ? 'reexport' : 'named',
                            local: text(name, code),
                            from: exportFrom,
                            line: startLine(spec)
                        });
                    }
                });
            } else if (child.type === 'function_declaration' || child.type === 'class_declaration') {
                // Export declaration: export function X() {} o export class X {}
                const nameNode = child.childForFieldName('name');
                if (nameNode) exports.push({ name: text(nameNode, code), type: 'declaration', line: startLine(child) });
            } else if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
                // Export variable: export const X = 1
                walk(child, ['variable_declarator'], (decl) => {
                    const name = decl.childForFieldName('name');
                    if (name) exports.push({ name: text(name, code), type: 'declaration', line: startLine(decl) });
                });
            }
        }
    });

    return exports;
}
