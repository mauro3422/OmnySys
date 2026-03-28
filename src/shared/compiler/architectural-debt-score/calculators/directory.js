import { createLogger } from '#utils/logger.js';
import { loadDistinctFilePaths } from '../../architectural-debt-score-repository.js';
import { detectFileType, validateFileLocation } from '../../directory-structure-analyzer.js';
import {
  buildFolderizationCandidateReport,
  findFolderizationCandidatesFromRepo
} from '../../directory-structure-folderization.js';
import { getRecommendation } from '../../recommendations/RecommendationEngine.js';

const logger = createLogger('OmnySys:ArchitecturalDebtScore');

export async function calculateDirectoryStructureScore(projectPath, repo, conventions) {
  const issues = [];
  let totalFiles = 0;
  let filesInWrongPlace = 0;
  let folderizationCandidateCount = 0;
  let folderizationCandidateReport = {
    candidateCount: 0,
    topCandidates: []
  };

  try {
    const files = loadDistinctFilePaths(repo);
    if (files.length > 0) {
      totalFiles = files.length;
      const folderizationCandidates = findFolderizationCandidatesFromRepo(repo);
      folderizationCandidateReport = buildFolderizationCandidateReport(folderizationCandidates);
      folderizationCandidateCount = folderizationCandidates.length;

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

      for (const candidate of folderizationCandidates) {
        const severity = candidate.fileCount >= 6 ? 'medium' : 'low';
        issues.push({
          type: 'flat_family_sprawl',
          file: candidate.files[0],
          severity,
          familyRoot: candidate.familyRoot,
          directory: candidate.directory,
          recommendedFolder: candidate.recommendedFolder,
          barrelFile: candidate.barrelFile?.path || null,
          confidence: candidate.confidence,
          fileCount: candidate.fileCount,
          files: candidate.files,
          recommendation: getRecommendation({
            type: 'flat_family_sprawl',
            filePath: candidate.files[0],
            context: {
              familyRoot: candidate.familyRoot,
              directory: candidate.directory,
              fileCount: candidate.fileCount,
              recommendedFolder: candidate.recommendedFolder,
              barrelFile: candidate.barrelFile?.path || null,
              confidence: candidate.confidence
            }
          }).message
        });
      }

      if (folderizationCandidateReport.topCandidates.length > 0) {
        const topCandidate = folderizationCandidateReport.topCandidates[0];
        issues.push({
          type: 'folderization_candidates',
          file: topCandidate.members[0] || topCandidate.recommendedFolder,
          severity: topCandidate.confidence >= 70 ? 'medium' : 'low',
          recommendation: topCandidate.recommendedFolder,
          candidates: folderizationCandidateReport.topCandidates
        });
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
      wrongPlaceRatio: Math.round(wrongPlaceRatio * 100 * 100) / 100,
      folderizationCandidateCount,
      folderizationCandidateReport
    }
  };
}
