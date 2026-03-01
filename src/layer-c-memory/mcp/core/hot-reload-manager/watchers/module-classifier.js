/**
 * @fileoverview Module Classifier
 * 
 * Classifies modules based on their file path to determine
 * reload behavior and priority.
 * 
 * @module hot-reload-manager/watchers/module-classifier
 */

/**
 * Module types and their reload patterns
 * @const {Array<{pattern: RegExp, type: string, priority: number}>}
 */
const RELOADABLE_PATTERNS = [
  { pattern: /tools[\\/].*\.js$/, type: 'tool', priority: 1 },
  { pattern: /extractors[\\/].*\.js$/, type: 'extractor', priority: 2 },
  { pattern: /handlers[\\/].*\.js$/, type: 'handler', priority: 2 },
  { pattern: /queries[\\/].*\.js$/, type: 'query', priority: 3 },
  { pattern: /lifecycle\.js$/, type: 'lifecycle', priority: 1 }
];

/**
 * Critical modules that cannot be hot-reloaded
 * @const {Array<string>}
 */
const CRITICAL_MODULES = [
  'server-class.js',
  'mcp-server.js',
  'mcp-http-server.js',
  'orchestrator/index.js'
];

/**
 * Classifies modules for hot-reload
 * 
 * @class ModuleClassifier
 */
export class ModuleClassifier {
  constructor() {
    this.patterns = [...RELOADABLE_PATTERNS];
    this.criticalModules = [...CRITICAL_MODULES];
  }

  /**
   * Classifies a module based on its filename
   * 
   * @param {string} filename - File path to classify
   * @returns {Object|null} Module classification or null if not reloadable
   */
  classify(filename) {
    // Check if critical
    if (this._isCritical(filename)) {
      return { type: 'critical', priority: 0 };
    }

    // Check if pipeline module
    if (this._isPipelineModule(filename)) {
      return { type: 'pipeline', priority: 0 };
    }

    // Check reloadable patterns
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(filename)) {
        return { type: pattern.type, priority: pattern.priority };
      }
    }

    return null;
  }

  /**
   * Checks if a module is critical
   * @private
   * @param {string} filename - File path
   * @returns {boolean}
   */
  _isCritical(filename) {
    return this.criticalModules.some(critical => filename.includes(critical));
  }

  /**
   * Checks if a module is part of the analysis pipeline
   * @private
   * @param {string} filename - File path
   * @returns {boolean}
   */
  _isPipelineModule(filename) {
    return filename.includes('/analyses/') ||
      filename.includes('/analyzer.js') ||
      filename.includes('/indexer.js');
  }

  /**
   * Adds a custom pattern for classification
   * 
   * @param {RegExp} pattern - Pattern to match
   * @param {string} type - Module type
   * @param {number} priority - Reload priority
   */
  addPattern(pattern, type, priority) {
    this.patterns.push({ pattern, type, priority });
  }

  /**
   * Adds a critical module
   * 
   * @param {string} moduleName - Module filename
   */
  addCriticalModule(moduleName) {
    this.criticalModules.push(moduleName);
  }

  /**
   * Gets all registered patterns
   * @returns {Array}
   */
  getPatterns() {
    return [...this.patterns];
  }

  /**
   * Gets all critical modules
   * @returns {Array<string>}
   */
  getCriticalModules() {
    return [...this.criticalModules];
  }
}

export default ModuleClassifier;
