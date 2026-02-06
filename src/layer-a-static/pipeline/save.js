import fs from 'fs/promises';
import path from 'path';

import { savePartitionedSystemMap } from '../storage/storage-manager.js';

export async function ensureDataDir(absoluteRootPath) {
  const dataDir = path.join(absoluteRootPath, '.OmnySysData');
  await fs.mkdir(dataDir, { recursive: true });
  return dataDir;
}

export async function saveSystemMap(dataDir, outputPath, systemMap, verbose = true) {
  if (verbose) console.log('ðŸ’¾ Saving graph...');
  const outputFullPath = path.join(dataDir, outputPath);
  await fs.writeFile(outputFullPath, JSON.stringify(systemMap, null, 2));
  if (verbose) console.log(`  âœ“ Saved to: .OmnySysData/${outputPath}\n`);
  return outputFullPath;
}

export async function saveAnalysisReport(dataDir, outputPath, analysisReport, verbose = true) {
  const analysisOutputPath = outputPath.replace('.json', '-analysis.json');
  const analysisFullPath = path.join(dataDir, analysisOutputPath);
  await fs.writeFile(analysisFullPath, JSON.stringify(analysisReport, null, 2));
  if (verbose) console.log(`  âœ“ Analysis saved to: .OmnySysData/${analysisOutputPath}\n`);
  return analysisOutputPath;
}

export async function saveEnhancedSystemMap(dataDir, outputPath, enhancedSystemMap, verbose = true) {
  const enhancedOutputPath = outputPath.replace('.json', '-enhanced.json');
  const enhancedFullPath = path.join(dataDir, enhancedOutputPath);
  await fs.writeFile(enhancedFullPath, JSON.stringify(enhancedSystemMap, null, 2));
  if (verbose) console.log(`  âœ“ Enhanced map saved to: .OmnySysData/${enhancedOutputPath}\n`);
  return enhancedOutputPath;
}

export async function savePartitionedData(absoluteRootPath, enhancedSystemMap, verbose = true) {
  if (verbose) console.log('ðŸ’¾ Saving partitioned data to .OmnySysData/...');
  const partitionedPaths = await savePartitionedSystemMap(absoluteRootPath, enhancedSystemMap);
  if (verbose) {
    console.log('  âœ“ Metadata saved to: .OmnySysData/index.json');
    console.log(`  âœ“ ${partitionedPaths.files.length} files saved to: .OmnySysData/files/`);
    console.log('  âœ“ Connections saved to: .OmnySysData/connections/');
    console.log('  âœ“ Risk assessment saved to: .OmnySysData/risks/\n');
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
  console.log('âœ… Layer A Complete!');
  console.log(`
ðŸ“Š STATIC ANALYSIS Summary:
  - Files analyzed: ${systemMap.metadata.totalFiles}
  - Functions analyzed: ${systemMap.metadata.totalFunctions}
  - Dependencies: ${systemMap.metadata.totalDependencies}
  - Function links: ${systemMap.metadata.totalFunctionLinks}
  - Average deps per file: ${(systemMap.metadata.totalDependencies / systemMap.metadata.totalFiles).toFixed(2)}

ðŸ” CODE QUALITY Analysis:
  - Quality Score: ${analysisReport.qualityMetrics.score}/100 (Grade: ${analysisReport.qualityMetrics.grade})
  - Total Issues: ${analysisReport.qualityMetrics.totalIssues}
  - Unused Exports: ${analysisReport.unusedExports.totalUnused}
  - Dead Code Files: ${analysisReport.orphanFiles.deadCodeCount}
  - Critical Hotspots: ${analysisReport.hotspots.criticalCount}
  - Circular Dependencies: ${analysisReport.circularFunctionDeps.total}
  - Recommendations: ${analysisReport.recommendations.total}

ðŸ§  SEMANTIC ANALYSIS (Phase 3.5):
  - Shared state connections: ${enhancedSystemMap.connections.sharedState.length}
  - Event listener connections: ${enhancedSystemMap.connections.eventListeners.length}
  - Total semantic connections: ${enhancedSystemMap.connections.total}
  - High-risk files: ${enhancedSystemMap.riskAssessment.report.summary.highCount + enhancedSystemMap.riskAssessment.report.summary.criticalCount}
  - Average risk score: ${enhancedSystemMap.riskAssessment.report.summary.averageScore}

âš ï¸  SEMANTIC ISSUES DETECTED:
  - Total issues: ${enhancedSystemMap.semanticIssues.stats?.totalIssues || 0}
  - High severity: ${enhancedSystemMap.semanticIssues.stats?.bySeverity?.high || 0}
  - Medium severity: ${enhancedSystemMap.semanticIssues.stats?.bySeverity?.medium || 0}
  - Low severity: ${enhancedSystemMap.semanticIssues.stats?.bySeverity?.low || 0}

ðŸ’¾ STORAGE:
  - Monolithic JSON: .OmnySysData/${enhancedOutputPath} (${(JSON.stringify(enhancedSystemMap).length / 1024).toFixed(2)} KB)
  - Partitioned data: .OmnySysData/ directory (${partitionedPaths.files.length} files)
  - Query API available via query-service.js
      `);
}
