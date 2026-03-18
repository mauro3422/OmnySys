import path from 'path';

/**
 * Parsea los imports de cada parsedFile y construye:
 * fileNamespaceMap: absoluteFilePath → Map(alias → resolvedAbsFilePath)
 *
 * Solo considera `import * as alias` (namespace imports).
 *
 * @param {Object} parsedFiles  — { [absPath]: parsedFile }
 * @param {string} rootPath     — raíz del proyecto (para resolver relativos)
 * @returns {Map<string, Map<string, string>>}
 */
export function buildNamespaceMap(parsedFiles, rootPath) {
    const fileNamespaceMap = new Map();

    for (const [absPath, parsedFile] of Object.entries(parsedFiles)) {
        const imports = parsedFile.imports || [];
        if (imports.length === 0) continue;

        const nsMap = new Map();
        const dir = path.dirname(absPath);

        for (let i = 0; i < imports.length; i++) {
            const imp = imports[i];
            const source = imp.source;

            if (!source) continue;

            const isNamespace = imp.type === 'namespace' ||
                imp.namespace === true ||
                (imp.specifiers || []).some(s => s.type === 'namespace' || s.imported === '*') ||
                (imp.specifiers?.length === 1 && imp.specifiers[0]?.local && !imp.specifiers[0]?.imported);

            const hasNamespaceAlias = imp.alias || (imp.specifiers?.length === 1 && imp.specifiers[0]?.type === 'namespace');

            if (!isNamespace && !hasNamespaceAlias) continue;

            const alias = imp.alias ||
                imp.specifiers?.[0]?.local ||
                imp.specifiers?.[0]?.name;
            
            if (!alias) continue;

            let resolved;
            if (source[0] === '.') {
                resolved = path.resolve(dir, source);
            } else {
                // For non-relative imports, we try to resolve relative to rootPath if provided
                resolved = rootPath ? path.resolve(rootPath, source) : source;
            }
            
            if (!path.extname(resolved)) resolved += '.js';

            // Ensure normalized path (forward slashes) for graph consistency
            nsMap.set(alias, resolved.replace(/\\/g, '/'));
        }

        if (nsMap.size > 0) {
            fileNamespaceMap.set(absPath.replace(/\\/g, '/'), nsMap);
        }
    }

    return fileNamespaceMap;
}
