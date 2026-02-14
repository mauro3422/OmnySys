/**
 * @fileoverview Risk Analyzer
 * 
 * Analyzes risk profile of shared objects
 * 
 * @module shared-objects-detector/analyzers/risk-analyzer
 */

import { isConfigObject, isStateObject, isUtilsObject } from '../patterns/name-patterns.js';

/**
 * Analyze risk profile of an object
 * @param {Object} obj - Object data
 * @param {Array} usages - Usage data
 * @param {string} filePath - File path
 * @returns {Object} Risk profile
 */
export function analyzeRiskProfile(obj, usages, filePath) {
  const factors = [];
  let score = 0;
  let type = 'unknown';
  
  // Heuristic 0: Use extractor metadata if available
  if (obj.objectType && obj.riskLevel) {
    ({ score, type, factors } = applyExtractorMetadata(obj, score, type, factors));
  }
  
  // Heuristic 1: Config pattern (reduces risk)
  if (isConfigObject(obj.name)) {
    score -= 25;
    if (type === 'unknown') type = 'config';
    factors.push('naming:config');
  }
  
  // Heuristic 2: State pattern (increases risk)
  if (isStateObject(obj.name, obj, filePath)) {
    score += 35;
    if (type === 'unknown') type = 'state';
    factors.push('naming:state');
  }
  
  // Heuristic 3: Utils pattern (reduces risk)
  if (isUtilsObject(obj.name)) {
    score -= 15;
    if (type === 'unknown') type = 'utils';
    factors.push('naming:utils');
  }
  
  // Heuristic 4: Property details
  if (obj.propertyDetails && Array.isArray(obj.propertyDetails)) {
    ({ score, type, factors } = analyzePropertyDetails(obj, score, type, factors));
  }
  
  // Heuristic 5: Mutability
  ({ score, factors } = analyzeMutability(obj, type, score, factors));
  
  // Heuristic 6: Usage count
  ({ score, factors } = analyzeUsageCount(usages, type, score, factors));
  
  // Heuristic 7: File location
  if (filePath && /config\/(change-)?types|config\/constants|types\.js$/i.test(filePath)) {
    score -= 15;
    factors.push('location:config_file');
  }
  
  // Determine final type
  if (type === 'unknown') {
    if (score > 20) type = 'potential_state';
    else if (score < -10) type = 'likely_config';
    else type = 'neutral';
  }
  
  return {
    score: Math.max(0, score),
    type,
    factors
  };
}

/**
 * Apply extractor metadata
 */
function applyExtractorMetadata(obj, score, type, factors) {
  switch (obj.objectType) {
    case 'enum':
      score -= 30;
      type = 'enum';
      factors.push('extractor:enum');
      break;
    case 'state':
      score += 40;
      type = 'state';
      factors.push('extractor:state');
      break;
    case 'data_structure':
      score += 5;
      type = 'data_structure';
      factors.push('extractor:data_structure');
      break;
    case 'mixed':
      score += 15;
      type = 'mixed';
      factors.push('extractor:mixed');
      break;
  }
  
  if (obj.riskLevel === 'low') {
    score = Math.min(score, 10);
  } else if (obj.riskLevel === 'high') {
    score = Math.max(score, 40);
  }
  
  return { score, type, factors };
}

/**
 * Analyze property details
 */
function analyzePropertyDetails(obj, score, type, factors) {
  const highRiskProps = obj.propertyDetails.filter(p => p.risk === 'high').length;
  const lowRiskProps = obj.propertyDetails.filter(p => p.risk === 'low').length;
  
  if (highRiskProps > 0) {
    score += highRiskProps * 10;
    factors.push(`properties:functions:${highRiskProps}`);
  }
  
  if (lowRiskProps > 0 && highRiskProps === 0) {
    score -= 20;
    if (type === 'unknown') type = 'enum';
    factors.push('properties:only_literals');
  }
  
  return { score, type, factors };
}

/**
 * Analyze mutability
 */
function analyzeMutability(obj, type, score, factors) {
  if (obj.isMutable) {
    if (type !== 'enum' && type !== 'config') {
      score += 15;
      factors.push('parser:mutable');
    }
  } else {
    score -= 10;
    factors.push('parser:immutable');
  }
  return { score, factors };
}

/**
 * Analyze usage count
 */
function analyzeUsageCount(usages, type, score, factors) {
  const isLowRiskType = type === 'enum' || type === 'config';
  
  if (usages.length >= 10) {
    if (!isLowRiskType) {
      score += 20;
      factors.push('usage:high');
    } else {
      score -= 5;
      factors.push('usage:high_but_enum');
    }
  } else if (usages.length >= 5) {
    if (!isLowRiskType) {
      score += 10;
      factors.push('usage:medium');
    }
  }
  
  return { score, factors };
}
