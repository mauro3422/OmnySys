import { getPipelineFieldCoverageContext } from './pipeline-health-context.js';
import {
  PIPELINE_FIELD_COVERAGE_SIGNALS,
  classifyFieldCoverage
} from './signal-coverage-helpers.js';
import { summarizeCentralityCoverageRow } from './signal-coverage-aggregations-rows.js';

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
