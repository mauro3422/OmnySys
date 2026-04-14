
import path from 'path';
import fs from 'fs';

/**
 * Calcula el path relativo para un import tras un movimiento
 * @param {string} callerPath - Path relativo del archivo que importa (desde projectPath)
 * @param {string} targetPath - Nuevo path relativo del archivo importado (desde projectPath)
 * @param {string} projectPath - Path raíz del proyecto (default '.')
 * @returns {string} Nuevo string de import relativo
 */
export function calculateRelativeImport(callerPath, targetPath, projectPath = '.') {
    const callerDir = path.dirname(path.resolve(projectPath, callerPath));
    const absoluteTarget = path.resolve(projectPath, targetPath);

    let relative = path.relative(callerDir, absoluteTarget);

    // Normalize to use forward slashes even on Windows
    relative = relative.replace(/\\/g, '/');

    // Ensure starts with ./ or ../
    if (!relative.startsWith('.')) {
        relative = './' + relative;
    }

    return relative;
}

/**
 * Try to resolve an import with different extensions (.js, .ts, .tsx, or none).
 * FIXED: Handle TypeScript and extensionless imports
 */
function tryResolveWithExtensions(resolvedPath) {
    // If file exists as-is, return it
    if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
    }
    
    // Try adding extensions
    const extensions = ['.js', '.ts', '.tsx', '.mjs', '.cjs', '.jsx'];
    
    for (const ext of extensions) {
        const withExt = resolvedPath + ext;
        if (fs.existsSync(withExt)) {
            return withExt;
        }
    }
    
    return resolvedPath; // Return original even if not found
}

/**
 * Normaliza un path de import para comparación
 * @param {string} importSource - El string del import
 * @param {string} currentFile - Archivo que contiene el import
 * @param {string} projectPath - Raíz del proyecto
 * @returns {string} Path absoluto resuelto
 */
export function normalizeImportToAbsolute(importSource, currentFile, projectPath) {
    if (importSource.startsWith('#')) {
        // Simple alias resolution (matching path-resolver.js logic)
        const aliasMap = {
            '#core': 'src/core',
            '#layer-a': 'src/layer-a-static',
            '#layer-b': 'src/layer-b-semantic',
            '#layer-c': 'src/layer-c-memory',
            '#layer-graph': 'src/layer-graph',
            '#ai': 'src/ai',
            '#services': 'src/services',
            '#utils': 'src/utils',
            '#config': 'src/config',
            '#shared': 'src/shared',
            '#cli': 'src/cli'
        };

        for (const [alias, realPath] of Object.entries(aliasMap)) {
            if (importSource.startsWith(alias)) {
                const relativePart = importSource.slice(alias.length + 1);
                const resolved = path.resolve(projectPath, realPath, relativePart);
                // FIXED: Try to resolve with different extensions
                return tryResolveWithExtensions(resolved);
            }
        }
    }

    if (importSource.startsWith('.')) {
        const resolved = path.resolve(path.dirname(path.resolve(projectPath, currentFile)), importSource);
        // FIXED: Try to resolve with different extensions
        return tryResolveWithExtensions(resolved);
    }

    return importSource; // node_module or absolute
}
