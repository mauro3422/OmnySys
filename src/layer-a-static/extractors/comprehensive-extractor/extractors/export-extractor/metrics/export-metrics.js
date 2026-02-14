/**
 * @fileoverview Export Metrics
 * 
 * @module export-extractor/metrics/export-metrics
 */

/**
 * Calculate export metrics
 * @param {Array} exports - Export declarations
 * @param {Array} assignments - Export assignments
 * @returns {Object} Metrics
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

/**
 * Extract unused exports
 * @param {Array} exports - Export declarations
 * @param {Object} options - Options with usage data
 * @returns {Array} Potentially unused exports
 */
export function extractUnusedExports(exports, options = {}) {
  const { usageData = {} } = options;
  const unused = [];
  
  exports.forEach(exp => {
    if (exp.name && !usageData[exp.name]) {
      unused.push({
        name: exp.name,
        type: exp.type,
        confidence: 'low'
      });
    }
  });
  
  return unused;
}
