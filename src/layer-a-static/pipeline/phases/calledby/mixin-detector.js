/**
 * Para cada archivo que tenga namespace imports, detecta si hace
 * `Object.assign(target, alias1, alias2, ...)` con alguno de esos aliases.
 *
 * Retorna: mixinMemberAbsPath → Set(otherMixedAbsPaths)
 * La clave es CADA archivo miembro del mixin (no el archivo que hace el assign),
 * porque son los miembros los que se llaman entre sí via `this.*`.
 *
 * Ejemplo:
 *   index.js: Object.assign(Foo.prototype, lifecycle, handlers, analyze)
 *   → mixinMap.get(lifecycle.js) = { handlers.js, analyze.js }
 *   → mixinMap.get(handlers.js)  = { lifecycle.js, analyze.js }
 *   → mixinMap.get(analyze.js)   = { lifecycle.js, handlers.js }
 *
 * @param {Object} parsedFiles
 * @param {Map} fileNamespaceMap — resultado de buildNamespaceMap
 * @returns {Map<string, Set<string>>}
 */
export function detectMixins(parsedFiles, fileNamespaceMap) {
    const mixinMap = new Map(); // memberAbsPath → Set(otherMemberAbsPaths)

    for (const [absPath, parsedFile] of Object.entries(parsedFiles)) {
        const nsMap = fileNamespaceMap.get(absPath);
        if (!nsMap || nsMap.size === 0) continue;

        const source = parsedFile.source || '';
        const mixed = new Set();

        // Detectar TODOS los aliases presentes en un Object.assign:
        // En lugar de regex compleja, buscamos qué aliases del nsMap aparecen
        // en el bloque de un Object.assign.
        const assignBlockRegex = /Object\.assign\s*\(([^;]+?)\)/gs;
        let m;
        while ((m = assignBlockRegex.exec(source)) !== null) {
            const block = m[1]; // todo lo que hay dentro de Object.assign(...)
            // Tokenizar el bloque para evitar falsos positivos con includes()
            const tokens = new Set(block.split(/[\s,\r\n()\[\]{}]+/).filter(Boolean));
            for (const [alias, resolvedPath] of nsMap) {
                if (tokens.has(alias)) {
                    mixed.add(resolvedPath);
                }
            }
        }

        // Spread en prototype: { ...alias }
        for (const [alias, resolvedPath] of nsMap) {
            if (source.includes(`...${alias}`) && source.includes('prototype')) {
                mixed.add(resolvedPath);
            }
        }

        if (mixed.size > 0) {
            // Registrar: cada miembro del mixin puede llamar a los otros via this.*
            // mixed = todos los archivos mezclados en este Object.assign
            for (const memberPath of mixed) {
                if (!mixinMap.has(memberPath)) mixinMap.set(memberPath, new Set());
                // Este miembro puede llamar a todos los otros
                for (const otherPath of mixed) {
                    if (otherPath !== memberPath) {
                        mixinMap.get(memberPath).add(otherPath);
                    }
                }
            }
            // También registrar bajo el archivo que hace el assign
            // (por si tiene sus propios this.* calls)
            if (!mixinMap.has(absPath)) mixinMap.set(absPath, new Set());
            for (const memberPath of mixed) {
                mixinMap.get(absPath).add(memberPath);
            }
        }
    }

    return mixinMap;
}
