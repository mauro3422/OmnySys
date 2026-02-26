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
    const fileNamespaceMap = new Map(); // absPath → Map(alias → resolvedAbsPath)

    for (const [absPath, parsedFile] of Object.entries(parsedFiles)) {
        const nsMap = new Map();
        const imports = parsedFile.imports || [];

        for (const imp of imports) {
            // Detectar namespace import: import * as alias from './source'
            const isNamespace = imp.type === 'namespace' ||
                (imp.specifiers || []).some(s => s.type === 'namespace' || s.imported === '*') ||
                imp.namespace === true ||
                (imp.specifiers?.length === 1 && imp.specifiers[0]?.local && !imp.specifiers[0]?.imported);

            // También detectar por la presencia de un alias sin specifiers nombrados
            const hasNamespaceAlias = imp.alias || (imp.specifiers?.length === 1 && imp.specifiers[0]?.type === 'namespace');

            if (!isNamespace && !hasNamespaceAlias) continue;

            const alias = imp.alias ||
                imp.specifiers?.[0]?.local ||
                imp.specifiers?.[0]?.name;
            if (!alias) continue;

            const source = imp.source;
            if (!source || source.startsWith('node:') || !source.startsWith('.')) continue;

            // Resolver el path relativo al archivo actual
            const dir = path.dirname(absPath);
            let resolved = path.resolve(dir, source);
            // Agregar .js si no tiene extensión
            if (!path.extname(resolved)) resolved += '.js';

            nsMap.set(alias, resolved);
        }

        if (nsMap.size > 0) {
            fileNamespaceMap.set(absPath, nsMap);
        }
    }

    return fileNamespaceMap;
}
