import { createLogger } from '#utils/logger.js';
import { loadCouplingRows } from './architectural-debt-score-repository.js';
import { getRecommendation } from './recommendations/RecommendationEngine.js';

const logger = createLogger('OmnySys:ArchitecturalDebtScore');

export async function calculateCouplingScore(projectPath, repo) {
  const issues = [];
  let totalFiles = 0;
  let highCouplingFiles = 0;

  try {
    const files = loadCouplingRows(repo);
    if (files.length > 0) {
      totalFiles = files.length;
      highCouplingFiles = files.length;

      for (const file of files) {
        issues.push({
          type: 'high_coupling',
          file: file.file_path,
          severity: 'medium',
          importCount: file.importCount,
          recommendation: getRecommendation({
            type: 'high_coupling',
            filePath: file.file_path,
            context: { importCount: file.importCount }
          }).message
        });
      }
    }
  } catch (err) {
    logger.error(`[calculateCouplingScore] Error analyzing coupling: ${err.message}`);
  }

  const highCouplingRatio = totalFiles > 0 ? highCouplingFiles / totalFiles : 0;
  const normalized = Math.round(highCouplingRatio * 100);

  return {
    normalized,
    issues,
    details: {
      totalFiles,
      highCouplingFiles,
      highCouplingRatio: Math.round(highCouplingRatio * 100 * 100) / 100
    }
  };
}
