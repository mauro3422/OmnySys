/**
 * extractors/connection-detector.js
 * Detect all TypeScript connections across files
 */

import { extractTypeScriptFromFile } from './file-extractor.js';
import {
  detectInterfaceImplementations,
  detectInterfaceExtensions,
  detectTypeUsages
} from '../connections/index.js';

/**
 * Detect all TypeScript connections
 * @param {Object} fileSourceCode - Map of filePath -> code
 * @returns {Object} - Detected connections
 */
export function detectAllTypeScriptConnections(fileSourceCode) {
  const fileResults = {};

  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractTypeScriptFromFile(filePath, code);
  }

  const implementations = detectInterfaceImplementations(fileResults);
  const extensions = detectInterfaceExtensions(fileResults);
  const typeUsages = detectTypeUsages(fileResults);

  return {
    connections: [...implementations, ...extensions, ...typeUsages],
    fileResults,
    byType: {
      implementation: implementations,
      extension: extensions,
      typeUsage: typeUsages
    }
  };
}
