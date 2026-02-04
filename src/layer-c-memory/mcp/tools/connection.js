/**
 * Tool: explain_connection
 * Explains why two files are connected
 */

import { getAllConnections, getFileAnalysis } from '../../../layer-a-static/storage/query-service.js';

export async function explain_connection(args, context) {
  const { fileA, fileB } = args;
  const { orchestrator, projectPath } = context;
  
  console.error(`[Tool] explain_connection("${fileA}", "${fileB}")`);

  // Ensure both files are analyzed
  let fileDataA = await getFileAnalysis(projectPath, fileA);
  if (!fileDataA) {
    await orchestrator.analyzeAndWait(fileA, 60000);
  }
  
  let fileDataB = await getFileAnalysis(projectPath, fileB);
  if (!fileDataB) {
    await orchestrator.analyzeAndWait(fileB, 60000);
  }

  const connections = await getAllConnections(projectPath);

  const relevant = connections.sharedState
    ?.filter(
      (c) =>
        (c.sourceFile === fileA && c.targetFile === fileB) ||
        (c.sourceFile === fileB && c.targetFile === fileA)
    )
    .slice(0, 5);

  if (!relevant || relevant.length === 0) {
    return {
      fileA,
      fileB,
      connected: false,
      reason: 'No direct connections found'
    };
  }

  return {
    fileA,
    fileB,
    connected: true,
    connections: relevant.map((c) => ({
      type: c.type,
      property: c.globalProperty,
      reason: c.reason,
      severity: c.severity
    }))
  };
}
