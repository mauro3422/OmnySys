export function detectSignalCoverageDrift(filePath, source = '') {
  if (!source) {
    return [];
  }

  const hasManualLogic =
    /(?:fieldCoverage|semanticSurface|physicsCoverage|centralityCoverage|pipelineFieldCoverage|coverageCandidates|coverageFindings)/.test(source) ||
    /(?:summarizeFieldCoverageRow|summarizeCentralityCoverageRow|collectPipelineFieldCoverageFindings)/.test(source);
  const hasCanonicalImports = /from\s+['"][^'"]*signal-coverage(?:\.js|\/)/.test(source);

  if (hasManualLogic && !hasCanonicalImports) {
    return [{
      filePath,
      issueType: 'sem_signal_coverage_drift',
      severity: 'medium',
      message: 'Module recomputes signal coverage heuristics manually instead of using the canonical signal-coverage helpers.'
    }];
  }

  return [];
}
