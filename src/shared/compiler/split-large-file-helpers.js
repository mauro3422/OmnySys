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
 * Construye el plan de división con folderización automática
 * 
 * En lugar de crear archivos con sufijos (file-public.js), crea una carpeta:
 *   file/
 *     ├── index.js (barrel)
 *     ├── public.js
 *     └── helpers.js
 * 
 * Incluye análisis de acoplamiento y reporte educativo cuando no se puede dividir.
 */
export function buildSplitPlan(analysis, options = {}) {
    const { maxLinesPerFile = 250, barrelStyle = 're-export' } = options;

    // Filtrar grupos que valga la pena dividir
    const splittableGroups = analysis.groups.filter(group => {
        return group.atoms.length >= 2 && group.lines.length > 50;
    });

    if (splittableGroups.length < 2) {
        // Estrategia 3: Fail Fast Educativo
        // Calcular métricas de acoplamiento
        const couplingAnalysis = analyzeCoupling(analysis.atoms);
        
        return {
            shouldSplit: false,
            reason: 'Not enough groups to split meaningfully',
            coupling: couplingAnalysis,
            suggestions: generateSuggestions(couplingAnalysis, analysis.atoms)
        };
    }

    // Calcular directorio folderizado
    // Ejemplo: src/shared/compiler/directory-structure-folderization-analysis.js
    // → src/shared/compiler/directory-structure-folderization-analysis/
    const baseName = analysis.filePath.replace(/\.js$/, '');
    const folderPath = baseName;
    
    // Crear plan para cada grupo con paths folderizados
    const groupPlans = splittableGroups.map(group => {
        // En lugar de file-public.js → file/public.js
        const newFilePath = `${folderPath}/${group.name}.js`;
        
        return {
            name: group.name,
            newFilePath: newFilePath,
            atoms: group.atoms,
            exports: group.exports,
            content: buildFileContent(group, analysis.imports, analysis.content, analysis.lines, folderPath),
            lines: group.lines.length
        };
    });

    // Construir barrel como index.js en la carpeta
    const barrelContent = buildBarrelContent(analysis, groupPlans, barrelStyle);

    return {
        shouldSplit: true,
        originalFile: analysis.filePath,
        originalLines: analysis.totalLines,
        folderPath: folderPath,
        groups: groupPlans,
        barrel: {
            content: barrelContent,
            style: barrelStyle,
            filePath: `${folderPath}/index.js`
        }
    };
}

/**
 * Construye contenido de un archivo dividido
 * 
 * Extrae el código REAL del archivo original usando metadatos de átomos.
 * Ajusta imports relativos para la nueva ubicación en subcarpeta.
 */
