/**
 * @fileoverview Split plan builder for large files.
 * @module shared/compiler/split-large-file-helpers/split-plan-builder
 */

import { analyzeCoupling, generateSuggestions } from './coupling-analysis.js';
import { buildFileContent } from './code-extraction.js';
import { buildBarrelContent } from './barrel-builder.js';

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
