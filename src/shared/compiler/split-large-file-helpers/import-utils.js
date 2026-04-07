/**
 * @fileoverview Import utilities for splitting large files.
 * @module shared/compiler/split-large-file-helpers/import-utils
 */

import { escapeRegex } from '#shared/utils/normalize-helpers.js';

/**
 * Extrae imports de un archivo
 */
export function extractImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push({
            source: match[1],
            fullMatch: match[0]
        });
    }

    return imports;
}

/**
 * Encuentra los imports necesarios para un grupo de átomos
 *
 * Analiza qué imports usa cada átomo del grupo basándose en:
 * 1. Variables/símbolos referenciados en el código del átomo
 * 2. Imports que aparecen en las líneas del grupo
 */
export function findImportsForGroup(group, originalImports, originalLines) {
    // Recopilar todo el código del grupo
    const groupCode = [];
    for (const atom of group.atoms) {
        if (atom.line_start && atom.line_end) {
            groupCode.push(...originalLines.slice(atom.line_start - 1, atom.line_end));
        }
    }
    const groupCodeText = groupCode.join('\n');

    // Encontrar imports que el grupo realmente usa
    const usedImports = [];
    for (const imp of originalImports) {
        const symbols = extractImportSymbols(imp.fullMatch);

        const isUsed = symbols.some(symbol => {
            const regex = new RegExp(`\\b${escapeRegex(symbol)}\\b`);
            return regex.test(groupCodeText);
        });

        if (isUsed) {
            usedImports.push(imp);
        }
    }

    // Fallback: si no se encontraron, incluir todos
    if (usedImports.length === 0) {
        return originalImports.slice(0, 5);
    }

    return usedImports;
}

/**
 * Extrae símbolos de una declaración import
 */
export function extractImportSymbols(importLine) {
    const symbols = [];

    const namedMatch = importLine.match(/import\s+\{([^}]+)\}/);
    if (namedMatch) {
        const namedSymbols = namedMatch[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
        symbols.push(...namedSymbols.filter(Boolean));
    }

    const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
    if (defaultMatch && !namedMatch) {
        symbols.push(defaultMatch[1]);
    }

    const namespaceMatch = importLine.match(/import\s+\*\s+as\s+(\w+)/);
    if (namespaceMatch) {
        symbols.push(namespaceMatch[1]);
    }

    return symbols;
}

/**
 * Ajusta paths de imports relativos para la nueva ubicación en subcarpeta
 *
 * Ejemplo:
 *   Original: import { foo } from './other-module.js';
 *   New location: subfolder/index.js
 *   Adjusted: import { foo } from '../other-module.js';
 *
 * También elimina imports circulares (archivos que se importan a sí mismos)
 */
export function adjustImportPath(importLine, source, folderPath) {
    // Solo ajustar imports relativos (que empiezan con ./)
    if (!source.startsWith('./')) {
        return importLine;
    }

    // Detectar import circular: el source apunta al archivo original
    // Ejemplo: import { ... } from './directory-structure-folderization-analysis-helpers.js'
    // cuando estamos en directory-structure-folderization-analysis/helpers.js
    const folderBaseName = folderPath.split('/').pop();
    if (source.includes(folderBaseName)) {
        // Import circular - eliminar esta línea
        return null;
    }

    // El import relativo necesita un ../ para salir de la subcarpeta
    const adjustedSource = source.replace(/^\.\//, '../');

    return importLine.replace(source, adjustedSource);
}
