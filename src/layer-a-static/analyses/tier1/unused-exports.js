import { isPublicAPI } from '../helpers.js';
import { classifyFile } from '#shared/utils/path-utils.js';

/**
 * Construye el índice de exports que están siendo usados
 */
function buildUsedExportsIndex(systemMap) {
  const usedExports = new Set();
  const functionLinks = systemMap.function_links || [];
  const exportIndex = systemMap.exportIndex || {};
  const files = systemMap.files || {};

  for (const link of functionLinks) {
    usedExports.add(link.to);
  }

  for (const exports of Object.values(exportIndex)) {
    for (const exportInfo of Object.values(exports)) {
      if (exportInfo.type === 'reexport') {
        usedExports.add(`${exportInfo.sourceFile}:${exportInfo.sourceName}`);
      }
    }
  }

  for (const fileNode of Object.values(files)) {
    const imports = fileNode.imports || [];

    for (const importStmt of imports) {
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
  const files = systemMap.files || {};
  const functionsByFile = systemMap.functions || {};
  let totalUnused = 0;

  for (const [filePath, fileNode] of Object.entries(files)) {
    const classification = classifyFile(filePath);
    if (classification.type === 'test' || classification.type === 'documentation') {
      continue;
    }

    const fileFunctions = functionsByFile[filePath] || fileNode.functions || [];

    const unusedInFile = findUnusedInFile(filePath, fileFunctions, usedExports);

    if (unusedInFile.length > 0) {
      unusedByFile[filePath] = unusedInFile;
      totalUnused += unusedInFile.length;
    }
  }

  return {
    totalUnused,
    byFile: unusedByFile,
    impact: `Removing unused exports could reduce: ${totalUnused} functions`
  };
}
