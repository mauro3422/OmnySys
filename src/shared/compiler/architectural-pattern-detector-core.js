import { createLogger } from '#utils/logger.js';
import { detectArchitecturalPatterns } from '../architecture-utils.js';
import {
  resolveArchitecturalRecommendation
} from './architectural-recommendations.js';
import { ARCHITECTURAL_PATTERNS } from './architectural-pattern-detector-constants.js';
import { buildGodObjectStructure, classifyOperationalRole } from './architectural-pattern-detector-helpers.js';

const logger = createLogger('OmnySys:ArchitecturalPatternDetector');

function buildPatternResultBase() {
  return {
    patterns: [],
    primaryPattern: null,
    severity: 'low',
    recommendations: []
  };
}

export { ARCHITECTURAL_PATTERNS };

export function detectArchitecturalPattern(metadata) {
  const patterns = detectArchitecturalPatterns(metadata);
  const result = buildPatternResultBase();

  if (patterns.isGodObject) {
    result.patterns.push(ARCHITECTURAL_PATTERNS.GOD_OBJECT);
    result.primaryPattern = ARCHITECTURAL_PATTERNS.GOD_OBJECT;
    result.severity = 'high';
    result.recommendations.push({
      type: 'split_module',
      message: 'This file has too many responsibilities. Consider splitting into smaller, focused modules.',
      suggestedStructure: buildGodObjectStructure(metadata)
    });
  }

  if (patterns.isOrphanModule) {
    result.patterns.push(ARCHITECTURAL_PATTERNS.ORPHAN_MODULE);
    if (!result.primaryPattern) {
      result.primaryPattern = ARCHITECTURAL_PATTERNS.ORPHAN_MODULE;
    }
    result.severity = result.severity === 'high' ? 'high' : 'medium';
    result.recommendations.push({
      type: 'consolidate_or_remove',
      message: 'This module has exports but no dependents. Consider consolidating or removing.',
      suggestedStructure: null
    });
  }

  if (patterns.hasHighCoupling) {
    result.patterns.push('high_coupling');
    result.severity = result.severity === 'high' ? 'high' : 'medium';
    result.recommendations.push({
      type: 'reduce_coupling',
      message: 'This file has high coupling. Consider introducing interfaces or dependency injection.',
      suggestedStructure: null
    });
  }

  if (patterns.hasManyExports) {
    result.patterns.push('many_exports');
    result.recommendations.push({
      type: 'consider_namespace',
      message: 'This file has many exports. Consider using a namespace or barrel export pattern.',
      suggestedStructure: null
    });
  }

  logger.debug(`[detectArchitecturalPattern] ${metadata.filePath || 'unknown'}: ${result.patterns.length} patterns detected`);

  return result;
}

export function buildArchitecturalPatternSummary(results) {
  if (!results || results.patterns.length === 0) {
    return 'No architectural patterns detected';
  }

  const summaries = [];

  if (results.primaryPattern === ARCHITECTURAL_PATTERNS.GOD_OBJECT) {
    summaries.push('God Object detected - file has too many responsibilities');
  }

  if (results.primaryPattern === ARCHITECTURAL_PATTERNS.ORPHAN_MODULE) {
    summaries.push('Orphan Module detected - exports exist but no dependents');
  }

  if (results.suggestedLocation) {
    summaries.push(`Consider moving to ${results.suggestedLocation}`);
  }

  if (results.canonicalRecommendation) {
    summaries.push(results.canonicalRecommendation.action);
  }

  return summaries.join('. ');
}
