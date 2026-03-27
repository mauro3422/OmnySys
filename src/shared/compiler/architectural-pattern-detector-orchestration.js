import {
  detectHelperUtilityPattern,
  detectPolicyModulePattern,
  detectServiceLayerPattern
} from './architectural-pattern-detector-patterns.js';
import { resolveArchitecturalRecommendation } from './architectural-recommendations.js';
import { classifyOperationalRole } from './architectural-pattern-detector-helpers.js';
import { detectArchitecturalPattern } from './architectural-pattern-detector-core.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:ArchitecturalPatternDetector');

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
