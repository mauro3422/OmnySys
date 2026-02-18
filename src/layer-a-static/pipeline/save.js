import fs from 'fs/promises';
import path from 'path';

import { savePartitionedSystemMap } from '#core/storage/index.js';
import { DATA_DIR } from '#config/paths.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:save');



export async function ensureDataDir(absoluteRootPath) {
  const dataDir = path.join(absoluteRootPath, DATA_DIR);
  await fs.mkdir(dataDir, { recursive: true });
  return dataDir;
}

export async function saveSystemMap(dataDir, outputPath, systemMap, verbose = true) {
  if (verbose) logger.info('\uD83D\uDCBE Saving graph...');
  const outputFullPath = path.join(dataDir, outputPath);
  await fs.writeFile(outputFullPath, JSON.stringify(systemMap, null, 2));
  if (verbose) logger.info(`  \u2714 Saved to: ${DATA_DIR}/${outputPath}\n`);
  return outputFullPath;
}

export async function saveAnalysisReport(dataDir, outputPath, analysisReport, verbose = true) {
  const analysisOutputPath = outputPath.replace('.json', '-analysis.json');
  const analysisFullPath = path.join(dataDir, analysisOutputPath);
  await fs.writeFile(analysisFullPath, JSON.stringify(analysisReport, null, 2));
  if (verbose) logger.info(`  \u2714 Analysis saved to: ${DATA_DIR}/${analysisOutputPath}\n`);
  return analysisOutputPath;
}

export async function saveEnhancedSystemMap(dataDir, outputPath, enhancedSystemMap, verbose = true) {
  const enhancedOutputPath = outputPath.replace('.json', '-enhanced.json');
  const enhancedFullPath = path.join(dataDir, enhancedOutputPath);
  await fs.writeFile(enhancedFullPath, JSON.stringify(enhancedSystemMap, null, 2));
  if (verbose) logger.info(`  \u2714 Enhanced map saved to: ${DATA_DIR}/${enhancedOutputPath}\n`);
  return enhancedOutputPath;
}

export async function savePartitionedData(absoluteRootPath, enhancedSystemMap, verbose = true) {
  if (verbose) logger.info('\uD83D\uDCBE Saving partitioned data to ${DATA_DIR}/...');
  const partitionedPaths = await savePartitionedSystemMap(absoluteRootPath, enhancedSystemMap);
  if (verbose) {
    logger.info('  \u2714 Metadata saved to: ${DATA_DIR}/index.json');
    logger.info(`  \u2714 ${partitionedPaths.files.length} files saved to: ${DATA_DIR}/files/`);
    logger.info('  \u2714 Connections saved to: ${DATA_DIR}/connections/');
    logger.info('  \u2714 Risk assessment saved to: ${DATA_DIR}/risks/\n');
  }
  return partitionedPaths;
}

export function printSummary({
  systemMap,
  analysisReport,
  enhancedSystemMap,
  enhancedOutputPath,
  partitionedPaths
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
  - Monolithic JSON: ${DATA_DIR}/${enhancedOutputPath} (${(JSON.stringify(enhancedSystemMap || {}).length / 1024).toFixed(2)} KB)
  - Partitioned data: ${DATA_DIR}/ directory (${partitionedPaths?.files?.length || 0} files)
  - Query API available via query-service.js
      `);
}
