/**
 * @fileoverview details.js
 * 
 * Export detail extraction utilities
 * 
 * @module comprehensive-extractor/extractors/export-extractor/extractors/details
 */

/**
 * Extract export declarations with their associated code
 * 
 * @param {string} code - Source code
 * @param {Array} exports - Array of exports
 * @returns {Array} - Exports with declarations
 */
export function extractExportDeclarations(code, exports) {
  return exports.map(exp => {
    const declaration = findDeclaration(code, exp);
    
    return {
      ...exp,
      declaration,
      hasJSDoc: declaration ? hasJSDoc(code, exp.start) : false,
      isAsync: declaration?.includes('async '),
      isGenerator: declaration?.includes('function*')
    };
  });
}

/**
 * Extract barrel export patterns (re-exporting from other modules)
 * 
 * @param {Array} exports - Array of exports
 * @returns {Object} - Barrel analysis
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

/**
 * Extract default export details
 * 
 * @param {string} code - Source code
 * @param {Object} defaultExport - Default export info
 * @returns {Object} - Default export details
 */
export function extractDefaultExportDetails(code, defaultExport) {
  if (!defaultExport) return null;
  
  const afterExport = code.slice(defaultExport.start + 'export default '.length, 
                                  defaultExport.start + 200);
  
  return {
    name: defaultExport.name,
    type: determineExportType(afterExport),
    isAnonymous: !defaultExport.name,
    isFunction: /^\s*(?:async\s+)?function/.test(afterExport),
    isClass: /^\s*class\b/.test(afterExport),
    isObject: /^\s*\{/.test(afterExport),
    isArrow: /^\s*\(?/.test(afterExport) && afterExport.includes('=>')
  };
}

/**
 * Extract unused exports (would need cross-file analysis for accuracy)
 * 
 * @param {Array} exports - Array of exports
 * @param {Object} options - Options with usage data
 * @returns {Array} - Potentially unused exports
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

function findDeclaration(code, exp) {
  if (!exp.name) return null;
  
  const afterExport = code.slice(exp.start + exp.raw?.length || 0, exp.start + 500);
  const declarationMatch = afterExport.match(/^(?:\s*(?:const|let|var|function|class|interface|type))?[\s\S]{0,200}/);
  
  return declarationMatch ? declarationMatch[0].trim() : null;
}

function hasJSDoc(code, position) {
  const beforeExport = code.slice(Math.max(0, position - 500), position);
  return /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeExport);
}

function determineExportType(code) {
  if (/^\s*class\b/.test(code)) return 'class';
  if (/^\s*(?:async\s+)?function\b/.test(code)) return 'function';
  if (/^\s*\{/.test(code)) return 'object';
  if (/^\s*\[/.test(code)) return 'array';
  if (/^\s*\w+\s*=>/.test(code)) return 'arrow';
  if (/^\s*\w+\s*\(/.test(code)) return 'call';
  if (/^\s*\d/.test(code)) return 'number';
  if (/^\s*['"]/.test(code)) return 'string';
  if (/^\s*true\b|^\s*false\b/.test(code)) return 'boolean';
  return 'unknown';
}
