/**
 * @fileoverview Risk Analyzer
 *
 * Analyzes risk profile of shared objects
 *
 * @module shared-objects-detector/analyzers/risk-analyzer
 */

import {
  analyzeMutability,
  analyzeNamingHeuristics,
  analyzePropertyDetails,
  analyzeUsageCount,
  applyExtractorMetadata,
  finalizeRiskType
} from './risk-heuristics.js';

/**
 * Analyze risk profile of an object
 * @param {Object} obj - Object data
 * @param {Array} usages - Usage data
 * @param {string} filePath - File path
 * @returns {Object} Risk profile
 */
export function analyzeRiskProfile(obj, usages, filePath) {
  let factors = [];
  let score = 0;
  let type = 'unknown';

  if (obj.objectType && obj.riskLevel) {
    const metadata = applyExtractorMetadata(obj, score, type, factors);
    score = metadata.score;
    type = metadata.type;
    factors = metadata.factors;
  }

  ({ score, type, factors } = analyzeNamingHeuristics(obj, score, type, factors, filePath));

  if (obj.propertyDetails && Array.isArray(obj.propertyDetails)) {
    ({ score, type, factors } = analyzePropertyDetails(obj, score, type, factors));
  }

  ({ score, factors } = analyzeMutability(obj, type, score, factors));
  ({ score, factors } = analyzeUsageCount(usages, type, score, factors));

  if (filePath && /\/pattern-detection\/detectors\//i.test(filePath)) {
    score -= 12;
    factors.push('location:analysis_infrastructure');
  }

  if (filePath && /config\/(change-)?types|config\/constants|types\.js$/i.test(filePath)) {
    score -= 15;
    factors.push('location:config_file');
  }

  type = finalizeRiskType(type, score);

  return {
    score: Math.max(0, score),
    type,
    factors
  };
}
