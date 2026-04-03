import { describe, expect, it } from 'vitest';

import { buildStructuralDuplicateContext } from '../../../../../../src/core/file-watcher/guards/duplicate-risk-remediation/context.js';

describe('duplicate-risk-remediation context', () => {
  it('attaches propagation to structural duplicate contexts', () => {
    const context = buildStructuralDuplicateContext({
      findings: [
        { duplicateFiles: ['src/a.js', 'src/b.js'], name: 'duplicateA', familyRoot: 'familyA' },
        { duplicateFiles: ['src/c.js'], name: 'duplicateB', familyRoot: 'familyB' }
      ],
      debtHistory: {
        summary: {},
        debt: {
          score: 0,
          trend: 0,
          level: 'low'
        }
      },
      severity: 'medium',
      remediationPlan: {
        items: [{ recommendedActions: ['rename'] }]
      },
      maxFindings: 5
    });

    expect(context.propagation).toMatchObject({
      changeType: 'duplicate_risk_remediation',
      decision: 'review',
      cacheHit: false
    });
    expect(context.propagation.connectedSystems).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'folderization' }),
      expect.objectContaining({ name: 'rename_folderized_family' })
    ]));
  });
});
