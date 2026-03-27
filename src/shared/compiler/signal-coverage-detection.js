import { getRecommendation } from './recommendations/RecommendationEngine.js';

const MANUAL_COVERAGE_PATTERNS = [
  /(centralityPct|centrality_score|centralityScore|avgCentrality|centralityClassification)/,
  /(coverage|missingSignals|missingAtoms|nonZero|all zero|physics)/i
];

const COVERAGE_API_IMPORTS = [
  /summarizeDerivedScoreCoverage/,
  /summarizePhysicsCoverageRow/,
  /classifyFieldCoverage/
];

export function detectSignalCoverageDrift(source = '', filePath = '') {
  const findings = [];
  const hasManualLogic = MANUAL_COVERAGE_PATTERNS.every((pattern) => pattern.test(source));
  const hasCanonicalImports = COVERAGE_API_IMPORTS.some((pattern) => pattern.test(source));

  if (hasManualLogic && !hasCanonicalImports && !filePath.endsWith('/signal-coverage.js')) {
    findings.push({
      rule: 'manual_signal_coverage_scan',
      severity: 'medium',
      policyArea: 'signal_coverage',
      message: 'Manual centrality coverage/physics scan detected',
      recommendation: getRecommendation({ type: 'signal_coverage' }).message
    });
  }

  return findings;
}
