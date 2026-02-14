/**
 * @fileoverview categorizer.js
 * 
 * Export categorization and pattern analysis
 * 
 * @module comprehensive-extractor/extractors/export-extractor/parsers/categorizer
 */

/**
 * Categorize exports by type
 * 
 * @param {Array} exports - Array of exports
 * @returns {Object} - Categorized exports
 */
export function categorizeExports(exports) {
  return {
    named: exports.filter(e => e.type === 'NamedExport'),
    defaultExport: exports.find(e => e.type === 'DefaultExport') || null,
    reExports: exports.filter(e => e.type === 'ReExport'),
    exportAll: exports.filter(e => e.type === 'ExportAll'),
    commonjs: exports.filter(e => e.type === 'CommonJSExport')
  };
}

/**
 * Analyze export patterns
 * 
 * @param {Array} exports - Array of exports
 * @returns {Object} - Pattern analysis
 */
export function analyzeExportPatterns(exports) {
  return {
    hasDefaultExport: exports.some(e => e.type === 'DefaultExport'),
    hasNamedExports: exports.some(e => e.type === 'NamedExport'),
    hasReExports: exports.some(e => e.type === 'ReExport' || e.type === 'ExportAll'),
    hasMixedExports: exports.some(e => e.type === 'DefaultExport') && 
                     exports.some(e => e.type === 'NamedExport'),
    isBarrelFile: exports.filter(e => e.type === 'ReExport' || e.type === 'ExportAll').length > 2,
    exportStyle: determineExportStyle(exports)
  };
}

/**
 * Determine the export style (ES6, CommonJS, or Mixed)
 * 
 * @param {Array} exports - Array of exports
 * @returns {string} - Export style
 */
function determineExportStyle(exports) {
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

/**
 * Calculate export metrics
 * 
 * @param {Array} exports - Array of exports
 * @param {Array} assignments - Export assignments
 * @returns {Object} - Export metrics
 */
export function calculateExportMetrics(exports, assignments) {
  const namedExports = exports.filter(e => e.type === 'NamedExport');
  const defaultExport = exports.find(e => e.type === 'DefaultExport');
  
  return {
    total: exports.length + assignments.length,
    namedCount: namedExports.length,
    hasDefault: !!defaultExport,
    reExportCount: exports.filter(e => e.type === 'ReExport').length,
    exportAllCount: exports.filter(e => e.type === 'ExportAll').length,
    commonjsExportCount: assignments.length,
    uniqueNamed: [...new Set(namedExports.map(e => e.name))].length,
    publicAPI: [...namedExports.map(e => e.name), defaultExport?.name].filter(Boolean)
  };
}
