/**
 * @fileoverview analyzer.js
 * Comprehensive system analysis logic
 */
const { getFileAnalysis, getFileAnalysisWithAtoms } = await import(
  '../../src/layer-c-memory/query/apis/file-api.js'
);
const { needsLLMAnalysis, computeMetadataCompleteness } = await import(
  '../../src/layer-b-semantic/llm-analyzer/analysis-decider.js'
);

export async function performFullSystemScan(rootPath, filePaths) {
  const stats = {
    total: filePaths.length,
    withAtoms: 0,
    withUsedBy: 0,
    totalAtoms: 0,
    totalCalledBy: 0,
    needsLLM: 0,
    bypassLLM: 0,
    avgMetadataScore: 0,
    lowScoreFiles: []
  };

  for (const filePath of filePaths) {
    try {
      const fileAnalysis = await getFileAnalysis(rootPath, filePath);
      if (!fileAnalysis) continue;

      const atomCount = fileAnalysis.atomIds?.length || fileAnalysis.atoms?.length || 0;
      stats.totalAtoms += atomCount;
      if (atomCount > 0) stats.withAtoms++;
      if ((fileAnalysis.usedBy || []).length > 0) stats.withUsedBy++;

      const { score } = computeMetadataCompleteness(fileAnalysis);
      stats.avgMetadataScore += score;

      const needsLLM = needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
      if (needsLLM) stats.needsLLM++;
      else stats.bypassLLM++;

      const fScore = calculateSystemScore(atomCount, (fileAnalysis.usedBy || []).length, score);
      if (fScore < 40) stats.lowScoreFiles.push({ filePath, score: fScore });

    } catch {}
  }

  stats.avgMetadataScore = stats.total > 0 ? (stats.avgMetadataScore / stats.total) : 0;
  return stats;
}

export function calculateSystemScore(atoms, usedBy, metadataScore) {
  let score = 0;
  if (atoms > 0) score += 40;
  if (usedBy > 0) score += 20;
  if (metadataScore >= 0.75) score += 40;
  else if (metadataScore >= 0.5) score += 20;
  return score;
}