export function buildFileContent(group, originalImports, originalContent, originalLines, folderPath) {
    const lines = [];

    // Header
    lines.push('// Auto-generated by split_large_file');
    lines.push(`// Group: ${group.name}`);
    lines.push('');

    // Determinar imports necesarios para este grupo
    const usedImports = findImportsForGroup(group, originalImports, originalLines);
    for (const imp of usedImports) {
        // Ajustar imports relativos para la nueva ubicación en subcarpeta
        const adjustedImport = adjustImportPath(imp.fullMatch, imp.source, folderPath);
        if (adjustedImport) {
            lines.push(adjustedImport);
        }
    }
    if (lines.length > 3) { // Si hay imports (más allá del header)
        lines.push('');
    }

    // Extraer código REAL de cada átomo del archivo original
    for (const atom of group.atoms) {
        const atomCode = extractRealAtomCode(atom, originalContent, originalLines);
        if (atomCode) {
            lines.push(atomCode);
            lines.push('');
        }
    }

    return lines.join('\n');
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
function adjustImportPath(importLine, source, folderPath) {
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

/**
 * Extrae código real de un átomo desde el archivo original
 * 
 * Usa line_start/line_end de los metadatos para extraer el contenido exacto.
 * Agrega prefijo export si el átomo está exportado.
 */
function extractRealAtomCode(atom, originalContent, originalLines) {
    if (!atom.line_start || !atom.line_end) {
        return null;
    }

    // Extraer líneas reales del archivo original
    const startIdx = atom.line_start - 1; // 0-indexed
    const endIdx = atom.line_end; // slice es exclusivo
    const codeLines = originalLines.slice(startIdx, endIdx);

    if (codeLines.length === 0) {
        return null;
    }

    // Si es exportado y no tiene 'export' en la primera línea, agregarlo
    let result = codeLines.join('\n');
    if (atom.is_exported && !result.trimStart().startsWith('export ')) {
        const firstLine = result.trimStart();
        if (firstLine.startsWith('function ') || firstLine.startsWith('const ') || firstLine.startsWith('let ') || firstLine.startsWith('var ')) {
            result = 'export ' + result;
        }
    }

    return result;
}

/**
 * Encuentra los imports necesarios para un grupo de átomos
 * 
 * Analiza qué imports usa cada átomo del grupo basándose en:
 * 1. Variables/símbolos referenciados en el código del átomo
 * 2. Imports que aparecen en las líneas del grupo
 */
function findImportsForGroup(group, originalImports, originalLines) {
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
function extractImportSymbols(importLine) {
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
 * Escapa caracteres especiales de regex
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// ─────────────────────────────────────────────────────────────────────────────
// ESTRATEGIA 3: FAIL FAST EDUCATIVO - Análisis de acoplamiento
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analiza el acoplamiento del archivo basándose en dependencias
 * 
 * Retorna métricas:
 * - couplingPercentage: % de átomos interconectados
 * - leafNodes: funciones que no llaman a nadie (hojas)
 * - centralNodes: funciones más conectadas (alta centralidad)
 * - canSplit: si el archivo puede dividirse de forma segura
 */
export function analyzeCoupling(atoms) {
    // Mapear nombre → átomo
    const atomByName = new Map();
    for (const atom of atoms) {
        atomByName.set(atom.name, atom);
    }

    // Contar conexiones por átomo
    const connectionCount = new Map();
    const leafNodes = [];
    const centralNodes = [];

    for (const atom of atoms) {
        const calls = atom.calls || [];
        const uniqueCalls = new Set();
        
        for (const call of calls) {
            const callName = typeof call === 'string' ? call : call.name;
            if (callName && atomByName.has(callName)) {
                uniqueCalls.add(callName);
            }
        }

        connectionCount.set(atom.name, uniqueCalls.size);

        // Hoja: no llama a nadie interno
        if (uniqueCalls.size === 0) {
            leafNodes.push(atom.name);
        }
    }

    // Calcular centralidad (cuántas veces es llamado cada átomo)
    const calledByCount = new Map();
    for (const atom of atoms) {
        const calls = atom.calls || [];
        for (const call of calls) {
            const callName = typeof call === 'string' ? call : call.name;
            if (callName && atomByName.has(callName)) {
                calledByCount.set(callName, (calledByCount.get(callName) || 0) + 1);
            }
        }
    }

    // Identificar nodos centrales (más llamados)
    for (const [name, count] of calledByCount) {
        if (count >= 3) { // Llamado por 3+ funciones
            centralNodes.push({ name, calledBy: count });
        }
    }

    // Calcular % de acoplamiento
    const totalAtoms = atoms.length;
    const connectedAtoms = atoms.filter(a => {
        const calls = a.calls || [];
        return calls.some(call => {
            const callName = typeof call === 'string' ? call : call.name;
            return callName && atomByName.has(callName);
        });
    }).length;

    const couplingPercentage = totalAtoms > 0 
        ? Math.round((connectedAtoms / totalAtoms) * 100) 
        : 0;

    // Determinar si puede dividirse
    const canSplit = couplingPercentage < 80;

    return {
        totalAtoms,
        connectedAtoms,
        couplingPercentage,
        leafNodes: leafNodes.slice(0, 10), // Top 10
        centralNodes: centralNodes.sort((a, b) => b.calledBy - a.calledBy).slice(0, 5), // Top 5
        canSplit,
        message: canSplit 
            ? `Acoplamiento moderado (${couplingPercentage}%). División posible.`
            : `Acoplamiento alto (${couplingPercentage}%). Archivo indivisible en estado actual.`
    };
}

/**
 * Genera sugerencias de refactorización basadas en análisis de acoplamiento
 * 
 * Estrategia 1 (Bottom-Up): Identificar hojas para extraer primero
 * Estrategia 2 (Clustering): Identificar sub-grafos desconectados
 * Estrategia 3 (Fail Fast): Reportar por qué no se puede dividir
 */
export function generateSuggestions(couplingAnalysis, atoms) {
    const suggestions = [];

    // Estrategia 1: Bottom-Up - Extraer hojas primero
    if (couplingAnalysis.leafNodes.length > 0) {
        suggestions.push({
            strategy: 'bottom-up',
            priority: 'high',
            title: 'Extraer funciones hoja primero',
            description: `Las siguientes ${couplingAnalysis.leafNodes.length} funciones no llaman a nadie más. Pueden extraerse a un archivo utils.js sin riesgo:`,
            items: couplingAnalysis.leafNodes.map(name => `  - ${name}`),
            action: 'Mover estas funciones a utils.js, luego re-analizar el archivo original.'
        });
    }

    // Estrategia 2: Clustering - Identificar nodos centrales
    if (couplingAnalysis.centralNodes.length > 0) {
        suggestions.push({
            strategy: 'clustering',
            priority: 'medium',
            title: 'Funciones altamente conectadas',
            description: 'Estas funciones son llamadas por muchas otras. Considerar refactorizarlas:',
            items: couplingAnalysis.centralNodes.map(n => `  - ${n.name} (llamado por ${n.calledBy} funciones)`),
            action: 'Extraer estas funciones a un módulo independiente puede reducir el acoplamiento.'
        });
    }

    // Estrategia 3: Fail Fast - Reporte de acoplamiento
    if (!couplingAnalysis.canSplit) {
        suggestions.push({
            strategy: 'fail-fast',
            priority: 'critical',
            title: 'Archivo indivisible',
            description: `El nivel de acoplamiento es ${couplingAnalysis.couplingPercentage}%. No se puede dividir de forma segura.`,
            items: [
                `  - ${couplingAnalysis.connectedAtoms} de ${couplingAnalysis.totalAtoms} átomos están interconectados`,
                `  - ${couplingAnalysis.leafNodes.length} funciones hoja disponibles para extracción`,
                `  - ${couplingAnalysis.centralNodes.length} funciones centrales necesitan refactorización`
            ],
            action: 'Primero extraer hojas, luego re-evaluar. Repetir hasta que acoplamiento < 80%.'
        });
    }

    return suggestions;
}
