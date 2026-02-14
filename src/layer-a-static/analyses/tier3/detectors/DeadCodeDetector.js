/**
 * @fileoverview DeadCodeDetector.js
 * 
 * Detects dead functions.
 * 
 * @module analyses/tier3/detectors/DeadCodeDetector
 */

import { groupByFile } from '../utils/issue-utils.js';

/**
 * Detects dead functions (never called)
 */
export class DeadCodeDetector {
  detect(systemMap) {
    const deadFunctions = [];
    const safeSystemMap = systemMap || {};

    for (const [filePath, functions] of Object.entries(safeSystemMap.functions || {})) {
      if (!functions) continue;
      for (const func of functions) {
        if (!func) continue;
        const isExported = func.isExported || false;
        const isCalled = func.calls?.length > 0 || func.usedBy?.length > 0;

        const isEventHandler = func.name?.startsWith('on') || 
                              func.name?.startsWith('handle');

        const isInitFunction = func.name?.toLowerCase().includes('init') ||
                              func.name?.toLowerCase().includes('setup') ||
                              func.name?.toLowerCase().includes('configure');

        if (!isExported && !isCalled && !isEventHandler && !isInitFunction) {
          deadFunctions.push({
            functionName: func.name,
            file: filePath,
            line: func.line,
            type: 'DEAD_FUNCTION',
            severity: 'LOW',
            reason: `Function '${func.name}' is never called`,
            suggestion: 'Remove if not needed, or check if it should be exported'
          });
        }
      }
    }

    return {
      total: deadFunctions.length,
      byFile: groupByFile(deadFunctions),
      all: deadFunctions
    };
  }
}

export default DeadCodeDetector;
