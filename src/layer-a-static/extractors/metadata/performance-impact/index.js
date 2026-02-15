/**
 * @fileoverview Performance Impact Extractor - Modular Architecture
 * 
 * Propagates performance impacts between functions.
 * Detects "performance cables": if A is slow and B calls A, B is also slow.
 * 
 * @module performance-impact
 * @version 2.0.0
 */

import { createLogger } from '#utils/logger.js';
import { ComplexityAnalyzer } from './analyzers/complexity-analyzer.js';
import { ExpensiveOperationsAnalyzer } from './analyzers/expensive-ops-analyzer.js';
import { ResourceAnalyzer } from './analyzers/resource-analyzer.js';
import { ImpactCalculator } from './metrics/impact-calculator.js';
import { PropagationCalculator } from './metrics/propagation-calculator.js';
import { ConnectionBuilder } from './reports/connection-builder.js';
import { ChainDetector } from './reports/chain-detector.js';

const logger = createLogger('OmnySys:extractors:performance-impact');

/**
 * Extracts performance metrics from code
 * 
 * @param {string} code - Source code
 * @param {Object} performanceHints - Existing performance hints
 * @returns {Object} Performance metrics
 */
export function extractPerformanceMetrics(code, performanceHints = {}) {
  const analyzers = {
    complexity: new ComplexityAnalyzer(),
    expensiveOps: new ExpensiveOperationsAnalyzer(),
    resources: new ResourceAnalyzer()
  };

  const calculator = new ImpactCalculator();

  const metrics = {
    complexity: { cyclomatic: 0, cognitive: 0, bigO: 'O(1)' },
    expensiveOps: { nestedLoops: 0, recursion: false, blockingOps: [], heavyCalls: [] },
    resources: { network: false, disk: false, memory: 'low', dom: false },
    estimates: { executionTime: 'instant', blocking: false, async: false },
    impactScore: 0
  };

  try {
    // Analyze complexity
    metrics.complexity = analyzers.complexity.analyze(code);

    // Detect expensive operations
    metrics.expensiveOps = analyzers.expensiveOps.analyze(code, performanceHints);

    // Estimate resources
    const resourceResult = analyzers.resources.analyze(code);
    metrics.resources = resourceResult.resources;
    Object.assign(metrics.estimates, resourceResult.estimates);

    // Calculate final scores
    metrics.impactScore = calculator.calculate(metrics);
    metrics.estimates = {
      ...metrics.estimates,
      ...calculator.estimateExecution(metrics.impactScore, metrics.resources.network)
    };

  } catch (error) {
    logger.warn('Failed to extract performance metrics:', error.message);
  }

  return metrics;
}

/**
 * Propagates performance impacts between atoms
 * 
 * @param {Array} atoms - All atoms
 * @returns {Array} Performance connections and chains
 */
export function extractPerformanceImpactConnections(atoms) {
  const connectionBuilder = new ConnectionBuilder();
  const chainDetector = new ChainDetector();

  // Build connections
  const connections = connectionBuilder.build(atoms);

  // Detect critical chains
  const criticalChains = chainDetector.detect(connections);

  return [...connections, ...criticalChains];
}

// Export all classes for advanced usage
export {
  ComplexityAnalyzer,
  ExpensiveOperationsAnalyzer,
  ResourceAnalyzer,
  ImpactCalculator,
  PropagationCalculator,
  ConnectionBuilder,
  ChainDetector
};

export default {
  extractPerformanceMetrics,
  extractPerformanceImpactConnections
};
