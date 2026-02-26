import { walk, text } from './utils.js';

export function extractClasses(root, code, definitions) {
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
