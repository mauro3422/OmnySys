import { createLogger } from '#utils/logger.js';
import { detectArchitecturalPattern } from './architectural-pattern-detector.js';
import { analyzeDirectoryStructure, validateFileLocation, detectFileType } from './directory-structure-analyzer.js';
import { getRecommendation } from './recommendations/RecommendationEngine.js';
import {
  loadCouplingRows,
  loadDistinctFilePaths,
  loadDuplicateRows,
  loadPatternAtoms
} from './architectural-debt-score-repository.js';

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

export async function calculatePatternScore(projectPath, repo) {
  const issues = [];
  let totalAtoms = 0;
  let problematicAtoms = 0;

  try {
    const atoms = loadPatternAtoms(repo);
    if (atoms.length > 0) {

      totalAtoms = atoms.length;

      for (const atom of atoms) {
        const metadata = {
          filePath: atom.file_path,
          name: atom.name,
          complexity: atom.complexity,
          isExported: atom.is_exported === 1,
          semanticFingerprint: atom.fingerprint
        };

        const pattern = detectArchitecturalPattern(metadata);

        if (pattern.patterns.length > 0 && pattern.severity !== 'low') {
          problematicAtoms++;

          for (const rec of pattern.recommendations) {
            issues.push({
              type: pattern.primaryPattern || 'architectural_issue',
              file: metadata.filePath,
              symbol: metadata.name,
              severity: pattern.severity,
              recommendation: rec.message,
              suggestedStructure: rec.suggestedStructure
            });
          }
        }
      }
    }
  } catch (err) {
    logger.error(`[calculatePatternScore] Error analyzing architectural patterns: ${err.message}`);
  }

  const problematicRatio = totalAtoms > 0 ? problematicAtoms / totalAtoms : 0;
  const normalized = Math.min(100, Math.round(problematicRatio * 200));

  return {
    normalized,
    issues,
    details: {
      totalAtoms,
      problematicAtoms,
      problematicRatio: Math.round(problematicRatio * 100 * 100) / 100
    }
  };
}

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
