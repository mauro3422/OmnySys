/**
 * @fileoverview Performance Impact Extractor - Backward Compatibility Layer
 * 
 * This file provides backward compatibility for the refactored module.
 * All functionality has been moved to the modular architecture.
 * 
 * @deprecated Use './performance-impact/index.js' instead
 * @module layer-a-static/extractors/metadata/performance-impact
 */

import {
  extractPerformanceMetrics,
  extractPerformanceImpactConnections,
  ComplexityAnalyzer,
  ExpensiveOperationsAnalyzer,
  ResourceAnalyzer,
  ImpactCalculator,
  PropagationCalculator,
  ConnectionBuilder,
  ChainDetector
} from './performance-impact/index.js';

// Re-export all public APIs for backward compatibility
export {
  extractPerformanceMetrics,
  extractPerformanceImpactConnections,
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
