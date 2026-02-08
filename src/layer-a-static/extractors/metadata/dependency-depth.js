/**
 * @fileoverview dependency-depth.js
 *
 * Dependency Depth Extractor - Analyzes import complexity
 * Part of the metadata extraction pipeline
 *
 * @module extractors/metadata/dependency-depth
 */

import { getLineNumber } from '../utils.js';

/**
 * Extracts dependency depth information from code
 * @param {string} code - Source code to analyze
 * @returns {Object} Dependency depth metrics
 */
export function extractDependencyDepth(code) {
  let importCount = 0;
  let localImportCount = 0;
  let npmImportCount = 0;
  let dynamicImportCount = 0;
  let reExportCount = 0;
  const importChainIndicators = [];

  // Extract static imports
  const importPattern = /import\s+(?:[^'"]*)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importPattern.exec(code)) !== null) {
    importCount++;
    const source = match[1];
    const line = getLineNumber(code, match.index);

    if (source.startsWith('./') || source.startsWith('../')) {
      localImportCount++;

      // Check if importing from index file (chain indicator)
      if (source.includes('/index') || source.endsWith('/index.js')) {
        importChainIndicators.push({
          source,
          line,
          reason: 'index-file'
        });
      }
    } else if (!source.startsWith('node:')) {
      npmImportCount++;
    }
  }

  // Extract dynamic imports
  const dynamicImportPattern = /import\s*\(/g;
  while ((match = dynamicImportPattern.exec(code)) !== null) {
    dynamicImportCount++;
  }

  // Extract re-exports
  const reExportPattern = /export\s+(?:\*|{[^}]+})\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = reExportPattern.exec(code)) !== null) {
    reExportCount++;
    const source = match[1];
    const line = getLineNumber(code, match.index);

    // Re-exports are chain indicators
    importChainIndicators.push({
      source,
      line,
      reason: 're-export'
    });
  }

  // Calculate depth score (heuristic)
  const depthScore = localImportCount + (npmImportCount * 0.5) + (dynamicImportCount * 1.5) + (reExportCount * 2);

  return {
    importCount,
    localImportCount,
    npmImportCount,
    dynamicImportCount,
    reExportCount,
    importChainIndicators,
    depthScore: Math.round(depthScore * 10) / 10
  };
}
