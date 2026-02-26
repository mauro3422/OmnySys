/**
 * @fileoverview Shadowing Detector
 * 
 * Detecta variables locales, parámetros o declaraciones internas que ocultan (shadow)
 * variables definidas en el ámbito del módulo o globales.
 */

import { getTree } from '../../../parser/index.js';
import { text, startLine } from '#layer-a/extractors/data-flow/utils/ts-ast-utils.js';

const DECLARATION_NODES = [
    'variable_declarator',
    'formal_parameters',
    'required_parameter',
    'optional_parameter',
    'rest_parameter'
];

const SCOPE_NODES = [
    'function_declaration',
    'function_expression',
    'arrow_function',
    'method_definition',
    'class_declaration',
    'block'
];

/**
 * Detecta shadowing en un archivo
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 */
export async function detectShadowing(code, filePath) {
    const tree = await getTree(filePath, code);
    if (!tree) return [];

    const shadowingFound = [];
    const moduleScope = new Set();
    const imports = new Set();

    /**
     * Primera pasada: Identificar variables de módulo e imports
     */
    function findModuleLevelIdentifiers(node) {
        if (node.type === 'variable_declarator') {
            const nameNode = node.childForFieldName('name');
            if (nameNode) moduleScope.add(text(nameNode, code));
        } else if (node.type === 'function_declaration') {
            const nameNode = node.childForFieldName('name');
            if (nameNode) moduleScope.add(text(nameNode, code));
        } else if (node.type === 'import_specifier' || node.type === 'import_clause' || node.type === 'namespace_import') {
            // Simplificado: obtener todos los identificadores en imports
            if (node.type === 'identifier') {
                imports.add(text(node, code));
            }
        }

        for (const child of node.namedChildren) {
            if (!SCOPE_NODES.includes(child.type)) {
                findModuleLevelIdentifiers(child);
            }
        }
    }

    findModuleLevelIdentifiers(tree.rootNode);

    /**
     * Segunda pasada: Buscar shadowing en scopes internos
     */
    function checkShadowing(node, currentLocalScope = new Set()) {
        const isNewScope = SCOPE_NODES.includes(node.type);
        const localScope = isNewScope ? new Set(currentLocalScope) : currentLocalScope;

        // Detectar declaraciones en este nodo
        if (node.type === 'variable_declarator' || node.type === 'identifier') {
            const parent = node.parent;
            const isDeclaration = parent && (
                parent.type === 'variable_declaration' ||
                parent.type === 'lexical_declaration' ||
                parent.type === 'formal_parameters' ||
                parent.type === 'parameter_declaration'
            );

            if (isDeclaration) {
                const varName = text(node, code);

                // Verificar si oculta algo del módulo o imports
                if (moduleScope.has(varName) || imports.has(varName)) {
                    shadowingFound.push({
                        name: varName,
                        line: startLine(node),
                        filePath,
                        type: 'shadowing',
                        severity: 'medium',
                        message: `Variable local "${varName}" oculta una variable de nivel de módulo o un import.`
                    });
                }

                localScope.add(varName);
            }
        }

        // Recorrer hijos
        for (const child of node.namedChildren) {
            checkShadowing(child, localScope);
        }
    }

    // Empezar a buscar debajo del nivel de módulo
    for (const child of tree.rootNode.namedChildren) {
        if (SCOPE_NODES.includes(child.type)) {
            checkShadowing(child);
        } else {
            // Si no es un scope, seguir buscando declaraciones locales profundas si no es nivel módulo
            // (ej. bloques anidados en el root si permitidos)
            checkShadowing(child);
        }
    }

    return shadowingFound;
}

export default detectShadowing;
