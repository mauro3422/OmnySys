/**
 * @fileoverview Temporal Connection Extractor
 * 
 * Main orchestrator for temporal connection detection using the Strategy pattern.
 * Delegates to specific detectors and analyzers for different temporal patterns.
 * 
 * SOLID Principles:
 * - SRP: Each detector handles one concern
 * - OCP: New detectors can be added without modifying existing code
 * - LSP: All detectors implement the same interface
 * - ISP: Clean interfaces between components
 * - DIP: Depends on abstractions (detector strategies)
 * 
 * @module temporal-connections/TemporalConnectionExtractor
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

import { detectTimeouts } from './detectors/timeout-detector.js';
import { detectIntervals } from './detectors/interval-detector.js';
import { detectPromises } from './detectors/promise-detector.js';
import { detectEvents } from './detectors/event-detector.js';
import { analyzeDelay } from './analyzers/delay-analyzer.js';
import { analyzeAsyncFlow } from './analyzers/async-flow-analyzer.js';
import { detectLifecycleHooks } from './lifecycle/index.js';
import { detectExecutionOrder, isInitializerByName } from './execution/index.js';
import { extractCrossFileConnections } from './crossfile/index.js';
import { detectPhaseConflicts } from './utils/index.js';

/**
 * Main extractor class for temporal connections
 */
export class TemporalConnectionExtractor {
  constructor(options = {}) {
    this.detectors = options.detectors || this._createDefaultDetectors();
    this.enableAnalysis = options.enableAnalysis !== false;
  }

  _createDefaultDetectors() {
    return [
      { name: 'timeout', detect: detectTimeouts, supports: (code) => /setTimeout\s*\(/.test(code) },
      { name: 'interval', detect: detectIntervals, supports: (code) => /setInterval\s*\(/.test(code) },
      { name: 'promise', detect: detectPromises, supports: (code) => /(?:async|await|Promise\.)/.test(code) },
      { name: 'event', detect: detectEvents, supports: (code) => /(?:addEventListener|\.on\s*\()/.test(code) }
    ];
  }

  registerDetector(detector) {
    this.detectors.push(detector);
    return this;
  }

  extractPatterns(code, functionInfo = {}) {
    const patterns = {
      timers: [],
      asyncPatterns: null,
      events: [],
      lifecycleHooks: [],
      executionOrder: null
    };

    // Run applicable detectors
    for (const detector of this.detectors) {
      if (detector.supports(code)) {
        const result = detector.detect(code, functionInfo);
        this._assignPatternResult(patterns, detector.name, result);
      }
    }

    // Legacy lifecycle hooks detection
    patterns.lifecycleHooks = detectLifecycleHooks(code);
    patterns.executionOrder = detectExecutionOrder(code, functionInfo);

    // Optional analysis phase
    if (this.enableAnalysis) {
      this._runAnalysis(patterns, code);
    }

    return patterns;
  }

  _assignPatternResult(patterns, detectorName, result) {
    switch (detectorName) {
      case 'timeout':
      case 'interval':
        patterns.timers.push(...(Array.isArray(result) ? result : []));
        break;
      case 'promise':
        patterns.asyncPatterns = result;
        break;
      case 'event':
        patterns.events = Array.isArray(result) ? result : [];
        break;
    }
  }

  _runAnalysis(patterns, code) {
    if (patterns.asyncPatterns) {
      patterns.asyncFlowAnalysis = analyzeAsyncFlow(patterns.asyncPatterns, code);
    }

    if (patterns.timers.length > 0) {
      patterns.timerAnalysis = patterns.timers.map(t => ({
        ...t,
        analysis: analyzeDelay(t.delay || t.interval, t.type === 'setInterval' ? 'interval' : 'timeout')
      }));
    }
  }

  extractConnections(atoms) {
    const connections = [];

    // Find initializers and consumers
    const initializers = atoms.filter(a => 
      a.temporal?.executionOrder?.mustRunBefore?.length > 0 ||
      isInitializerByName(a.name)
    );

    const consumers = atoms.filter(a =>
      a.temporal?.executionOrder?.mustRunAfter?.length > 0
    );

    // Create temporal dependencies
    for (const init of initializers) {
      for (const consumer of consumers) {
        if (init.id !== consumer.id) {
          connections.push({
            type: 'temporal-dependency',
            from: init.id,
            to: consumer.id,
            relationship: 'must-run-before',
            reason: 'initialization',
            confidence: 0.75,
            evidence: {
              initializer: init.name,
              consumer: consumer.name
            }
          });
        }
      }
    }

    // Detect lifecycle phase conflicts
    connections.push(...detectPhaseConflicts(atoms));

    return connections;
  }

  extractCrossFileConnections(allAtoms) {
    return extractCrossFileConnections(allAtoms);
  }
}

export default TemporalConnectionExtractor;
