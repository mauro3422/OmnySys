import { walk, text, AtomBuilder } from './utils.js';

/**
 * Extrae constantes y variables globales convirtiéndolas en Átomos.
 * 
 * @param {import('tree-sitter').SyntaxNode} root - Nodo raíz
 * @param {string} code - Código fuente
 * @param {string} filePath - Path del archivo
 * @param {Set<string>} exportedNames - Nombres de símbolos exportados
 * @returns {Object[]} Lista de átomos de variables
 */
export function extractVariables(root, code, filePath, exportedNames) {
    const builder = new AtomBuilder(filePath);
    const variableAtoms = [];

    walk(root, ['lexical_declaration', 'variable_declaration'], (node) => {
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

            const atom = builder.createAtom(name, 'variable', decl, {
                isExported,
                value_type: isObject ? 'object' : 'unknown',
            });

            variableAtoms.push(atom);
        });
    });

    return variableAtoms;
}
