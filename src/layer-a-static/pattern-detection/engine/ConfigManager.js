/**
 * @fileoverview ConfigManager.js
 * 
 * Manages configuration for pattern detection.
 * 
 * @module pattern-detection/engine/ConfigManager
 */

import { DEFAULT_CONFIG } from './DefaultConfig.js';

/**
 * Manages pattern detection configuration
 */
export class ConfigManager {
  constructor(customConfig = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, customConfig);
  }

  /**
   * Merge custom config with defaults
   */
  mergeConfig(defaults, custom) {
    return {
      ...defaults,
      ...custom,
      thresholds: { ...defaults.thresholds, ...custom.thresholds },
      weights: { ...defaults.weights, ...custom.weights },
      features: { ...defaults.features, ...custom.features }
    };
  }

  /**
   * Detect project type from system map
   */
  detectProjectType(systemMap) {
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
