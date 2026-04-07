/**
 * @fileoverview Grouping strategies for splitting large files.
 * @module shared/compiler/split-large-file-helpers/grouping-strategies
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

    // Estrategia 2: Agrupar por exports vs helpers (con dependencias)
    const exportGroups = groupByExports(atoms, content, lines);
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
 *
 * Incluye TODAS las dependencias (directas y transitivas) de funciones exportadas
 * para evitar referencias rotas entre archivos.
 */
export function groupByExports(atoms, content, lines) {
    const exported = atoms.filter(a => a.is_exported);
    const internal = atoms.filter(a => !a.is_exported);

    if (exported.length === 0 || internal.length < 2) {
        return new Map();
    }

    // Mapear nombre → átomo para búsqueda rápida
    const atomByName = new Map();
    for (const atom of atoms) {
        atomByName.set(atom.name, atom);
    }

    // Encontrar TODAS las dependencias (directas y transitivas) de funciones exportadas
    const exportedNames = new Set(exported.map(a => a.name));
    const dependencyNames = new Set();

    // Función recursiva para encontrar todas las dependencias
    function findDependencies(atomName, visited = new Set()) {
        if (visited.has(atomName)) return; // Evitar ciclos
        visited.add(atomName);

        const atom = atomByName.get(atomName);
        if (!atom || !atom.calls) return;

        for (const call of atom.calls) {
            const callName = typeof call === 'string' ? call : call.name;
            // Si es una llamada interna (no externa), agregar como dependencia
            if (callName && !callName.includes('.') && !exportedNames.has(callName)) {
                dependencyNames.add(callName);
                // Recursivamente buscar dependencias de esta dependencia
                findDependencies(callName, visited);
            }
        }
    }

    // Encontrar dependencias de cada función exportada
    for (const atom of exported) {
        findDependencies(atom.name);
    }

    // Separar: public (exported + dependencias) vs helpers (resto)
    const publicAtoms = [];
    const helperAtoms = [];

    for (const atom of atoms) {
        if (atom.is_exported || dependencyNames.has(atom.name)) {
            publicAtoms.push(atom);
        } else {
            helperAtoms.push(atom);
        }
    }

    // Solo retornar si ambos grupos tienen contenido
    if (publicAtoms.length > 0 && helperAtoms.length > 0) {
        return new Map([
            ['public', publicAtoms],
            ['helpers', helperAtoms]
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
