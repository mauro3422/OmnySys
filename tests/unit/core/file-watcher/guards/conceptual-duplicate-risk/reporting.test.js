import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../../src/core/file-watcher/guards/guard-standards.js', () => ({
  StandardSuggestions: {
    DUPLICATE_REUSE: 'Use atomic_edit to extend the existing function instead of duplicating'
  },
  IssueDomains: {
    CODE: 'code'
  },
  createIssueType: (domain, issue, severity) => `${domain}_${issue}_${severity}`,
  createStandardContext: ({
    guardName,
    atomId = null,
    atomName = null,
    metricValue = null,
    threshold = null,
    severity = null,
    suggestedAction,
    suggestedAlternatives = [],
    relatedAtomIds = [],
    relatedFiles = [],
    extraData = {}
  } = {}) => ({
    source: 'file_watcher',
    guardName,
    ...(atomId && { atomId }),
    ...(atomName && { atomName }),
    ...(metricValue !== null && { metricValue }),
    ...(threshold !== null && { threshold }),
    ...(severity && { severity }),
    suggestedAction,
    ...(suggestedAlternatives.length > 0 && { suggestedAlternatives }),
    ...(relatedAtomIds.length > 0 && { relatedAtomIds }),
    ...(relatedFiles.length > 0 && { relatedFiles }),
    ...extraData
  })
}));

vi.mock('../../../../../../src/core/file-watcher/watcher-issue-persistence.js', () => ({
  persistWatcherIssue: vi.fn().mockResolvedValue(true),
  clearWatcherIssue: vi.fn().mockResolvedValue(true)
}));

import { persistConceptualDuplicateFinding } from '../../../../../../src/core/file-watcher/guards/conceptual-duplicate-risk/reporting.js';

describe('conceptual-duplicate-risk reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists and emits a propagation summary', async () => {
    const emitter = {
      emit: vi.fn()
    };

    const result = await persistConceptualDuplicateFinding({
      rootPath: 'C:/Dev/OmnySystem',
      normalizedFilePath: 'src/core/file-watcher/guards/conceptual-duplicate-risk/reporting.js',
      findings: [
        {
          symbol: 'reuseCanonicalGuard',
          semanticFingerprint: 'reuse:logic:watcher:guard',
          duplicateFiles: ['src/shared/compiler/index.js'],
          suggestedAlternatives: ['Reuse the canonical implementation'],
          filePath: 'src/core/file-watcher/guards/conceptual-duplicate-risk/reporting.js',
          totalInstances: 2,
          isExported: true,
          existingExports: 1
        }
      ],
      previousFindings: [],
      eventEmitterContext: emitter,
      maxFindings: 5
    });

    expect(result.propagation).toMatchObject({
      changeType: 'duplicate_risk_remediation',
      decision: 'review',
      cacheHit: false
    });
    expect(result.context.extraData.propagation.connectedSystems).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'folderization' }),
      expect.objectContaining({ name: 'watcher' })
    ]));
    expect(emitter.emit).toHaveBeenCalledWith(
      'code:conceptual_duplicate',
      expect.objectContaining({
        propagation: expect.objectContaining({
          changeType: 'duplicate_risk_remediation'
        })
      })
    );
  });
});
