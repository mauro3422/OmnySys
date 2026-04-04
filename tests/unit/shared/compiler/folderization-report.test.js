import { describe, expect, it } from 'vitest';

import { buildFolderizationReportFromRows } from '../../../../src/shared/compiler/folderization-report.js';

function buildRow(path) {
  return {
    path,
    directory: path.slice(0, path.lastIndexOf('/')),
    exports: [{ name: `${path.split('/').pop()?.replace(/\.js$/i, '') || 'value'}Export` }],
    importTargets: [],
    exportTargets: [],
    dependencyTargets: [],
    versionCount: 1,
    updatedAt: '2026-03-29T00:00:00.000Z'
  };
}

describe('folderization-report', () => {
  it('uses the closest DB-backed family when scopePath and focusPath are provided', () => {
    const rows = [
      buildRow('src/shared/compiler/dead-code/dead-code-core.js'),
      buildRow('src/shared/compiler/dead-code/dead-code-summary.js'),
      buildRow('src/core/file-watcher/guards/impact-wave/impact-wave-core.js'),
      buildRow('src/core/file-watcher/guards/impact-wave/impact-wave-summary.js')
    ];

    const report = buildFolderizationReportFromRows(rows, {
      scopePath: 'src/core/file-watcher/guards/impact-wave/impact-wave-guard.js',
      focusPath: 'src/core/file-watcher/guards/impact-wave/impact-wave-core.js'
    });

    expect(report.creationGuidance.scopePath).toBe('src/core/file-watcher/guards/impact-wave');
    expect(report.creationGuidance.focusPath).toBe('src/core/file-watcher/guards/impact-wave');
    expect(report.creationGuidance.matchedBy).toBe('focusPath');
    expect(report.creationGuidance.preferredFolder).toBe('src/core/file-watcher/guards/impact-wave');
    expect(report.creationGuidance.preferredFamilyRoot).toBe('impact-wave');
    expect(report.creationGuidance.familyDomain).toBe('src/core/file-watcher/guards/impact-wave');
    expect(report.creationGuidance.barrelPolicy).toContain('index.js');
    expect(report.creationGuidance.helperPolicy).toContain('role-only');
    expect(report.creationGuidance.collisionPolicy).toContain('suffix');
    expect(report.summary.guidanceScopePath).toBe('src/core/file-watcher/guards/impact-wave');
    expect(report.summary.guidanceFocusPath).toBe('src/core/file-watcher/guards/impact-wave');
    expect(report.propagation).toMatchObject({
      changeType: 'folderization',
      cacheHit: false,
      mode: expect.any(String)
    });
    expect(report.propagation.cacheKey).toBeTruthy();
  });

  it('detects a repeated-name family even when internal imports are absent', () => {
    const rows = [
      buildRow('src/shared/compiler/compiler-metrics-current.js'),
      buildRow('src/shared/compiler/compiler-metrics-current-helpers.js'),
      buildRow('src/shared/compiler/compiler-metrics-snapshot.js'),
      buildRow('src/shared/compiler/compiler-metrics-snapshot-summary.js'),
      buildRow('src/shared/compiler/compiler-metrics-snapshot-helpers.js')
    ];

    const report = buildFolderizationReportFromRows(rows, {
      scopePath: 'src/shared/compiler/compiler-metrics-snapshot.js',
      focusPath: 'src/shared/compiler/compiler-metrics-snapshot-summary.js'
    });

    expect(report.candidateReport.totalCandidates).toBeGreaterThan(0);
    expect(report.summary.candidateCount).toBeGreaterThan(0);
    expect(report.familyState.totalFamilies).toBeGreaterThan(0);
    expect(report.creationGuidance.preferredFamilyRoot).toBeTruthy();
  });
});
