import { walk, text } from './utils.js';

export function extractIdentifierRefs(root, code, fileInfo) {
    walk(root, ['identifier'], (node) => {
        const parent = node.parent;
        if (!parent) return;

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
