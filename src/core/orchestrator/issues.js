import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:issues');



/**
 * Finaliza el análisis y emite el evento complete
 */
export async function _finalizeAnalysis() {
  if (this.analysisCompleteEmitted) {
    return; // Evitar múltiples emisiones
  }

  this.analysisCompleteEmitted = true;

  logger.info('\nðŸ” Detecting semantic issues...');
  const issuesReport = await this._detectSemanticIssues();

  logger.info('\nâœ… Analysis complete!');

  this.emit('analysis:complete', {
    iterations: this.iteration,
    totalFiles: this.indexedFiles.size,
    issues: issuesReport
  });
}

/**
 * Detect semantic issues across all analyzed files
 */
export async function _detectSemanticIssues() {
  logger.info('\nðŸ” Detecting semantic issues...');

  try {
    const { getFileAnalysis } = await import('../../layer-a-static/query/index.js');
    const { detectSemanticIssues } = await import('../../layer-b-semantic/issue-detectors/index.js');

    // Build system map from all analyzed files
    const systemMap = {
      files: {},
      metadata: {
        analyzedAt: new Date().toISOString(),
        totalFiles: this.indexedFiles.size
      }
    };

    for (const filePath of this.indexedFiles) {
      const analysis = await getFileAnalysis(this.projectPath, filePath);
      if (analysis) {
        systemMap.files[filePath] = analysis;
      }
    }

    // Detect issues
    const issuesReport = detectSemanticIssues(systemMap);

    // Save issues report
    const issuesPath = path.join(this.OmnySysDataPath, 'semantic-issues.json');
    await fs.writeFile(issuesPath, JSON.stringify(issuesReport, null, 2), 'utf-8');

    logger.info(`  âœ“ Found ${issuesReport.stats?.totalIssues || 0} semantic issues`);
    if (issuesReport.stats?.totalIssues > 0) {
      logger.info(`    â€¢ High: ${issuesReport.stats.bySeverity?.high || 0}`);
      logger.info(`    â€¢ Medium: ${issuesReport.stats.bySeverity?.medium || 0}`);
      logger.info(`    â€¢ Low: ${issuesReport.stats.bySeverity?.low || 0}`);
    }

    // El evento analysis:complete se emite desde _finalizeAnalysis
    return issuesReport;
  } catch (error) {
    logger.error('  âŒ Error detecting semantic issues:', error.message);
    return { stats: { totalIssues: 0 } };
  }
}
