import { beforeEach, describe, expect, it, vi } from 'vitest';

const findings = vi.hoisted(() => ([
  { rule: 'manual_summary_recomposition', recommendation: 'Use shared summary helper', policyArea: 'status' },
  { rule: 'private_barrel_import', recommendation: 'Import from shared/compiler', policyArea: 'barrel' }
]));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue('export const demo = 1;')
  }
}));

vi.mock('../../../../../src/core/file-watcher/watcher-issue-persistence.js', () => ({
  persistWatcherIssue: vi.fn().mockResolvedValue(true),
  clearWatcherIssue: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../../../../src/shared/compiler/index.js', async () => {
  const actual = await vi.importActual('../../../../../src/shared/compiler/index.js');
  return {
    ...actual,
    detectCompilerPolicyDriftFromSource: vi.fn().mockReturnValue(findings),
    buildCompilerPolicyIssueSummary: vi.fn().mockReturnValue({
      severity: 'medium',
      summary: { byPolicyArea: { status: 1, barrel: 1 }, byRule: { manual_summary_recomposition: 1, private_barrel_import: 1 } },
      message: 'policy drift findings',
      reuseGuidance: []
    })
  };
});

import { persistWatcherIssue } from '../../../../../src/core/file-watcher/watcher-issue-persistence.js';
import { detectCompilerPolicyConformance } from '../../../../../src/core/file-watcher/guards/compiler-policy-conformance-guard.js';

describe('compiler-policy-conformance guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a propagation plan with policy drift context', async () => {
    const findingsResult = await detectCompilerPolicyConformance('C:/Dev/OmnySystem', 'src/shared/compiler/index.js');

    expect(findingsResult).toEqual(findings);
    expect(persistWatcherIssue).toHaveBeenCalledTimes(1);
    const context = persistWatcherIssue.mock.calls[0][5];
    expect(context.propagation).toMatchObject({
      changeType: 'policy_drift',
      decision: 'review',
      cacheHit: false
    });
    expect(context.propagation.connectedSystems).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'compiler_policy_conformance_guard' }),
      expect.objectContaining({ name: 'watcher' })
    ]));
  });

  it('returns no findings when path context is missing', async () => {
    await expect(detectCompilerPolicyConformance(undefined, 'src/shared/compiler/index.js')).resolves.toEqual([]);
    await expect(detectCompilerPolicyConformance('C:/Dev/OmnySystem', undefined)).resolves.toEqual([]);

    expect(persistWatcherIssue).not.toHaveBeenCalled();
  });
});
