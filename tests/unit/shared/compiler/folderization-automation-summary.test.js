import { describe, expect, it } from 'vitest';

import {
  buildFolderizationAutomationSummaryFromReport
} from '../../../../src/shared/compiler/folderization-automation-summary.js';

describe('folderization-automation-summary', () => {
  it('builds a ready automation plan when propagation and normalization are safe', () => {
    const automation = buildFolderizationAutomationSummaryFromReport({
      decision: 'approve',
      scopePath: 'src/shared/compiler',
      focusPath: 'src/shared/compiler',
      candidateReport: { candidateCount: 4 },
      drift: { state: 'fresh', score: 5, reason: 'stable support surface' },
      recommendation: { strategy: 'flat_family_sprawl' },
      propagation: {
        changeType: 'folderization',
        decision: 'approve',
        mode: 'move_and_rewrite',
        cacheKey: 'abc123',
        cacheHit: false,
        validationTargetCount: 7,
        recommendationStrategy: 'flat_family_sprawl',
        connectedSystems: [
          { name: 'technical_debt_report', role: 'consumer' },
          { name: 'status_panel', role: 'visibility' },
          { name: 'compiler_explainability', role: 'explainability' }
        ]
      },
      normalization: {
        summary: {
          safetyLevel: 'safe',
          recommendedAction: 'execute',
          renameTargetCount: 6,
          renameTargetDensity: 1.5
        }
      }
    }, {
      systemInventory: {
        inventoryState: 'watching',
        policyCoverage: { coverageState: 'fresh' },
        canonicalPromotion: { promotionState: 'watching' }
      },
      policyCoverage: { coverageState: 'fresh' },
      canonicalPromotion: { promotionState: 'watching' }
    });

    expect(automation.automationState).toBe('ready');
    expect(automation.shouldExecute).toBe(true);
    expect(automation.executionTarget).toBe('folderize_family');
    expect(automation.connectedSystemCount).toBe(3);
    expect(automation.connectedSystemNames).toContain('technical_debt_report');
    expect(automation.nextAction).toContain('Execute folderize_family');
  });

  it('blocks automation when propagation is blocked', () => {
    const automation = buildFolderizationAutomationSummaryFromReport({
      decision: 'reject',
      drift: { state: 'blocked', score: 100, reason: 'database not trustworthy' },
      recommendation: { strategy: 'flat_family_sprawl' },
      propagation: {
        changeType: 'folderization',
        decision: 'reject',
        mode: 'blocked',
        cacheKey: 'abc123',
        cacheHit: true,
        validationTargetCount: 0,
        recommendationStrategy: 'flat_family_sprawl',
        connectedSystems: []
      },
      normalization: {
        summary: {
          safetyLevel: 'missing',
          recommendedAction: 'noop',
          renameTargetCount: 0,
          renameTargetDensity: 0
        }
      }
    });

    expect(automation.automationState).toBe('blocked');
    expect(automation.shouldExecute).toBe(false);
    expect(automation.executionMode).toBe('analyze');
    expect(automation.executionTarget).toBe('analyze');
    expect(automation.reason).toContain('blocked');
  });
});
