/**
 * @fileoverview Default Configuration - Configuración por defecto del extractor
 * 
 * @module comprehensive-extractor/config
 */

/**
 * Configuration options for extraction
 */
export const DEFAULT_CONFIG = {
  // Which extractors to enable
  extractors: {
    functions: true,
    classes: true,
    imports: true,
    exports: true
  },
  
  // Detail level
  detailLevel: 'standard', // 'minimal', 'standard', 'detailed'
  
  // Include raw source in results
  includeSource: false,
  
  // Calculate metrics
  calculateMetrics: true,
  
  // Detect patterns
  detectPatterns: true,
  
  // Timeout for extraction (ms)
  timeout: 30000
};

/**
 * Statistics about available extractors
 */
export const EXTRACTOR_STATS = {
  total: 4,
  categories: {
    function: { 
      count: 1, 
      impact: 'Function declarations, arrow functions, async patterns',
      extractors: ['extractFunctions', 'extractAsyncPatterns']
    },
    class: { 
      count: 1, 
      impact: 'Class declarations, methods, inheritance',
      extractors: ['extractClasses']
    },
    import: { 
      count: 1, 
      impact: 'ES6 imports, CommonJS requires, dynamic imports',
      extractors: ['extractImports']
    },
    export: { 
      count: 1, 
      impact: 'ES6 exports, CommonJS exports, re-exports',
      extractors: ['extractExports']
    }
  },
  llmReduction: '60%'
};

/**
 * Detail levels and their settings
 */
export const DETAIL_LEVELS = {
  minimal: {
    includeSource: false,
    includeAST: false,
    maxDepth: 1
  },
  standard: {
    includeSource: false,
    includeAST: false,
    maxDepth: 2
  },
  detailed: {
    includeSource: true,
    includeAST: true,
    maxDepth: 5
  }
};

/**
 * Merge user config with defaults
 * @param {Object} userConfig - User provided configuration
 * @returns {Object} Merged configuration
 */
export function mergeConfig(userConfig = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    extractors: {
      ...DEFAULT_CONFIG.extractors,
      ...(userConfig.extractors || {})
    }
  };
}
