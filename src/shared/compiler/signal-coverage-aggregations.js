import { getPipelineFieldCoverageContext } from './pipeline-health-context.js';
import { getRecommendation } from './recommendations/RecommendationEngine.js';
import {
  DERIVED_SCORE_SIGNALS,
  PIPELINE_FIELD_COVERAGE_SIGNALS,
  classifyFieldCoverage,
  getNetworkFlaggedCandidates,
  getNetworkCandidates,
  getSharedStateCandidates,
  isProductionCandidate,
  getSignalValue,
  summarizeFieldCoverageRow
} from './signal-coverage-helpers.js';

export function summarizeDerivedScoreCoverage(atoms = [], options = {}) {
  const { filePath = '' } = options;
  const candidates = atoms.filter((atom) => isProductionCandidate(atom, filePath));
  const primarySignals = DERIVED_SCORE_SIGNALS.filter((signal) =>
    signal.name === 'fragility' || signal.name === 'coupling' || signal.name === 'cohesion'
  );

  const missingAtoms = candidates.filter((atom) =>
    primarySignals.every((signal) => getSignalValue(atom, signal) === 0)
  );

  return {
    candidates,
    candidateCount: candidates.length,
    missingAtoms,
    missingCount: missingAtoms.length,
    missingRatio: candidates.length > 0 ? Number((missingAtoms.length / candidates.length).toFixed(3)) : 0,
    sampleAtoms: missingAtoms.slice(0, 5).map((atom) => atom.name).filter(Boolean)
  };
}

export function summarizeSemanticCoverage(atoms = [], options = {}) {
  const { filePath = '', sharesStateRelations = 0 } = options;
  const candidates = atoms.filter((atom) => isProductionCandidate(atom, filePath));
  const networkCandidates = getNetworkCandidates(candidates);
  const networkFlagged = getNetworkFlaggedCandidates(networkCandidates);
  const sharedStateCandidates = getSharedStateCandidates(candidates);

  const gaps = [];
  if (networkCandidates.length > 0 && networkFlagged.length === 0) {
    gaps.push({
      kind: 'network_coverage',
      message: `${networkCandidates.length} atom(s) look network-bound but none were flagged as hasNetworkCalls`
    });
  }
  if (sharedStateCandidates.length > 0 && sharesStateRelations === 0) {
    gaps.push({
      kind: 'shared_state_coverage',
      message: `${sharedStateCandidates.length} atom(s) touch shared-state patterns but no shares_state relations were persisted`
    });
  }

  return {
    candidates,
    networkCandidates,
    networkFlagged,
    sharedStateCandidates,
    sharesStateRelations,
    gaps,
    severity: gaps.length > 1 || networkCandidates.length >= 3 ? 'high' : 'medium'
  };
}

export function summarizePhysicsCoverageRow(row = {}) {
  const total = Number(row.total) || 0;
  const coverage = {};
  const missingSignals = [];

  for (const signal of DERIVED_SCORE_SIGNALS) {
    const nonZero = Number(row[`${signal.name}_nonzero`]) || 0;
    coverage[`${signal.name}Pct`] = total > 0 ? Math.round((nonZero / total) * 100) : 0;
    if (nonZero === 0 && ['fragility', 'coupling', 'cohesion'].includes(signal.name)) {
      missingSignals.push(signal.name);
    }
  }

  return { total, coverage, missingSignals };
}

export function summarizeCentralityCoverageRow(row = {}, options = {}) {
  return summarizeFieldCoverageRow(row, 'centrality', options);
}

export function collectPipelineFieldCoverageFindings({ db, phase2PendingFiles = 0 } = {}) {
  const graphMetricFields = new Set(['coupling_score', 'cohesion_score', 'centrality_score']);
  const zeroFields = [];
  const issues = [];
  const warnings = [];

  if (!db) {
    return { zeroFields, issues, warnings };
  }

  for (const { field, description, minWarningCoverage = 5 } of PIPELINE_FIELD_COVERAGE_SIGNALS) {
    try {
      const { whereClause, descriptionSuffix } = getPipelineFieldCoverageContext(field);
      const scopedTotal = db.prepare(`SELECT COUNT(*) as total FROM atoms ${whereClause}`).get()?.total || 0;
      if (scopedTotal === 0) continue;

      const nonZeroCount = db.prepare(
        `SELECT SUM(CASE WHEN ${field} != 0 AND ${field} IS NOT NULL THEN 1 ELSE 0 END) as nonzero FROM atoms ${whereClause}`
      ).get()?.nonzero || 0;

      const coverage = field === 'centrality_score'
        ? summarizeCentralityCoverageRow(
          { total: scopedTotal, centrality_nonzero: nonZeroCount },
          { minWarningCoverage, description, descriptionSuffix }
        )?.classification
        : classifyFieldCoverage({
          total: scopedTotal,
          nonZeroCount,
          minWarningCoverage,
          description,
          descriptionSuffix
        });

      if (!coverage || coverage.level === 'ok') continue;

      if (coverage.level === 'issue' && phase2PendingFiles > 0 && graphMetricFields.has(field)) {
        warnings.push({
          field,
          coverage: '0%',
          nonZeroCount,
          issue: `Phase 2 still settling - ${description}`
        });
        continue;
      }

      if (coverage.level === 'issue') {
        issues.push({ field, coverage: '0%', nonZeroCount, issue: coverage.issue });
        zeroFields.push(field);
      } else if (coverage.level === 'warning') {
        warnings.push({ field, coverage: `${coverage.coveragePct}%`, nonZeroCount, issue: coverage.issue });
      }
    } catch {
      // Missing or incompatible field surfaces are handled as absent coverage.
    }
  }

  return { zeroFields, issues, warnings };
}
