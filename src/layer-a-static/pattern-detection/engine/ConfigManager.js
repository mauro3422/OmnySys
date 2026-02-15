/**
 * @fileoverview ConfigManager.js
 * 
 * Manages configuration for pattern detection.
 * 
 * @module pattern-detection/engine/ConfigManager
 */

import { DEFAULT_CONFIG } from './DefaultConfig.js';

/**
 * Deep merges two objects, recursively merging nested objects
 * Preserves target values when source values are undefined
 * @param {object} target - Target object (defaults)
 * @param {object} source - Source object to merge (custom values)
 * @returns {object} - Merged object
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return source;
  
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (sourceValue === undefined) {
      // Keep target value if source is undefined - do nothing
      continue;
    } else if (sourceValue !== null && typeof sourceValue === 'object' && 
               targetValue !== null && typeof targetValue === 'object' &&
               !Array.isArray(sourceValue)) {
      // Deep merge objects
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      // Use source value
      result[key] = sourceValue;
    }
  }
  
  return result;
}

/**
 * Filters out undefined values from top-level object
 * @param {object} obj - Object to filter
 * @returns {object} - Object with undefined values removed
 */
function filterUndefined(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Manages pattern detection configuration
 */
export class ConfigManager {
  constructor(customConfig = {}) {
    // Handle null customConfig
    const safeCustomConfig = customConfig === null ? {} : customConfig;
    this.config = this.mergeConfig(DEFAULT_CONFIG, safeCustomConfig);
  }

  /**
   * Merge custom config with defaults
   */
  mergeConfig(defaults, custom) {
    // Handle null/undefined inputs
    if (!defaults) defaults = {};
    if (!custom) custom = {};
    
    // Filter out undefined top-level values
    const filteredCustom = filterUndefined(custom);
    
    return {
      ...defaults,
      ...filteredCustom,
      thresholds: deepMerge(defaults.thresholds, custom.thresholds),
      weights: deepMerge(defaults.weights, custom.weights),
      features: deepMerge(defaults.features, custom.features)
    };
  }

  /**
   * Detect project type from system map
   */
  detectProjectType(systemMap) {
    // Handle null/undefined systemMap
    if (!systemMap || typeof systemMap !== 'object') {
      this.config.projectType = 'standard';
      return 'standard';
    }
    
    const files = Object.keys(systemMap.files || {});
    const fileCount = files.length;

    const hasMicroservicePatterns = files.some(f => 
      /service|gateway|broker/i.test(f)
    );
    const hasLibraryPatterns = files.some(f => 
      /index\.js$/.test(f) && files.filter(f2 => f2.includes('test')).length < fileCount * 0.1
    );
    const hasManyTests = files.filter(f => 
      /test|spec/i.test(f)
    ).length > fileCount * 0.3;

    if (hasMicroservicePatterns) this.config.projectType = 'microservices';
    else if (hasLibraryPatterns && !hasManyTests) this.config.projectType = 'library';
    else this.config.projectType = 'standard';

    return this.config.projectType;
  }

  /**
   * Get thresholds for a detector
   */
  getThresholds(detectorId) {
    return this.config.thresholds[detectorId] || {};
  }

  /**
   * Get full config
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get project type
   */
  getProjectType() {
    return this.config.projectType;
  }
}

export default ConfigManager;
