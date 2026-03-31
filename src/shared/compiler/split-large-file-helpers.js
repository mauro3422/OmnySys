/**
 * @fileoverview Helpers for split_large_file MCP tool.
 *
 * Extracted from split-large-file.js to keep the barrel pure
 * and satisfy compiler policy: canonical helpers should live in shared/compiler.
 *
 * @module shared/compiler/split-large-file-helpers
 */

/**
 * Agrupa átomos por responsabilidad usando múltiples estrategias.
 * 
 * Estrategias (en orden de prioridad):
 * 1. Clases: agrupa por className
 * 2. Exports: separa exports públicos de helpers internos
 * 3. DNA: agrupa por semanticFingerprint
 * 4. Imports comunes: agrupa por dependencias compartidas
 */
export function groupAtomsByResponsibility(atoms, content, lines) {
    const groups = new Map();

    // Estrategia 1: Intentar agrupar por clase primero
    const classGroups = groupByClass(atoms);
    if (classGroups.size >= 2) {
        return buildGroupsFromArray(classGroups, lines);
    }

    // Estrategia 2: Agrupar por exports vs helpers
    const exportGroups = groupByExports(atoms);
    if (exportGroups.size >= 2) {
        return buildGroupsFromArray(exportGroups, lines);
    }

    // Estrategia 3: Agrupar por DNA semántico
    const dnaGroups = groupByDNA(atoms);
    if (dnaGroups.size >= 2) {
        return buildGroupsFromArray(dnaGroups, lines);
    }

    // Estrategia 4: Agrupar por imports comunes
    const importGroups = groupByImports(atoms, content);
    if (importGroups.size >= 2) {
        return buildGroupsFromArray(importGroups, lines);
    }

    // Fallback: un solo grupo
    return buildGroupsFromArray(new Map([['main', atoms]]), lines);
}

/**
 * Estrategia 1: Agrupa por className
 */
export function groupByClass(atoms) {
    const groups = new Map();
    for (const atom of atoms) {
        const key = atom.class_name || atom.className || '_standalone';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(atom);
    }
    return groups;
}

/**
 * Estrategia 2: Separa exports públicos de helpers internos
 */
export function groupByExports(atoms) {
    const exported = atoms.filter(a => a.is_exported);
    const internal = atoms.filter(a => !a.is_exported);
    
    if (exported.length > 0 && internal.length >= 2) {
        return new Map([
            ['public', exported],
            ['helpers', internal]
        ]);
    }
    return new Map();
}

/**
 * Estrategia 3: Agrupa por DNA semanticFingerprint
 */
export function groupByDNA(atoms) {
    const groups = new Map();
    for (const atom of atoms) {
        let groupName = '_default';
        if (atom.dna_json) {
            try {
                const dna = JSON.parse(atom.dna_json);
                if (dna.semanticFingerprint) {
                    const parts = dna.semanticFingerprint.split(':');
                    if (parts.length >= 3) {
                        groupName = parts[2];
                    }
                }
            } catch { /* ignore */ }
        }
        if (!groups.has(groupName)) groups.set(groupName, []);
        groups.get(groupName).push(atom);
    }
    // Filtrar grupos con solo 1 átomo
    for (const [key, val] of groups) {
        if (val.length < 2) groups.delete(key);
    }
    return groups;
}

/**
 * Estrategia 4: Agrupa por imports comunes
 */
export function groupByImports(atoms, content) {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const imports = new Set();
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.add(match[1]);
    }

    // Si hay pocos imports, no vale la pena agrupar
    if (imports.size < 2) return new Map();

    // Para cada átomo, determinar qué imports usa (por proximidad de línea)
    const groups = new Map();
    for (const atom of atoms) {
        // Simplificación: agrupar por primer segmento del nombre
        const namePrefix = (atom.name || '').split(/(?=[A-Z])/)[0]?.toLowerCase() || '_other';
        if (!groups.has(namePrefix)) groups.set(namePrefix, []);
        groups.get(namePrefix).push(atom);
    }
    for (const [key, val] of groups) {
        if (val.length < 2) groups.delete(key);
    }
    return groups;
}

/**
 * Construye grupos finales desde un Map de nombre → átomos
 */
export function buildGroupsFromArray(groupsMap, lines) {
    const result = [];
    for (const [name, atoms] of groupsMap) {
        const groupLines = [];
        const exports = [];
        for (const atom of atoms) {
            if (atom.line_start && atom.line_end) {
                groupLines.push(...lines.slice(atom.line_start - 1, atom.line_end));
            }
            if (atom.is_exported) {
                exports.push(atom.name);
            }
        }
        result.push({ name, atoms, lines: groupLines, exports });
    }
    return result;
}

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
 * Construye el plan de división
 */
export function buildSplitPlan(analysis, options = {}) {
    const { maxLinesPerFile = 250, barrelStyle = 're-export' } = options;

    // Filtrar grupos que valga la pena dividir
    const splittableGroups = analysis.groups.filter(group => {
        return group.atoms.length >= 2 && group.lines.length > 50;
    });

    if (splittableGroups.length < 2) {
        return {
            shouldSplit: false,
            reason: 'Not enough groups to split meaningfully'
        };
    }

    // Crear plan para cada grupo
    const groupPlans = splittableGroups.map(group => {
        const baseName = analysis.filePath.replace(/\.js$/, '');
        const newFileName = `${baseName}-${group.name}.js`;
        
        return {
            name: group.name,
            newFilePath: newFileName,
            atoms: group.atoms,
            exports: group.exports,
            content: buildFileContent(group, analysis.imports),
            lines: group.lines.length
        };
    });

    // Construir barrel
    const barrelContent = buildBarrelContent(analysis, groupPlans, barrelStyle);

    return {
        shouldSplit: true,
        originalFile: analysis.filePath,
        originalLines: analysis.totalLines,
        groups: groupPlans,
        barrel: {
            content: barrelContent,
            style: barrelStyle
        }
    };
}

/**
 * Construye contenido de un archivo dividido
 */
export function buildFileContent(group, originalImports) {
    const lines = [];

    // Agregar imports necesarios (simplificado por ahora)
    lines.push('// Auto-generated by split_large_file');
    lines.push(`// Group: ${group.name}`);
    lines.push('');

    // Agregar contenido del grupo
    lines.push(...group.lines);

    return lines.join('\n');
}

/**
 * Construye contenido del barrel
 */
export function buildBarrelContent(analysis, groupPlans, style) {
    const lines = [];

    lines.push(`/**`);
    lines.push(` * @fileoverview Barrel/Coordinador - Auto-generated by split_large_file`);
    lines.push(` *`);
    lines.push(` * Este archivo re-exporta desde los módulos divididos.`);
    lines.push(` * Mantiene compatibilidad con imports existentes.`);
    lines.push(` */`);
    lines.push('');

    // Re-exportar desde cada grupo
    for (const group of groupPlans) {
        const relativePath = `./${group.newFilePath.split('/').pop()}`;
        
        if (group.exports.length > 0) {
            if (style === 're-export') {
                lines.push(`export { ${group.exports.join(', ')} } from '${relativePath}';`);
            } else {
                lines.push(`export * from '${relativePath}';`);
            }
        }
    }

    // Agregar imports originales que no se movieron
    lines.push('');
    lines.push('// Original imports preserved');
    for (const imp of analysis.imports) {
        lines.push(imp.fullMatch);
    }

    return lines.join('\n');
}