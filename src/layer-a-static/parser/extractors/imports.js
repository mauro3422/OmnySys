import { walk, text, startLine } from './utils.js';

function addDefaultImportSpecifier(specifiers, child, code) {
    const localName = text(child, code);
    specifiers.push({ name: localName, type: 'default', local: localName });
}

function addNamespaceImportSpecifier(specifiers, child, code) {
    const id = child.children.find(c => c.type === 'identifier');
    if (!id) return;

    const localName = text(id, code);
    specifiers.push({ name: text(child, code), type: 'namespace', local: localName });
}

function addNamedImportSpecifiers(specifiers, child, code) {
    for (const spec of child.children) {
        if (spec.type !== 'import_specifier') continue;

        const alias = spec.childForFieldName('alias') || spec.childForFieldName('name');
        if (!alias) continue;

        const imported = spec.childForFieldName('name');
        const localName = text(alias, code);
        specifiers.push({
            name: localName,
            type: 'named',
            local: localName,
            imported: imported ? text(imported, code) : localName
        });
    }
}

function extractImportSpecifiers(node, code) {
    const specifiers = [];

    for (const child of node.children) {
        if (child.type === 'identifier') {
            addDefaultImportSpecifier(specifiers, child, code);
            continue;
        }

        if (child.type === 'namespace_import') {
            addNamespaceImportSpecifier(specifiers, child, code);
            continue;
        }

        if (child.type === 'named_imports') {
            addNamedImportSpecifiers(specifiers, child, code);
        }
    }

    return specifiers;
}

function extractCallImport(node, code) {
    const fnNode = node.childForFieldName('function');
    if (!fnNode) return null;

    const fnName = text(fnNode, code);
    if (fnName !== 'require' && fnName !== 'import') return null;

    const argsNode = node.childForFieldName('arguments');
    if (!argsNode || argsNode.namedChildCount === 0) return null;

    const arg = argsNode.namedChild(0);
    if (!arg || (arg.type !== 'string' && arg.type !== 'string_fragment')) return null;

    return {
        type: fnName === 'require' ? 'commonjs' : 'dynamic',
        source: text(arg, code).replace(/['"`]/g, ''),
        line: startLine(node)
    };
}

export function extractImports(root, code) {
    const imports = [];

    walk(root, ['import_statement', 'call_expression'], (node) => {
        if (node.type === 'import_statement') {
            const sourceNode = node.childForFieldName('source');
            const source = sourceNode ? text(sourceNode, code).replace(/['"`]/g, '') : null;
            if (!source) return;

            const specifiers = extractImportSpecifiers(node, code);
            imports.push({ type: 'esm', source, specifiers, line: startLine(node) });
        }
        else if (node.type === 'call_expression') {
            const callImport = extractCallImport(node, code);
            if (callImport) {
                imports.push(callImport);
            }
        }
    });

    return imports;
}
