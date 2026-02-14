/**
 * @fileoverview export-extractor.js
 * 
 * Export Extractor - Extracts all export patterns
 * Handles ES6 exports, CommonJS exports, and re-exports
 * 
 * @module comprehensive-extractor/extractors/export-extractor
 * @phase Layer A - Enhanced
 */

import { findExports } from '../parsers/ast-parser.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:export-extractor');

/**
 * Extract all exports from code
 * 
 * @param {string} code - Source code
 * @param {Object} options - Extraction options
 * @returns {Object} - Export extraction results
 */
export function extractExports(code, options = {}) {
  try {
    const exports = findExports(code);
    
    // Categorize exports
    const categorized = categorizeExports(exports);
    
    // Analyze export patterns
    const patterns = analyzeExportPatterns(exports);
    
    // Extract export assignments (module.exports)
    const assignments = extractExportAssignments(code);
    
    // Calculate metrics
    const metrics = calculateExportMetrics(exports, assignments);
    
    return {
      all: exports,
      ...categorized,
      assignments,
      patterns,
      metrics,
      _metadata: {
        extractedAt: new Date().toISOString(),
        success: true
      }
    };
  } catch (error) {
    logger.warn(`Error extracting exports: ${error.message}`);
    return {
      all: [],
      named: [],
      defaultExport: null,
      reExports: [],
      exportAll: [],
      assignments: [],
      patterns: {},
      metrics: {},
      _metadata: { error: error.message, success: false }
    };
  }
}

/**
 * Categorize exports by type
 * 
 * @param {Array} exports - Array of exports
 * @returns {Object} - Categorized exports
 */
function categorizeExports(exports) {
  return {
    named: exports.filter(e => e.type === 'NamedExport'),
    defaultExport: exports.find(e => e.type === 'DefaultExport') || null,
    reExports: exports.filter(e => e.type === 'ReExport'),
    exportAll: exports.filter(e => e.type === 'ExportAll'),
    commonjs: exports.filter(e => e.type === 'CommonJSExport')
  };
}

/**
 * Extract module.exports assignments
 * 
 * @param {string} code - Source code
 * @returns {Array} - Export assignments
 */
export function extractExportAssignments(code) {
  const assignments = [];
  
  // module.exports = { ... }
  const moduleExportsPattern = /module\.exports\s*=\s*(\{[^}]*\}|\w+);?/g;
  let match;
  
  while ((match = moduleExportsPattern.exec(code)) !== null) {
    const exportedNames = match[1].startsWith('{') 
      ? extractObjectKeys(match[1])
      : [match[1]];
    
    assignments.push({
      type: 'module.exports',
      names: exportedNames,
      isObject: match[1].startsWith('{'),
      raw: match[0],
      start: match.index
    });
  }
  
  // exports.x = ...
  const exportsDotPattern = /exports\.(\w+)\s*=/g;
  while ((match = exportsDotPattern.exec(code)) !== null) {
    assignments.push({
      type: 'exports.property',
      name: match[1],
      raw: match[0],
      start: match.index
    });
  }
  
  // module.exports.x = ...
  const moduleDotPattern = /module\.exports\.(\w+)\s*=/g;
  while ((match = moduleDotPattern.exec(code)) !== null) {
    assignments.push({
      type: 'module.exports.property',
      name: match[1],
      raw: match[0],
      start: match.index
    });
  }
  
  return assignments;
}

/**
 * Analyze export patterns
 * 
 * @param {Array} exports - Array of exports
 * @returns {Object} - Pattern analysis
 */
function analyzeExportPatterns(exports) {
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
function calculateExportMetrics(exports, assignments) {
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
        confidence: 'low' // Without cross-file analysis, confidence is low
      });
    }
  });
  
  return unused;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractObjectKeys(objectLiteral) {
  const keys = [];
  const keyPattern = /(\w+)\s*:/g;
  let match;
  
  while ((match = keyPattern.exec(objectLiteral)) !== null) {
    keys.push(match[1]);
  }
  
  return keys;
}

function findDeclaration(code, exp) {
  if (!exp.name) return null;
  
  // Look for the declaration following the export
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

// ============================================
// EXPORTS
// ============================================

export default {
  extractExports,
  extractExportAssignments,
  extractExportDeclarations,
  extractBarrelPattern,
  extractDefaultExportDetails,
  extractUnusedExports
};
