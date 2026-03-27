import { createLogger } from '#utils/logger.js';
import { loadDistinctFilePaths } from './architectural-debt-score-repository.js';
import { detectFileType, validateFileLocation } from './directory-structure-analyzer.js';
import { getRecommendation } from './recommendations/RecommendationEngine.js';

const logger = createLogger('OmnySys:ArchitecturalDebtScore');

export async function calculateDirectoryStructureScore(projectPath, repo, conventions) {
  const issues = [];
  let totalFiles = 0;
  let filesInWrongPlace = 0;

  try {
    const files = loadDistinctFilePaths(repo);
    if (files.length > 0) {
      totalFiles = files.length;

      for (const file of files) {
        const filePath = file.file_path.replace(/\\/g, '/');
        const fileName = filePath.split('/').pop();
        const fileType = detectFileType(fileName);

        if (fileType && fileType !== 'other') {
          const validation = validateFileLocation(filePath, fileType, conventions);

          if (!validation.isCorrect) {
            filesInWrongPlace++;
            issues.push({
              type: 'file_in_wrong_directory',
              file: filePath,
              severity: 'low',
              expectedDirectory: validation.expectedDirectory,
              actualDirectory: validation.actualDirectory,
              recommendation: getRecommendation({
                type: 'file_in_wrong_directory',
                filePath,
                context: { expectedDirectory: validation.expectedDirectory }
              }).message
            });
          }
        }
      }
    }
  } catch (err) {
    logger.error(`[calculateDirectoryStructureScore] Error analyzing directory structure: ${err.message}`);
  }

  const wrongPlaceRatio = totalFiles > 0 ? filesInWrongPlace / totalFiles : 0;
  const normalized = Math.round(wrongPlaceRatio * 100);

  return {
    normalized,
    issues,
    details: {
      totalFiles,
      filesInWrongPlace,
      wrongPlaceRatio: Math.round(wrongPlaceRatio * 100 * 100) / 100
    }
  };
}
