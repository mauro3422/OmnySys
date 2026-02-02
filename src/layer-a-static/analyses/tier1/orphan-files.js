/**
 * Orphan Files Analyzer
 *
 * Responsabilidad:
 * - Detectar archivos sin dependencias (entry points o código muerto)
 */

import { isLikelyEntryPoint } from '../helpers.js';

/**
 * Encuentra archivos sin dependencias (entrada points o código muerto)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de archivos huérfanos
 */
export function findOrphanFiles(systemMap) {
  const orphans = [];

  // Construir set de archivos que son re-exportados (barrel exports)
  const reexportedFiles = new Set();
  for (const [barrelFile, exports] of Object.entries(systemMap.exportIndex || {})) {
    for (const exportInfo of Object.values(exports)) {
      if (exportInfo.type === 'reexport' && exportInfo.sourceFile) {
        reexportedFiles.add(exportInfo.sourceFile);
      }
    }
  }

  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const hasIncomingDeps = fileNode.usedBy && fileNode.usedBy.length > 0;
    const hasOutgoingDeps = fileNode.dependsOn && fileNode.dependsOn.length > 0;
    const isReexported = reexportedFiles.has(filePath);

    // Un archivo NO es huérfano si:
    // 1. Tiene incoming dependencies (otros archivos lo importan)
    // 2. Tiene outgoing dependencies (importa otros archivos)
    // 3. Se re-exporta en otro archivo (barrel export)
    if (!hasIncomingDeps && !hasOutgoingDeps && !isReexported) {
      orphans.push({
        file: filePath,
        type: isLikelyEntryPoint(filePath) ? 'ENTRY_POINT' : 'DEAD_CODE',
        functions: (systemMap.functions[filePath] || []).length,
        recommendation: isLikelyEntryPoint(filePath)
          ? 'This is likely your entry point - ignore'
          : 'Consider removing or linking this file'
      });
    }
  }

  return {
    total: orphans.length,
    files: orphans,
    deadCodeCount: orphans.filter(o => o.type === 'DEAD_CODE').length
  };
}
