/**
 * @fileoverview Canonical heuristics, reporting, and remediation for exported 
 * pipeline atoms that look disconnected from the live graph.
 *
 * @module shared/compiler/pipeline-orphans
 */

import { getFileImportEvidenceCoverage } from './file-import-evidence.js';
import {
  buildStandardPlan,
  buildStandardItem
} from './remediation-plan-builder.js';

const MANUAL_ORPHAN_PATTERNS = [
  /(called_by_json|calls_json|callers_count|callees_count)/,
  /(pipeline_orphans|orphanFunctions|patternCondition|fileLevelImportEvidence|disconnected pipeline)/i
];

const CANONICAL_ORPHAN_RESOURCES = [
  /getPipelineOrphanSummary/,
  /classifyPipelineOrphans/,
  /pipelineOrphanSummary\.(orphans|warning|normalizedOrphans)/
];

export const PIPELINE_ORPHAN_NAME_PATTERNS = [
  'persist',
  'analyze',
  'compute',
  'calculate',
  'build',
  'generate',
  'process',
  'index'
];

export function getEffectiveCallerCount(atomRow = {}) {
  if ((atomRow?.callers_count || 0) > 0) {
    return atomRow.callers_count;
  }

  if (!atomRow?.called_by_json || atomRow.called_by_json === '[]') {
    return 0;
  }

  try {
    const parsed = JSON.parse(atomRow.called_by_json);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function isPipelineProductionFile(filePath = '') {
  return typeof filePath === 'string'
    && !filePath.startsWith('tests/')
    && !filePath.startsWith('scripts/')
    && !filePath.startsWith('src/shared/compiler/');
}

export function hasFileLevelImportEvidence(atomRow = {}) {
  return Math.max(
    Number(atomRow?.dependency_importer_count) || 0,
    Number(atomRow?.file_importer_count) || 0
  ) > 0;
}

export function isLikelyDisconnectedPipelineAtom(atomRow = {}) {
  const effectiveCallers = getEffectiveCallerCount(atomRow);
  if (effectiveCallers > 0) return false;
  if (!isPipelineProductionFile(atomRow.file_path)) return false;
  if (hasFileLevelImportEvidence(atomRow)) return false;
  if ((atomRow?.callees_count || 0) > 0) return false;
  return true;
}

export function getPipelineNamePatternSqlCondition(columnName = 'name') {
  return PIPELINE_ORPHAN_NAME_PATTERNS
    .map(pattern => `${columnName} LIKE '%${pattern}%'`)
    .join(' OR ');
}

export function normalizePipelineOrphan(atomRow = {}) {
  return {
    name: atomRow.name,
    file: atomRow.file_path,
    complexity: atomRow.complexity,
    diagnosis: 'Exported pipeline atom with no effective callers — likely disconnected'
  };
}

export function classifyPipelineOrphans(rows = [], options = {}) {
  const { limit = 20 } = options;
  return rows
    .filter(isLikelyDisconnectedPipelineAtom)
    .slice(0, limit);
}

/**
 * Detecta si un código está reimplementando lógica de clasificación de 
 * pipeline orphans de forma manual.
 * @param {string} source - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Array} Findings de deriva
 */
export function detectPipelineOrphanDrift(source = '', filePath = '') {
  const findings = [];
  const hasManualLogic = MANUAL_ORPHAN_PATTERNS.every(p => p.test(source));
  const hasCanonicalUse = CANONICAL_ORPHAN_RESOURCES.some(p => p.test(source));

  if (hasManualLogic && !hasCanonicalUse && !filePath.endsWith('/pipeline-orphans.js')) {
    findings.push({
      rule: 'manual_pipeline_orphan_scan',
      severity: 'medium',
      policyArea: 'pipeline_orphans',
      message: 'Manual pipeline orphan classification detected',
      recommendation: 'Use classifyPipelineOrphans / getPipelineOrphanSummary from shared/compiler instead of rebuilding orphan heuristics inline.'
    });
  }

  return findings;
}

export function getPipelineOrphanCandidates(db, options = {}) {
  const {
    limit = 50,
    minComplexity = 3
  } = options;

  const patternCondition = getPipelineNamePatternSqlCondition('name');

  return db.prepare(`
    SELECT
        a.id,
        a.name,
        a.file_path,
        a.atom_type,
        a.callers_count,
        a.callees_count,
        a.called_by_json,
        a.complexity,
        a.is_phase2_complete,
        (
          SELECT COUNT(*)
          FROM files f
          WHERE f.path != a.file_path
            AND f.imports_json LIKE '%' || a.file_path || '%'
        ) AS file_importer_count,
        (
          SELECT COUNT(*)
          FROM file_dependencies fd
          WHERE fd.target_path = a.file_path
            AND fd.source_path != a.file_path
        ) AS dependency_importer_count
    FROM atoms a
    WHERE a.is_exported = 1
      AND a.atom_type IN ('function', 'arrow', 'method', 'class')
      AND a.is_test_callback = 0
      AND a.is_phase2_complete = 1
      AND a.file_path NOT LIKE 'tests/%'
      AND a.file_path NOT LIKE 'scripts/%'
      AND (${patternCondition})
      AND a.complexity > ?
    ORDER BY a.complexity DESC
    LIMIT ?
  `).all(minComplexity, limit);
}

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

function getRemediationActions(orphan = {}) {
  const importerCount = Math.max(
    Number(orphan?.dependency_importer_count) || 0,
    Number(orphan?.file_importer_count) || 0
  );
  const actions = [
    'Verify whether the export is still referenced by a production entrypoint.'
  ];

  if ((orphan?.complexity || 0) >= 12) {
    actions.push('Review whether the atom was copied during a refactor and left behind.');
  }

  if ((orphan?.callees_count || 0) === 0) {
    actions.push('Check whether the atom should be inlined, deleted, or wired into the pipeline graph.');
  }

  if (importerCount === 0) {
    actions.push('Confirm whether the file itself is imported anywhere in production code.');
  }

  return actions;
}

export function buildPipelineOrphanRemediation(orphan = {}) {
  const importerCount = Math.max(
    Number(orphan?.dependency_importer_count) || 0,
    Number(orphan?.file_importer_count) || 0
  );
  return buildStandardItem({
    name: orphan.name,
    file: orphan.file_path,
    diagnosis: 'Pipeline atom appears disconnected from both function-level and file-level reachability.',
    actions: getRemediationActions(orphan),
    complexity: orphan.complexity,
    effectiveCallers: orphan.callers_count || 0,
    callees: orphan.callees_count || 0,
    fileImporters: importerCount
  });
}

export function buildPipelineOrphanRemediationPlan(orphans = []) {
  return buildStandardPlan({
    total: orphans.length,
    items: orphans.map(buildPipelineOrphanRemediation),
    recommendation: 'Review pipeline orphan candidates before deleting or rewiring them.',
    emptyRecommendation: 'No disconnected pipeline atoms detected.'
  });
}
