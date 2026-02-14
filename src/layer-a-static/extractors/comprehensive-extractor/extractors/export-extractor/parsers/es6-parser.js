/**
 * @fileoverview ES6 Parser
 * 
 * @module export-extractor/parsers/es6-parser
 */

/**
 * Categorize ES6 exports by type
 * @param {Array} exports - Export declarations
 * @returns {Object} Categorized exports
 */
export function categorizeES6Exports(exports) {
  return {
    named: exports.filter(e => e.type === 'NamedExport'),
    defaultExport: exports.find(e => e.type === 'DefaultExport') || null,
    reExports: exports.filter(e => e.type === 'ReExport'),
    exportAll: exports.filter(e => e.type === 'ExportAll'),
    commonjs: exports.filter(e => e.type === 'CommonJSExport')
  };
}

/**
 * Determine export style
 * @param {Array} exports - Export declarations
 * @returns {string} Export style
 */
export function determineExportStyle(exports) {
  const hasES6 = exports.some(e => 
    ['NamedExport', 'DefaultExport', 'ReExport', 'ExportAll'].includes(e.type)
  );
  const hasCommonJS = exports.some(e => 
    e.type === 'CommonJSExport'
  );
  
  if (hasES6 && hasCommonJS) return 'mixed';
  if (hasCommonJS) return 'commonjs';
  if (hasES6) return 'es6';
  return 'none';
}
