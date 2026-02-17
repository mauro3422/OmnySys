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

  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const unusedInFile = [];

    // Recolectar todas las llamadas y accesos en este archivo
    const allCalls = new Set();

    // 1. Calls dentro de funciones
    for (const func of (systemMap.files[filePath] && systemMap.files[filePath].functions) || []) {
      for (const call of func.calls) {
        allCalls.add(call.name); // Puede ser "tier1", "tier1.findHotspots", "traverse", etc.
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
    for (const importStmt of fileNode.imports) {
      for (const spec of importStmt.specifiers || []) {
        const importedName = spec.local || spec.imported;
        const isNamespace = spec.type === 'namespace';
        const isDefault = spec.type === 'default';

        let isUsed = false;

        if (isNamespace) {
          // import * as tier1
          // Buscar si se usa tier1.* en algún call
          for (const callName of allCalls) {
            if (callName === importedName || callName.startsWith(importedName + '.')) {
              isUsed = true;
              break;
            }
          }
        } else if (isDefault) {
          // import traverse (default)
          // Buscar si se usa "traverse" directamente
          if (allCalls.has(importedName)) {
            isUsed = true;
          }
        } else {
          // import { findHotspots }
          // Buscar si se llama directamente o vía function_links
          const isUsedLocally = allCalls.has(importedName);
          const isUsedAsTarget = systemMap.function_links.some(link => {
            return link.file_to === filePath && link.to.endsWith(`:${importedName}`);
          });

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
