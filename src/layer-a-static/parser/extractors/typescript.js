import { walk, text, startLine } from './utils.js';

export function extractTypeScriptMetadata(root, code, fileInfo) {
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
            const name = text(node, code);
            if (!fileInfo.typeUsages.some(u => u.name === name && u.line === startLine(node))) {
                fileInfo.typeUsages.push({ name, line: startLine(node) });
            }
        }
    });
}
