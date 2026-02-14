/**
 * @fileoverview DetectorRunner.js
 * 
 * Runs detectors with error handling.
 * 
 * @module pattern-detection/runners/DetectorRunner
 */

/**
 * Runs pattern detectors
 */
export class DetectorRunner {
  constructor(options = {}) {
    this.onError = options.onError || console.error;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Run a detector with timeout and error handling
   */
  async run(detector, systemMap) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Detector timeout')), this.timeout);
    });

    try {
      const result = await Promise.race([
        this.executeDetector(detector, systemMap),
        timeoutPromise
      ]);
      return result;
    } catch (error) {
      this.onError(`Detector ${detector.id} failed:`, error);
      return {
        detector: detector.id,
        findings: [],
        score: 100,
        error: error.message
      };
    }
  }

  /**
   * Execute detector
   */
  async executeDetector(detector, systemMap) {
    const module = await detector.loader();
    const DetectorClass = module.default || module[Object.keys(module)[0]];
    
    const instance = new DetectorClass({
      config: detector.config || {},
      globalConfig: detector.globalConfig || {}
    });
    
    return await instance.detect(systemMap);
  }

  /**
   * Run multiple detectors in parallel
   */
  async runAll(detectors, systemMap) {
    const promises = detectors.map(d => this.run(d, systemMap));
    return Promise.allSettled(promises);
  }
}

export default DetectorRunner;
