import { describe, expect, it } from 'vitest';

import {
  buildCanonicalPromotionReport,
  buildCanonicalPromotionSnapshot,
  summarizeCanonicalPromotion
} from '../../../../src/shared/compiler/canonical-promotion-summary.js';

describe('canonical promotion summary', () => {
  it('builds a promotion plan from system inventory and folderization evidence', () => {
    const snapshot = buildCanonicalPromotionSnapshot({
      projectPath: 'C:/Dev/OmnySystem',
      scopePath: 'src/shared/compiler',
      focusPath: 'src/shared/compiler/system-inventory-summary.js',
      systemInventory: {
        summary: {
          inventoryState: 'ready',
          totalSystemCount: 12,
          canonicalSurfaceCount: 6,
          canonicalEntrypointCount: 2,
          emergentSystemCount: 2,
          bridgeSystemCount: 1,
          wrapperSystemCount: 1,
          legacySystemCount: 0,
          nextAction: 'Promote the strongest emergent surface into a canonical API.'
        },
        topPromotionCandidates: [
          {
            id: 'system_inventory',
            role: 'emergent',
            surface: 'systemInventory',
            canonicalTarget: 'systemInventory',
            centralityScore: 90,
            propagationScore: 82,
            summary: 'Emergent system inventory surface.'
          }
        ]
      },
      folderizationReport: {
        decision: 'already_folderized',
        creationGuidance: {
          preferredFolder: 'src/shared/compiler',
          selectionReason: 'The current scope has the strongest reusable folderization match in the DB.'
        },
        summary: {
          alreadyFolderizedFamilies: 1,
          guidanceScopePath: 'src/shared/compiler',
          recommendedAction: 'Promote the folderized family into a canonical contract and migrate callers together.',
          nextBestStem: 'summary.js'
        },
        propagation: {
          impactedFileCount: 3,
          rewriteCount: 2
        }
      }
    });
    const report = buildCanonicalPromotionReport(snapshot);
    const compact = summarizeCanonicalPromotion(snapshot);

    expect(report.promotionState).toBe('ready');
    expect(report.candidateCount).toBeGreaterThan(0);
    expect(report.folderizedFamilyCount).toBe(1);
    expect(report.emergentCandidateCount).toBeGreaterThan(0);
    expect(report.nextAction).toContain('Promote');
    expect(report.summaryText).toContain('state=ready');
    expect(report.summaryText).toContain('folderized=1');
    expect(Array.isArray(report.topPromotionTargets)).toBe(true);
    expect(report.topPromotionTargets[0].kind).toBeDefined();
    expect(compact.promotionState).toBe(report.promotionState);
  });
});
