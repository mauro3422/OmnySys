/**
 * @fileoverview Import Usage Detector
 * 
 * Detects which imports are used in function code
 * 
 * @module function-analyzer/detectors/import-usage-detector
 */

/**
 * Detect used imports in function code
 * @param {string} functionCode - Function code
 * @param {Array} imports - File imports
 * @returns {Array} Used imports
 */
export function detectUsedImports(functionCode, imports = []) {
  const usedImports = [];
  
  for (const imp of imports) {
    for (const spec of imp.specifiers || []) {
      const importedName = spec.imported || spec.local;
      
      // Check if import is used in function
      if (isNameUsed(functionCode, importedName)) {
        usedImports.push({
          source: imp.source,
          name: importedName,
          line: imp.line
        });
      }
    }
  }
  
  return usedImports;
}

/**
 * Check if name is used in code
 */
function isNameUsed(code, name) {
  if (!name) return false;
  
  // Word boundary match to avoid partial matches
  const pattern = new RegExp(`\\b${name}\\b`);
  return pattern.test(code);
}
