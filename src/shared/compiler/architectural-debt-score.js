/**
 * @fileoverview architectural-debt-score.js
 *
 * Calcula score de deuda arquitectónica (0-100) basado en:
 * - Organización de directorios (files en lugar incorrecto)
 * - Patrones arquitectónicos (God Objects, Orphan Modules)
 * - Acoplamiento excesivo
 * - Duplicación conceptual y estructural
 *
 * Score: 0 = arquitectura perfecta, 100 = deuda máxima
 *
 * @module shared/compiler/architectural-debt-score
 */

import { createLogger } from '#utils/logger.js';
import { CATEGORY_WEIGHTS, getSeverityLevel, sortIssuesBySeverityAndLocation } from './architectural-debt-score-helpers.js';
import {
  calculateDirectoryStructureScore,
  calculatePatternScore,
  calculateCouplingScore,
  calculateDuplicationScore
} from './architectural-debt-score/calculators/index.js';
import { analyzeDirectoryStructure } from './directory-structure-analyzer.js';

const logger = createLogger('OmnySys:ArchitecturalDebtScore');

export async function calculateArchitecturalDebtScore(projectPath, repo) {
  logger.info('[calculateArchitecturalDebtScore] Starting architectural debt analysis');

  const conventions = analyzeDirectoryStructure(projectPath, repo);
  const directoryScore = await calculateDirectoryStructureScore(projectPath, repo, conventions);
  const patternScore = await calculatePatternScore(projectPath, repo);
  const couplingScore = await calculateCouplingScore(projectPath, repo);
  const duplicationScore = await calculateDuplicationScore(projectPath, repo);

  const overallScore = Math.round(
    directoryScore.normalized * CATEGORY_WEIGHTS.directoryStructure +
    patternScore.normalized * CATEGORY_WEIGHTS.patterns +
    couplingScore.normalized * CATEGORY_WEIGHTS.coupling +
    duplicationScore.normalized * CATEGORY_WEIGHTS.duplication
  );

  const level = getSeverityLevel(overallScore);

  const topIssues = sortIssuesBySeverityAndLocation([
    ...directoryScore.issues,
    ...patternScore.issues,
    ...couplingScore.issues,
    ...duplicationScore.issues
  ]);

  logger.info(`[calculateArchitecturalDebtScore] Overall score: ${overallScore}/100 (${level})`);

  return {
    overallScore,
    level,
    breakdown: {
      directoryStructure: {
        score: directoryScore.normalized,
        issues: directoryScore.issues.length,
        details: directoryScore.details
      },
      patterns: {
        score: patternScore.normalized,
        issues: patternScore.issues.length,
        details: patternScore.details
      },
      coupling: {
        score: couplingScore.normalized,
        issues: couplingScore.issues.length,
        details: couplingScore.details
      },
      duplication: {
        score: duplicationScore.normalized,
        issues: duplicationScore.issues.length,
        details: duplicationScore.details
      }
    },
    topIssues: topIssues.slice(0, 10),
    totalIssues: topIssues.length,
    categoryWeights: CATEGORY_WEIGHTS,
    calculatedAt: new Date().toISOString()
  };
}

export default calculateArchitecturalDebtScore;
export { getSeverityLevel };
