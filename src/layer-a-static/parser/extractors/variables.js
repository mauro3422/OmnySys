import { walk, text, startLine } from './utils.js';

/**
 * Extrae constantes y variables globales (incluyendo exports)
 * 
 * @param {import('web-tree-sitter').SyntaxNode} root - Nodo raíz
 * @param {string} code - Código fuente
 * @param {Set<string>} exportedNames - Nombres de símbolos exportados
 * @returns {Object} { constantExports, objectExports }
 */
export function extractVariables(root, code, exportedNames) {
    const constantExports = [];
    const objectExports = [];

    // Buscamos declaraciones de variables a nivel raíz (o dentro de export_statement)
    walk(root, ['lexical_declaration', 'variable_declaration'], (node) => {
        // Solo procesamos si el padre es el root o un export_statement
        const parentType = node.parent?.type;
        const isTopLevel = parentType === 'program' || parentType === 'export_statement';
        if (!isTopLevel) return;

        walk(node, ['variable_declarator'], (decl) => {
            const nameNode = decl.childForFieldName('name');
            if (!nameNode) return;

            const name = text(nameNode, code);
            const isExported = exportedNames.has(name);

            const valueNode = decl.childForFieldName('value');
            const isObject = valueNode && valueNode.type === 'object';

            const varInfo = {
                name,
                line: startLine(decl),
                isExported: isExported,
                valueType: isObject ? 'object' : 'unknown'
            };

            if (isObject) {
                objectExports.push(varInfo);
            } else {
                constantExports.push(varInfo);
            }
        });
    });

    return { constantExports, objectExports };
}
