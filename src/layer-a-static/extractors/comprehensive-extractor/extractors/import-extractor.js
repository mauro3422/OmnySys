/**
 * @fileoverview import-extractor.js
 * 
 * Import Extractor - Extracts all import patterns
 * Handles ES6 imports, CommonJS requires, and dynamic imports
 * 
 * @module comprehensive-extractor/extractors/import-extractor
 * @phase Layer A - Enhanced
 */

import { findImports } from '../parsers/ast-parser.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:import-extractor');

/**
 * Extract all imports from code
 * 
 * @param {string} code - Source code
 * @param {Object} options - Extraction options
 * @returns {Object} - Import extraction results
 */
export function extractImports(code, options = {}) {
  try {
    const imports = findImports(code);
    
    // Categorize imports
    const categorized = categorizeImports(imports);
    
    // Analyze import patterns
    const patterns = analyzeImportPatterns(imports);
    
    // Extract dynamic imports
    const dynamicImports = extractDynamicImports(code);
    
    // Calculate metrics
    const metrics = calculateImportMetrics(imports);
    
    return {
      all: imports,
      ...categorized,
      dynamicImports,
      patterns,
      metrics,
      _metadata: {
        extractedAt: new Date().toISOString(),
        success: true
      }
    };
  } catch (error) {
    logger.warn(`Error extracting imports: ${error.message}`);
    return {
      all: [],
      named: [],
      defaultImports: [],
      namespace: [],
      sideEffect: [],
      commonjs: [],
      dynamicImports: [],
      metrics: {},
      _metadata: { error: error.message, success: false }
    };
  }
}

/**
 * Categorize imports by type
 * 
 * @param {Array} imports - Array of imports
 * @returns {Object} - Categorized imports
 */
function categorizeImports(imports) {
  return {
    named: imports.filter(i => i.type === 'NamedImport'),
    defaultImports: imports.filter(i => i.type === 'DefaultImport'),
    namespace: imports.filter(i => i.type === 'NamespaceImport'),
    sideEffect: imports.filter(i => i.type === 'SideEffectImport'),
    commonjs: imports.filter(i => i.type === 'CommonJSRequire')
  };
}

/**
 * Extract dynamic imports (import())
 * 
 * @param {string} code - Source code
 * @returns {Array} - Dynamic import info
 */
