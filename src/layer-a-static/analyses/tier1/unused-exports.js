import { isPublicAPI } from '../helpers.js';
import { classifyFile } from '../../../layer-c-memory/verification/utils/path-utils.js';

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
  const unusedByFile = {};

  // Construir índice de qué exports están siendo usados
  const usedExports = new Set();

  // 1. Marcar exports que se llaman como funciones
  for (const link of systemMap.function_links) {
    usedExports.add(link.to); // function IDs
  }

  // 2. Marcar exports que se re-exportan (barrel exports)
  for (const [barrelFile, exports] of Object.entries(systemMap.exportIndex || {})) {
    for (const [exportName, exportInfo] of Object.entries(exports)) {
      if (exportInfo.type === 'reexport') {
        // Si tier1/index.js re-exporta findHotspots desde tier1/hotspots.js
        // entonces tier1/hotspots.js::findHotspots SÍ está usado
        usedExports.add(`${exportInfo.sourceFile}:${exportInfo.sourceName}`);
      }
    }
  }

  // 3. Marcar exports que se importan directamente
  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    for (const importStmt of fileNode.imports) {
      if (!importStmt.specifiers) continue;

      for (const spec of importStmt.specifiers) {
        const importedName = spec.imported || spec.local;
        // Marcar como usado en el archivo fuente
        const sourceFile = importStmt.resolved || importStmt.source;
        if (sourceFile) {
          usedExports.add(`${sourceFile}:${importedName}`);
        }
      }
    }
  }

  // Ahora revisar cada archivo y sus exports
  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    // 🆕 CLASIFICAR: Ignorar tests y documentación
    // Scripts SÍ se analizan (tienen funciones útiles), pero con lógica diferente
    const classification = classifyFile(filePath);
    if (classification.type === 'test' || classification.type === 'documentation') {
      continue;
    }
    
    // 🆕 Para scripts, ser más permisivo con "unused exports"
    // Los scripts exportan funciones para uso CLI/externo, no para imports internos
    const isScript = classification.type === 'script';
    
    const unusedInFile = [];

    // Obtener las funciones exportadas de este archivo
    const fileFunctions = systemMap.functions[filePath] || [];

    for (const func of fileFunctions) {
      if (!func.isExported) continue;

      // Verificar si está usado (por ID de función o por nombre)
      const usedByFuncId = usedExports.has(func.id);
      const usedByName = usedExports.has(`${filePath}:${func.name}`);
      const isPublic = isPublicAPI(filePath, func.name);

      // No reportar como unused si:
      // 1. Se usa internamente (usedByFuncId o usedByName)
      // 2. Es parte de la API pública (export intencional para uso externo)
      // 3. Es un script (las exports de scripts son para uso CLI/externo por diseño)
      if (!usedByFuncId && !usedByName && !isPublic && !isScript) {
        unusedInFile.push({
          name: func.name,
          line: func.line,
          callers: 0,
          severity: 'warning'
        });
      }
    }

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
