import { isPublicAPI } from '../helpers.js';
import { classifyFile } from '#shared/utils/path-utils.js';

/**
 * Construye el índice de exports que están siendo usados
 */
function buildUsedExportsIndex(systemMap) {
  const usedExports = new Set();

  for (const link of (systemMap.function_links || [])) {
    usedExports.add(link.to);
  }

  for (const [barrelFile, exports] of Object.entries(systemMap.exportIndex || {})) {
    for (const [exportName, exportInfo] of Object.entries(exports)) {
      if (exportInfo.type === 'reexport') {
        usedExports.add(`${exportInfo.sourceFile}:${exportInfo.sourceName}`);
      }
    }
  }

  for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
    for (const importStmt of fileNode.imports) {
      if (!importStmt.specifiers) continue;

      for (const spec of importStmt.specifiers) {
        const importedName = spec.imported || spec.local;
        const sourceFile = importStmt.resolved || importStmt.source;
        if (sourceFile) {
          usedExports.add(`${sourceFile}:${importedName}`);
        }
      }
    }
  }

  return usedExports;
}

/**
 * Encuentra exports sin usar en un archivo específico
 */
function findUnusedInFile(filePath, fileFunctions, usedExports) {
  const classification = classifyFile(filePath);
  if (classification.type === 'test' || classification.type === 'documentation') {
    return [];
  }

  const isScript = classification.type === 'script';
  const unusedInFile = [];

  for (const func of fileFunctions) {
    if (!func.isExported) continue;

    const usedByFuncId = usedExports.has(func.id);
    const usedByName = usedExports.has(`${filePath}:${func.name}`);
    const isPublic = isPublicAPI(filePath, func.name);

    if (!usedByFuncId && !usedByName && !isPublic && !isScript) {
      unusedInFile.push({
        name: func.name,
        line: func.line,
        callers: 0,
        severity: 'warning'
      });
    }
  }

  return unusedInFile;
}

/**
 * Unused Exports Analyzer
 *
 * Responsabilidad:
 * - Detectar exports que nunca se importan (código muerto)
 * - Considerar barrel exports (re-exports)
 * - Filtrar API pública (exports intencionales para uso externo)
 * - IGNORAR tests, scripts y documentación (no son código de producción)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de exports sin usar
 */
export function findUnusedExports(systemMap) {
  if (!systemMap) {
    return { totalUnused: 0, byFile: {}, impact: 'No unused exports detected' };
  }

  const unusedByFile = {};
  const usedExports = buildUsedExportsIndex(systemMap);

  for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
    const fileFunctions = (systemMap.functions && systemMap.functions[filePath]) || 
                          (systemMap.files && systemMap.files[filePath] && systemMap.files[filePath].functions) || 
                          [];

    const unusedInFile = findUnusedInFile(filePath, fileFunctions, usedExports);

    if (unusedInFile.length > 0) {
      unusedByFile[filePath] = unusedInFile;
    }
  }

  return {
    totalUnused: Object.values(unusedByFile).flat().length,
    byFile: unusedByFile,
    impact: `Removing unused exports could reduce: ${Object.values(unusedByFile).flat().length} functions`
  };
}
