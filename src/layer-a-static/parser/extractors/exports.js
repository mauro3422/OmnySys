import { walk, text, startLine } from './utils.js';

export function extractExports(root, code) {
    const exports = [];

    walk(root, ['export_statement'], (node) => {
        const defaultKw = node.children.find(c => c.type === 'default');
        if (defaultKw) {
            exports.push({ name: 'default', type: 'default', line: startLine(node) });
            return;
        }

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
