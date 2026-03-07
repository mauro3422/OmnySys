/**
 * @fileoverview Canonical file-universe granularity contract.
 *
 * Explains why the scanner/hash manifest, persisted manifest, and live indexed
 * file universe can differ without implying metadata drift.
 *
 * @module shared/compiler/file-universe-granularity
 */

function toCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function toRatio(numerator, denominator) {
  if (!denominator || denominator <= 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(3));
}

function buildIssue(code, severity, message) {
  return { code, severity, message };
}

export function getFileUniverseGranularity({
  scannedFileTotal = 0,
  manifestFileTotal = 0,
  liveFileCount = 0
} = {}) {
  const scanned = toCount(scannedFileTotal);
  const manifest = toCount(manifestFileTotal);
  const live = toCount(liveFileCount);

  const manifestCoverageRatio = toRatio(manifest, scanned);
  const liveCoverageRatio = toRatio(live, scanned);
  const liveVsManifestRatio = toRatio(live, manifest || scanned);
  const zeroAtomFileCount = Math.max(0, manifest - live);
  const contract = {
    scannerSurface: 'discoverProjectSourceFiles',
    manifestSurface: 'compiler_scanned_files',
    liveIndexSurface: 'atoms/files live index',
    summaryVsLiveIndex: true,
    equivalentTotals: scanned === live && manifest === live,
    trustworthy: manifest >= scanned && scanned >= live,
    zeroAtomFilesExpected: zeroAtomFileCount > 0
  };

  const issues = [];

  if (manifest < scanned) {
    issues.push(buildIssue(
      'manifest_missing_scanned_files',
      'high',
      'The persisted scanned-file manifest is missing files seen by the scanner.'
    ));
  }

  if (live > manifest) {
    issues.push(buildIssue(
      'live_index_exceeds_manifest',
      'medium',
      'Live indexed files exceed the persisted scanned-file manifest, which suggests file-universe desynchronization.'
    ));
  }

  return {
    scannedFileTotal: scanned,
    manifestFileTotal: manifest,
    liveFileCount: live,
    zeroAtomFileCount,
    manifestCoverageRatio,
    liveCoverageRatio,
    liveVsManifestRatio,
    contract,
    healthy: issues.length === 0,
    issues
  };
}
