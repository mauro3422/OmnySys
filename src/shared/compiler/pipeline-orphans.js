/**
 * @fileoverview Canonical heuristics for exported pipeline atoms that look
 * disconnected from the live graph.
 *
 * @module shared/compiler/pipeline-orphans
 */

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
  return (atomRow?.file_importer_count || 0) > 0;
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
