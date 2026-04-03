import { createHash } from 'node:crypto';
import { normalizeSnapshotPath } from '../../../shared/compiler/index.js';
import {
  buildTechnicalDebtReportValues,
  persistTechnicalDebtReportWithValues
} from './technical-debt-report-cache-helpers.js';

export const TECHNICAL_DEBT_SNAPSHOT_KIND = 'technical_debt';

export function buildTechnicalDebtFingerprint({ projectPath, scopePath, focusPath, currentSnapshot } = {}) {
  return createHash('sha1')
    .update(JSON.stringify({
      projectPath: projectPath || null,
      scopePath: normalizeSnapshotPath(scopePath),
      focusPath: normalizeSnapshotPath(focusPath),
      currentSnapshotFingerprint: currentSnapshot?.snapshotFingerprint || null,
      currentSummaryText: currentSnapshot?.summaryText || null
    }))
    .digest('hex')
    .slice(0, 16);
}

function parseReportRow(row = null) {
  if (!row) {
    return null;
  }

  let payload = null;
  try {
    payload = row.payload_json ? JSON.parse(row.payload_json) : null;
  } catch {
    payload = null;
  }

  return {
    capturedAt: row.captured_at || null,
    fingerprint: payload?.fingerprint || row.snapshot_fingerprint || null,
    report: payload?.report || null,
    summary: payload?.summary || null,
    currentSnapshot: payload?.currentSnapshot || null
  };
}

export function loadCachedTechnicalDebtReport(db, { projectPath, scopePath, focusPath } = {}) {
  if (!db?.prepare) {
    return null;
  }

  try {
    const row = db.prepare(`
      SELECT captured_at, snapshot_fingerprint, summary_text, payload_json
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
      ORDER BY captured_at DESC
      LIMIT 1
    `).get(
      projectPath || null,
      TECHNICAL_DEBT_SNAPSHOT_KIND,
      normalizeSnapshotPath(scopePath),
      normalizeSnapshotPath(focusPath)
    ) || null;

    return parseReportRow(row);
  } catch {
    return null;
  }
}

export function buildEmptyDuplicatesResult() {
  return {
    duplicates: {
      summary: {
        duplicateGroups: 0,
        totalDuplicateInstances: 0
      }
    },
    remediation: {
      items: []
    }
  };
}

export function buildEmptyConceptualResult() {
  return {
    summary: {
      actionableGroups: 0,
      actionableImplementations: 0,
      rawGroups: 0,
      rawImplementations: 0,
      highRisk: 0,
      noiseByClass: {},
      chestDistribution: {}
    },
    groups: []
  };
}

export function buildEmptyPipelineHealthResult() {
  return {
    healthScore: 100,
    grade: 'A',
    orphanPipelineFunctions: []
  };
}

export function persistTechnicalDebtReport(db, {
  projectPath,
  scopePath,
  focusPath,
  currentSnapshot,
  report,
  fingerprint
} = {}) {
  if (!db?.prepare || !currentSnapshot || !report) {
    return null;
  }

  try {
    const values = buildTechnicalDebtReportValues({
      projectPath,
      scopePath,
      focusPath,
      currentSnapshot,
      report,
      fingerprint
    });
    return persistTechnicalDebtReportWithValues(db, values);
  } catch {
    return null;
  }
}
