/**
 * @fileoverview PatternDetectionEngine.js
 * 
 * Core of the pattern detection system.
 * Orchestrates pattern detection using registered detectors.
 * 
 * @module pattern-detection/engine/PatternDetectionEngine
 */

import { PatternDetectorRegistry } from './PatternDetectorRegistry.js';
import { QualityScoreAggregator } from './QualityScoreAggregator.js';
import { ConfigManager } from './ConfigManager.js';

const logger = {
  info: (msg, ...args) => console.log(`[PatternDetection] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[PatternDetection] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[PatternDetection] ${msg}`, ...args),
  debug: (msg, ...args) => process.env.DEBUG && console.log(`[PatternDetection] ${msg}`, ...args)
};

/**
 * Pattern Detection Engine - Core of the system
 */
export class PatternDetectionEngine {
  constructor(config = {}) {
    this.configManager = new ConfigManager(config);
    this.registry = new PatternDetectorRegistry();
    this.aggregator = new QualityScoreAggregator(this.configManager.getConfig());
    this.results = new Map();

    this.registerDefaultDetectors();
  }

  /**
   * Register default detectors
   */
  registerDefaultDetectors() {
    const detectors = [
      { id: 'deepChains', loader: () => import('../detectors/deep-chains-detector.js'), priority: 100 },
      { id: 'sharedObjects', loader: () => import('../detectors/shared-objects-detector/index.js'), priority: 90 },
      { id: 'coupling', loader: () => import('../detectors/coupling-detector.js'), priority: 80 },
      { id: 'hotspots', loader: () => import('../detectors/hotspots-detector.js'), priority: 70 },
      { id: 'performance-patterns', loader: () => import('../detectors/performance-patterns-detector.js'), priority: 60 }
    ];

    detectors.forEach(detector => this.registry.register(detector));
    logger.info(`Registered ${detectors.length} pattern detectors`);
  }

  /**
   * Run complete analysis
   */
  async analyze(systemMap) {
    logger.info('🔍 Starting pattern detection analysis...');
    const startTime = Date.now();

    this.configManager.detectProjectType(systemMap);

    const detectors = this.registry.getAll();
    const detectionPromises = detectors.map(detector =>
      this.runDetector(detector, systemMap)
    );

    const results = await Promise.allSettled(detectionPromises);

    const patternResults = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        patternResults.push(result.value);
        this.results.set(detectors[index].id, result.value);
      } else {
        logger.warn(`Detector ${detectors[index].id} failed:`, result.reason);
      }
    });

    const qualityScore = this.aggregator.calculate(patternResults);
    const duration = Date.now() - startTime;

    logger.info(`✅ Pattern detection complete in ${duration}ms`);

    return {
      patterns: patternResults,
      qualityScore,
      metadata: {
        duration,
        detectorsRun: detectors.length,
        projectType: this.configManager.getProjectType(),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Run a single detector
   */
  async runDetector(detector, systemMap) {
    try {
      const module = await detector.loader();
      const DetectorClass = module.default || module[Object.keys(module)[0]];

      const instance = new DetectorClass({
        config: this.configManager.getThresholds(detector.id),
        globalConfig: this.configManager.getConfig()
      });

      return await instance.detect(systemMap);
    } catch (error) {
      logger.error(`Detector ${detector.id} error:`, error.message);
      return {
        detector: detector.id,
        findings: [],
        score: 100,
        error: error.message
      };
    }
  }

  /**
   * Add custom detector
   */
  addDetector(detectorConfig) {
    this.registry.register(detectorConfig);
  }

  /**
   * Get results for a specific detector
   */
  getResults(detectorId) {
    return this.results.get(detectorId);
  }
}

export default PatternDetectionEngine;
