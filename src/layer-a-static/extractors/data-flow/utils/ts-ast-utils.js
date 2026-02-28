/**
 * @fileoverview ts-ast-utils.js
 * 
 * Shared Tree-sitter AST utilities for Data Flow Extractors.
 */

/**
 * Literal text of a node
 * @param {Object} node - Tree-sitter node
 * @param {string} code - Source code
 * @returns {string}
 */
export function text(node, code) {
    if (!node) return '';
    return code ? code.slice(node.startIndex, node.endIndex) : (node.text || '');
}

/**
 * Start line of a node (1-indexed)
 * @param {Object} node - Tree-sitter node
 * @returns {number}
 */
export function startLine(node) {
    return node ? node.startPosition.row + 1 : 0;
}

/**
 * End line of a node (1-indexed)
 * @param {Object} node - Tree-sitter node
 * @returns {number}
 */
export function endLine(node) {
    return node ? node.endPosition.row + 1 : 0;
}

/**
 * Get identifier name or 'this'
 * @param {Object} node - Tree-sitter node
 * @param {string} code - Source code
 * @returns {string|null}
 */
export function getIdentifierName(node, code) {
    if (!node) return null;
    if (node.type === 'identifier') return text(node, code);
    if (node.type === 'this') return 'this';
    return null;
}

/**
 * Get full path of a member expression (e.g. "a.b.c")
 * @param {Object} node - Tree-sitter node
 * @param {string} code - Source code
 * @returns {string|null}
 */
export function getMemberPath(node, code) {
    if (node.type === 'identifier') return text(node, code);
    if (node.type === 'this') return 'this';
    if (node.type === 'member_expression') {
        const object = node.childForFieldName('object');
        const property = node.childForFieldName('property');
        const objPath = object ? getMemberPath(object, code) : null;
        const propName = property ? text(property, code) : null;
        return objPath && propName ? `${objPath}.${propName}` : null;
    }
    return null;
}

export const FUNCTION_NODE_TYPES = [
    'function_declaration',
    'function_expression',
    'arrow_function',
    'method_definition',
    'generator_function_declaration',
    'generator_function',
];

/**
 * Find function node in a snippet or program
 */
export function findFunctionNode(node) {
    if (!node) return null;
    if (FUNCTION_NODE_TYPES.includes(node.type)) return node;

    if (node.type === 'program') {
        for (const child of node.namedChildren) {
            if (FUNCTION_NODE_TYPES.includes(child.type)) return child;
            if (child.type === 'export_statement') {
                const decl = child.namedChildren.find(c => FUNCTION_NODE_TYPES.includes(c.type));
                if (decl) return decl;
            }
            if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
                for (const decl of child.namedChildren) {
                    if (decl.type === 'variable_declarator') {
                        const init = decl.childForFieldName('value');
                        if (init && FUNCTION_NODE_TYPES.includes(init.type)) return init;
                    }
                }
            }
        }
    }
    return null;
}

/**
 * Get the target name of an assignment or member access
 * @param {Object} node - Tree-sitter node
 * @param {string} code - Source code
 * @returns {string|null}
 */
export function getAssignmentTarget(node, code) {
    if (!node) return null;
    if (node.type === 'identifier') return text(node, code);
    if (node.type === 'member_expression') return getMemberPath(node, code);
    if (node.type === 'this') return 'this';
    return null;
}

export default {
    text,
    startLine,
    endLine,
    getIdentifierName,
    getMemberPath,
    getAssignmentTarget,
    findFunctionNode,
    FUNCTION_NODE_TYPES,
};
