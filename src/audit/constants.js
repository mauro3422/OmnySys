/**
 * @fileoverview Audit Constants
 * 
 * @module audit/constants
 */

/**
 * Required fields for complete context
 */
export const REQUIRED_FIELDS = {
  // Basic fields
  basic: [
    'id',
    'path',
    'name',
    'content',
    'exports',
    'imports',
    'dependencies',
    'dependents'
  ],

  // Metadata fields
  metadata: [
    'exportCount',
    'dependentCount',
    'importCount',
    'functionCount',
    'hasJSDoc',
    'hasAsync',
    'hasErrors'
  ],

  // LLM analysis fields
  llm: [
    'confidence',
    'reasoning',
    'analysisType'
  ],

  // Quality fields
  quality: [
    'qualityScore',
    'issues',
    'unusedExports',
    'isDeadCode'
  ],

  // Semantic fields
  semantic: [
    'localStorageKeys',
    'eventNames',
    'sharedState',
    'connections'
  ]
};

/**
 * Score thresholds
 */
export const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  ACCEPTABLE: 50,
  POOR: 30
};
