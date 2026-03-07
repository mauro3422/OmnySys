import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:issues');

/**
 * Finaliza el análisis y emite el evento complete
 */
export async function _finalizeAnalysis() {
  if (this.analysisCompleteEmitted) {
    return;
  }

  this.analysisCompleteEmitted = true;

  const issuesReport = await this._detectSemanticIssues();

  logger.info('\n✅ Analysis complete!');

  this.emit('analysis:complete', {
    iterations: this.iteration,
    totalFiles: this.indexedFiles.size,
    issues: issuesReport
  });
}

/**
 * Detect semantic issues across all analyzed files
 * Guarda en SQLite en lugar de JSON
 */
export async function _detectSemanticIssues() {
  logger.info('\n🔍 Detecting semantic issues...');

  try {
    const { getFileAnalysis } = await import('../../layer-c-memory/query/apis/file-api.js');
    const { detectSemanticIssues } = await import('../../layer-a-static/analyses/tier3/issue-detectors/index.js');

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

    const issuesReport = detectSemanticIssues(systemMap);

    // Save to SQLite instead of JSON
    const repo = getRepository(this.projectPath);
    if (repo && repo.db && issuesReport.issues) {
      // Mark existing active issues as superseded/removed instead of deleting
      repo.db.prepare(`
        UPDATE semantic_issues 
        SET lifecycle_status = 'superseded', 
            is_removed = 1, 
            updated_at = datetime('now') 
        WHERE is_removed = 0
      `).run();

      // Insert new issues - flatten all issue arrays from the issues object
      const insertStmt = repo.db.prepare(`
        INSERT INTO semantic_issues (file_path, issue_type, severity, message, line_number, context_json, detected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const allIssues = Object.values(issuesReport.issues).flat();

      for (const issue of allIssues) {
        insertStmt.run(
          issue.file || issue.filePath || 'unknown',
          issue.type || issue.issue_type || 'unknown',
          issue.severity || 'low',
          issue.message || '',
          issue.line || issue.line_number || null,
          JSON.stringify(issue.context || {}),
          new Date().toISOString()
        );
      }

      logger.info(`  ✅ Saved ${issuesReport.stats?.totalIssues || 0} issues to SQLite`);
    }

    logger.info(`  ✅ Found ${issuesReport.stats?.totalIssues || 0} semantic issues`);
    if (issuesReport.stats?.totalIssues > 0) {
      logger.info(`    • High: ${issuesReport.stats.bySeverity?.high || 0}`);
      logger.info(`    • Medium: ${issuesReport.stats.bySeverity?.medium || 0}`);
      logger.info(`    • Low: ${issuesReport.stats.bySeverity?.low || 0}`);
    }

    return issuesReport;
  } catch (error) {
    logger.error('  ❌ Error detecting semantic issues:', error.message);
    return { stats: { totalIssues: 0 } };
  }
}
