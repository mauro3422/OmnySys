import { isConfigObject, isStateObject, isUtilsObject } from '../patterns/name-patterns.js';

export function applyExtractorMetadata(obj, score, type, factors) {
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

export function analyzeNamingHeuristics(obj, score, type, factors, filePath) {
  if (isConfigObject(obj.name)) {
    score -= 25;
    if (type === 'unknown') type = 'config';
    factors.push('naming:config');
  }

  if (isStateObject(obj.name, obj, filePath)) {
    score += 35;
    if (type === 'unknown') type = 'state';
    factors.push('naming:state');
  }

  if (isUtilsObject(obj.name)) {
    score -= 15;
    if (type === 'unknown') type = 'utils';
    factors.push('naming:utils');
  }

  return { score, type, factors };
}

export function analyzePropertyDetails(obj, score, type, factors) {
  const highRiskProps = obj.propertyDetails.filter((prop) => prop.risk === 'high').length;
  const lowRiskProps = obj.propertyDetails.filter((prop) => prop.risk === 'low').length;

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

export function analyzeMutability(obj, type, score, factors) {
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

export function analyzeUsageCount(usages, type, score, factors) {
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

export function finalizeRiskType(type, score) {
  if (type !== 'unknown') {
    return type;
  }

  if (score > 20) return 'potential_state';
  if (score < -10) return 'likely_config';
  return 'neutral';
}

export default {
  analyzeMutability,
  analyzeNamingHeuristics,
  analyzePropertyDetails,
  analyzeUsageCount,
  applyExtractorMetadata,
  finalizeRiskType
};
