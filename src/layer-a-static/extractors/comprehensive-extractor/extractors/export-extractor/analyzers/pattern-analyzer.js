/**
 * @fileoverview Pattern Analyzer
 * 
 * @module export-extractor/analyzers/pattern-analyzer
 */

/**
 * Analyze export patterns
 * @param {Array} exports - Export declarations
 * @returns {Object} Pattern analysis
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
 * Determine export style
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
 * Extract barrel pattern
 * @param {Array} exports - Export declarations
 * @returns {Object} Barrel analysis
 */
export function extractBarrelPattern(exports) {
  const reExports = exports.filter(e => e.type === 'ReExport' || e.type === 'ExportAll');
  
  if (reExports.length < 2) {
    return { isBarrel: false };
  }
  
  const sources = [...new Set(reExports.map(e => e.source).filter(Boolean))];
  
  return {
    isBarrel: true,
    reExportedModules: sources,
    reExportCount: reExports.length,
    pattern: reExports.every(e => e.type === 'ExportAll') 
      ? 'aggregate' 
      : reExports.every(e => e.type === 'ReExport')
      ? 'selective'
      : 'mixed'
  };
}
