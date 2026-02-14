/**
 * @fileoverview Export Parser - Parseo de exports
 * 
 * @module parsers/modules
 */

/**
 * Find all exports in code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of export info
 */
export function findExports(code) {
  const exports = [];
  
  // Named exports: export const x = ...
  const namedExportPattern = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
  let match;
  while ((match = namedExportPattern.exec(code)) !== null) {
    exports.push({
      type: 'NamedExport',
      name: match[1],
      start: match.index
    });
  }
  
  // Default export: export default ...
  const defaultPattern = /export\s+default\s+(?:class|function|interface)?\s*(\w+)?/g;
  while ((match = defaultPattern.exec(code)) !== null) {
    exports.push({
      type: 'DefaultExport',
      name: match[1] || 'default',
      start: match.index
    });
  }
  
  // Export all: export * from 'module'
  const exportAllPattern = /export\s+\*\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = exportAllPattern.exec(code)) !== null) {
    exports.push({
      type: 'ExportAll',
      source: match[1],
      start: match.index
    });
  }
  
  // Re-exports: export { x } from 'module'
  const reExportPattern = /export\s+\{\s*([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = reExportPattern.exec(code)) !== null) {
    exports.push({
      type: 'ReExport',
      names: match[1].split(',').map(n => n.trim().split(' as ')[0]),
      source: match[2],
      start: match.index
    });
  }
  
  // Module.exports
  const moduleExportsPattern = /module\.exports\s*=\s*(?:\{([^}]+)\}|(\w+))/g;
  while ((match = moduleExportsPattern.exec(code)) !== null) {
    exports.push({
      type: 'CommonJSExport',
      names: match[1] 
        ? match[1].split(',').map(n => n.trim().split(':')[0].trim())
        : [match[2]],
      start: match.index
    });
  }
  
  return exports;
}

/**
 * Check if file is a barrel file (re-exports from other modules)
 * @param {string} code - Source code
 * @returns {boolean} True if barrel file
 */
export function isBarrelFile(code) {
  const hasOnlyReExports = /export\s+\*\s+from/.test(code);
  const noLocalExports = !/export\s+(?:const|let|var|function|class)/.test(code);
  return hasOnlyReExports && noLocalExports;
}

/**
 * Get exported names
 * @param {Array} exports - Export array
 * @returns {Array} Export names
 */
export function getExportedNames(exports) {
  return exports
    .filter(e => e.name || e.names)
    .flatMap(e => e.name ? [e.name] : e.names);
}
