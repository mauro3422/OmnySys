/**
 * @fileoverview pattern-index-manager.js
 * 
 * Backward compatibility wrapper.
 * Use './index.js' for new code.
 * 
 * @deprecated Use './index.js' instead
 * @module data-flow/utils/pattern-index-manager
 */

export {
  PatternIndexManager,
  PatternIndexManager as default,
  MasterIndexer,
  PatternDirectoryManager,
  TrainingDatasetManager,
  TokenSummarizer,
  GraphSummarizer,
  StatisticsCalculator
} from './index.js';
