/**
 * @fileoverview ComprehensiveExtractor.js
 * 
 * Main orchestrator class for comprehensive code extraction
 * Coordinates all extractors to provide a unified extraction interface
 * 
 * @module comprehensive-extractor/ComprehensiveExtractor
 * @phase Layer A - Enhanced
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

import { createLogger } from '#utils/logger.js';
import { extractFunctions, extractAsyncPatterns } from './extractors/function-extractor.js';
import { extractClasses } from './extractors/class-extractor/index.js';
import { extractImports } from './extractors/import-extractor.js';
import { extractExports } from './extractors/export-extractor/index.js';
import { DEFAULT_CONFIG, EXTRACTOR_STATS, mergeConfig } from './config/defaults.js';
import { extractBasicMetadata } from './metadata/basic-metadata.js';
import { calculateMetrics } from './metrics/metrics-calculator.js';
import { detectPatterns } from './patterns/pattern-detector.js';
import { calculateCompleteness, shouldNeedLLM, countActiveExtractors } from './completeness/completeness-calculator.js';

const logger = createLogger('OmnySys:ComprehensiveExtractor');

export { DEFAULT_CONFIG, EXTRACTOR_STATS };

/**
 * ComprehensiveExtractor - Main orchestrator class
 * 
 * Provides a unified interface for extracting all code constructs
 */
export class ComprehensiveExtractor {
  constructor(config = {}) {
    this.config = mergeConfig(config);
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
      const results = this._runExtractors(code, opts);
      
      // Add basic metadata
      results.basic = extractBasicMetadata(filePath, code);
      
      // Calculate derived metrics
      if (opts.calculateMetrics) {
        results.metrics = calculateMetrics(results);
      }
      
      // Detect patterns
      if (opts.detectPatterns) {
        results.patterns = detectPatterns(results);
      }
      
      // Calculate completeness
      const completeness = calculateCompleteness(results);
      
      const duration = Date.now() - startTime;
      
      const output = {
        ...results,
        _meta: {
          extractorCount: countActiveExtractors(results),
          extractionTime: duration,
          completeness,
          timestamp: new Date().toISOString(),
          version: '3.0.0-modular'
        },
        needsLLM: shouldNeedLLM(results, calculateCompleteness)
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
        basic: extractBasicMetadata(filePath, code),
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
   * Run extractors based on configuration
   * @private
   */
  _runExtractors(code, opts) {
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
    
    return results;
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

export default ComprehensiveExtractor;
