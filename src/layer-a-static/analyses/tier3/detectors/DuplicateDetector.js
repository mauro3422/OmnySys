/**
 * @fileoverview DuplicateDetector.js
 * 
 * Detects duplicate functions.
 * 
 * @module analyses/tier3/detectors/DuplicateDetector
 */

import { isCommonFunctionName } from '../utils/name-utils.js';

/**
 * Detects duplicate or similar functions between files
 */
export class DuplicateDetector {
  detect(systemMap) {
    const duplicates = [];
    const functionIndex = new Map();

    for (const [filePath, functions] of Object.entries(systemMap.functions || {})) {
      for (const func of functions) {
        if (!functionIndex.has(func.name)) {
          functionIndex.set(func.name, []);
        }
        functionIndex.get(func.name).push({
          file: filePath,
          function: func
        });
      }
    }

    for (const [funcName, occurrences] of functionIndex.entries()) {
      if (occurrences.length > 1) {
        if (isCommonFunctionName(funcName)) continue;

        const files = occurrences.map(o => o.file);

        duplicates.push({
          functionName: funcName,
          files: files,
          count: occurrences.length,
          type: 'DUPLICATE_FUNCTION_NAME',
          severity: 'LOW',
          reason: `Function '${funcName}' defined in ${occurrences.length} files`,
          suggestion: 'Consider extracting to a shared module or renaming for clarity'
        });
      }
    }

    return {
      total: duplicates.length,
      all: duplicates
    };
  }
}

export default DuplicateDetector;
