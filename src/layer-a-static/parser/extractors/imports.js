import { walk, text, startLine } from './utils.js';

export function extractImports(root, code) {
    const imports = [];

    walk(root, ['import_statement', 'call_expression'], (node) => {
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
