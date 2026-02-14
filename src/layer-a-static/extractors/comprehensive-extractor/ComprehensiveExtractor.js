/**
 * @fileoverview ComprehensiveExtractor.js
 * 
 * Main orchestrator class for comprehensive code extraction
 * Coordinates all extractors to provide a unified extraction interface
 * 
 * @module comprehensive-extractor/ComprehensiveExtractor
 * @phase Layer A - Enhanced
 */

import { createLogger } from '#utils/logger.js';

// Import all extractors
import { extractFunctions, extractAsyncPatterns } from './extractors/function-extractor.js';
import { extractClasses } from './extractors/class-extractor.js';
import { extractImports } from './extractors/import-extractor.js';
import { extractExports } from './extractors/export-extractor.js';

const logger = createLogger('OmnySys:ComprehensiveExtractor');

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
 * ComprehensiveExtractor - Main orchestrator class
 * 
 * Provides a unified interface for extracting all code constructs
 * 
 * @example
 * const extractor = new ComprehensiveExtractor({ detailLevel: 'detailed' });
 * const metadata = extractor.extract(filePath, code);
 */
export class ComprehensiveExtractor {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = { ...EXTRACTOR_STATS };
    this.cache = new Map();
    
    logger.debug('ComprehensiveExtractor initialized with config:', this.config);
  }
  
  /**
   * Extract comprehensive metadata from code
   * 
   * @param {string} filePath - Path to the file
   * @param {string} code - Source code
   * @param {Object} options - Override options for this extraction
   * @returns {Object} - Comprehensive extraction results
   */
  extract(filePath, code, options = {}) {
    const startTime = Date.now();
    const opts = { ...this.config, ...options };
    
    try {
      logger.debug(`Starting extraction for: ${filePath}`);
      
      // Check cache
      const cacheKey = `${filePath}:${code.length}`;
      if (this.cache.has(cacheKey) && !options.skipCache) {
        logger.debug('Returning cached result');
        return this.cache.get(cacheKey);
      }
      
      // Run extractors based on configuration
      const results = {};
      
      if (opts.extractors.functions) {
        results.functions = extractFunctions(code, { detailLevel: opts.detailLevel });
        results.asyncPatterns = extractAsyncPatterns(code);
      }
      
      if (opts.extractors.classes) {
        results.classes = extractClasses(code, { detailLevel: opts.detailLevel });
      }
      
      if (opts.extractors.imports) {
        results.imports = extractImports(code, { detailLevel: opts.detailLevel });
      }
      
      if (opts.extractors.exports) {
        results.exports = extractExports(code, { detailLevel: opts.detailLevel });
      }
      
      // Add basic metadata
      results.basic = this.extractBasicMetadata(filePath, code);
      
      // Calculate derived metrics
      if (opts.calculateMetrics) {
        results.metrics = this.calculateMetrics(results);
      }
      
      // Detect patterns
      if (opts.detectPatterns) {
        results.patterns = this.detectPatterns(results);
      }
      
      // Calculate completeness
      const completeness = this.calculateCompleteness(results);
      
      const duration = Date.now() - startTime;
      
      const output = {
        ...results,
        _meta: {
          extractorCount: this.countActiveExtractors(results),
          extractionTime: duration,
          completeness,
          timestamp: new Date().toISOString(),
          version: '3.0.0-modular'
        },
        needsLLM: this.shouldNeedLLM(results)
      };
      
      // Cache result
      if (!options.skipCache) {
        this.cache.set(cacheKey, output);
      }
      
      logger.debug(`Extraction completed in ${duration}ms, completeness: ${completeness}%`);
      
      return output;
      
    } catch (error) {
      logger.error(`Error extracting metadata for ${filePath}:`, error.message);
      
      return {
        basic: this.extractBasicMetadata(filePath, code),
        error: error.message,
        _meta: {
          extractionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: true,
          version: '3.0.0-modular'
        },
        needsLLM: true
      };
    }
  }
  
  /**
   * Extract basic file metadata
   * 
   * @private
   * @param {string} filePath - Path to the file
   * @param {string} code - Source code
   * @returns {Object} - Basic metadata
   */
  extractBasicMetadata(filePath, code) {
    return {
      filePath,
      size: code.length,
      lineCount: code.split('\n').length,
      hasImports: /import\s+|require\s*\(/.test(code),
      hasExports: /export\s+|module\.exports/.test(code),
      isTestFile: /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(filePath),
      isConfigFile: /(config|\.config)\.(js|ts|json)$/.test(filePath),
      isTypeScript: /\.(ts|tsx)$/.test(filePath),
      isJSX: /\.(jsx|tsx)$/.test(filePath)
    };
  }
  
  /**
   * Calculate derived metrics from extraction results
   * 
   * @private
   * @param {Object} results - Extraction results
   * @returns {Object} - Calculated metrics
   */
  calculateMetrics(results) {
    const metrics = {
      totalConstructs: 0,
      complexity: {
        cyclomatic: 0,
        cognitive: 0
      },
      maintainability: {
        score: 0,
        factors: []
      }
    };
    
    // Function metrics
    if (results.functions) {
      metrics.totalConstructs += results.functions.totalCount || 0;
      metrics.complexity.functionCount = results.functions.totalCount || 0;
      metrics.complexity.asyncCount = results.functions.asyncCount || 0;
    }
    
    // Class metrics
    if (results.classes) {
      metrics.totalConstructs += results.classes.count || 0;
      metrics.complexity.classCount = results.classes.count || 0;
      metrics.complexity.inheritanceDepth = results.classes.inheritanceDepth || 0;
    }
    
    // Import metrics
    if (results.imports) {
      metrics.dependencies = results.imports.metrics || {};
      metrics.hasDynamicImports = results.imports.dynamicImports?.length > 0;
    }
    
    // Export metrics
    if (results.exports) {
      metrics.publicAPI = results.exports.metrics?.publicAPI || [];
      metrics.hasDefaultExport = results.exports.patterns?.hasDefaultExport || false;
    }
    
    return metrics;
  }
  
  /**
   * Detect architectural patterns
   * 
   * @private
   * @param {Object} results - Extraction results
   * @returns {Object} - Detected patterns
   */
  detectPatterns(results) {
    const patterns = {
      architectural: [],
      structural: [],
      behavioral: []
    };
    
    // Detect singleton pattern
    if (results.classes?.classes?.some(c => 
      c.methods.some(m => m.name === 'getInstance') ||
      c.staticMembers > 0 && c.methods.some(m => m.name === 'constructor' && m.isPrivate)
    )) {
      patterns.architectural.push('singleton');
    }
    
    // Detect factory pattern
    if (results.functions?.functions?.some(f => 
      f.name?.toLowerCase().includes('create') ||
      f.name?.toLowerCase().includes('factory')
    )) {
      patterns.architectural.push('factory');
    }
    
    // Detect async patterns
    if (results.asyncPatterns) {
      if (results.asyncPatterns.hasAsyncAwait) patterns.behavioral.push('async-await');
      if (results.asyncPatterns.hasPromises) patterns.behavioral.push('promises');
      if (results.asyncPatterns.promiseChains > 2) patterns.behavioral.push('promise-chaining');
    }
    
    // Detect module patterns
    if (results.exports?.patterns?.isBarrelFile) {
      patterns.structural.push('barrel');
    }
    
    // Detect React patterns (if applicable)
    if (results.imports?.patterns?.hasNodeModules) {
      const reactImports = results.imports.all?.some(i => 
        i.source?.includes('react') || i.source?.includes('jsx')
      );
      if (reactImports) {
        patterns.architectural.push('react');
      }
    }
    
    return patterns;
  }
  
  /**
   * Calculate completeness score
   * 
   * @private
   * @param {Object} results - Extraction results
   * @returns {number} - Completeness percentage (0-100)
   */
  calculateCompleteness(results) {
    const weights = {
      basic: 0.1,
      functions: 0.25,
      classes: 0.2,
      imports: 0.2,
      exports: 0.15,
      patterns: 0.1
    };
    
    let score = 0;
    let totalWeight = 0;
    
    for (const [key, weight] of Object.entries(weights)) {
      const data = results[key];
      totalWeight += weight;
      
      if (data && Object.keys(data).length > 0) {
        const hasRealData = Object.values(data).some(v =>
          v !== null &&
          v !== undefined &&
          (Array.isArray(v) ? v.length > 0 : true) &&
          (typeof v === 'object' ? Object.keys(v).length > 0 : true)
        );
        
        if (hasRealData) {
          score += weight;
        }
      }
    }
    
    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
  }
  
  /**
   * Count active extractors
   * 
   * @private
   * @param {Object} results - Extraction results
   * @returns {number} - Count of active extractors
   */
  countActiveExtractors(results) {
    let count = 0;
    const extractors = ['functions', 'classes', 'imports', 'exports'];
    
    for (const key of extractors) {
      if (results[key]?._metadata?.success) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Determine if LLM analysis is needed
   * 
   * @private
   * @param {Object} results - Extraction results
   * @returns {boolean} - Whether LLM analysis is recommended
   */
  shouldNeedLLM(results) {
    const hasComplexClasses = results.classes?.classes?.some(c => 
      c.methods.length > 10 || c.inheritanceDepth > 2
    );
    
    const hasHighAsyncUsage = results.asyncPatterns?.asyncFunctionCount > 5 ||
                               results.asyncPatterns?.awaitCount > 10;
    
    const hasManyDependencies = results.imports?.metrics?.total > 20;
    
    const lowCompleteness = this.calculateCompleteness(results) < 50;
    
    return hasComplexClasses || hasHighAsyncUsage || hasManyDependencies || lowCompleteness;
  }
  
  /**
   * Clear the extraction cache
   */
  clearCache() {
    this.cache.clear();
    logger.debug('Extraction cache cleared');
  }
  
  /**
   * Get extractor statistics
   * 
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      config: this.config
    };
  }
  
  /**
   * Update configuration
   * 
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.clearCache();
    logger.debug('Configuration updated:', this.config);
  }
}

/**
 * Create a new extractor instance with default configuration
 * 
 * @param {Object} config - Configuration options
 * @returns {ComprehensiveExtractor} - New extractor instance
 */
export function createExtractor(config = {}) {
  return new ComprehensiveExtractor(config);
}

// ============================================
// EXPORTS
// ============================================

export default ComprehensiveExtractor;