export function extractDynamicImports(code) {
  const dynamicImports = [];
  
  // Dynamic import: import('module') or await import('module')
  const pattern = /(?:await\s+)?import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  
  while ((match = pattern.exec(code)) !== null) {
    const beforeImport = code.slice(Math.max(0, match.index - 100), match.index);
    
    dynamicImports.push({
      source: match[1],
      isLazy: /lazy\s*[=:]\s*\(?/.test(beforeImport),
      isConditional: /if\s*\(/.test(beforeImport) || /\?\s*$/.test(beforeImport),
      isInsideFunction: /function|=>/.test(beforeImport),
      hasAwait: beforeImport.includes('await'),
      start: match.index
    });
  }
  
  return dynamicImports;
}

/**
 * Analyze import patterns and relationships
 * 
 * @param {Array} imports - Array of imports
 * @returns {Object} - Pattern analysis
 */
function analyzeImportPatterns(imports) {
  const sources = imports.map(i => i.source);
  
  return {
    hasNodeModules: sources.some(s => !s.startsWith('.') && !s.startsWith('/')),
    hasLocalImports: sources.some(s => s.startsWith('.')),
    hasAbsoluteImports: sources.some(s => s.startsWith('/') || s.startsWith('~') || s.startsWith('@/')),
    hasTypeImports: sources.some(s => s.includes('.type') || /\btype\b/.test(s)),
    uniqueSources: [...new Set(sources)],
    duplicateSources: findDuplicates(sources),
    circularRisk: detectCircularRisk(imports)
  };
}

/**
 * Calculate import metrics
 * 
 * @param {Array} imports - Array of imports
 * @returns {Object} - Import metrics
 */
function calculateImportMetrics(imports) {
  const sources = imports.map(i => i.source);
  
  return {
    total: imports.length,
    unique: new Set(sources).size,
    es6Count: imports.filter(i => !i.type.includes('CommonJS')).length,
    commonjsCount: imports.filter(i => i.type === 'CommonJSRequire').length,
    externalCount: sources.filter(s => !s.startsWith('.') && !s.startsWith('/')).length,
    internalCount: sources.filter(s => s.startsWith('.') || s.startsWith('/')).length,
    thirdPartyPackages: [...new Set(sources.filter(s => !s.startsWith('.') && !s.startsWith('/')))],
    localModules: [...new Set(sources.filter(s => s.startsWith('.')))]
  };
}

/**
 * Find duplicate imports
 * 
 * @param {Array} sources - Import sources
 * @returns {Array} - Duplicate sources
 */
function findDuplicates(sources) {
  const counts = {};
  sources.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
  return Object.entries(counts)
    .filter(([_, count]) => count > 1)
    .map(([source, count]) => ({ source, count }));
}

/**
 * Detect potential circular import risks
 * 
 * @param {Array} imports - Array of imports
 * @returns {Array} - Potential circular import paths
 */
function detectCircularRisk(imports) {
  // This is a simplified check
  // Full circular detection requires multi-file analysis
  const risks = [];
  const localImports = imports.filter(i => i.source?.startsWith('.'));
  
  // Check for imports that reference parent directories
  localImports.forEach(imp => {
    if (imp.source.includes('../')) {
      const depth = (imp.source.match(/\.\.\//g) || []).length;
      if (depth > 2) {
        risks.push({
          source: imp.source,
          depth,
          risk: depth > 3 ? 'high' : 'medium'
        });
      }
    }
  });
  
  return risks;
}

/**
 * Extract import aliases and renames
 * 
 * @param {Array} imports - Array of imports
 * @returns {Array} - Import aliases
 */
export function extractImportAliases(imports) {
  const aliases = [];
  
  imports.forEach(imp => {
    if (imp.type === 'NamedImport' && imp.names) {
      // Check for 'as' syntax in the original code
      imp.names.forEach(name => {
        // This is a simplified check - real implementation would parse more carefully
        if (name.includes(' as ')) {
          const [original, alias] = name.split(' as ').map(s => s.trim());
          aliases.push({
            original,
            alias,
            source: imp.source
          });
        }
      });
    }
  });
  
  return aliases;
}

/**
 * Extract barrel imports (index.js imports)
 * 
 * @param {Array} imports - Array of imports
 * @returns {Array} - Barrel imports
 */
export function extractBarrelImports(imports) {
  return imports.filter(imp => 
    imp.source?.endsWith('/index') || 
    imp.source?.match(/\/[^/]+$/)?.[0] === '/'
  );
}

/**
 * Extract unused imports (requires variable usage analysis)
 * 
 * @param {string} code - Source code
 * @param {Array} imports - Array of imports
 * @returns {Array} - Potentially unused imports
 */
export function extractUnusedImports(code, imports) {
  const unused = [];
  
  imports.forEach(imp => {
    const names = imp.names || [imp.name];
    
    names.forEach(name => {
      // Simple check: count usages excluding import statement
      const importEnd = code.indexOf(imp.source) + imp.source.length;
      const restOfCode = code.slice(importEnd);
      
      // Look for usage of the imported name
      const usagePattern = new RegExp(`\\b${name}\\b`, 'g');
      const usages = (restOfCode.match(usagePattern) || []).length;
      
      if (usages === 0 && name !== imp.source) {
        unused.push({
          name,
          source: imp.source,
          type: imp.type
        });
      }
    });
  });
  
  return unused;
}

// ============================================
// EXPORTS
// ============================================

export default {
  extractImports,
  extractDynamicImports,
  extractImportAliases,
  extractBarrelImports,
  extractUnusedImports
};
