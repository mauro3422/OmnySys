import { createLogger } from '#utils/logger.js';
import { loadDuplicateRows } from '../../architectural-debt-score-repository.js';
import { getRecommendation } from '../../recommendations/RecommendationEngine.js';

const logger = createLogger('OmnySys:ArchitecturalDebtScore');

export async function calculateDuplicationScore(projectPath, repo) {
  const issues = [];
  let duplicateGroups = 0;
  let duplicateImplementations = 0;

  try {
    const duplicates = loadDuplicateRows(repo);
    if (duplicates.length > 0) {
      duplicateGroups = duplicates.length;
      duplicateImplementations = duplicates.reduce((sum, duplicate) => sum + duplicate.instanceCount, 0);

      for (const duplicate of duplicates.slice(0, 20)) {
        issues.push({
          type: 'conceptual_duplicate',
          semanticFingerprint: duplicate.fingerprint,
          instanceCount: duplicate.instanceCount,
          files: duplicate.files.split(','),
          severity: duplicate.instanceCount > 5 ? 'high' : 'medium',
          recommendation: getRecommendation({
            type: 'conceptual_duplicate',
            filePath: duplicate.files.split(',')[0],
            context: { instanceCount: duplicate.instanceCount }
          }).message
        });
      }
    }
  } catch (err) {
    logger.error(`[calculateDuplicationScore] Error analyzing duplication: ${err.message}`);
  }

  const normalized = Math.min(100, Math.round(duplicateGroups * 2));

  return {
    normalized,
    issues,
    details: {
      duplicateGroups,
      duplicateImplementations,
      avgInstancesPerGroup: duplicateGroups > 0 ? Math.round(duplicateImplementations / duplicateGroups * 100) / 100 : 0
    }
  };
}
