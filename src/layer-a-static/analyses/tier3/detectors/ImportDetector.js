/**
 * @fileoverview ImportDetector.js
 * 
 * Detects broken dynamic imports.
 * 
 * @module analyses/tier3/detectors/ImportDetector
 */

import { groupByFile } from '../utils/issue-utils.js';

/**
 * Detects broken dynamic imports
 */
export class ImportDetector {
  detect(systemMap) {
    const brokenDynamics = [];
    const safeSystemMap = systemMap || {};

    for (const [filePath, fileNode] of Object.entries(safeSystemMap.files || {})) {
      if (!fileNode) continue;
      const dynamicImports = fileNode.imports?.filter(imp => 
        imp.type === 'dynamic' || imp.source?.includes('${') || imp.source?.includes('+')
      ) || [];

      for (const imp of dynamicImports) {
        if (!imp.source?.includes('${') && !imp.source?.includes('+')) {
          const resolved = systemMap.resolutions?.[filePath]?.[imp.source];

          if (resolved?.type === 'unresolved') {
            brokenDynamics.push({
              sourceFile: filePath,
              importPath: imp.source,
              line: imp.line,
              type: 'DYNAMIC_IMPORT_UNRESOLVED',
              severity: 'MEDIUM',
              reason: `Dynamic import '${imp.source}' may not resolve at runtime`,
              suggestion: 'Ensure the path is correct or handle import failure'
            });
          }
        }
      }
    }

    return {
      total: brokenDynamics.length,
      byFile: groupByFile(brokenDynamics),
      all: brokenDynamics
    };
  }
}

export default ImportDetector;
