import { getRecommendation } from '../recommendations/RecommendationEngine.js';

const MANUAL_LIVE_ROW_PATTERNS = [
  /(LEFT JOIN|NOT IN)\s+live_files/,
  /(staleFileRows|staleRiskRows|liveFileTotal|unassessedLiveFiles)/,
  /(daemon-owner-|ownerLockPath|OWNER_LOCK_PATH|readOwnerLock|writeOwnerLock|waitForExistingOwner|removeOwnerLock)/
];

const CANONICAL_LIVE_ROW_RESOURCES = [
  /getLiveRowDriftSummary/,
  /getStaleTableRowCount/,
  /getLiveFileTotal/,
  /getLiveFileSetSql/,
  /ensureLiveRowSync\s*\(/,
  /liveRowSync\.summary/
];

export function detectLiveRowDrift(source = '', filePath = '') {
  const findings = [];
  const hasManualLogic = MANUAL_LIVE_ROW_PATTERNS.some((p) => p.test(source));
  const hasCanonicalUse = CANONICAL_LIVE_ROW_RESOURCES.some((p) => p.test(source));

  if (hasManualLogic && !hasCanonicalUse && !filePath.endsWith('/live-row-utils.js')) {
    findings.push({
      rule: 'manual_live_row_drift_scan',
      severity: 'medium',
      policyArea: 'live_row_drift',
      message: 'Manual live/stale row drift logic detected',
      recommendation: getRecommendation({ type: 'live_row_drift' }).message
    });
  }

  return findings;
}
