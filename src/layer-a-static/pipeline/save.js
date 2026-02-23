import { getRepository } from '#layer-c/storage/repository/index.js';
import { DATA_DIR } from '#config/paths.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:save');

export async function ensureDataDir(absoluteRootPath) {
  // Crear directorio para SQLite si no existe
  const fs = await import('fs/promises');
  const path = await import('path');
  const dataDir = path.join(absoluteRootPath, DATA_DIR);
  await fs.mkdir(dataDir, { recursive: true });
  return dataDir;
}

export async function saveSystemMap(systemMap, verbose = true, rootPath = null) {
  if (verbose) logger.info('💾 Saving graph...');
  
  if (!rootPath) {
    throw new Error('rootPath is required for SQLite storage');
  }
  
  const repo = getRepository(rootPath);
  if (!repo.saveSystemMap) {
    throw new Error('Repository does not support saveSystemMap');
  }
  
  repo.saveSystemMap(systemMap);
  
  if (verbose) {
    logger.info(`  ✔ Saved to SQLite: ${Object.keys(systemMap.files || {}).length} files\n`);
  }
  
  return '[SQLite]';
}

export async function saveEnhancedSystemMap(enhancedSystemMap, verbose = true, rootPath = null) {
  if (!rootPath) {
    throw new Error('rootPath is required for SQLite storage');
  }
  
  const repo = getRepository(rootPath);
  if (!repo.saveSystemMap) {
    throw new Error('Repository does not support saveSystemMap');
  }
  
  repo.saveSystemMap(enhancedSystemMap);
  
  if (verbose) {
    logger.info(`  ✔ Saved to SQLite (enhanced)\n`);
  }
  
  return '[SQLite]';
}

export function printSummary({
  systemMap,
  analysisReport,
  enhancedSystemMap
}) {
  const meta = systemMap?.metadata || {};
  const quality = analysisReport?.qualityMetrics || {};
  const conns = enhancedSystemMap?.connections || {};
  const risk = enhancedSystemMap?.riskAssessment?.report?.summary || {};
  const issues = enhancedSystemMap?.semanticIssues?.stats || {};

  logger.info('\u2705 Layer A Complete!');
  logger.info(`
\uD83D\uDCCA STATIC ANALYSIS Summary:
  - Files analyzed: ${meta.totalFiles || 0}
  - Functions analyzed: ${meta.totalFunctions || 0}
  - Dependencies: ${meta.totalDependencies || 0}
  - Function links: ${meta.totalFunctionLinks || 0}
  - Average deps per file: ${meta.totalFiles > 0 ? (meta.totalDependencies / meta.totalFiles).toFixed(2) : '0.00'}

\uD83D\uDD0D CODE QUALITY Analysis:
  - Quality Score: ${quality.score || 0}/100 (Grade: ${quality.grade || 'N/A'})
  - Total Issues: ${quality.totalIssues || 0}
  - Unused Exports: ${analysisReport?.unusedExports?.totalUnused || 0}
  - Dead Code Files: ${analysisReport?.orphanFiles?.deadCodeCount || 0}
  - Critical Hotspots: ${analysisReport?.hotspots?.criticalCount || 0}
  - Circular Dependencies: ${analysisReport?.circularFunctionDeps?.total || 0}
  - Recommendations: ${analysisReport?.recommendations?.total || 0}

\uD83E\uDDE0 SEMANTIC ANALYSIS (Phase 3.5):
  - Shared state connections: ${conns.sharedState?.length || 0}
  - Event listener connections: ${conns.eventListeners?.length || 0}
  - Total semantic connections: ${conns.total || 0}
  - High-risk files: ${(risk.highCount || 0) + (risk.criticalCount || 0)}
  - Average risk score: ${risk.averageScore || 0}

\u26A0\uFE0F SEMANTIC ISSUES DETECTED:
  - Total issues: ${issues.totalIssues || 0}
  - High severity: ${issues.bySeverity?.high || 0}
  - Medium severity: ${issues.bySeverity?.medium || 0}
  - Low severity: ${issues.bySeverity?.low || 0}

\uD83D\uDCBE STORAGE:
  - SQLite Database: ${DATA_DIR}/omnysys.db
  - Atoms: ${meta.totalAtoms || 'N/A'}
  - Query API: SQLite + MCP tools
      `);
}
