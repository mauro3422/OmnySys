/**
 * Tool: get_risk_assessment
 * Returns a risk assessment of the entire project
 */

import { getProjectMetadata } from '../../../layer-a-static/storage/query-service.js';

// TODO: Implement proper risk assessment query
async function getRiskAssessment(projectPath, minSeverity = 'low') {
  const metadata = await getProjectMetadata(projectPath);
  return {
    totalIssues: 0,
    bySeverity: { high: 0, medium: 0, low: 0 },
    hotspots: [],
    metadata
  };
}

export async function get_risk_assessment(args, context) {
  const { minSeverity = 'medium' } = args;
  const { projectPath } = context;
  
  console.error(`[Tool] get_risk_assessment("${minSeverity}")`);

  const assessment = await getRiskAssessment(projectPath);

  const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  const minLevel = severityOrder[minSeverity];

  const filtered = assessment.report.mediumRiskFiles
    ?.concat(assessment.report.highRiskFiles || [])
    .filter((f) => severityOrder[f.severity] >= minLevel)
    .slice(0, 10);

  return {
    summary: assessment.report.summary,
    topRiskFiles: filtered,
    recommendation:
      assessment.report.summary.criticalCount > 0
        ? '🚨 Critical issues detected - Review high-risk files'
        : '✓ Risk levels acceptable'
  };
}
