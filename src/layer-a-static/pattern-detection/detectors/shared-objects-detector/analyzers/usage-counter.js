/**
 * @fileoverview Usage Counter
 * 
 * Counts real usages of shared objects
 * 
 * @module shared-objects-detector/analyzers/usage-counter
 */

/**
 * Count real usages of an object (imports from other files)
 * @param {string} objectName - Object name
 * @param {Object} systemMap - System map data
 * @returns {Array} Usage records
 */
export function countUsages(objectName, systemMap) {
  const usages = [];
  
  for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
    for (const importStmt of fileNode.imports || []) {
      for (const spec of importStmt.specifiers || []) {
        if ((spec.imported || spec.local) === objectName) {
          usages.push({
            file: filePath,
            source: importStmt.source,
            line: importStmt.line
          });
        }
      }
    }
  }
  
  return usages;
}
