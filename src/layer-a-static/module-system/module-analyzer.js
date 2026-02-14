/**
 * @fileoverview Module Analyzer (Legacy Compatibility)
 * 
 * @deprecated Use './module-analyzer/index.js' instead
 * @module module-analyzer-legacy
 * @version 2.0.0
 */

export {
  ModuleAnalyzer,
  ConnectionAnalyzer,
  ExportAnalyzer,
  ImportAnalyzer,
  MetricsCalculator,
  ChainBuilder
} from './module-analyzer/index.js';

export { ModuleAnalyzer as default } from './module-analyzer/ModuleAnalyzer.js';
