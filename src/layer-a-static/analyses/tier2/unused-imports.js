/**
 * Unused Imports Analyzer
 *
 * Responsabilidad:
 * - Encontrar imports que se hacen pero no se usan en ese archivo
 * - Soportar namespace imports (import * as X)
 * - Soportar default imports
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de imports sin usar
 */
export function findUnusedImports(systemMap) {
  if (!systemMap || !systemMap.files) {
    return { total: 0, byFile: {} };
  }

  const unusedByFile = {};
  let totalUnused = 0;

  // Indexar links por archivo destino para búsqueda rápida (O(links) una sola vez)
  const linksByFile = new Map();
  if (systemMap.function_links) {
    for (const link of systemMap.function_links) {
      if (!linksByFile.has(link.file_to)) {
        linksByFile.set(link.file_to, new Set());
      }
      linksByFile.get(link.file_to).add(link.to);
    }
  }

  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const unusedInFile = [];
    const fileLinks = linksByFile.get(filePath) || new Set();

    // Recolectar todas las llamadas y accesos en este archivo
    const allCalls = new Set();

    // 1. Calls dentro de funciones
    for (const func of fileNode.functions || []) {
      for (const call of func.calls || []) {
        allCalls.add(call.name);
      }
    }

    // 2. Calls a nivel de archivo (fuera de funciones)
    for (const call of fileNode.calls || []) {
      allCalls.add(call.name);
    }

    // 3. Referencias a identificadores (constantes, variables)
    for (const ref of fileNode.identifierRefs || []) {
      allCalls.add(ref);
    }

    // Obtener symbols importados
    for (const importStmt of fileNode.imports || []) {
      for (const spec of importStmt.specifiers || []) {
        const importedName = spec.local || spec.imported;
        const isNamespace = spec.type === 'namespace';
        const isDefault = spec.type === 'default';

        let isUsed = false;

        if (isNamespace) {
          // Buscar si se usa tier1.* en algún call
          for (const callName of allCalls) {
            if (callName === importedName || callName.startsWith(importedName + '.')) {
              isUsed = true;
              break;
            }
          }
        } else if (isDefault) {
          if (allCalls.has(importedName)) {
            isUsed = true;
          }
        } else {
          // Buscar si se llama directamente o vía function_links (O(1) lookup en el Set)
          const isUsedLocally = allCalls.has(importedName);

          // El ID en function_links suele ser "filePath:symbolName"
          const targetId = `${filePath}:${importedName}`;
          const isUsedAsTarget = fileLinks.has(targetId);

          isUsed = isUsedLocally || isUsedAsTarget;
        }

        if (!isUsed) {
          unusedInFile.push({
            name: importedName,
            source: importStmt.source,
            type: spec.type,
            severity: 'warning'
          });
          totalUnused++;
        }
      }
    }

    if (unusedInFile.length > 0) {
      unusedByFile[filePath] = unusedInFile;
    }
  }

  return {
    total: totalUnused,
    byFile: unusedByFile,
    recommendation: totalUnused > 0 ? `Remove ${totalUnused} unused import(s) to reduce confusion` : 'All imports are used'
  };
}
