import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('../../../../../../src/core/file-watcher/guards/guard-standards.js', () => ({
  StandardSuggestions: {
    DUPLICATE_REUSE: 'Use atomic_edit to extend the existing function instead of duplicating'
  },
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

import { buildConceptualDuplicateReportPayload } from '../../../../../../src/core/file-watcher/guards/conceptual-duplicate-risk/payload.js';

describe('conceptual-duplicate-risk payload', () => {
  it('attaches canonical propagation to the watcher payload and persisted context', () => {
    const payload = buildConceptualDuplicateReportPayload({
      normalizedFilePath: 'src/core/file-watcher/guards/conceptual-duplicate-risk/reporting.js',
      findings: [
        {
          symbol: 'reuseCanonicalGuard',
          semanticFingerprint: 'reuse:logic:watcher:guard',
          duplicateFiles: ['src/shared/compiler/index.js', 'src/core/file-watcher/guards/other.js'],
          suggestedAlternatives: ['Reuse the canonical implementation'],
          filePath: 'src/core/file-watcher/guards/conceptual-duplicate-risk/reporting.js',
          totalInstances: 3,
          isExported: true,
          existingExports: 1
        }
      ],
      previousFindings: [],
      maxFindings: 5
    });

    expect(payload.propagation).toMatchObject({
      changeType: 'duplicate_risk_remediation',
      decision: 'review',
      cacheHit: false
    });
    expect(payload.context.propagation).toMatchObject({
      changeType: 'duplicate_risk_remediation'
    });
    expect(payload.context.extraData.propagation.connectedSystems).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'folderization' }),
      expect.objectContaining({ name: 'rename_folderized_family' })
    ]));
  });
});
