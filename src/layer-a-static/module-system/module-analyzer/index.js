/**
 * @fileoverview Module Analyzer
 * 
 * Analiza módulos completos con arquitectura extensible.
 * 
 * @module module-analyzer
 * @version 2.0.0
 */

// Analyzers
export { ConnectionAnalyzer } from './analyzers/connection-analyzer.js';
export { ExportAnalyzer } from './analyzers/export-analyzer.js';
export { ImportAnalyzer } from './analyzers/import-analyzer.js';

// Metrics
export { MetricsCalculator } from './metrics/metrics-calculator.js';

// Chains
export { ChainBuilder } from './chains/chain-builder.js';

// Main class re-export for compatibility
export { ModuleAnalyzer } from './ModuleAnalyzer.js';
