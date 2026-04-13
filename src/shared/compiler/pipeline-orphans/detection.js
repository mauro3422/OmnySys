import { getRecommendation } from '../recommendations/RecommendationEngine.js';

const MANUAL_ORPHAN_PATTERNS = [
  /(called_by_json|calls_json|callers_count|callees_count)/,
  /(pipeline_orphans|orphanFunctions|patternCondition|fileLevelImportEvidence|disconnected pipeline)/i
];

const CANONICAL_ORPHAN_RESOURCES = [
  /getPipelineOrphanSummary/,
  /classifyPipelineOrphans/,
  /pipelineOrphanSummary\.(orphans|warning|normalizedOrphans)/
];

const INTENTIONALLY_DORMANT_PIPELINE_PATHS = [
  /^src\/layer-b-semantic\/llm-analyzer\//
];

export function detectPipelineOrphanDrift(source = '', filePath = '') {
  const findings = [];
  const hasManualLogic = MANUAL_ORPHAN_PATTERNS.every((pattern) => pattern.test(source));
  const hasCanonicalUse = CANONICAL_ORPHAN_RESOURCES.some((pattern) => pattern.test(source));

  if (hasManualLogic && !hasCanonicalUse && !filePath.endsWith('/pipeline-orphans.js')) {
    findings.push({
      rule: 'manual_pipeline_orphan_scan',
      severity: 'medium',
      policyArea: 'pipeline_orphans',
      message: 'Manual pipeline orphan classification detected',
      recommendation: getRecommendation({ type: 'pipeline_orphan' }).message
    });
  }

  return findings;
}

export function classifyPipelineOrphans(rows = [], options = {}) {
  const { limit = 20 } = options;
  return rows
    .filter((row) => {
      const effectiveCallers = Number(row?.callers_count || 0);
      if (effectiveCallers > 0) return false;
      if (typeof row?.file_path !== 'string' || row.file_path.startsWith('tests/') || row.file_path.startsWith('scripts/') || row.file_path.startsWith('src/shared/compiler/')) return false;
      if (INTENTIONALLY_DORMANT_PIPELINE_PATHS.some((pattern) => pattern.test(row.file_path))) return false;
      if (Math.max(Number(row?.dependency_importer_count) || 0, Number(row?.file_importer_count) || 0, Number(row?.barrel_exporter_count) || 0) > 0) return false;
      if ((row?.callees_count || 0) > 0) return false;
      return true;
    })
    .slice(0, limit);
}

export function getEffectiveCallerCount(atomRow = {}) {
  if ((atomRow?.callers_count || 0) > 0) {
    return atomRow.callers_count;
  }

  return 0;
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
    Number(atomRow?.file_importer_count) || 0,
    Number(atomRow?.barrel_exporter_count) || 0
  ) > 0;
}

export function isLikelyDisconnectedPipelineAtom(atomRow = {}) {
  const effectiveCallers = getEffectiveCallerCount(atomRow);
  if (effectiveCallers > 0) return false;
  if (!isPipelineProductionFile(atomRow.file_path)) return false;
  if (INTENTIONALLY_DORMANT_PIPELINE_PATHS.some((pattern) => pattern.test(atomRow.file_path || ''))) return false;
  if (hasFileLevelImportEvidence(atomRow)) return false;
  if ((atomRow?.callees_count || 0) > 0) return false;
  return true;
}
