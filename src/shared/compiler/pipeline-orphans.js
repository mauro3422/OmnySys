/**
 * @fileoverview Canonical heuristics, reporting, and remediation for exported
 * pipeline atoms that look disconnected from the live graph.
 *
 * @module shared/compiler/pipeline-orphans
 */

import { getFileImportEvidenceCoverage } from './file-import-evidence.js';
import {
  classifyPipelineOrphans,
  detectPipelineOrphanDrift,
  getEffectiveCallerCount,
  hasFileLevelImportEvidence,
  isLikelyDisconnectedPipelineAtom,
  isPipelineProductionFile
} from './pipeline-orphans-detection.js';
import {
  getPipelineNamePatternSqlCondition,
  getPipelineOrphanCandidates,
  normalizePipelineOrphan
} from './pipeline-orphans-candidates.js';
import {
  buildPipelineOrphanRemediation,
  buildPipelineOrphanRemediationPlan
} from './pipeline-orphans-remediation.js';

export const PIPELINE_ORPHAN_NAME_PATTERNS = ['persist', 'analyze', 'compute', 'calculate', 'build', 'generate', 'process', 'index'];

export {
  getEffectiveCallerCount,
  isPipelineProductionFile,
  hasFileLevelImportEvidence,
  isLikelyDisconnectedPipelineAtom,
  getPipelineNamePatternSqlCondition,
  normalizePipelineOrphan,
  classifyPipelineOrphans,
  detectPipelineOrphanDrift,
  getPipelineOrphanCandidates,
  buildPipelineOrphanRemediation,
  buildPipelineOrphanRemediationPlan
};

export function getPipelineOrphanSummary(db, options = {}) {
  const {
    candidateLimit = 50,
    orphanLimit = 20,
    minComplexity = 3
  } = options;

  const fileImportCoverage = getFileImportEvidenceCoverage(db);
  const candidates = getPipelineOrphanCandidates(db, {
    limit: candidateLimit,
    minComplexity
  });
  const orphans = fileImportCoverage.trustworthy
    ? classifyPipelineOrphans(candidates, { limit: orphanLimit })
    : [];

  const lowConfidenceWarning = !fileImportCoverage.trustworthy && candidates.length > 0
    ? {
      field: 'pipeline_orphans',
      coverage: `${Math.round(fileImportCoverage.coverageRatio * 100)}% file import coverage`,
      issue: 'Pipeline orphan detection is suppressed because file-level import evidence is too sparse to trust.'
    }
    : null;

  return {
    fileImportCoverage,
    totalCandidates: candidates.length,
    orphanCount: orphans.length,
    warning: lowConfidenceWarning || (orphans.length > 0
      ? {
        field: 'pipeline_orphans',
        coverage: `${orphans.length} atoms`,
        issue: 'Exported pipeline atoms appear disconnected after filtering import-backed modules'
      }
      : null),
    orphans,
    normalizedOrphans: orphans.map(normalizePipelineOrphan)
  };
}
