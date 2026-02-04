/**
 * Tool: get_impact_map
 * Returns a complete impact map for a file
 */

import { getFileAnalysis, getFileDependencies } from '../../../layer-a-static/storage/query-service.js';

export async function get_impact_map(args, context) {
  const { filePath } = args;
  const { orchestrator, projectPath } = context;
  
  console.error(`[Tool] get_impact_map("${filePath}")`);

  // Check if analyzed
  let fileData = await getFileAnalysis(projectPath, filePath);
  
  if (!fileData) {
    // Auto-analyze with CRITICAL priority
    console.error(`  → File not analyzed, queueing as CRITICAL`);
    
    try {
      await orchestrator.analyzeAndWait(filePath, 60000);
      console.error(`  → Analysis completed`);
    } catch (error) {
      return {
        status: 'analyzing',
        message: `File "${filePath}" is being analyzed as CRITICAL priority.`,
        estimatedTime: '30-60 seconds',
        suggestion: 'Please retry this query in a moment.'
      };
    }
  }

  // Get fresh data after analysis
  const deps = await getFileDependencies(projectPath, filePath);
  fileData = await getFileAnalysis(projectPath, filePath);

  return {
    file: filePath,
    directlyAffects: deps.usedBy || [],
    transitiveAffects: deps.transitiveDependents || [],
    semanticConnections: fileData?.semanticConnections || [],
    totalAffected:
      (deps.usedBy?.length || 0) +
      (deps.transitiveDependents?.length || 0) +
      (fileData?.semanticConnections?.length || 0),
    riskLevel: fileData?.riskScore?.severity || 'unknown',
    subsystem: fileData?.subsystem
  };
}
