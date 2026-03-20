import path from 'path';

function isNamespaceImport(imp) {
    return imp.type === 'namespace' ||
        imp.namespace === true ||
        (imp.specifiers || []).some(s => s.type === 'namespace' || s.imported === '*') ||
        (imp.specifiers?.length === 1 && imp.specifiers[0]?.local && !imp.specifiers[0]?.imported);
}

function getNamespaceAlias(imp) {
    return imp.alias ||
        imp.specifiers?.[0]?.local ||
        imp.specifiers?.[0]?.name;
}

function resolveNamespacePath(source, dir, rootPath) {
    let resolved;

    if (source[0] === '.') {
        resolved = path.resolve(dir, source);
    } else {
        resolved = rootPath ? path.resolve(rootPath, source) : source;
    }

    if (!path.extname(resolved)) {
        resolved += '.js';
    }

    return resolved.replace(/\\/g, '/');
}

function buildNamespaceMapForFile(parsedFile, absPath, rootPath) {
    const nsMap = new Map();
    const imports = parsedFile.imports || [];

    if (imports.length === 0) {
        return nsMap;
    }

    const dir = path.dirname(absPath);

    for (const imp of imports) {
        const source = imp.source;
        if (!source || !isNamespaceImport(imp)) continue;

        const alias = getNamespaceAlias(imp);
        if (!alias) continue;

        nsMap.set(alias, resolveNamespacePath(source, dir, rootPath));
    }

    return nsMap;
}

/**
 * Parse namespace imports from parsed files and build:
 * fileNamespaceMap: absoluteFilePath -> Map(alias -> resolvedAbsFilePath)
 *
 * Only consider `import * as alias` (namespace imports).
 *
 * @param {Object} parsedFiles - { [absPath]: parsedFile }
 * @param {string} rootPath - Project root (for relative resolution)
 * @returns {Map<string, Map<string, string>>}
 */
export function buildNamespaceMap(parsedFiles, rootPath) {
    const fileNamespaceMap = new Map();

    for (const [absPath, parsedFile] of Object.entries(parsedFiles)) {
        const nsMap = buildNamespaceMapForFile(parsedFile, absPath, rootPath);
        if (nsMap.size > 0) {
            fileNamespaceMap.set(absPath.replace(/\\/g, '/'), nsMap);
        }
    }

    return fileNamespaceMap;
}
