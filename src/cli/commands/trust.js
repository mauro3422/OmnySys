import { resolveProjectPath } from '../utils/paths.js';
import { log } from '../utils/logger.js';
import {
  buildTrustInvestigationReport,
  summarizeTrustInvestigationReport
} from '#shared/compiler/trust-investigation-report.js';

export const aliases = ['trust', 'investigate', 'baseline'];

export async function trustLogic(projectPath, options = {}) {
  const absolutePath = resolveProjectPath(projectPath);
  const report = await buildTrustInvestigationReport(absolutePath, {
    persist: options.persist !== false,
    includeSamples: options.includeSamples !== false,
    limit: options.limit || 3,
    compareDays: options.compareDays || 3,
    historyLimit: options.historyLimit || 12,
    toolRunTelemetryWindowDays: options.toolRunTelemetryWindowDays || 7,
    context: options.context || {}
  });

  if (!report.success) {
    return {
      success: false,
      exitCode: 1,
      error: report.error || 'Trust investigation failed',
      projectPath: absolutePath
    };
  }

  return {
    success: true,
    exitCode: 0,
    projectPath: absolutePath,
    report,
    summary: summarizeTrustInvestigationReport(report)
  };
}

function printSection(title, lines = []) {
  console.log(`\n${title}`);
  for (const line of lines) {
    if (line) {
      console.log(`  ${line}`);
    }
  }
}

export async function execute(projectPath) {
  const result = await trustLogic(projectPath);

  if (!result.success) {
    log(result.error, 'error');
    return;
  }

  const report = result.report;
  const summary = result.summary;

  console.log('\nTrust Investigation\n');
  console.log(`Project: ${result.projectPath}`);
  console.log(`State: ${summary.trustState.toUpperCase()} (${summary.confidenceScore}/100)`);
  console.log(`Baseline: ${summary.oneLine}`);
  console.log(`Next: ${summary.nextAction}`);

  printSection('Core DB', [
    `Health: ${report.database.health?.healthScore || 0}/${report.database.health?.grade || 'F'}`,
    `Live counts: atoms=${report.database.liveCounts.activeAtoms}, files=${report.database.liveCounts.activeFiles}, callRelations=${report.database.liveCounts.activeCallRelations}, semantic=${report.database.liveCounts.activeSemanticConnections}`,
    `Metadata drift: atoms=${report.database.metadataDrift.activeAtomsDelta}, files=${report.database.metadataDrift.activeFilesDelta}`
  ]);

  printSection('Trust Gates', report.gates.map((gate) => `${gate.key}: ${gate.state} - ${gate.reason}`));

  if (report.samples?.issue) {
    printSection('Top Issue', [
      `${report.samples.issue.severity} ${report.samples.issue.issueType} @ ${report.samples.issue.filePath}`,
      report.samples.issue.message
    ]);
  }

  if (report.samples?.canonicalPromotion) {
    printSection('Canonical Promotion', [
      `${report.samples.canonicalPromotion.id || report.samples.canonicalPromotion.name || 'candidate'}`,
      report.samples.canonicalPromotion.recommendation || report.samples.canonicalPromotion.summary || 'No recommendation available'
    ]);
  }

  if (Array.isArray(report.samples?.slowTools) && report.samples.slowTools.length > 0) {
    printSection('Slow Tools', report.samples.slowTools.slice(0, 3).map((tool) => (
      `${tool.toolName}: ${Math.round(tool.avgDurationMs)}ms avg (${tool.runCount} runs)`
    )));
  }

  if (Array.isArray(report.remediation?.batches) && report.remediation.batches.length > 0) {
    printSection('Remediation Batches', report.remediation.batches.map((batch) => (
      `${batch.key}: ${batch.state} - ${batch.title}`
    )));
    console.log(`  Next batch: ${report.remediation.summary?.nextBatchTitle || 'n/a'}`);
  }
}
