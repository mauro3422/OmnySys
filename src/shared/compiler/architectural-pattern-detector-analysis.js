/**
 * @fileoverview Architectural pattern analysis and orchestration.
 *
 * @module shared/compiler/architectural-pattern-detector-analysis
 */

import { createLogger } from '#utils/logger.js';
import {
  detectGodObject,
  detectOrphanModule,
  detectArchitecturalPatterns
} from '../architecture-utils.js';
import {
  resolveArchitecturalRecommendation
} from './architectural-recommendations.js';
import { ARCHITECTURAL_PATTERNS } from './architectural-pattern-detector-constants.js';
import { buildGodObjectStructure, classifyOperationalRole } from './architectural-pattern-detector-helpers.js';
import {
  detectHelperUtilityPattern,
  detectPolicyModulePattern,
  detectServiceLayerPattern
} from './architectural-pattern-detector-patterns.js';

const logger = createLogger('OmnySys:ArchitecturalPatternDetector');

export { ARCHITECTURAL_PATTERNS };

export function detectArchitecturalPattern(metadata) {
  const patterns = detectArchitecturalPatterns(metadata);

  const result = {
    patterns: [],
    primaryPattern: null,
    severity: 'low',
    recommendations: []
  };

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

export function detectAllArchitecturalPatterns(filePath, metadata) {
  const fileName = filePath.split('/').pop();

  const results = {
    filePath,
    fileName,
    patterns: [],
    primaryPattern: null,
    severity: 'low',
    recommendations: [],
    suggestedLocation: null
  };

  const basePattern = detectArchitecturalPattern(metadata);
  if (basePattern.patterns.length > 0) {
    results.patterns.push(...basePattern.patterns);
    results.primaryPattern = basePattern.primaryPattern;
    results.severity = basePattern.severity;
    results.recommendations.push(...basePattern.recommendations);
  }

  const helperPattern = detectHelperUtilityPattern(fileName, metadata);
  if (helperPattern) {
    results.patterns.push(helperPattern.pattern);
    results.suggestedLocation = helperPattern.suggestedLocation;
    results.recommendations.push(helperPattern.recommendation);
  }

  const policyPattern = detectPolicyModulePattern(fileName, metadata);
  if (policyPattern) {
    results.patterns.push(policyPattern.pattern);
    if (!results.suggestedLocation) {
      results.suggestedLocation = policyPattern.suggestedLocation;
    }
    results.recommendations.push(policyPattern.recommendation);
  }

  const servicePattern = detectServiceLayerPattern(fileName, metadata);
  if (servicePattern) {
    results.patterns.push(servicePattern.pattern);
    if (!results.suggestedLocation) {
      results.suggestedLocation = servicePattern.suggestedLocation;
    }
    results.recommendations.push(servicePattern.recommendation);
  }

  const canonicalRecommendation = resolveArchitecturalRecommendation({
    issueType: results.severity === 'high' ? 'code_complexity_high' : 'code_complexity_medium',
    filePath,
    context: { findings: results.patterns.map((pattern) => ({ rule: pattern })) },
    operationalRole: { role: classifyOperationalRole(fileName) }
  });

  if (canonicalRecommendation) {
    results.canonicalRecommendation = canonicalRecommendation;
  }

  logger.info(`[detectAllArchitecturalPatterns] ${filePath}: ${results.patterns.length} patterns, severity: ${results.severity}`);

  return results;
}

export function summarizeArchitecturalPatterns(results) {
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
